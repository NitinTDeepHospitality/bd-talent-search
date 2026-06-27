// POST /api/extract-candidate-cv — turn an uploaded CV (PDF) into the
// same structured candidate shape /api/extract-candidate produces from a
// voice memo. Lets Belinda paste/upload a CV she already has in email
// instead of having to dictate the candidate from scratch.
//
// Input  : multipart/form-data with a `cv` File (PDF preferred)
// Output : { candidate: ExtractedCandidate }
//
// Claude reads the PDF directly via a document content block — no PDF
// parsing library required server-side.

import { NextResponse } from 'next/server';
import type { Anthropic } from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — well above any reasonable CV

const SYSTEM_PROMPT = `You are Belinda's onboarding assistant. Belinda is a senior hospitality talent broker; she's adding a candidate to her own network by uploading their CV. Your job is to read the CV and turn it into a clean structured record.

A CV gives you facts, not Belinda's read. Pull facts aggressively; leave her-specific signals blank (she'll add them later in the review step).

Facts to extract:
- name (required — top of the CV)
- age (if a date of birth is given; calculate from today; otherwise 0)
- current_title (most recent role)
- current_hotel (most recent employer — luxury hotel or operator)
- tenure (e.g. "3 yrs" — compute from most recent role's start date if you can; otherwise leave blank)
- nationalities (array — extract from CV header or work-authorisation notes)
- languages (array of 2-letter codes preferred — EN, FR, IT, DE)
- current_location (city where they're currently based)
- last_job_change_date — start date of current role as YYYY-MM-DD if known

LinkedIn:
- linkedin_url — if the CV has a LinkedIn URL anywhere (header, contact details, footer), extract it. Otherwise empty string.

Belinda's-read fields you should LEAVE BLANK (she'll edit them in the review):
- belinda_tier, belinda_rating, availability, quote
- signals.word_on_street, signals.chemistry, signals.trajectory, signals.gut_note
- move_readiness, family_travels, child_education_required, last_contact_at, open_to_locations

Tags — short phrases (≤3 words) that capture searchable facts from the CV: "luxury", "F&B-led", "pre-opening" (if they've done one), specific brands ("Aman", "Four Seasons"). 3–8 tags. Inferred from the career history, not made up.

Return ONLY a JSON object. No prose, no fences, no preamble.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    current_title: { type: 'string' },
    current_hotel: { type: 'string' },
    tenure: { type: 'string' },
    current_location: { type: 'string' },
    open_to_locations: { type: 'array', items: { type: 'string' } },
    nationalities: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    last_job_change_date: { type: 'string' },
    last_contact_at: { type: 'string' },
    linkedin_url: { type: 'string' },
    move_readiness: {
      anyOf: [
        { type: 'string', enum: ['ready', 'passive', 'settled'] },
        { type: 'null' },
      ],
    },
    family_travels: { type: 'boolean' },
    child_education_required: { type: 'boolean' },
    belinda_tier: {
      anyOf: [
        { type: 'string', enum: ['black_book', 'inner_circle', 'watching'] },
        { type: 'null' },
      ],
    },
    belinda_rating: { type: 'number' },
    availability: { type: 'string' },
    quote: { type: 'string' },
    signals: {
      type: 'object',
      properties: {
        word_on_street: { type: 'string' },
        chemistry: { type: 'string' },
        trajectory: { type: 'string' },
        gut_note: { type: 'string' },
      },
      required: ['word_on_street', 'chemistry', 'trajectory', 'gut_note'],
      additionalProperties: false,
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name',
    'age',
    'current_title',
    'current_hotel',
    'tenure',
    'current_location',
    'open_to_locations',
    'nationalities',
    'languages',
    'last_job_change_date',
    'last_contact_at',
    'linkedin_url',
    'move_readiness',
    'family_travels',
    'child_education_required',
    'belinda_tier',
    'belinda_rating',
    'availability',
    'quote',
    'signals',
    'tags',
  ],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  let cv: File;
  try {
    const form = await request.formData();
    const f = form.get('cv');
    if (!(f instanceof File)) {
      return NextResponse.json(
        { error: 'cv_field_missing' },
        { status: 400 },
      );
    }
    cv = f;
  } catch {
    return NextResponse.json({ error: 'bad_form_data' }, { status: 400 });
  }

  if (cv.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'cv_too_large', max_bytes: MAX_BYTES },
      { status: 413 },
    );
  }

  const mediaType = cv.type || 'application/pdf';
  if (!mediaType.includes('pdf')) {
    return NextResponse.json(
      {
        error: 'unsupported_media_type',
        detail: 'Upload a PDF. (Word docs not supported yet.)',
      },
      { status: 415 },
    );
  }

  const base64 = Buffer.from(await cv.arrayBuffer()).toString('base64');

  let response;
  try {
    response = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      } as Anthropic.Messages.MessageCreateParams['output_config'],
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            { type: 'text', text: "Here's the CV. Extract the structured record." },
          ],
        },
      ],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      {
        error: 'anthropic_failed',
        status: err.status,
        message: err.message?.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) {
    return NextResponse.json(
      { error: 'no_text_block', stop_reason: response.stop_reason },
      { status: 502 },
    );
  }

  try {
    const candidate = JSON.parse(textBlock.text);
    return NextResponse.json({ candidate });
  } catch {
    return NextResponse.json(
      { error: 'parse_failed', raw: textBlock.text.slice(0, 500) },
      { status: 502 },
    );
  }
}
