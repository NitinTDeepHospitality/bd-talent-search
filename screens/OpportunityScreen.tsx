'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/theme';
import { type Candidate, type Opportunity, OPPORTUNITIES } from '@/lib/data';

function OpportunityCard({
  theme,
  o,
  candidates,
  onOpenCandidate,
}: {
  theme: Theme;
  o: Opportunity;
  candidates: Candidate[];
  onOpenCandidate?: (c: Candidate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const matched = o.candidates
    .map((id) => candidates.find((c) => c.id === id))
    .filter((c): c is Candidate => Boolean(c));
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: 'rgba(245,239,230,0.03)',
        border: `0.5px solid ${theme.line}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.8,
            color: theme.gold,
            textTransform: 'uppercase',
          }}
        >
          {o.source}
        </div>
        <div style={{ fontSize: 9, color: theme.muted, letterSpacing: 0.5 }}>{o.when}</div>
      </div>
      <div
        style={{
          fontFamily: theme.display,
          fontSize: 17,
          color: theme.paper,
          lineHeight: 1.25,
          marginBottom: 8,
          fontWeight: 400,
        }}
      >
        {o.headline}
      </div>
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(184,150,107,0.06)',
          borderLeft: `2px solid ${theme.gold}`,
          borderRadius: '0 8px 8px 0',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: theme.gold,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Why this matters
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 13,
            fontStyle: 'italic',
            color: theme.paper,
            lineHeight: 1.4,
          }}
        >
          {o.why}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: expanded ? 14 : 0,
        }}
      >
        <div style={{ display: 'flex' }}>
          {matched.map((c, i) => (
            <div
              key={c.id}
              onClick={() => onOpenCandidate?.(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: `url(${c.photo}) center/cover`,
                border: `1.5px solid ${theme.bg}`,
                marginLeft: i ? -10 : 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, fontSize: 11, color: theme.muted }}>
          {matched.map((c) => c.name.split(' ')[0]).join(', ')} fit
        </div>
        {o.draft && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              fontSize: 9,
              letterSpacing: 1.5,
              color: theme.goldLight,
              background: 'transparent',
              border: `0.5px solid ${theme.line}`,
              padding: '6px 10px',
              borderRadius: 999,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {expanded ? 'Hide draft' : 'See draft'}
          </button>
        )}
      </div>

      {expanded && o.draft && (
        <div
          style={{
            padding: 12,
            background: theme.surface,
            border: `0.5px solid ${theme.lineDark}`,
            borderRadius: 10,
            fontFamily: theme.serif,
            fontSize: 13,
            fontStyle: 'italic',
            color: theme.paper,
            lineHeight: 1.45,
            marginBottom: 12,
          }}
        >
          {o.draft}
        </div>
      )}

      <button
        style={{
          width: '100%',
          padding: '11px',
          marginTop: 4,
          background: 'transparent',
          color: theme.goldLight,
          border: `0.5px solid ${theme.gold}`,
          borderRadius: 999,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {o.cta}
      </button>
    </div>
  );
}

export function OpportunityScreen({
  theme,
  candidates,
  onClose,
  onOpenCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
}) {
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
            The world
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            Opportunities <span style={{ fontStyle: 'italic', color: theme.goldLight }}>for you</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '8px 20px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {OPPORTUNITIES.map((o) => (
          <OpportunityCard
            key={o.id}
            theme={theme}
            o={o}
            candidates={candidates}
            onOpenCandidate={onOpenCandidate}
          />
        ))}
      </div>
    </div>
  );
}
