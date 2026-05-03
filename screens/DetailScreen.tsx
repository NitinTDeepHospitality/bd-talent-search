'use client';

import type { Theme, VoiceLevel } from '@/lib/theme';
import { type Candidate, RESOURCES } from '@/lib/data';
import { Divider, SerifStat, TierMark } from '@/components/Shared';

const SIGNALS: Array<{ k: keyof Candidate['signals']; label: string }> = [
  { k: 'wordOnStreet', label: 'Word on the street' },
  { k: 'chemistry', label: 'Chemistry read' },
  { k: 'trajectory', label: "Where she's headed" },
  { k: 'gutNote', label: "Belinda's gut" },
];

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
    </div>
  );
}
