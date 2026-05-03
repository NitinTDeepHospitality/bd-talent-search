'use client';

import type { Theme } from '@/lib/theme';
import type { Candidate, Job } from '@/lib/data';
import { Wordmark } from '@/components/Shared';

export function MatchScreen({
  theme,
  candidate,
  job,
  onDismiss,
  onMessage,
  onAsk,
}: {
  theme: Theme;
  candidate: Candidate;
  job: Job;
  onDismiss: () => void;
  onMessage: () => void;
  onAsk: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${theme.bg} 0%, #000 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '70px 24px 34px',
        fontFamily: theme.sans,
        color: theme.paper,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <Wordmark theme={theme} subtitle="AN INTRODUCTION" size={10} />
      </div>

      <div
        style={{
          marginTop: 24,
          fontFamily: theme.display,
          fontSize: 52,
          color: theme.goldLight,
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: 0.5,
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        A match,
      </div>
      <div
        style={{
          fontFamily: theme.display,
          fontSize: 22,
          color: theme.paper,
          marginTop: 12,
          letterSpacing: 0.4,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        worth a conversation.
      </div>

      <div style={{ marginTop: 40, position: 'relative', width: 280, height: 180 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 10,
            width: 130,
            height: 160,
            borderRadius: 10,
            background: `url(${candidate.photo}) center/cover`,
            transform: 'rotate(-5deg)',
            border: `2px solid ${theme.paper}`,
            boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '10px 10px 8px',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.9))',
              fontFamily: theme.display,
              color: theme.paper,
              fontSize: 13,
              letterSpacing: 0.3,
              textAlign: 'center',
            }}
          >
            {candidate.name.split(' ')[0]}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 10,
            width: 130,
            height: 160,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.ink})`,
            transform: 'rotate(5deg)',
            border: `2px solid ${theme.paper}`,
            boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 8,
              letterSpacing: 2,
              color: theme.goldLight,
              textTransform: 'uppercase',
            }}
          >
            The House
          </div>
          <div>
            <div
              style={{
                fontFamily: theme.display,
                fontSize: 15,
                color: theme.paper,
                lineHeight: 1.05,
                fontWeight: 400,
              }}
            >
              {job.hotel}
            </div>
            <div
              style={{
                fontSize: 9,
                color: theme.goldLight,
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              {job.city} · {job.keys} keys
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 52,
            height: 52,
            borderRadius: 26,
            background: theme.bg,
            border: `1px solid ${theme.gold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: theme.display,
            color: theme.goldLight,
            fontSize: 22,
            fontStyle: 'italic',
            boxShadow: `0 0 30px ${theme.gold}55`,
          }}
        >
          &amp;
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          padding: '18px 20px',
          background: 'rgba(184,150,107,0.08)',
          border: `0.5px solid ${theme.gold}`,
          borderRadius: 12,
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2.5,
            color: theme.gold,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Belinda&apos;s note
        </div>
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 15,
            fontStyle: 'italic',
            lineHeight: 1.4,
            color: theme.paper,
          }}
        >
          &ldquo;{candidate.signals.gutNote}&rdquo;
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onMessage}
          style={{
            background: theme.gold,
            color: theme.bg,
            border: 'none',
            padding: '15px',
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 12,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Request introduction
        </button>
        <button
          onClick={onAsk}
          style={{
            background: 'transparent',
            color: theme.goldLight,
            border: `0.5px solid ${theme.gold}`,
            padding: '15px',
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 12,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Ask Belinda first
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            color: theme.muted,
            border: 'none',
            padding: '10px',
            fontFamily: theme.sans,
            fontSize: 11,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          Keep browsing
        </button>
      </div>
    </div>
  );
}
