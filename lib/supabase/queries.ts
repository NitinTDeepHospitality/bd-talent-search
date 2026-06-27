// Typed queries that map DB rows -> the shapes the UI already expects.
// Keep all DB->UI translation here so screens stay clean.

import 'server-only';
import { supabaseServer } from './server';
import type { Candidate, Client, ClientBrief, Opportunity } from '@/lib/data';

export type Todo = {
  id: string;
  label: string;
  detail: string | null;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  capture_id: string | null;
  candidate_id: string | null;
  company_id: string | null;
  brief_id: string | null;
  created_at: string;
};

export async function fetchTodos(opts: { includeCompleted?: boolean } = {}): Promise<Todo[]> {
  const sb = supabaseServer();
  let q = sb
    .from('todos')
    .select('id, label, detail, due_at, completed, completed_at, capture_id, candidate_id, company_id, brief_id, created_at')
    .order('completed', { ascending: true })
    // Nulls last on due_at so dated todos float to the top.
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);
  if (!opts.includeCompleted) {
    q = q.eq('completed', false);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as Todo[]) ?? [];
}

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
  current_location: string | null;
  open_to_locations: string[] | null;
  last_job_change_date: string | null;
  last_contact_at: string | null;
  move_readiness: 'ready' | 'passive' | 'settled' | null;
  family_travels: boolean | null;
  child_education_required: boolean | null;
  follow_up_at: string | null;
  follow_up_event_id: string | null;
  linkedin_url: string | null;
  is_watched: boolean | null;
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
    currentLocation: r.current_location,
    openToLocations: r.open_to_locations ?? [],
    lastJobChangeDate: r.last_job_change_date,
    lastContactAt: r.last_contact_at,
    moveReadiness: r.move_readiness,
    familyTravels: r.family_travels,
    childEducationRequired: r.child_education_required,
    followUpAt: r.follow_up_at,
    followUpEventId: r.follow_up_event_id,
    linkedinUrl: r.linkedin_url,
    isWatched: r.is_watched ?? false,
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

type DbClient = {
  id: string;
  name: string;
  type: Client['type'];
  status: string | null;
  hq_city: string | null;
  last_contact_at: string | null;
  follow_up_at: string | null;
  follow_up_event_id: string | null;
  notes: string | null;
  briefs:
    | Array<{
        id: string;
        role: string;
        city: string | null;
        hotel_name: string | null;
        opening_date: string | null;
        status: string | null;
        is_interim: boolean | null;
        interim_duration: string | null;
        brief_shortlist: Array<{ candidate_id: string }>;
      }>
    | null;
};

function rowToClient(r: DbClient): Client {
  const briefs = (r.briefs ?? []).filter(
    (b) => b.status !== 'closed' && b.status !== 'placed',
  );
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    status: (r.status === 'dormant' ? 'dormant' : 'active') as Client['status'],
    hqCity: r.hq_city,
    lastContactAt: r.last_contact_at,
    notes: r.notes,
    followUpAt: r.follow_up_at,
    followUpEventId: r.follow_up_event_id,
    openBriefs: briefs.map(
      (b): ClientBrief => ({
        id: b.id,
        role: b.role,
        city: b.city,
        hotelName: b.hotel_name,
        openingDate: b.opening_date,
        status: b.status ?? 'open',
        isInterim: b.is_interim ?? false,
        interimDuration: b.interim_duration ?? null,
        shortlistedCandidateIds: (b.brief_shortlist ?? []).map(
          (s) => s.candidate_id,
        ),
      }),
    ),
  };
}

export async function fetchClients(): Promise<Client[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('companies')
    .select(
      `
      id, name, type, status, hq_city, last_contact_at, follow_up_at, follow_up_event_id, notes,
      briefs(id, role, city, hotel_name, opening_date, status,
        is_interim, interim_duration,
        brief_shortlist(candidate_id))
    `,
    )
    .order('status', { ascending: true })
    .order('last_contact_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as DbClient[]).map(rowToClient);
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
      current_location, open_to_locations, last_job_change_date,
      last_contact_at, move_readiness, family_travels, child_education_required,
      follow_up_at, follow_up_event_id, linkedin_url, is_watched,
      candidate_experience(brand, role, years, ord),
      candidate_signals(type, note),
      candidate_tags(axis, value)
    `,
    )
    .order('belinda_rating', { ascending: false });

  if (error) throw error;
  return (data as unknown as DbCandidate[]).map(rowToCandidate);
}
