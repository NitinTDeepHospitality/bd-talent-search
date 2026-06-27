'use client';

import type { Theme } from '@/lib/theme';
import type { Candidate } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';
import { TierMark } from '@/components/Shared';

// Days since lastContactAt, formatted compactly. Returns null if no date.
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

function freshnessLabel(days: number | null): {
  label: string;
  color: string;
} {
  if (days == null) return { label: 'no contact logged', color: '#f0a3a3' };
  if (days <= 14) return { label: `Spoke ${days}d ago`, color: '#bfe5b6' };
  if (days <= 60) return { label: `Spoke ${days}d ago`, color: '#e8d18a' };
  if (days < 365)
    return { label: `Spoke ${Math.round(days / 30)} mo ago`, color: '#f0a3a3' };
  return {
    label: `Spoke ${(days / 365).toFixed(1).replace(/\.0$/, '')} yr ago`,
    color: '#f0a3a3',
  };
}

export function WatchlistScreen({
  theme,
  candidates,
  onClose,
  onOpenCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
}) {
  // Sort: most-recent contact first; nulls (no contact) last.
  const watched = candidates
    .filter((c) => c.isWatched)
    .slice()
    .sort((a, b) => {
      const ad = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
      const bd = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
      return bd - ad;
    });

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
            <path
              d="M8 2L2 8l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
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
              Watchlist
            </div>
            <PreviewBadge
              theme={theme}
              status="real"
              note={`${watched.length} watched`}
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
            Your golden{' '}
            <span style={{ fontStyle: 'italic', color: theme.goldLight }}>list</span>
          </div>
        </div>
      </div>

      {watched.length === 0 ? (
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
          No one on the watchlist yet.
          <br />
          Open any candidate&rsquo;s profile and tap the{' '}
          <span style={{ color: theme.gold }}>★</span> to start watching.
        </div>
      ) : (
        <div
          style={{
            padding: '8px 20px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {watched.map((c) => {
            const days = daysSince(c.lastContactAt);
            const fresh = freshnessLabel(days);
            return (
              <button
                key={c.id}
                onClick={() => onOpenCandidate(c)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: 'rgba(245,239,230,0.04)',
                  border: `0.5px solid ${theme.lineDark}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    background: `url(${c.photo}) center/cover`,
                    border: `0.5px solid ${theme.gold}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
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
                  <div
                    style={{
                      fontSize: 10,
                      color: theme.muted,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.current}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <TierMark theme={theme} tier={c.belindaTier} />
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: 0.8,
                        color: fresh.color,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {fresh.label}
                    </span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, color: theme.gold }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 2.5l2.95 6.6 7.05.8-5.3 4.85 1.5 7.25L12 18.4l-6.2 3.6 1.5-7.25L2 9.9l7.05-.8L12 2.5z"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          padding: '0 20px 30px',
          fontSize: 11,
          color: theme.muted,
          fontFamily: theme.serif,
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        These are the candidates you&rsquo;re watching. LinkedIn change detection
        will plug in here next — when one of them moves roles, this list will
        tell you first.
      </div>
    </div>
  );
}
