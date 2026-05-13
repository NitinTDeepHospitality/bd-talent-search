'use client';

import type { Theme } from '@/lib/theme';
import { type Candidate, VOICE_QUERIES } from '@/lib/data';
import { ListeningDots, SignalPill } from '@/components/Shared';

function ResultRow({
  theme,
  c,
  rank,
  onClick,
}: {
  theme: Theme;
  c: Candidate;
  rank: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        background: 'rgba(245,239,230,0.04)',
        border: `0.5px solid ${theme.lineDark}`,
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: theme.display,
          fontSize: 22,
          color: theme.gold,
          width: 24,
          textAlign: 'center',
        }}
      >
        0{rank}
      </div>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: `url(${c.photo}) center/cover`,
          border: `0.5px solid ${theme.gold}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: theme.display, fontSize: 16, color: theme.paper, fontWeight: 400 }}>
          {c.name}
        </div>
        <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{c.current}</div>
        <div
          style={{
            fontSize: 10,
            color: theme.goldLight,
            marginTop: 4,
            fontStyle: 'italic',
            fontFamily: theme.serif,
          }}
        >
          {c.tags[0]} · {c.languages.join('/')}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: theme.display, fontSize: 18, color: theme.goldLight }}>
          {c.belindaRating}
        </div>
        <div
          style={{
            fontSize: 8,
            letterSpacing: 1.5,
            color: theme.muted,
            textTransform: 'uppercase',
          }}
        >
          BD
        </div>
      </div>
    </button>
  );
}

export function VoiceResult({
  theme,
  candidates,
  userTranscript,
  matchedIds,
  reasoning,
  userTags,
  onClose,
  onPickCandidate,
  onSwipeAll,
}: {
  theme: Theme;
  candidates: Candidate[];
  // null = transcription still in flight; string = ready ('' = transcribe failed).
  // undefined = no live query (fall back to the mock demo query).
  userTranscript?: string | null;
  // null = parse-query in flight; array = results ready ([] = parse-query failed).
  // undefined = no live query (use mock matchIds + reasoning + tags).
  matchedIds?: string[] | null;
  reasoning?: string | null;
  userTags?: string[] | null;
  onClose: () => void;
  onPickCandidate: (c: Candidate) => void;
  onSwipeAll: () => void;
}) {
  const q = VOICE_QUERIES[0];

  // Phase is derived from props — no internal timers. Live mode:
  //   transcript pending → 'listening'
  //   transcript ready, parse pending → 'thinking'
  //   parse ready → 'done'
  // Mock mode (undefined props) → 'done' immediately so the demo still works.
  let phase: 'listening' | 'thinking' | 'done';
  if (userTranscript === undefined && matchedIds === undefined) {
    phase = 'done';
  } else if (userTranscript === null) {
    phase = 'listening';
  } else if (matchedIds == null) {
    phase = 'thinking';
  } else {
    phase = 'done';
  }

  const shownSpoken = userTranscript || q.spoken;
  const transcribeFailed = userTranscript === '';
  const shownTags = userTags && userTags.length > 0 ? userTags : q.tags;
  const shownReasoning = reasoning || q.reasoning;
  const idsToShow = matchedIds && matchedIds.length > 0 ? matchedIds : q.matchIds;
  const matched = idsToShow
    .map((id) => candidates.find((c) => c.id === id))
    .filter((c): c is Candidate => Boolean(c));

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
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: theme.gold,
            textTransform: 'uppercase',
          }}
        >
          Voice search
        </div>
      </div>

      <div style={{ padding: '0 24px 16px' }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.5,
            color: theme.muted,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          You said
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 18,
            fontStyle: 'italic',
            lineHeight: 1.35,
            color: theme.paper,
          }}
        >
          {transcribeFailed
            ? '— couldn’t transcribe, please try again —'
            : `“${shownSpoken}”`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {shownTags.map((t) => (
            <SignalPill key={t} theme={theme}>
              {t}
            </SignalPill>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 24px 0', borderTop: `0.5px solid ${theme.line}` }}>
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            background: 'rgba(184,150,107,0.08)',
            borderLeft: `2px solid ${theme.gold}`,
            borderRadius: '0 10px 10px 0',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: theme.gold,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            BD assistant
          </div>
          {phase === 'listening' && (
            <ListeningDots
              theme={theme}
              label={userTranscript === null ? 'Transcribing' : 'Listening'}
            />
          )}
          {phase === 'thinking' && (
            <ListeningDots theme={theme} label="Searching 7,142 contacts" />
          )}
          {phase === 'done' && (
            <div
              style={{
                fontFamily: theme.serif,
                fontSize: 14,
                lineHeight: 1.4,
                color: theme.paper,
                fontStyle: 'italic',
              }}
            >
              {shownReasoning}
            </div>
          )}
        </div>
      </div>

      {phase === 'done' && (
        <div style={{ padding: '20px 20px 30px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              {matched.length} matches
            </div>
            <button
              onClick={onSwipeAll}
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: theme.goldLight,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Swipe view ›
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matched.map((c, i) => (
              <ResultRow
                key={c.id}
                theme={theme}
                c={c}
                rank={i + 1}
                onClick={() => onPickCandidate(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
