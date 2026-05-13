'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { Theme } from '@/lib/theme';
import { BelindaAvatar } from '@/components/Shared';
import { startRecording, type RecorderController } from '@/lib/recorder';

export type VoiceQuery = { audio: Blob } | { text: string };

function Stat({ theme, v, l }: { theme: Theme; v: string; l: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: theme.display, fontSize: 24, color: theme.paper, lineHeight: 1 }}>
        {v}
      </div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.3,
          color: theme.muted,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {l}
      </div>
    </div>
  );
}

function DockBtn({
  theme,
  label,
  icon,
  onClick,
  badge,
}: {
  theme: Theme;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px',
        borderRadius: 12,
        background: 'transparent',
        border: `0.5px solid ${theme.line}`,
        color: theme.paper,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
      }}
    >
      <div style={{ color: theme.gold }}>{icon}</div>
      {label}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 14,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: theme.gold,
            color: theme.bg,
            fontSize: 9,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge}
        </div>
      )}
    </button>
  );
}

export function HomeScreen({
  theme,
  onVoice,
  onCapture,
  onOpps,
  onSwipe,
}: {
  theme: Theme;
  onVoice?: (q: VoiceQuery) => void;
  onCapture?: () => void;
  onOpps?: () => void;
  onSwipe?: () => void;
}) {
  const [pulse, setPulse] = useState(false);
  const recorderRef = useRef<RecorderController | null>(null);
  const holdingRef = useRef(false);

  const beginRecord = async () => {
    setPulse(true);
    holdingRef.current = true;
    try {
      const ctrl = await startRecording();
      if (!holdingRef.current) {
        // Released before getUserMedia returned — discard.
        ctrl.cancel();
        return;
      }
      recorderRef.current = ctrl;
    } catch {
      holdingRef.current = false;
      setPulse(false);
    }
  };

  const endRecord = async () => {
    setPulse(false);
    holdingRef.current = false;
    const ctrl = recorderRef.current;
    if (!ctrl) return;
    recorderRef.current = null;
    const blob = await ctrl.stop();
    if (blob.size > 0) onVoice?.({ audio: blob });
  };

  const cancelRecord = () => {
    holdingRef.current = false;
    setPulse(false);
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
  };
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, #1a1410 0%, ${theme.bg} 60%, #050403 100%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.sans,
        color: theme.paper,
      }}
    >
      <div
        style={{
          padding: '60px 22px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2.5,
              color: theme.gold,
              textTransform: 'uppercase',
            }}
          >
            Tuesday, 7:42
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 26,
              marginTop: 4,
              fontWeight: 400,
            }}
          >
            Good morning,{' '}
            <span style={{ fontStyle: 'italic', color: theme.goldLight }}>Belinda</span>
          </div>
        </div>
        <div style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.5)', borderRadius: 21 }}>
          <BelindaAvatar size={42} theme={theme} />
        </div>
      </div>

      <div
        style={{
          margin: '20px 22px 0',
          padding: '16px',
          background: 'rgba(184,150,107,0.06)',
          border: `0.5px solid ${theme.line}`,
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: theme.gold,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Today
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Stat theme={theme} v="3" l="active briefs" />
          <Stat theme={theme} v="2" l="new openings" />
          <Stat theme={theme} v="7" l="follow-ups" />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: theme.display,
            fontSize: 24,
            fontStyle: 'italic',
            color: theme.goldLight,
            textAlign: 'center',
            lineHeight: 1.25,
            maxWidth: 280,
            marginBottom: 36,
          }}
        >
          What can I help you find today?
        </div>

        <button
          onPointerDown={beginRecord}
          onPointerUp={endRecord}
          onPointerLeave={cancelRecord}
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            background: `radial-gradient(circle at 35% 30%, ${theme.goldLight}, ${theme.gold} 60%, ${theme.accent})`,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 20px 60px ${theme.gold}66, 0 0 0 ${pulse ? 12 : 0}px ${theme.gold}22`,
            transition: 'box-shadow 0.3s, transform 0.15s',
            transform: pulse ? 'scale(0.96)' : 'scale(1)',
          }}
        >
          <svg width="36" height="48" viewBox="0 0 36 48">
            <rect x="11" y="4" width="14" height="26" rx="7" fill={theme.bg} />
            <path
              d="M5 22 Q5 36 18 36 Q31 36 31 22 M18 36 V44 M11 44 H25"
              stroke={theme.bg}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            letterSpacing: 1.2,
            color: theme.muted,
            textTransform: 'uppercase',
          }}
        >
          Hold to speak
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: theme.muted,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Recent
          </div>
          {[
            'Five GMs for Faena Mediterranean',
            'Who fits the Lisbon brief?',
            'Anyone moved at Maybourne lately?',
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => onVoice?.({ text: q })}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(245,239,230,0.04)',
                border: `0.5px solid ${theme.lineDark}`,
                color: theme.paper,
                textAlign: 'left',
                fontFamily: theme.serif,
                fontSize: 13,
                fontStyle: 'italic',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ color: theme.gold, fontSize: 11 }}>›</span>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '14px 22px 30px',
          display: 'flex',
          gap: 8,
          borderTop: `0.5px solid ${theme.lineDark}`,
        }}
      >
        <DockBtn
          theme={theme}
          label="Capture"
          onClick={onCapture}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <DockBtn
          theme={theme}
          label="Opportunities"
          onClick={onOpps}
          badge="3"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M8 1l1.8 4.5L14 6.2l-3.3 3 .9 4.6L8 11.8 4.4 13.8l.9-4.6L2 6.2l4.2-.7L8 1z"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <DockBtn
          theme={theme}
          label="Shortlist"
          onClick={onSwipe}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
