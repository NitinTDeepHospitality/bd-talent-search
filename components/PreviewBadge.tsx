'use client';

import type { Theme } from '@/lib/theme';

export type PreviewStatus = 'real' | 'sample' | 'coming-soon';

const LABELS: Record<PreviewStatus, string> = {
  real: 'Real',
  sample: 'Sample data',
  'coming-soon': 'Coming soon',
};

const DOT_COLORS: Record<PreviewStatus, string> = {
  real: '#8fcf82', // soft green
  sample: '#b8966b', // theme.gold — muted but neutral
  'coming-soon': '#e0b46c', // amber
};

export function PreviewBadge({
  theme,
  status,
  note,
}: {
  theme: Theme;
  status: PreviewStatus;
  /** Optional one-line explanation in plain language. */
  note?: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        borderRadius: 999,
        background: 'rgba(245,239,230,0.06)',
        border: `0.5px solid ${theme.lineDark}`,
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: theme.paper,
      }}
      title={note}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: DOT_COLORS[status],
          flexShrink: 0,
        }}
      />
      {LABELS[status]}
      {note && (
        <span
          style={{
            color: theme.muted,
            textTransform: 'none',
            letterSpacing: 0.2,
            fontSize: 10,
            marginLeft: 4,
          }}
        >
          · {note}
        </span>
      )}
    </div>
  );
}
