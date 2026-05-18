// POST /api/calendar/event — schedule a follow-up in Belinda's Outlook
// calendar using the Microsoft Graph API, using the access token Supabase
// captured during her Microsoft sign-in. Also persists the same
// follow-up locally on the candidate/company row so the in-app "Coming
// up" view doesn't have to round-trip Outlook.
//
// Body:
//   {
//     subject: string,
//     startsAt: ISO timestamp,
//     durationMinutes?: number (default 30),
//     bodyHtml?: string,
//     candidateId?: string,  // exactly one of these two
//     companyId?: string,
//   }

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Body = {
  subject?: string;
  startsAt?: string;
  durationMinutes?: number;
  bodyHtml?: string;
  candidateId?: string;
  companyId?: string;
};

async function getProviderToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { data } = await client.auth.getSession();
  // provider_token is the Microsoft Graph access token; provider_refresh_token
  // is its refresh token. Supabase doesn't auto-refresh provider tokens, so
  // if the user's session is fresh we use what's there; if not, they need
  // to re-sign-in to refresh the Graph scope.
  return data.session?.provider_token ?? null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.subject || !body.startsAt) {
    return NextResponse.json(
      { error: 'subject and startsAt required' },
      { status: 400 },
    );
  }
  if (body.candidateId && body.companyId) {
    return NextResponse.json(
      { error: 'pass either candidateId or companyId, not both' },
      { status: 400 },
    );
  }

  const token = await getProviderToken();
  if (!token) {
    return NextResponse.json(
      {
        error: 'no_provider_token',
        message:
          'Sign in with Microsoft (or sign in again) to grant calendar access.',
      },
      { status: 401 },
    );
  }

  const startDate = new Date(body.startsAt);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json(
      { error: 'invalid startsAt' },
      { status: 400 },
    );
  }
  const durationMin = Math.max(15, Math.min(180, body.durationMinutes ?? 30));
  const endDate = new Date(startDate.getTime() + durationMin * 60_000);

  // Graph event payload. Times must be ISO and we provide an explicit
  // timeZone — using UTC keeps things consistent regardless of the user
  // device's locale.
  const graphPayload = {
    subject: body.subject,
    body: {
      contentType: 'HTML' as const,
      content: body.bodyHtml ?? '',
    },
    start: {
      dateTime: startDate.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDate.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    reminderMinutesBeforeStart: 15,
    isReminderOn: true,
  };

  const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(graphPayload),
  });

  if (!graphRes.ok) {
    const detail = await graphRes.text().catch(() => '');
    // 401 here usually means the token expired. Surface a clear signal so
    // the client can prompt re-sign-in.
    return NextResponse.json(
      {
        error: 'graph_failed',
        status: graphRes.status,
        detail: detail.slice(0, 500),
      },
      { status: graphRes.status === 401 ? 401 : 502 },
    );
  }

  const event = (await graphRes.json()) as {
    id: string;
    webLink?: string;
  };

  // Persist on the linked row so the in-app "Coming up" view is fast and
  // works even when Belinda's offline. Best-effort — don't fail the
  // calendar create if this update errors.
  const sb = supabaseServer();
  if (body.candidateId) {
    await sb
      .from('candidates')
      .update({
        follow_up_at: startDate.toISOString(),
        follow_up_event_id: event.id,
      })
      .eq('id', body.candidateId);
  } else if (body.companyId) {
    await sb
      .from('companies')
      .update({
        follow_up_at: startDate.toISOString(),
        follow_up_event_id: event.id,
      })
      .eq('id', body.companyId);
    // Also update last_contact_at — scheduling a follow-up is a contact
    // signal in itself.
  }

  return NextResponse.json({
    event_id: event.id,
    web_link: event.webLink ?? null,
    starts_at: startDate.toISOString(),
  });
}
