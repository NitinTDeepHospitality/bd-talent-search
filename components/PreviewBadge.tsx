'use client';

import type { Theme } from '@/lib/theme';

export type PreviewStatus = 'real' | 'sample' | 'coming-soon';

const LABELS: Record<PreviewStatus, string> = {
  real: 'Real',
  sample: 'Sample data',
  'coming-soon': 'Coming soon',
};

// Real = green. Anything that's NOT real (sample, coming soon) is red so
// Belinda can spot it at a glance — text alone can be skimmed past.
const DOT_COLORS: Record<PreviewStatus, string> = {
  real: '#8fcf82',
  sample: '#e25b5b',
  'coming-soon': '#e25b5b',
};
const BG_COLORS: Record<PreviewStatus, string> = {
  real: 'rgba(143,207,130,0.08)',
  sample: 'rgba(226,91,91,0.14)',
  'coming-soon': 'rgba(226,91,91,0.14)',
};
const BORDER_COLORS: Record<PreviewStatus, string> = {
  real: 'rgba(143,207,130,0.28)',
  sample: 'rgba(226,91,91,0.45)',
  'coming-soon': 'rgba(226,91,91,0.45)',
};
const LABEL_COLORS: Record<PreviewStatus, string> = {
  real: '#bfe5b6',
  sample: '#f0a3a3',
  'coming-soon': '#f0a3a3',
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
        background: BG_COLORS[status],
        border: `0.5px solid ${BORDER_COLORS[status]}`,
        fontFamily: theme.sans,
        fontSize: 9,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: LABEL_COLORS[status],
        fontWeight: 600,
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
            fontWeight: 400,
          }}
        >
          · {note}
        </span>
      )}
    </div>
  );
}
