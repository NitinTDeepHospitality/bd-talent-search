'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Theme, VoiceLevel, Density } from '@/lib/theme';
import type { Candidate } from '@/lib/data';
import { BelindaNote, SignalPill, TierMark } from '@/components/Shared';

function CandidateCard({
  theme,
  voice,
  density,
  candidate,
  style,
  onTap,
  onDown,
  overlay,
  back,
}: {
  theme: Theme;
  voice: VoiceLevel;
  density: Density;
  candidate: Candidate;
  style?: CSSProperties;
  onTap?: () => void;
  onDown?: (e: React.PointerEvent) => void;
  overlay?: 'save' | 'pass' | null;
  back?: boolean;
}) {
  const c = candidate;
  const photoFlex = density?.photoFlex ?? 1.4;
  return (
    <div
      onPointerDown={onDown}
      onClick={onTap}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 18,
        overflow: 'hidden',
        background: theme.surface,
        border: `0.5px solid ${theme.line}`,
        boxShadow: back
          ? 'none'
          : '0 18px 40px rgba(0,0,0,0.55), 0 2px 0 rgba(184,150,107,0.1) inset',
        cursor: onTap ? 'pointer' : 'default',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div
        style={{
          flex: photoFlex,
          position: 'relative',
          background: `url(${c.photo}) center/cover`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(14,12,10,0.35) 0%, rgba(14,12,10,0) 35%, rgba(14,12,10,0) 55%, rgba(14,12,10,0.92) 100%)',
          }}
        />
        <div style={{ position: 'absolute', top: 14, left: 14 }}>
          <TierMark theme={theme} tier={c.belindaTier} />
        </div>
        <div style={{ position: 'absolute', top: 12, right: 14, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 8,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: theme.gold,
              marginBottom: 2,
            }}
          >
            Belinda
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 28,
              fontWeight: 400,
              color: theme.goldLight,
              lineHeight: 1,
            }}
          >
            {c.belindaRating}
          </div>
        </div>

        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 30,
              lineHeight: 1.05,
              color: theme.paper,
              fontWeight: 400,
              letterSpacing: 0.2,
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: theme.goldLight,
              marginTop: 4,
              letterSpacing: 0.3,
            }}
          >
            {c.current}
          </div>
        </div>

        {overlay === 'save' && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 24,
              border: `2px solid ${theme.gold}`,
              padding: '8px 16px',
              transform: 'rotate(14deg)',
              fontFamily: theme.display,
              fontSize: 22,
              color: theme.gold,
              letterSpacing: 4,
              background: 'rgba(14,12,10,0.5)',
            }}
          >
            SHORTLIST
          </div>
        )}
        {overlay === 'pass' && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 24,
              border: `2px solid ${theme.paper}`,
              padding: '8px 16px',
              transform: 'rotate(-14deg)',
              fontFamily: theme.display,
              fontSize: 22,
              color: theme.paper,
              letterSpacing: 4,
              opacity: 0.8,
              background: 'rgba(14,12,10,0.5)',
            }}
          >
            PASS
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: '16px 20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              fontFamily: theme.sans,
              fontSize: 11,
              color: theme.muted,
              flex: 1,
            }}
          >
            <span style={{ color: theme.paper }}>{c.location}</span>
            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            {c.nationalities.join(' / ')}
            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            {c.languages.join(' · ')}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {c.tags.slice(0, 3).map((t) => (
            <SignalPill key={t} theme={theme}>
              {t}
            </SignalPill>
          ))}
        </div>

        {voice.annotations && <BelindaNote theme={theme} text={c.signals.gutNote} />}

        {density.info === 'full' && !voice.annotations && (
          <div
            style={{
              fontFamily: theme.serif,
              fontSize: 14,
              fontStyle: 'italic',
              color: theme.paper,
              opacity: 0.85,
              lineHeight: 1.35,
              paddingTop: 4,
            }}
          >
            {c.quote}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: `0.5px solid ${theme.lineDark}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              color: theme.muted,
              textTransform: 'uppercase',
            }}
          >
            {c.availability}
          </div>
          <div
            style={{
              fontSize: 10,
              color: theme.gold,
              fontWeight: 500,
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Full profile
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 5h6M5 2l3 3-3 3"
                stroke={theme.gold}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  theme,
  kind,
  onClick,
}: {
  theme: Theme;
  kind: 'pass' | 'save' | 'ask';
  onClick?: () => void;
  small?: boolean;
}) {
  const conf: Record<string, { size: number; bg: string; border: string; color: string; icon: ReactNode }> = {
    pass: {
      size: 56,
      bg: 'transparent',
      border: theme.muted,
      color: theme.muted,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    save: {
      size: 64,
      bg: theme.gold,
      border: theme.gold,
      color: theme.bg,
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 17l-6.2-6.4a4 4 0 015.7-5.7L10 5.5l.5-.6a4 4 0 015.7 5.7L10 17z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    ask: {
      size: 42,
      bg: 'transparent',
      border: theme.gold,
      color: theme.goldLight,
      icon: (
        <span style={{ fontFamily: theme.display, fontSize: 18, fontStyle: 'italic' }}>B?</span>
      ),
    },
  };
  const c = conf[kind];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        width: c.size,
        height: c.size,
        borderRadius: c.size / 2,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: kind === 'save' ? `0 6px 20px ${theme.gold}55` : 'none',
        transition: 'transform 0.12s ease',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {c.icon}
    </button>
  );
}

export function SwipeScreen({
  theme,
  voice,
  density,
  role,
  candidates,
  onReveal,
  onMatch,
  onBelindaAsk,
}: {
  theme: Theme;
  voice: VoiceLevel;
  density: Density;
  role: string;
  candidates: Candidate[];
  onReveal: (c: Candidate) => void;
  onMatch: (c: Candidate) => void;
  onBelindaAsk: (c: Candidate) => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const [exit, setExit] = useState<'left' | 'right' | null>(null);

  const c = candidates[index % candidates.length];
  const next = candidates[(index + 1) % candidates.length];

  const pass = () => {
    setExit('left');
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExit(null);
      setDrag({ x: 0, y: 0, dragging: false });
    }, 260);
  };
  const save = () => {
    setExit('right');
    onMatch?.(c);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExit(null);
      setDrag({ x: 0, y: 0, dragging: false });
    }, 260);
  };

  const rotate = drag.dragging ? drag.x * 0.04 : exit === 'left' ? -18 : exit === 'right' ? 18 : 0;
  const tx = drag.dragging ? drag.x : exit === 'left' ? -500 : exit === 'right' ? 500 : 0;
  const ty = drag.dragging ? drag.y : 0;
  const opacity = exit ? 0 : 1;

  const onDown = (e: React.PointerEvent) => {
    const startX = e.clientX,
      startY = e.clientY;
    setDrag({ x: 0, y: 0, dragging: true });
    const move = (ev: PointerEvent) =>
      setDrag({ x: ev.clientX - startX, y: ev.clientY - startY, dragging: true });
    const up = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      if (dx > 120) save();
      else if (dx < -120) pass();
      else setDrag({ x: 0, y: 0, dragging: false });
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${theme.bg} 0%, #050403 100%)`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.sans,
      }}
    >
      <div
        style={{
          padding: '62px 20px 12px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: theme.gold,
              marginBottom: 4,
            }}
          >
            Curated for you
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 26,
              color: theme.paper,
              fontWeight: 400,
              lineHeight: 1.05,
            }}
          >
            {role} <span style={{ color: theme.gold, fontStyle: 'italic' }}>candidates</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 20,
              color: theme.goldLight,
              fontWeight: 400,
            }}
          >
            {(index % candidates.length) + 1}
            <span style={{ color: theme.muted, fontSize: 14 }}>/{candidates.length}</span>
          </div>
          <div
            style={{
              fontSize: 8,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: theme.muted,
              marginTop: 2,
            }}
          >
            Today
          </div>
        </div>
      </div>

      <div
        style={{
          margin: '6px 20px 10px',
          padding: '10px 14px',
          border: `0.5px solid ${theme.line}`,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(184,150,107,0.04)',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: theme.gold,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: theme.paper, fontWeight: 500 }}>
            The Carlyle Reserve · Lisbon
          </div>
          <div style={{ fontSize: 10, color: theme.muted, marginTop: 1 }}>
            Pre-opening · 148 keys · €280k + bonus
          </div>
        </div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: theme.gold,
          }}
        >
          Active brief
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', margin: '0 20px' }}>
        <CandidateCard
          theme={theme}
          voice={voice}
          density={density}
          candidate={next}
          style={{ transform: 'scale(0.96) translateY(10px)', opacity: 0.5 }}
          back
        />
        <CandidateCard
          theme={theme}
          voice={voice}
          density={density}
          candidate={c}
          onTap={() => onReveal?.(c)}
          onDown={onDown}
          style={{
            transform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`,
            opacity,
            transition: drag.dragging ? 'none' : 'all 0.26s cubic-bezier(.4,.1,.3,1)',
          }}
          overlay={drag.x > 40 ? 'save' : drag.x < -40 ? 'pass' : null}
        />
      </div>

      <div
        style={{
          padding: '16px 20px 34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        <ActionBtn theme={theme} kind="pass" onClick={pass} />
        <ActionBtn theme={theme} kind="ask" onClick={() => onBelindaAsk?.(c)} small />
        <ActionBtn theme={theme} kind="save" onClick={save} />
      </div>
    </div>
  );
}
