import App from './App';
import { fetchCandidates } from '@/lib/supabase/queries';
import { CANDIDATES as FALLBACK } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let candidates = FALLBACK;
  try {
    const fromDb = await fetchCandidates();
    if (fromDb.length > 0) candidates = fromDb;
  } catch (e) {
    // If env vars are missing or DB is unreachable, fall back to mocks so the
    // demo still renders. Surface the error in the server logs.
    console.error('[BD Talent] candidate fetch failed, using mock data:', e);
  }
  return <App initialCandidates={candidates} />;
}
