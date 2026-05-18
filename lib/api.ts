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

export type ExtractedCandidate = {
  name: string | null;
  age: number | null;
  current_title: string | null;
  current_hotel: string | null;
  tenure: string | null;
  current_location: string | null;
  open_to_locations: string[];
  nationalities: string[];
  languages: string[];
  last_job_change_date: string | null;
  last_contact_at: string | null;
  move_readiness: 'ready' | 'passive' | 'settled' | null;
  family_travels: boolean | null;
  child_education_required: boolean | null;
  belinda_tier: 'black_book' | 'inner_circle' | 'watching' | null;
  belinda_rating: number | null;
  availability: string | null;
  quote: string | null;
  signals: {
    word_on_street: string | null;
    chemistry: string | null;
    trajectory: string | null;
    gut_note: string | null;
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
  return data.candidate;
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
