'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/theme';
import { QUICK_CAPTURE_SAMPLE } from '@/lib/data';
import { Divider, ListeningDots } from '@/components/Shared';

type Phase = 'idle' | 'recording' | 'transcribing' | 'structured';

export function CaptureScreen({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const sample = QUICK_CAPTURE_SAMPLE;

  const start = () => {
    setPhase('recording');
    let i = 0;
    const tick = () => {
      i += 8;
      setTranscript(sample.raw.slice(0, i));
      if (i < sample.raw.length) setTimeout(tick, 60);
      else {
        setTimeout(() => setPhase('transcribing'), 500);
        setTimeout(() => setPhase('structured'), 1700);
      }
    };
    tick();
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
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: theme.gold,
              textTransform: 'uppercase',
            }}
          >
            Quick capture
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 18,
              marginTop: 2,
              fontStyle: 'italic',
            }}
          >
            After the meeting
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px 30px' }}>
        {phase === 'idle' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                fontFamily: theme.serif,
                fontSize: 16,
                color: theme.goldLight,
                fontStyle: 'italic',
                marginBottom: 32,
                lineHeight: 1.4,
              }}
            >
              Just walked out of a meeting?
              <br />
              Tell me what you heard.
            </div>
            <button
              onClick={start}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                background: `radial-gradient(circle at 35% 30%, ${theme.goldLight}, ${theme.gold})`,
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 12px 40px ${theme.gold}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 4, background: '#c33' }} />
            </button>
            <div
              style={{
                marginTop: 18,
                fontSize: 11,
                color: theme.muted,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Tap to record
            </div>
          </div>
        )}

        {(phase === 'recording' || phase === 'transcribing') && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 4,
                marginBottom: 24,
                height: 40,
                alignItems: 'flex-end',
              }}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    background: theme.gold,
                    borderRadius: 2,
                    height: 8 + Math.sin(Date.now() / 200 + i) * 14 + (i % 4) * 4,
                    animation: `bdpulse 0.8s ${i * 0.06}s infinite ease-in-out`,
                    opacity: 0.4 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                padding: '18px 18px',
                borderRadius: 14,
                background: 'rgba(245,239,230,0.04)',
                border: `0.5px solid ${theme.lineDark}`,
                fontFamily: theme.serif,
                fontSize: 15,
                lineHeight: 1.45,
                color: theme.paper,
                fontStyle: 'italic',
                minHeight: 120,
              }}
            >
              &ldquo;{transcript}
              <span style={{ color: theme.gold }}>|</span>&rdquo;
            </div>
            {phase === 'transcribing' && (
              <div style={{ marginTop: 16 }}>
                <ListeningDots theme={theme} label="Extracting briefs, contacts, tags" />
              </div>
            )}
          </div>
        )}

        {phase === 'structured' && (
          <div>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(245,239,230,0.04)',
                border: `0.5px solid ${theme.lineDark}`,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: theme.muted,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Transcript
              </div>
              <div
                style={{
                  fontFamily: theme.serif,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: theme.paper,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{sample.raw}&rdquo;
              </div>
            </div>

            <Divider theme={theme} label="Structured" />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sample.extracted.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'rgba(184,150,107,0.06)',
                    border: `0.5px solid ${theme.line}`,
                    borderRadius: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      letterSpacing: 1.5,
                      color: theme.gold,
                      textTransform: 'uppercase',
                      width: 64,
                      flexShrink: 0,
                      paddingTop: 3,
                      fontWeight: 500,
                    }}
                  >
                    {e.type}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: theme.paper,
                      lineHeight: 1.4,
                    }}
                  >
                    {e.label}
                  </div>
                  <div style={{ color: theme.gold, fontSize: 14 }}>+</div>
                </div>
              ))}
            </div>

            <button
              style={{
                marginTop: 24,
                width: '100%',
                padding: '14px',
                background: theme.gold,
                color: theme.bg,
                border: 'none',
                borderRadius: 999,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save to BD brain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
