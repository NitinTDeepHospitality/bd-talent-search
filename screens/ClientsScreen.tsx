'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/theme';
import type { Candidate, Client } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';

const TYPE_LABELS: Record<Client['type'], string> = {
  third_party_operator: 'Operator',
  luxury_collection: 'Luxury collection',
  family_office: 'Family office',
  developer: 'Developer',
  big_chain: 'Big chain',
};

function relativeDate(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const days = Math.floor(ms / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return new Date(iso).toLocaleDateString();
}

export function ClientsScreen({
  theme,
  clients,
  candidates,
  onClose,
  onOpenClient,
  onAddClient,
}: {
  theme: Theme;
  clients: Client[];
  candidates: Candidate[];
  onClose: () => void;
  onOpenClient: (c: Client) => void;
  onAddClient: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'dormant'>('all');

  const rows = clients.filter((c) =>
    filter === 'all' ? true : c.status === filter,
  );

  const activeCount = clients.filter((c) => c.status === 'active').length;
  const dormantCount = clients.filter((c) => c.status === 'dormant').length;

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              Clients
            </div>
            <PreviewBadge
              theme={theme}
              status={clients.length > 5 ? 'real' : 'sample'}
              note={`${clients.length} in book`}
            />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            Your book of business
          </div>
        </div>
      </div>

      <button
        onClick={onAddClient}
        style={{
          margin: '0 22px 14px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: 'calc(100% - 44px)',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        Add a client
      </button>

      <div style={{ padding: '6px 20px 12px' }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(
            [
              { id: 'all', label: `All · ${clients.length}` },
              { id: 'active', label: `Active · ${activeCount}` },
              { id: 'dormant', label: `Dormant · ${dormantCount}` },
            ] as const
          ).map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
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
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: '4px 20px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              fontFamily: theme.serif,
              fontStyle: 'italic',
              color: theme.muted,
            }}
          >
            No clients in this view.
          </div>
        ) : (
          rows.map((c) => {
            const matched = c.openBriefs.flatMap((b) =>
              b.shortlistedCandidateIds
                .map((id) => candidates.find((cd) => cd.dbId === id))
                .filter((x): x is Candidate => Boolean(x)),
            );
            const isDormant = c.status === 'dormant';
            return (
              <button
                key={c.id}
                onClick={() => onOpenClient(c)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 14,
                  background: 'rgba(245,239,230,0.03)',
                  border: `0.5px solid ${theme.line}`,
                  borderRadius: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  color: theme.paper,
                  fontFamily: theme.sans,
                  opacity: isDormant ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontSize: 17,
                        color: theme.paper,
                        fontWeight: 400,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 1.2,
                        color: theme.muted,
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}
                    >
                      {TYPE_LABELS[c.type]}
                      {c.hqCity ? ` · ${c.hqCity}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: 9,
                      letterSpacing: 1.2,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: isDormant
                        ? 'rgba(245,239,230,0.05)'
                        : 'rgba(143,207,130,0.10)',
                      color: isDormant ? theme.muted : '#bfe5b6',
                      border: `0.5px solid ${isDormant ? theme.lineDark : 'rgba(143,207,130,0.3)'}`,
                    }}
                  >
                    {c.status}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    marginTop: 6,
                    fontSize: 11,
                    color: theme.goldLight,
                    fontFamily: theme.serif,
                    fontStyle: 'italic',
                  }}
                >
                  <span>
                    {c.openBriefs.length} open {c.openBriefs.length === 1 ? 'brief' : 'briefs'}
                  </span>
                  {matched.length > 0 && (
                    <span>· {matched.length} candidate{matched.length === 1 ? '' : 's'} attached</span>
                  )}
                  <span style={{ marginLeft: 'auto', color: theme.muted, fontStyle: 'normal' }}>
                    last spoke {relativeDate(c.lastContactAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
