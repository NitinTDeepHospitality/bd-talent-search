import App from './App';
import {
  fetchCandidates,
  fetchOpportunities,
} from '@/lib/supabase/queries';
import { CANDIDATES as CANDIDATE_FALLBACK, type Opportunity } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let candidates = CANDIDATE_FALLBACK;
  let opportunities: Opportunity[] = [];

  // Run the two DB queries in parallel — they don't depend on each other.
  const [candidatesResult, opportunitiesResult] = await Promise.allSettled([
    fetchCandidates(),
    fetchOpportunities(),
  ]);

  if (candidatesResult.status === 'fulfilled' && candidatesResult.value.length > 0) {
    candidates = candidatesResult.value;
  } else if (candidatesResult.status === 'rejected') {
    console.error('[BD] candidate fetch failed, using mock:', candidatesResult.reason);
  }

  if (opportunitiesResult.status === 'fulfilled') {
    opportunities = opportunitiesResult.value;
  } else {
    console.error('[BD] opportunities fetch failed:', opportunitiesResult.reason);
  }

  return (
    <App initialCandidates={candidates} initialOpportunities={opportunities} />
  );
}
