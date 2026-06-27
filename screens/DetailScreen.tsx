'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme, VoiceLevel } from '@/lib/theme';
import { type Candidate, type CandidateChange, RESOURCES } from '@/lib/data';
import { Divider, SerifStat, TierMark } from '@/components/Shared';
import { FollowUpDialog } from '@/components/FollowUpDialog';
import { OUTLOOK_ENABLED } from '@/lib/flags';
import {
  deleteCandidate,
  setCandidateWatched,
  setChangeAcknowledged,
} from '@/lib/api';

const SIGNALS: Array<{ k: keyof Candidate['signals']; label: string }> = [
  { k: 'wordOnStreet', label: 'Word on the street' },
  { k: 'chemistry', label: 'Chemistry read' },
  { k: 'trajectory', label: "Where she's headed" },
  { k: 'gutNote', label: "Belinda's gut" },
];

const READINESS_LABEL: Record<'ready' | 'passive' | 'settled', string> = {
  ready: 'Ready to move',
  passive: 'Open to right brief',
  settled: 'Settled',
};

function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const days = Math.floor(ms / 86400000);
  if (days < 0) return new Date(iso).toLocaleDateString();
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = (days / 365).toFixed(1).replace(/\.0$/, '');
  return `${years} yr ago`;
}

function MobilityBlock({ theme, c }: { theme: Theme; c: Candidate }) {
  type Row = { label: string; value: string };
  const rows: Row[] = [];
  if (c.moveReadiness) rows.push({ label: 'Readiness', value: READINESS_LABEL[c.moveReadiness] });
  if (c.currentLocation || c.location) rows.push({ label: 'Based in', value: c.currentLocation || c.location });
  if (c.openToLocations && c.openToLocations.length > 0)
    rows.push({ label: 'Open to', value: c.openToLocations.join(', ') });
  if (c.lastContactAt) rows.push({ label: 'Last spoke', value: relativeDate(c.lastContactAt) });
  if (c.lastJobChangeDate) rows.push({ label: 'In role since', value: relativeDate(c.lastJobChangeDate) });
  if (c.familyTravels === true) rows.push({ label: 'Family', value: 'Travels with' });
  if (c.childEducationRequired === true) rows.push({ label: 'Schools', value: 'Required for kids' });

  // The LinkedIn link is rendered as its own row so the URL stays clickable
  // (an italic-serif value column would mangle URL underlining + tap area).
  const hasLinkedIn = Boolean(c.linkedinUrl);

  if (rows.length === 0 && !hasLinkedIn) return null;

  return (
    <div>
      <Divider theme={theme} label="Mobility & contact" />
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              fontSize: 13,
              color: theme.paper,
            }}
          >
            <div
              style={{
                width: 92,
                flexShrink: 0,
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: theme.muted,
                fontWeight: 500,
              }}
            >
              {r.label}
            </div>
            <div style={{ flex: 1, color: theme.goldLight, fontFamily: theme.serif, fontStyle: 'italic' }}>
              {r.value}
            </div>
          </div>
        ))}
        {hasLinkedIn && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 13,
              color: theme.paper,
              marginTop: 2,
            }}
          >
            <div
              style={{
                width: 92,
                flexShrink: 0,
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: theme.muted,
                fontWeight: 500,
              }}
            >
              LinkedIn
            </div>
            <a
              href={c.linkedinUrl!}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: theme.goldLight,
                fontFamily: theme.sans,
                fontSize: 12,
                textDecoration: 'none',
                padding: '6px 12px',
                background: 'rgba(184,150,107,0.08)',
                border: `0.5px solid ${theme.line}`,
                borderRadius: 8,
                width: 'fit-content',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.43v6.31zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.22 0z"/>
              </svg>
              Open profile
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailScreen({
  theme,
  voice,
  candidate,
  changes = [],
  onClose,
  onShortlist,
  onAsk,
}: {
  theme: Theme;
  voice: VoiceLevel;
  candidate: Candidate;
  /** Unacknowledged LinkedIn changes for THIS candidate. */
  changes?: CandidateChange[];
  onClose: () => void;
  onShortlist: () => void;
  onAsk: () => void;
}) {
  const c = candidate;
  const router = useRouter();
  const signals = SIGNALS.slice(0, voice.signalCount);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  // Optimistic Watch toggle: flip the local star immediately, then PATCH
  // the server in the background. If the server rejects, revert.
  const [watched, setWatched] = useState(Boolean(c.isWatched));
  const [watchPending, setWatchPending] = useState(false);
  const toggleWatch = async () => {
    if (!c.dbId || watchPending) return;
    const next = !watched;
    setWatched(next);
    setWatchPending(true);
    try {
      await setCandidateWatched(c.dbId, next);
      // Refresh server data so the Watchlist screen reflects the change
      // on next navigation without a hard reload.
      router.refresh();
    } catch (e) {
      console.error('[BD] watch toggle failed:', e);
      setWatched(!next);
    } finally {
      setWatchPending(false);
    }
  };

  // Local state for the change-banner — IDs we've optimistically acked,
  // so the row vanishes on tap without waiting for the server.
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Hard-delete this candidate. Confirms with the user, then leans on the
  // schema's cascading FKs to clean up signals/tags/etc. Closes the
  // screen and refreshes server data so the row vanishes from any list
  // the user navigates back to.
  const onDeleteCandidate = async () => {
    if (!c.dbId || deleting) return;
    const ok = window.confirm(
      `Delete ${c.name} from your network?\n\nThis removes their signals, tags, career history, and any shortlist references. It cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteCandidate(c.dbId);
      router.refresh();
      onClose();
    } catch (e) {
      console.error('[BD] delete-candidate failed:', e);
      window.alert('Delete failed. Try again.');
      setDeleting(false);
    }
  };
  const visibleChanges = changes.filter((ch) => !ackedIds.has(ch.id));
  const acknowledge = async (changeId: string) => {
    setAckedIds((prev) => {
      const next = new Set(prev);
      next.add(changeId);
      return next;
    });
    try {
      await setChangeAcknowledged(changeId, true);
      router.refresh();
    } catch (e) {
      console.error('[BD] acknowledge failed:', e);
      setAckedIds((prev) => {
        const next = new Set(prev);
        next.delete(changeId);
        return next;
      });
    }
  };
  const CHANGE_TYPE_LABEL: Record<CandidateChange['type'], string> = {
    role_change: 'Role changed',
    company_change: 'Company changed',
  };
  const relativeChangeAge = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    const d = Math.floor(ms / 86400000);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return `${d} days ago`;
    const mo = Math.round(d / 30);
    return mo === 1 ? '1 month ago' : `${mo} months ago`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: theme.bg,
        overflow: 'auto',
        fontFamily: theme.sans,
        color: theme.paper,
      }}
    >
      <div
        style={{
          height: 420,
          position: 'relative',
          background: `url(${c.photo}) center/cover`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, rgba(14,12,10,0.3) 0%, rgba(14,12,10,0) 30%, rgba(14,12,10,0) 55%, ${theme.bg} 100%)`,
          }}
        />
        <div style={{ position: 'absolute', top: 58, left: 16 }}>
          <button
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: 'rgba(14,12,10,0.5)',
              backdropFilter: 'blur(10px)',
              border: `0.5px solid ${theme.line}`,
              color: theme.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path
                d="M10 2L2 10l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 58,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <TierMark theme={theme} tier={c.belindaTier} />
          {c.dbId && (
            <button
              onClick={toggleWatch}
              disabled={watchPending}
              aria-label={watched ? 'Stop watching this candidate' : 'Watch this candidate'}
              title={
                watched
                  ? 'Watching — tap to unwatch'
                  : 'Add to your golden list — get changes surfaced'
              }
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                background: watched ? theme.gold : 'rgba(14,12,10,0.55)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `0.5px solid ${watched ? theme.gold : theme.line}`,
                color: watched ? theme.bg : theme.paper,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: watchPending ? 'wait' : 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {/* Star, filled when watched */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2.5l2.95 6.6 7.05.8-5.3 4.85 1.5 7.25L12 18.4l-6.2 3.6 1.5-7.25L2 9.9l7.05-.8L12 2.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2.5,
              color: theme.gold,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {c.tags[0]}
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 40,
              lineHeight: 0.98,
              color: theme.paper,
              fontWeight: 400,
              letterSpacing: 0.3,
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: theme.goldLight,
              letterSpacing: 0.3,
            }}
          >
            {c.current} · {c.tenure}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '10px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {visibleChanges.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {visibleChanges.map((ch) => (
              <div
                key={ch.id}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(226,91,91,0.10)',
                  border: '0.5px solid rgba(226,91,91,0.5)',
                  borderRadius: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.8,
                        textTransform: 'uppercase',
                        color: '#f0a3a3',
                        fontWeight: 700,
                      }}
                    >
                      ● Moved · {CHANGE_TYPE_LABEL[ch.type]}
                    </div>
                    <div style={{ fontSize: 10, color: theme.muted }}>
                      detected {relativeChangeAge(ch.detectedAt)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: theme.serif,
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: theme.paper,
                      lineHeight: 1.4,
                    }}
                  >
                    {ch.fromValue ? (
                      <>
                        <span style={{ opacity: 0.65 }}>{ch.fromValue}</span>
                        <span style={{ margin: '0 8px', color: theme.gold, opacity: 0.7 }}>→</span>
                        <span style={{ color: theme.goldLight }}>
                          {ch.toValue ?? '—'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: theme.goldLight }}>
                        {ch.toValue ?? '—'}{' '}
                        <span style={{ color: theme.muted, fontStyle: 'normal', fontSize: 11 }}>
                          (new)
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => acknowledge(ch.id)}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    color: theme.muted,
                    border: `0.5px solid ${theme.line}`,
                    borderRadius: 999,
                    fontSize: 9.5,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontFamily: theme.sans,
                  }}
                >
                  Seen
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 20,
            lineHeight: 1.35,
            color: theme.paper,
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '0 10px',
          }}
        >
          <span
            style={{
              color: theme.gold,
              fontSize: 32,
              verticalAlign: '-8px',
              marginRight: 4,
            }}
          >
            “
          </span>
          {c.quote.replace(/"/g, '')}
          <span
            style={{
              color: theme.gold,
              fontSize: 32,
              verticalAlign: '-8px',
              marginLeft: 2,
            }}
          >
            ”
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '20px 0',
            borderTop: `0.5px solid ${theme.line}`,
            borderBottom: `0.5px solid ${theme.line}`,
          }}
        >
          <SerifStat theme={theme} value={c.belindaRating} label="BD Score" />
          <SerifStat theme={theme} value={c.pnl} label="P&L run" />
          <SerifStat theme={theme} value={c.keys} label="Keys" />
          <SerifStat theme={theme} value={c.age} label="Age" />
        </div>

        <MobilityBlock theme={theme} c={c} />

        <div>
          <Divider theme={theme} label="Belinda's Read" />
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {signals.map((s, idx) => (
              <div key={s.k} style={{ display: 'flex', gap: 14 }}>
                <div
                  style={{
                    width: 28,
                    flexShrink: 0,
                    paddingTop: 3,
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: theme.gold,
                    fontWeight: 500,
                  }}
                >
                  0{idx + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: theme.display,
                      fontSize: 15,
                      color: theme.goldLight,
                      fontWeight: 400,
                      fontStyle: 'italic',
                      marginBottom: 4,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: theme.paper,
                      opacity: 0.88,
                    }}
                  >
                    {c.signals[s.k]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Divider theme={theme} label="Career" />
          <div style={{ marginTop: 16 }}>
            {c.experience.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : `0.5px solid ${theme.lineDark}`,
                }}
              >
                <div
                  style={{
                    width: 80,
                    fontSize: 10,
                    color: theme.muted,
                    letterSpacing: 1,
                    paddingTop: 2,
                  }}
                >
                  {e.years}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: theme.display,
                      fontSize: 17,
                      color: theme.paper,
                      fontWeight: 400,
                      letterSpacing: 0.2,
                    }}
                  >
                    {e.brand}
                  </div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{e.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {voice.chatTease && (
          <button
            onClick={onAsk}
            style={{
              background: 'rgba(184,150,107,0.08)',
              border: `0.5px solid ${theme.gold}`,
              borderRadius: 14,
              padding: '16px 18px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              color: theme.paper,
              width: '100%',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: `url(${RESOURCES.belinda}) center 20%/cover`,
                border: `0.5px solid ${theme.gold}`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: theme.gold,
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                Ask Belinda
              </div>
              <div
                style={{
                  fontFamily: theme.serif,
                  fontSize: 14,
                  fontStyle: 'italic',
                  lineHeight: 1.3,
                }}
              >
                &ldquo;Is {c.name.split(' ')[0]} right for the Carlyle brief?&rdquo;
              </div>
            </div>
            <svg width="10" height="14" viewBox="0 0 10 14" style={{ flexShrink: 0 }}>
              <path d="M2 2l6 5-6 5" stroke={theme.gold} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {OUTLOOK_ENABLED && c.dbId && (
          <button
            onClick={() => setFollowUpOpen(true)}
            style={{
              background: 'transparent',
              color: theme.goldLight,
              border: `0.5px solid ${theme.gold}`,
              borderRadius: 999,
              padding: '12px 18px',
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
              width: '100%',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M4 1.5v2.5M10 1.5v2.5M1.5 6h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {c.followUpAt ? 'Reschedule follow-up' : 'Schedule follow-up'}
          </button>
        )}

        <button
          onClick={onShortlist}
          style={{
            marginTop: 4,
            background: theme.gold,
            color: theme.bg,
            border: 'none',
            borderRadius: 999,
            padding: '16px 24px',
            fontFamily: theme.sans,
            fontSize: 12,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 10px 30px ${theme.gold}44`,
          }}
        >
          Shortlist for the Carlyle
        </button>

        {/* Destructive action — muted-red text button, not a big block,
            so it doesn't compete with the primary CTAs. Only rendered
            when we have a real DB row to delete. */}
        {c.dbId && (
          <button
            onClick={onDeleteCandidate}
            disabled={deleting}
            style={{
              marginTop: 4,
              background: 'transparent',
              color: deleting ? theme.muted : '#e25b5b',
              border: 'none',
              padding: '10px 16px',
              fontFamily: theme.sans,
              fontSize: 11,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: deleting ? 'wait' : 'pointer',
              opacity: deleting ? 0.6 : 0.85,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete this candidate'}
          </button>
        )}
      </div>
      <FollowUpDialog
        theme={theme}
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        subject={`Follow-up — ${c.name}`}
        candidateId={c.dbId}
      />
    </div>
  );
}
