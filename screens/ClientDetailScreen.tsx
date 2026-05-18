'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/theme';
import type { Candidate, Client } from '@/lib/data';
import { Divider } from '@/components/Shared';
import { FollowUpDialog } from '@/components/FollowUpDialog';
import { OUTLOOK_ENABLED } from '@/lib/flags';

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
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} months ago`;
  return new Date(iso).toLocaleDateString();
}

export function ClientDetailScreen({
  theme,
  client,
  candidates,
  onClose,
  onOpenCandidate,
}: {
  theme: Theme;
  client: Client;
  candidates: Candidate[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
}) {
  const isDormant = client.status === 'dormant';
  const [followUpOpen, setFollowUpOpen] = useState(false);

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
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: theme.gold,
            textTransform: 'uppercase',
          }}
        >
          Client
        </div>
      </div>

      <div style={{ padding: '0 24px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: theme.display,
                fontSize: 28,
                color: theme.paper,
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              {client.name}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                letterSpacing: 1.5,
                color: theme.muted,
                textTransform: 'uppercase',
              }}
            >
              {TYPE_LABELS[client.type]}
              {client.hqCity ? ` · ${client.hqCity}` : ''}
            </div>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 10,
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
            {client.status}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontSize: 12,
            color: theme.goldLight,
            fontFamily: theme.serif,
            fontStyle: 'italic',
          }}
        >
          Last spoke {relativeDate(client.lastContactAt)}
          {client.followUpAt && (
            <span style={{ marginLeft: 'auto', color: theme.gold, fontStyle: 'normal', fontSize: 11 }}>
              · Next: {new Date(client.followUpAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {OUTLOOK_ENABLED && (
          <button
            onClick={() => setFollowUpOpen(true)}
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              color: theme.goldLight,
              border: `0.5px solid ${theme.gold}`,
              borderRadius: 999,
              padding: '11px 18px',
              fontFamily: theme.sans,
              fontSize: 11,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M4 1.5v2.5M10 1.5v2.5M1.5 6h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {client.followUpAt ? 'Reschedule follow-up' : 'Schedule follow-up'}
          </button>
        )}

        {client.notes && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(245,239,230,0.04)',
              border: `0.5px solid ${theme.lineDark}`,
              fontFamily: theme.serif,
              fontSize: 13,
              fontStyle: 'italic',
              color: theme.paper,
              lineHeight: 1.45,
            }}
          >
            {client.notes}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 24px 30px' }}>
        <Divider theme={theme} label={`${client.openBriefs.length} open brief${client.openBriefs.length === 1 ? '' : 's'}`} />

        {client.openBriefs.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              padding: 20,
              textAlign: 'center',
              color: theme.muted,
              fontFamily: theme.serif,
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            No open briefs.
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {client.openBriefs.map((b) => {
              const shortlisted = b.shortlistedCandidateIds
                .map((id) => candidates.find((c) => c.dbId === id))
                .filter((x): x is Candidate => Boolean(x));
              return (
                <div
                  key={b.id}
                  style={{
                    padding: 14,
                    background: 'rgba(184,150,107,0.06)',
                    border: `0.5px solid ${theme.line}`,
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: theme.display,
                      fontSize: 16,
                      color: theme.paper,
                      fontWeight: 400,
                      lineHeight: 1.2,
                    }}
                  >
                    {b.role}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      letterSpacing: 0.4,
                      color: theme.goldLight,
                      fontFamily: theme.serif,
                      fontStyle: 'italic',
                    }}
                  >
                    {[b.hotelName, b.city, b.openingDate].filter(Boolean).join(' · ')}
                  </div>

                  {shortlisted.length > 0 ? (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 1.5,
                          color: theme.muted,
                          textTransform: 'uppercase',
                        }}
                      >
                        Shortlisted
                      </div>
                      {shortlisted.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onOpenCandidate(c)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            background: 'rgba(245,239,230,0.04)',
                            border: `0.5px solid ${theme.lineDark}`,
                            borderRadius: 10,
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: theme.paper,
                            fontFamily: theme.sans,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              background: `url(${c.photo}) center/cover`,
                              border: `0.5px solid ${theme.gold}`,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, fontSize: 13 }}>
                            <div>{c.name}</div>
                            <div style={{ fontSize: 10, color: theme.muted }}>
                              {c.current}
                            </div>
                          </div>
                          <div style={{ color: theme.goldLight, fontSize: 16 }}>›</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: theme.muted,
                        fontStyle: 'italic',
                        fontFamily: theme.serif,
                      }}
                    >
                      No one shortlisted yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FollowUpDialog
        theme={theme}
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        subject={`Follow-up — ${client.name}`}
        companyId={client.id}
      />
    </div>
  );
}
