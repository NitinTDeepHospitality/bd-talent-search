// POST /api/refresh-opportunities
//
// User-callable refresh of the Opportunities feed for a given region.
// Same scout logic as the daily cron, but takes a region in the body
// and is gated by the proxy's normal auth (which is currently bypassed
// via BYPASS_AUTH for Belinda's prototype window).

import { NextResponse } from 'next/server';
import { scoutOpportunities, type Region } from '@/lib/opportunities-scout';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_REGIONS: Region[] = ['global', 'europe', 'middle_east', 'asia', 'americas'];

export async function POST(request: Request) {
  let body: { region?: string };
  try {
    body = (await request.json()) as { region?: string };
  } catch {
    body = {};
  }

  let region: Region | undefined;
  if (body.region) {
    if (!VALID_REGIONS.includes(body.region as Region)) {
      return NextResponse.json(
        { error: 'invalid_region', valid: VALID_REGIONS },
        { status: 400 },
      );
    }
    region = body.region as Region;
  }

  const result = await scoutOpportunities({ region });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: result.status },
    );
  }
  return NextResponse.json(result);
}
