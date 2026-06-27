'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { THEMES } from '@/lib/theme';

const T = THEMES.editorial;

const ERROR_COPY: Record<string, string> = {
  not_authorized:
    'That Microsoft account isn’t on the allow-list. Try a different account, or ask Nitin to add you.',
  missing_code: 'Sign-in didn’t complete. Try again.',
};

// Wrap the inner component in Suspense — useSearchParams() requires it
// when the page is prerendered. The fallback is null because the
// suspense resolves on the first client tick (no perceptible flash).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick up ?error=... params set by the middleware/callback so the
  // user understands why they're back here (e.g. allow-list rejection).
  const search = useSearchParams();
  useEffect(() => {
    const errParam = search?.get('error');
    if (errParam) {
      setError(ERROR_COPY[errParam] ?? errParam);
    }
  }, [search]);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        // Phase 4: Calendars.ReadWrite lets us create real Outlook
        // events on Belinda's behalf for follow-ups. The Microsoft Graph
        // permission must also be granted on the Azure app registration
        // (API permissions → add Calendars.ReadWrite, delegated).
        scopes:
          'email offline_access https://graph.microsoft.com/Calendars.ReadWrite',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.paper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontFamily: T.display,
          fontSize: '3rem',
          letterSpacing: '0.2em',
          color: T.gold,
        }}
      >
        B · D
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: '0.75rem',
          letterSpacing: '0.4em',
          color: T.muted,
        }}
      >
        HOSPITALITY TALENT SEARCH
      </div>

      <button
        onClick={signIn}
        disabled={loading}
        style={{
          marginTop: '3rem',
          padding: '0.875rem 2rem',
          background: T.gold,
          color: T.ink,
          border: 'none',
          borderRadius: 999,
          fontFamily: T.sans,
          fontWeight: 500,
          fontSize: '0.95rem',
          letterSpacing: '0.05em',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Redirecting…' : 'Sign in with Microsoft'}
      </button>

      {error && (
        <div
          style={{
            marginTop: 20,
            fontSize: '0.85rem',
            color: '#E5827A',
            maxWidth: 360,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <p
        style={{
          position: 'absolute',
          bottom: 32,
          fontSize: '0.65rem',
          letterSpacing: '0.3em',
          color: T.muted,
          textTransform: 'uppercase',
        }}
      >
        Internal use · Deep Hospitality
      </p>
    </main>
  );
}
