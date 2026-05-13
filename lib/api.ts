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

export async function extractCapture(
  transcript: string,
): Promise<ExtractedRow[]> {
  const r = await fetch('/api/extract-capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`extract-capture ${r.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await r.json()) as { extracted: ExtractedRow[] };
  return data.extracted;
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
