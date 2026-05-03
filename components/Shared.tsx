'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Theme } from '@/lib/theme';
import { RESOURCES } from '@/lib/data';

export function BDMark({ theme, size = 28 }: { theme: Theme; size?: number; subtle?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `1px solid ${theme.gold}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: theme.display,
        fontSize: size * 0.42,
        color: theme.gold,
        letterSpacing: 1,
        fontWeight: 400,
      }}
    >
      BD
    </div>
  );
}

type Tone = 'default' | 'black' | 'ivory';

export function SignalPill({
  theme,
  children,
  icon,
  dark = true,
  tone = 'default',
}: {
  theme: Theme;
  children: ReactNode;
  icon?: ReactNode;
  dark?: boolean;
  tone?: Tone;
}) {
  const palette: Record<Tone, { bg: string; border: string; text: string }> = {
    default: {
      bg: dark ? 'rgba(184,150,107,0.12)' : 'rgba(184,150,107,0.15)',
      border: theme.gold,
      text: dark ? theme.goldLight : theme.accent,
    },
    black: {
      bg: dark ? '#000' : theme.ink,
      border: theme.gold,
      text: theme.goldLight,
    },
    ivory: {
      bg: theme.paper,
      border: theme.ink,
      text: theme.ink,
    },
  };
  const p = palette[tone];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: p.bg,
        border: `0.5px solid ${p.border}`,
        fontFamily: theme.sans,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: p.text,
        fontWeight: 500,
      }}
    >
      {icon}
      {children}
    </div>
  );
}

export function Divider({
  theme,
  label,
  dark = true,
}: {
  theme: Theme;
  label?: string;
  dark?: boolean;
}) {
  const line = dark ? theme.lineDark : theme.line;
  const color = dark ? theme.muted : theme.accent;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color,
        fontWeight: 500,
      }}
    >
      <div style={{ flex: 1, height: 0.5, background: line }} />
      {label && <span>{label}</span>}
      <div style={{ flex: 1, height: 0.5, background: line }} />
    </div>
  );
}

export function SerifStat({
  theme,
  value,
  label,
  dark = true,
}: {
  theme: Theme;
  value: string | number;
  label: string;
  dark?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: theme.display,
          fontSize: 26,
          lineHeight: 1,
          color: dark ? theme.paper : theme.ink,
          fontWeight: 400,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: theme.sans,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: dark ? theme.muted : theme.accent,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function BelindaNote({
  theme,
  text,
  dark = true,
}: {
  theme: Theme;
  text: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        background: dark ? 'rgba(184,150,107,0.08)' : 'rgba(184,150,107,0.1)',
        borderLeft: `2px solid ${theme.gold}`,
        borderRadius: '0 10px 10px 0',
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            background: theme.gold,
            color: dark ? theme.bg : theme.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: theme.display,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          B
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: theme.sans,
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: theme.gold,
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          Belinda says
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 14,
            lineHeight: 1.35,
            color: dark ? theme.paper : theme.ink,
            fontStyle: 'italic',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

export function Wordmark({
  theme,
  subtitle = 'HOSPITALITY TALENT SEARCH',
  size = 11,
}: {
  theme: Theme;
  subtitle?: string;
  size?: number;
}) {
  return (
    <div style={{ textAlign: 'center', fontFamily: theme.display, color: theme.goldLight }}>
      <div style={{ fontSize: size * 2.4, letterSpacing: 8, fontWeight: 400, lineHeight: 1 }}>
        B<span style={{ margin: '0 6px', color: theme.gold, opacity: 0.5 }}>·</span>D
      </div>
      <div
        style={{
          fontSize: size * 0.85,
          letterSpacing: 4,
          fontFamily: theme.sans,
          fontWeight: 400,
          color: theme.gold,
          marginTop: 8,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function TierMark({ theme, tier }: { theme: Theme; tier: string }) {
  const glyph = ({ 'Black Book': '◆', 'Inner circle': '○', Watching: '△' } as Record<string, string>)[tier] || '·';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.goldLight,
        fontWeight: 500,
      }}
    >
      <span style={{ color: theme.gold, fontSize: 10 }}>{glyph}</span>
      {tier}
    </div>
  );
}

export function ListeningDots({ theme, label }: { theme: Theme; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: theme.gold,
              animation: `bdpulse 1.2s ${i * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: theme.serif,
          fontSize: 13,
          fontStyle: 'italic',
          color: theme.goldLight,
        }}
      >
        {label}…
      </div>
    </div>
  );
}

export function BelindaAvatar({ size = 44, theme }: { size?: number; theme: Theme }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundImage: `url(${RESOURCES.belinda})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        border: `0.5px solid ${theme.gold}`,
      }}
    />
  );
}

export type StyleProp = CSSProperties;
