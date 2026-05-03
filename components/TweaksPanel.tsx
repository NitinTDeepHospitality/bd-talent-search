'use client';

import type { ReactNode } from 'react';
import { type Theme, THEMES, VOICE_LEVELS, DENSITIES, ROLES } from '@/lib/theme';

export type Tweaks = {
  theme: string;
  density: string;
  role: string;
  voice: string;
};

export function TweaksPanel({
  theme,
  tweaks,
  update,
  onClose,
}: {
  theme: Theme;
  tweaks: Tweaks;
  update: (k: keyof Tweaks, v: string) => void;
  onClose: () => void;
}) {
  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: theme.gold,
          marginBottom: 8,
          fontFamily: theme.sans,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  );
  const Opt = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: '7px 11px',
        borderRadius: 8,
        background: active ? theme.gold : 'transparent',
        color: active ? theme.bg : theme.paper,
        border: `0.5px solid ${active ? theme.gold : theme.line}`,
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: theme.sans,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 280,
        background: 'rgba(14,12,10,0.96)',
        backdropFilter: 'blur(16px)',
        border: `0.5px solid ${theme.gold}`,
        borderRadius: 14,
        padding: '16px 16px 8px',
        color: theme.paper,
        zIndex: 1000,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `0.5px solid ${theme.line}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: theme.gold,
              textTransform: 'uppercase',
            }}
          >
            Tweaks
          </div>
          <div style={{ fontFamily: theme.display, fontSize: 17, marginTop: 2 }}>Dial it in</div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: 'transparent',
            border: `0.5px solid ${theme.line}`,
            color: theme.paper,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ×
        </button>
      </div>
      <Row label="Visual theme">
        {Object.entries(THEMES).map(([k, t]) => (
          <Opt key={k} active={tweaks.theme === k} onClick={() => update('theme', k)}>
            {t.name}
          </Opt>
        ))}
      </Row>
      <Row label="Card density">
        {Object.entries(DENSITIES).map(([k, d]) => (
          <Opt key={k} active={tweaks.density === k} onClick={() => update('density', k)}>
            {d.label}
          </Opt>
        ))}
      </Row>
      <Row label="Role">
        {ROLES.map((r) => (
          <Opt key={r} active={tweaks.role === r} onClick={() => update('role', r)}>
            {r}
          </Opt>
        ))}
      </Row>
      <Row label="Belinda voice">
        {Object.entries(VOICE_LEVELS).map(([k, v]) => (
          <Opt key={k} active={tweaks.voice === k} onClick={() => update('voice', k)}>
            {v.label}
          </Opt>
        ))}
      </Row>
    </div>
  );
}
