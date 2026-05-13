'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { type Candidate, type Opportunity, OPPORTUNITIES } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';
import {
  refreshOpportunities,
  type RefreshOpportunitiesRegion,
} from '@/lib/api';

const REGION_OPTIONS: Array<{ id: RefreshOpportunitiesRegion; label: string }> = [
  { id: 'global', label: 'Global' },
  { id: 'europe', label: 'Europe' },
  { id: 'middle_east', label: 'Middle East' },
  { id: 'asia', label: 'Asia' },
  { id: 'americas', label: 'Americas' },
];

function findCandidate(
  candidates: Candidate[],
  id: number | string,
): Candidate | undefined {
  // DB-sourced opportunities carry UUIDs that match Candidate.dbId; mock
  // opportunities carry numeric Candidate.id.
  return typeof id === 'string'
    ? candidates.find((c) => c.dbId === id)
    : candidates.find((c) => c.id === id);
}

function OpportunityCard({
  theme,
  o,
  candidates,
  onOpenCandidate,
}: {
  theme: Theme;
  o: Opportunity;
  candidates: Candidate[];
  onOpenCandidate?: (c: Candidate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const matched = o.candidates
    .map((id) => findCandidate(candidates, id))
    .filter((c): c is Candidate => Boolean(c));
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: 'rgba(245,239,230,0.03)',
        border: `0.5px solid ${theme.line}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.8,
            color: theme.gold,
            textTransform: 'uppercase',
          }}
        >
          {o.source}
        </div>
        <div style={{ fontSize: 9, color: theme.muted, letterSpacing: 0.5 }}>{o.when}</div>
      </div>
      <div
        style={{
          fontFamily: theme.display,
          fontSize: 17,
          color: theme.paper,
          lineHeight: 1.25,
          marginBottom: 8,
          fontWeight: 400,
        }}
      >
        {o.headline}
      </div>
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(184,150,107,0.06)',
          borderLeft: `2px solid ${theme.gold}`,
          borderRadius: '0 8px 8px 0',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: theme.gold,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Why this matters
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 13,
            fontStyle: 'italic',
            color: theme.paper,
            lineHeight: 1.4,
          }}
        >
          {o.why}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: expanded ? 14 : 0,
        }}
      >
        <div style={{ display: 'flex' }}>
          {matched.map((c, i) => (
            <div
              key={c.id}
              onClick={() => onOpenCandidate?.(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: `url(${c.photo}) center/cover`,
                border: `1.5px solid ${theme.bg}`,
                marginLeft: i ? -10 : 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, fontSize: 11, color: theme.muted }}>
          {matched.map((c) => c.name.split(' ')[0]).join(', ')} fit
        </div>
        {o.draft && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              fontSize: 9,
              letterSpacing: 1.5,
              color: theme.goldLight,
              background: 'transparent',
              border: `0.5px solid ${theme.line}`,
              padding: '6px 10px',
              borderRadius: 999,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {expanded ? 'Hide draft' : 'See draft'}
          </button>
        )}
      </div>

      {expanded && o.draft && (
        <div
          style={{
            padding: 12,
            background: theme.surface,
            border: `0.5px solid ${theme.lineDark}`,
            borderRadius: 10,
            fontFamily: theme.serif,
            fontSize: 13,
            fontStyle: 'italic',
            color: theme.paper,
            lineHeight: 1.45,
            marginBottom: 12,
          }}
        >
          {o.draft}
        </div>
      )}

      {o.sourceUrl ? (
        <a
          href={o.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '11px',
            marginTop: 4,
            background: 'transparent',
            color: theme.goldLight,
            textDecoration: 'none',
            border: `0.5px solid ${theme.gold}`,
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Read the article
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M3 3h6v6M9 3 3.5 8.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </a>
      ) : (
        <div
          style={{
            width: '100%',
            padding: '11px',
            marginTop: 4,
            textAlign: 'center',
            color: theme.muted,
            fontFamily: theme.sans,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          No source link
        </div>
      )}
    </div>
  );
}

export function OpportunityScreen({
  theme,
  candidates,
  opportunities,
  onClose,
  onOpenCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  /** Live data from Supabase; falls back to mock when empty. */
  opportunities?: Opportunity[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
}) {
  const rows =
    opportunities && opportunities.length > 0 ? opportunities : OPPORTUNITIES;
  const router = useRouter();
  const [region, setRegion] = useState<RefreshOpportunitiesRegion>('global');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const result = await refreshOpportunities(region);
      if (result.inserted === 0 && result.deduped) {
        setRefreshNote('Nothing new since the last pull.');
      } else if (result.inserted === 0) {
        setRefreshNote('No signals worth surfacing.');
      } else {
        setRefreshNote(`Added ${result.inserted} new signal${result.inserted === 1 ? '' : 's'}.`);
      }
      router.refresh();
    } catch (e) {
      console.error('[BD] refresh failed:', e);
      setRefreshNote('Couldn’t reach the scout — try again.');
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: theme.bg,
        fontFamily: theme.sans,
        color: theme.paper,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          padding: '58px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: 'transparent',
            border: `0.5px solid ${theme.line}`,
            color: theme.paper,
            cursor: 'pointer',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" style={{ marginTop: 2 }}>
            <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              The world
            </div>
            <PreviewBadge theme={theme} status="real" note="today's news, matched to your network" />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            Opportunities <span style={{ fontStyle: 'italic', color: theme.goldLight }}>for you</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 20px 12px' }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.5,
            color: theme.muted,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Region
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {REGION_OPTIONS.map((r) => {
            const active = region === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRegion(r.id)}
                disabled={refreshing}
                style={{
                  flex: '0 0 auto',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: active ? theme.gold : 'rgba(245,239,230,0.04)',
                  color: active ? theme.bg : theme.paper,
                  border: `0.5px solid ${active ? theme.gold : theme.lineDark}`,
                  fontFamily: theme.sans,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  fontWeight: active ? 600 : 400,
                  cursor: refreshing ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '11px 16px',
            borderRadius: 999,
            background: refreshing ? 'rgba(184,150,107,0.25)' : theme.gold,
            color: refreshing ? theme.muted : theme.bg,
            border: 'none',
            fontFamily: theme.sans,
            fontSize: 11,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: refreshing ? 'wait' : 'pointer',
          }}
        >
          {refreshing ? 'Scouting the web…' : 'Refresh signals'}
        </button>
        {refreshNote && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: theme.muted,
              fontStyle: 'italic',
              textAlign: 'center',
              fontFamily: theme.serif,
            }}
          >
            {refreshNote}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '8px 20px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {rows.map((o) => (
          <OpportunityCard
            key={o.id}
            theme={theme}
            o={o}
            candidates={candidates}
            onOpenCandidate={onOpenCandidate}
          />
        ))}
      </div>
    </div>
  );
}
