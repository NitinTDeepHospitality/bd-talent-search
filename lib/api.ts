// Client-side wrappers for the Belinda server routes.

export type ParseQueryResponse = {
  filters: {
    expertise?: string[];
    tier?: string;
    location?: string;
    languages?: string[];
    notes?: string;
  };
  matchedIds: string[];
  reasoning: string;
  tags: string[];
};

export async function parseQuery(
  transcript: string,
): Promise<ParseQueryResponse> {
  const r = await fetch('/api/parse-query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`parse-query ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as ParseQueryResponse;
}

export type ExtractedRow = {
  type: 'brief' | 'contact' | 'tag' | 'opportunity';
  label: string;
  detail: string;
};

export type ExtractedTodo = {
  label: string;
  due_hint: string | null;
};

export type ExtractCaptureResult = {
  extracted: ExtractedRow[];
  highlights: string[];
  todos: ExtractedTodo[];
};

export async function extractCapture(
  transcript: string,
): Promise<ExtractCaptureResult> {
  const r = await fetch('/api/extract-capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`extract-capture ${r.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await r.json()) as ExtractCaptureResult;
  return data;
}

export type SavedTodo = {
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

export async function saveCapture(payload: {
  transcript: string;
  extracted: ExtractedRow[];
  highlights: string[];
  todos: ExtractedTodo[];
}): Promise<{ capture_id: string; todo_ids: string[] }> {
  const r = await fetch('/api/captures', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`save-capture ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as { capture_id: string; todo_ids: string[] };
}

export async function completeTodo(id: string, completed: boolean): Promise<void> {
  const r = await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`complete-todo ${r.status}: ${detail.slice(0, 200)}`);
  }
}

export type RefreshOpportunitiesRegion =
  | 'global'
  | 'europe'
  | 'middle_east'
  | 'asia'
  | 'americas';

export type RefreshOpportunitiesResult = {
  inserted: number;
  found: number;
  region: RefreshOpportunitiesRegion;
  deduped?: boolean;
  note?: string;
};

export async function refreshOpportunities(
  region: RefreshOpportunitiesRegion,
): Promise<RefreshOpportunitiesResult> {
  const r = await fetch('/api/refresh-opportunities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`refresh ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as RefreshOpportunitiesResult;
}

// Empty strings / 0s stand in for "not specified" — Anthropic schema cap on
// nullable parameters forced this; the review form treats them as nulls
// when editing, and the server route nulls them before insert.
export type ExtractedCandidate = {
  name: string;
  age: number;
  current_title: string;
  current_hotel: string;
  tenure: string;
  current_location: string;
  open_to_locations: string[];
  nationalities: string[];
  languages: string[];
  last_job_change_date: string;
  last_contact_at: string;
  move_readiness: 'ready' | 'passive' | 'settled' | null;
  family_travels: boolean;
  child_education_required: boolean;
  belinda_tier: 'black_book' | 'inner_circle' | 'watching' | null;
  belinda_rating: number;
  availability: string;
  quote: string;
  // Phase 5 — set by the review form when Belinda pastes a profile URL,
  // or by /api/extract-candidate-cv when reading a CV PDF. The voice
  // extract leaves this as ''.
  linkedin_url: string;
  signals: {
    word_on_street: string;
    chemistry: string;
    trajectory: string;
    gut_note: string;
  };
  tags: string[];
};

export async function extractCandidate(
  transcript: string,
): Promise<ExtractedCandidate> {
  const r = await fetch('/api/extract-candidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`extract-candidate ${r.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await r.json()) as { candidate: ExtractedCandidate };
  // Voice route doesn't include linkedin_url in its schema. Fill the
  // default so the review form has a string to bind against.
  return { ...data.candidate, linkedin_url: data.candidate.linkedin_url ?? '' };
}

/**
 * Send a CV file (PDF, preferred) to the server. Claude reads the
 * document directly and returns the same structured shape as the voice
 * route, so the review form is reusable.
 */
export async function extractCandidateFromCV(
  file: File,
): Promise<ExtractedCandidate> {
  const fd = new FormData();
  fd.append('cv', file);
  const r = await fetch('/api/extract-candidate-cv', {
    method: 'POST',
    body: fd,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`extract-candidate-cv ${r.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await r.json()) as { candidate: ExtractedCandidate };
  return { ...data.candidate, linkedin_url: data.candidate.linkedin_url ?? '' };
}

export async function saveCandidate(
  candidate: ExtractedCandidate,
): Promise<{ id: string; name: string }> {
  const r = await fetch('/api/candidates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(candidate),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`save-candidate ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as { id: string; name: string };
}

/**
 * Toggle the watchlist flag on a candidate. Caller does the optimistic
 * UI update; this function only rejects on network/server failure so the
 * caller can roll back.
 */
export async function setCandidateWatched(
  dbId: string,
  watched: boolean,
): Promise<void> {
  const r = await fetch(`/api/candidates/${encodeURIComponent(dbId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ is_watched: watched }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`set-watched ${r.status}: ${detail.slice(0, 200)}`);
  }
}

export type ExtractedClient = {
  name: string | null;
  type:
    | 'third_party_operator'
    | 'luxury_collection'
    | 'family_office'
    | 'developer'
    | 'big_chain'
    | null;
  status: 'active' | 'dormant' | null;
  hq_city: string | null;
  last_contact_at: string | null;
  notes: string | null;
  briefs: Array<{
    role: string;
    hotel_name: string | null;
    city: string | null;
    opening_date: string | null;
  }>;
  contacts: Array<{ name: string; role: string | null }>;
};

export async function extractClient(transcript: string): Promise<ExtractedClient> {
  const r = await fetch('/api/extract-client', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`extract-client ${r.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await r.json()) as { client: ExtractedClient };
  return data.client;
}

export async function saveClient(
  client: ExtractedClient,
): Promise<{ id: string; name: string; brief_ids: string[] }> {
  const r = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(client),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`save-client ${r.status}: ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as { id: string; name: string; brief_ids: string[] };
}

export type ScheduleFollowUpInput = {
  subject: string;
  startsAt: string; // ISO timestamp
  durationMinutes?: number;
  bodyHtml?: string;
  candidateId?: string;
  companyId?: string;
};

export type ScheduledFollowUp = {
  event_id: string;
  web_link: string | null;
  starts_at: string;
};

export async function scheduleFollowUp(
  input: ScheduleFollowUpInput,
): Promise<ScheduledFollowUp> {
  const r = await fetch('/api/calendar/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = await r.json();
    } catch {
      /* ignore */
    }
    if (r.status === 401) {
      throw new Error(
        parsed.message ??
          'Calendar access expired. Sign in with Microsoft to refresh.',
      );
    }
    throw new Error(
      `schedule-follow-up ${r.status}: ${parsed.error ?? 'unknown'}`,
    );
  }
  return (await r.json()) as ScheduledFollowUp;
}

export type ChatMessageForApi = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Streams Claude's chat reply, one decoded text chunk at a time. Caller
 * concatenates chunks into the rendered bubble.
 */
export async function* streamChat(
  messages: ChatMessageForApi[],
  candidateId?: string,
): AsyncIterableIterator<string> {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, candidateId }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`chat ${r.status}: ${detail.slice(0, 200)}`);
  }
  if (!r.body) {
    throw new Error('chat returned no body');
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) yield decoder.decode(value, { stream: true });
  }
  const flush = decoder.decode();
  if (flush) yield flush;
}
