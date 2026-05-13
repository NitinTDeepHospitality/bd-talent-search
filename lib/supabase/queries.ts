// Typed queries that map DB rows -> the shapes the UI already expects.
// Keep all DB->UI translation here so screens stay clean.

import 'server-only';
import { supabaseServer } from './server';
import type { Candidate, Opportunity } from '@/lib/data';

type DbCandidate = {
  id: string;
  name: string;
  age: number | null;
  current_title: string | null;
  current_hotel: string | null;
  tenure: string | null;
  location: string | null;
  photo_url: string | null;
  nationalities: string[] | null;
  languages: string[] | null;
  pnl: string | null;
  keys: number | null;
  belinda_rating: string | null;
  belinda_tier: 'black_book' | 'inner_circle' | 'watching' | null;
  quote: string | null;
  availability: string | null;
  candidate_experience: Array<{ brand: string; role: string | null; years: string | null; ord: number | null }>;
  candidate_signals: Array<{ type: string; note: string }>;
  candidate_tags: Array<{ axis: string; value: string }>;
};

const TIER_DB_TO_UI: Record<string, Candidate['belindaTier']> = {
  black_book: 'Black Book',
  inner_circle: 'Inner circle',
  watching: 'Watching',
};

function rowToCandidate(r: DbCandidate, idx: number): Candidate {
  const signals: Record<string, string> = {};
  for (const s of r.candidate_signals) signals[s.type] = s.note;
  const tags = r.candidate_tags.map((t) => t.value);

  const experience = (r.candidate_experience ?? [])
    .slice()
    .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
    .map((e) => ({ brand: e.brand, role: e.role ?? '', years: e.years ?? '' }));

  const currentParts = [r.current_title, r.current_hotel].filter(Boolean);

  return {
    id: idx + 1, // UI Candidate.id is number; UUID lives in dbId
    dbId: r.id,
    name: r.name,
    age: r.age ?? 0,
    current: currentParts.join(', '),
    tenure: r.tenure ?? '',
    location: r.location ?? '',
    photo: r.photo_url ?? '',
    nationalities: r.nationalities ?? [],
    languages: r.languages ?? [],
    experience,
    pnl: r.pnl ?? '',
    keys: r.keys ?? 0,
    belindaRating: r.belinda_rating ? Number(r.belinda_rating) : 0,
    belindaTier: r.belinda_tier ? TIER_DB_TO_UI[r.belinda_tier] : 'Watching',
    tags,
    signals: {
      wordOnStreet: signals.word_on_street ?? '',
      chemistry: signals.chemistry ?? '',
      trajectory: signals.trajectory ?? '',
      gutNote: signals.gut_note ?? '',
    },
    quote: r.quote ?? '',
    availability: r.availability ?? '',
    match: 0,
  };
}

type DbOpportunity = {
  id: string;
  source: string | null;
  source_url: string | null;
  headline: string;
  body: string | null;
  why_it_matters: string | null;
  matched_candidate_ids: string[] | null;
  draft_email: string | null;
  surfaced_at: string;
};

function relativeWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString();
}

function rowToOpportunity(r: DbOpportunity): Opportunity {
  return {
    id: r.id,
    source: r.source ?? 'Industry whisper',
    headline: r.headline,
    when: relativeWhen(r.surfaced_at),
    why: r.why_it_matters ?? '',
    candidates: r.matched_candidate_ids ?? [],
    draft: r.draft_email,
    cta: r.draft_email ? 'Send the draft' : 'Open brief',
    sourceUrl: r.source_url ?? undefined,
  };
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('opportunities')
    .select(
      'id, source, source_url, headline, body, why_it_matters, matched_candidate_ids, draft_email, surfaced_at',
    )
    .neq('status', 'archived')
    .order('surfaced_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data as unknown as DbOpportunity[]).map(rowToOpportunity);
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('candidates')
    .select(
      `
      id, name, age, current_title, current_hotel, tenure, location,
      photo_url, nationalities, languages, pnl, keys,
      belinda_rating, belinda_tier, quote, availability,
      candidate_experience(brand, role, years, ord),
      candidate_signals(type, note),
      candidate_tags(axis, value)
    `,
    )
    .order('belinda_rating', { ascending: false });

  if (error) throw error;
  return (data as unknown as DbCandidate[]).map(rowToCandidate);
}
