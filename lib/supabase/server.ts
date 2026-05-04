// Server-side Supabase client. Uses the SECRET key — never import from client code.
// Use this in: server components, route handlers (app/api/*), server actions.

import { createClient } from '@supabase/supabase-js';

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
