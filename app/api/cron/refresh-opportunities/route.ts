// GET /api/cron/refresh-opportunities
//
// Daily Vercel cron that scouts hospitality signals via Claude + web_search,
// matches them to candidates, and inserts new rows into `opportunities`.
//
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}`. The route also
// accepts the same header for manual triggers. For the user-facing
// region-specific refresh, see /api/refresh-opportunities.

import { NextResponse } from 'next/server';
import { scoutOpportunities } from '@/lib/opportunities-scout';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handler(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not set' },
      { status: 500 },
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await scoutOpportunities({});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: result.status },
    );
  }
  return NextResponse.json(result);
}

export const GET = handler;
export const POST = handler;
