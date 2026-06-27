'use client';

import { useMemo, useState } from 'react';
import type { Theme } from '@/lib/theme';
import type { Candidate, CandidateChange } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';
import { TierMark } from '@/components/Shared';

function relativeContact(iso: string | null | undefined): {
  label: string;
  color: string;
} {
  if (!iso) return { label: 'never spoken', color: '#f0a3a3' };
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return { label: 'never spoken', color: '#f0a3a3' };
  const days = Math.floor(ms / 86400000);
  if (days < 1) return { label: 'today', color: '#bfe5b6' };
  if (days === 1) return { label: 'yesterday', color: '#bfe5b6' };
  if (days <= 14) return { label: `${days}d ago`, color: '#bfe5b6' };
  if (days <= 60) return { label: `${days}d ago`, color: '#e8d18a' };
  if (days < 365) return { label: `${Math.round(days / 30)}mo ago`, color: '#f0a3a3' };
  return {
    label: `${(days / 365).toFixed(1).replace(/\.0$/, '')}yr ago`,
    color: '#f0a3a3',
  };
}

const TIER_RANK: Record<Candidate['belindaTier'], number> = {
  'Black Book': 0,
  'Inner circle': 1,
  Watching: 2,
};

type SortKey = 'recent' | 'tier' | 'name';

export function CandidatesScreen({
  theme,
  candidates,
  changes = [],
  onClose,
  onOpenCandidate,
  onAddCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  /** Unacknowledged changes — drives the MOVED pill. */
  changes?: CandidateChange[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
  onAddCandidate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  // Map dbId → unacked change count so each row can render a MOVED pill
  // without re-filtering changes per render.
  const movedByDbId = useMemo(() => {
    const m = new Map<string, number>();
    for (const ch of changes) {
      m.set(ch.candidateId, (m.get(ch.candidateId) ?? 0) + 1);
    }
    return m;
  }, [changes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = candidates.filter((c) => {
      if (!q) return true;
      const hay = [
        c.name,
        c.current,
        c.location,
        c.currentLocation ?? '',
        c.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...matches].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'tier') {
        const ta = TIER_RANK[a.belindaTier] ?? 9;
        const tb = TIER_RANK[b.belindaTier] ?? 9;
        if (ta !== tb) return ta - tb;
        return (b.belindaRating ?? 0) - (a.belindaRating ?? 0);
      }
      // recent (default): unacked changes float to the top, then most
      // recent contact, then highest rating.
      const ma = a.dbId ? movedByDbId.get(a.dbId) ?? 0 : 0;
      const mb = b.dbId ? movedByDbId.get(b.dbId) ?? 0 : 0;
      if (ma !== mb) return mb - ma;
      const ad = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
      const bd = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (b.belindaRating ?? 0) - (a.belindaRating ?? 0);
    });
    return sorted;
  }, [candidates, query, sort, movedByDbId]);

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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              Candidates
            </div>
            <PreviewBadge
              theme={theme}
              status="real"
              note={`${candidates.length} in your network`}
            />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            Your <span style={{ fontStyle: 'italic', color: theme.goldLight }}>network</span>
          </div>
        </div>
      </div>

      {/* Add + search */}
      <div style={{ padding: '0 20px 12px' }}>
        <button
          onClick={onAddCandidate}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 16px',
            background: theme.gold,
            color: theme.bg,
            border: 'none',
            borderRadius: 12,
            fontFamily: theme.sans,
            fontSize: 12,
            letterSpacing: 1.5,
            fontWeight: 600,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Add a candidate
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, hotel, tag…"
          style={{
            width: '100%',
            marginTop: 10,
            background: 'rgba(245,239,230,0.04)',
            border: `0.5px solid ${theme.lineDark}`,
            borderRadius: 10,
            padding: '10px 14px',
            color: theme.paper,
            fontFamily: theme.sans,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Sort pills */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '0 20px 12px',
          fontFamily: theme.sans,
        }}
      >
        {(
          [
            { id: 'recent', label: 'Recent' },
            { id: 'tier', label: 'Tier' },
            { id: 'name', label: 'A–Z' },
          ] as Array<{ id: SortKey; label: string }>
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSort(opt.id)}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              background: sort === opt.id ? theme.gold : 'transparent',
              color: sort === opt.id ? theme.bg : theme.paper,
              border: `0.5px solid ${sort === opt.id ? theme.gold : theme.line}`,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: sort === opt.id ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {query && (
          <div style={{ fontSize: 10, color: theme.muted, alignSelf: 'center' }}>
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            margin: '20px',
            padding: 28,
            border: `0.5px dashed ${theme.line}`,
            borderRadius: 14,
            textAlign: 'center',
            color: theme.muted,
            fontFamily: theme.serif,
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {query
            ? `No candidates match "${query}".`
            : 'No candidates yet. Tap "Add a candidate" to dictate or upload a CV.'}
        </div>
      ) : (
        <div
          style={{
            padding: '0 20px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filtered.map((c) => {
            const contact = relativeContact(c.lastContactAt);
            const moved = c.dbId ? (movedByDbId.get(c.dbId) ?? 0) > 0 : false;
            return (
              <button
                key={c.id}
                onClick={() => onOpenCandidate(c)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: moved
                    ? 'rgba(226,91,91,0.10)'
                    : 'rgba(245,239,230,0.04)',
                  border: moved
                    ? '0.5px solid rgba(226,91,91,0.45)'
                    : `0.5px solid ${theme.lineDark}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: c.photo
                      ? `url(${c.photo}) center/cover`
                      : 'rgba(184,150,107,0.18)',
                    border: `0.5px solid ${theme.gold}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontSize: 16,
                        color: theme.paper,
                        fontWeight: 400,
                      }}
                    >
                      {c.name}
                    </div>
                    {c.isWatched && (
                      <span style={{ color: theme.gold, fontSize: 12 }} title="On watchlist">
                        ★
                      </span>
                    )}
                    {moved && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'rgba(226,91,91,0.20)',
                          border: '0.5px solid rgba(226,91,91,0.6)',
                          fontSize: 8.5,
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                          color: '#f0a3a3',
                          fontWeight: 700,
                        }}
                      >
                        ● Moved
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.muted,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.current || '—'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <TierMark theme={theme} tier={c.belindaTier} />
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: 0.8,
                        color: contact.color,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {contact.label}
                    </span>
                  </div>
                </div>
                <svg
                  width="10"
                  height="14"
                  viewBox="0 0 10 14"
                  style={{ flexShrink: 0 }}
                  aria-hidden
                >
                  <path
                    d="M2 2l6 5-6 5"
                    stroke={theme.gold}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
