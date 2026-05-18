'use client';

import { useState } from 'react';
import type { Theme, VoiceLevel } from '@/lib/theme';
import { type Candidate, RESOURCES } from '@/lib/data';
import { Divider, SerifStat, TierMark } from '@/components/Shared';
import { FollowUpDialog } from '@/components/FollowUpDialog';
import { OUTLOOK_ENABLED } from '@/lib/flags';

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

  if (rows.length === 0) return null;

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
      </div>
    </div>
  );
}

export function DetailScreen({
  theme,
  voice,
  candidate,
  onClose,
  onShortlist,
  onAsk,
}: {
  theme: Theme;
  voice: VoiceLevel;
  candidate: Candidate;
  onClose: () => void;
  onShortlist: () => void;
  onAsk: () => void;
}) {
  const c = candidate;
  const signals = SIGNALS.slice(0, voice.signalCount);
  const [followUpOpen, setFollowUpOpen] = useState(false);

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
        <div style={{ position: 'absolute', top: 66, right: 20 }}>
          <TierMark theme={theme} tier={c.belindaTier} />
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
