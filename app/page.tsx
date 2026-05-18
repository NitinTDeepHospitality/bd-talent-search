import App from './App';
import {
  fetchCandidates,
  fetchClients,
  fetchOpportunities,
  fetchTodos,
  type Todo,
} from '@/lib/supabase/queries';
import {
  CANDIDATES as CANDIDATE_FALLBACK,
  type Client,
  type Opportunity,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let candidates = CANDIDATE_FALLBACK;
  let opportunities: Opportunity[] = [];
  let todos: Todo[] = [];
  let clients: Client[] = [];

  // Parallel queries — none depend on each other.
  const [candidatesResult, opportunitiesResult, todosResult, clientsResult] =
    await Promise.allSettled([
      fetchCandidates(),
      fetchOpportunities(),
      fetchTodos(),
      fetchClients(),
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

  return (
    <App
      initialCandidates={candidates}
      initialOpportunities={opportunities}
      initialTodos={todos}
      initialClients={clients}
    />
  );
}
