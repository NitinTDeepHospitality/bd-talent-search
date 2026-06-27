import App from './App';
import {
  fetchCandidates,
  fetchClients,
  fetchLatestImport,
  fetchOpportunities,
  fetchTodos,
  fetchUnackedChanges,
  type Todo,
} from '@/lib/supabase/queries';
import {
  CANDIDATES as CANDIDATE_FALLBACK,
  type CandidateChange,
  type Client,
  type LinkedInImport,
  type Opportunity,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let candidates = CANDIDATE_FALLBACK;
  let opportunities: Opportunity[] = [];
  let todos: Todo[] = [];
  let clients: Client[] = [];
  let changes: CandidateChange[] = [];
  let latestImport: LinkedInImport | null = null;

  // Parallel queries — none depend on each other.
  const [
    candidatesResult,
    opportunitiesResult,
    todosResult,
    clientsResult,
    changesResult,
    latestImportResult,
  ] = await Promise.allSettled([
    fetchCandidates(),
    fetchOpportunities(),
    fetchTodos(),
    fetchClients(),
    fetchUnackedChanges(),
    fetchLatestImport(),
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

  if (todosResult.status === 'fulfilled') {
    todos = todosResult.value;
  } else {
    console.error('[BD] todos fetch failed:', todosResult.reason);
  }

  if (clientsResult.status === 'fulfilled') {
    clients = clientsResult.value;
  } else {
    console.error('[BD] clients fetch failed:', clientsResult.reason);
  }

  if (changesResult.status === 'fulfilled') {
    changes = changesResult.value;
  } else {
    console.error('[BD] changes fetch failed:', changesResult.reason);
  }

  if (latestImportResult.status === 'fulfilled') {
    latestImport = latestImportResult.value;
  } else {
    console.error('[BD] latest import fetch failed:', latestImportResult.reason);
  }

  return (
    <App
      initialCandidates={candidates}
      initialOpportunities={opportunities}
      initialTodos={todos}
      initialClients={clients}
      initialChanges={changes}
      initialLatestImport={latestImport}
    />
  );
}
