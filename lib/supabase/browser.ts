// Browser-side Supabase client. Uses the PUBLISHABLE key — safe to expose.
// Use this in: client components ('use client'), browser-side fetches.

'use client';

import { createBrowserClient } from '@supabase/ssr';

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
