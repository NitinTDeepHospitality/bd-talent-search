'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { ListeningDots } from '@/components/Shared';
import { PreviewBadge } from '@/components/PreviewBadge';
import {
  startRecording,
  transcribe,
  type RecorderController,
} from '@/lib/recorder';
import {
  extractCandidate,
  saveCandidate,
  type ExtractedCandidate,
} from '@/lib/api';

type Phase = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'review' | 'saving';

const TIER_LABELS: Record<'black_book' | 'inner_circle' | 'watching', string> = {
  black_book: 'Black Book',
  inner_circle: 'Inner Circle',
  watching: 'Watching',
};

function emptyCandidate(): ExtractedCandidate {
  return {
    name: null,
    age: null,
    current_title: null,
    current_hotel: null,
    tenure: null,
    location: null,
    nationalities: [],
    languages: [],
    belinda_tier: null,
    belinda_rating: null,
    availability: null,
    quote: null,
    signals: {
      word_on_street: null,
      chemistry: null,
      trajectory: null,
      gut_note: null,
    },
    tags: [],
  };
}

export function AddCandidate({
  theme,
  onClose,
}: {
  theme: Theme;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [candidate, setCandidate] = useState<ExtractedCandidate>(emptyCandidate());
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const recorderRef = useRef<RecorderController | null>(null);

  const beginRecord = async () => {
    setError(null);
    setConfirmed(null);
    try {
      recorderRef.current = await startRecording();
      setPhase('recording');
    } catch {
      setError('Mic permission denied. Allow microphone access and try again.');
    }
  };

  const endRecord = async () => {
    const ctrl = recorderRef.current;
    if (!ctrl) return;
    recorderRef.current = null;
    setPhase('transcribing');
    let text = '';
    try {
      const blob = await ctrl.stop();
      text = await transcribe(blob);
      setTranscript(text);
    } catch (e) {
      console.error('[BD] transcribe failed:', e);
      setError('Couldn’t transcribe. Try recording again.');
      setPhase('idle');
      return;
    }
    setPhase('extracting');
    try {
      const extracted = await extractCandidate(text);
      setCandidate(extracted);
      setPhase('review');
      if (!extracted.name) {
        setError(
          'I couldn’t catch a candidate name. Edit below or record again.',
        );
      }
    } catch (e) {
      console.error('[BD] extract-candidate failed:', e);
      setError('Couldn’t extract the candidate. Try recording again.');
      setPhase('idle');
    }
  };

  const save = async () => {
    if (!candidate.name?.trim()) {
      setError('A name is required.');
      return;
    }
    setPhase('saving');
    setError(null);
    try {
      const saved = await saveCandidate(candidate);
      setConfirmed(saved.name);
      router.refresh();
      // Reset for the next add — keep the flow rapid.
      setCandidate(emptyCandidate());
      setTranscript('');
      setPhase('idle');
    } catch (e) {
      console.error('[BD] save-candidate failed:', e);
      setError('Save failed. Try again.');
      setPhase('review');
    }
  };

  const upd = (patch: Partial<ExtractedCandidate>) =>
    setCandidate((c) => ({ ...c, ...patch }));

  const updSignal = (
    k: keyof ExtractedCandidate['signals'],
    v: string,
  ) =>
    setCandidate((c) => ({
      ...c,
      signals: { ...c.signals, [k]: v.trim() ? v : null },
    }));

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
            <path
              d="M8 2L2 8l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              Add a candidate
            </div>
            <PreviewBadge
              theme={theme}
              status="real"
              note="speak — Claude extracts"
            />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 18,
              marginTop: 2,
              fontStyle: 'italic',
            }}
          >
            Into your network
          </div>
        </div>
      </div>

      {confirmed && (
        <div
          style={{
            margin: '6px 20px 0',
            padding: '10px 14px',
            background: 'rgba(143,207,130,0.10)',
            border: '0.5px solid rgba(143,207,130,0.4)',
            borderRadius: 10,
            fontFamily: theme.serif,
            fontStyle: 'italic',
            fontSize: 13,
            color: '#bfe5b6',
          }}
        >
          {confirmed} added to your network ✓
        </div>
      )}

      <div style={{ padding: '20px 24px 30px' }}>
        {phase === 'idle' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                fontFamily: theme.serif,
                fontSize: 15,
                color: theme.goldLight,
                fontStyle: 'italic',
                marginBottom: 28,
                lineHeight: 1.4,
              }}
            >
              Tell me about one candidate.
              <br />
              Their role, where they are, languages,
              <br />
              and what you know in your gut.
            </div>
            <button
              onClick={beginRecord}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                background: `radial-gradient(circle at 35% 30%, ${theme.goldLight}, ${theme.gold})`,
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 12px 40px ${theme.gold}55`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="36" viewBox="0 0 36 48">
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

        {phase === 'recording' && (
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
                    height: 8 + (i % 4) * 6,
                    animation: `bdpulse 0.8s ${i * 0.06}s infinite ease-in-out`,
                    opacity: 0.4 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={endRecord}
                style={{
                  padding: '10px 22px',
                  background: theme.gold,
                  color: theme.bg,
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Stop &amp; extract
              </button>
            </div>
          </div>
        )}

        {(phase === 'transcribing' || phase === 'extracting') && (
          <div style={{ padding: '20px 0' }}>
            <ListeningDots
              theme={theme}
              label={phase === 'transcribing' ? 'Transcribing' : 'Reading what you said'}
            />
          </div>
        )}

        {(phase === 'review' || phase === 'saving') && (
          <ReviewForm
            theme={theme}
            candidate={candidate}
            transcript={transcript}
            saving={phase === 'saving'}
            onChange={upd}
            onChangeSignal={updSignal}
            onSave={save}
            onRedo={() => {
              setCandidate(emptyCandidate());
              setTranscript('');
              setPhase('idle');
            }}
          />
        )}

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: '10px 14px',
              background: 'rgba(226,91,91,0.10)',
              border: '0.5px solid rgba(226,91,91,0.4)',
              borderRadius: 10,
              fontFamily: theme.serif,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#f0a3a3',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewForm({
  theme,
  candidate,
  transcript,
  saving,
  onChange,
  onChangeSignal,
  onSave,
  onRedo,
}: {
  theme: Theme;
  candidate: ExtractedCandidate;
  transcript: string;
  saving: boolean;
  onChange: (patch: Partial<ExtractedCandidate>) => void;
  onChangeSignal: (k: keyof ExtractedCandidate['signals'], v: string) => void;
  onSave: () => void;
  onRedo: () => void;
}) {
  const inputStyle = {
    width: '100%',
    background: theme.surface,
    border: `0.5px solid ${theme.lineDark}`,
    borderRadius: 8,
    padding: '8px 10px',
    color: theme.paper,
    fontFamily: theme.sans,
    fontSize: 13,
    outline: 'none',
    marginTop: 4,
  } as const;
  const labelStyle = {
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.muted,
    textTransform: 'uppercase' as const,
    marginTop: 12,
  };

  return (
    <div>
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(245,239,230,0.03)',
          border: `0.5px solid ${theme.lineDark}`,
          marginBottom: 16,
          fontFamily: theme.serif,
          fontSize: 12,
          fontStyle: 'italic',
          color: theme.muted,
          lineHeight: 1.4,
        }}
      >
        &ldquo;{transcript}&rdquo;
      </div>

      <div style={labelStyle}>Name *</div>
      <input
        style={inputStyle}
        value={candidate.name ?? ''}
        onChange={(e) => onChange({ name: e.target.value || null })}
        placeholder="e.g. Sophie Laurent"
      />

      <div style={labelStyle}>Current title</div>
      <input
        style={inputStyle}
        value={candidate.current_title ?? ''}
        onChange={(e) => onChange({ current_title: e.target.value || null })}
        placeholder="General Manager"
      />

      <div style={labelStyle}>Current hotel</div>
      <input
        style={inputStyle}
        value={candidate.current_hotel ?? ''}
        onChange={(e) => onChange({ current_hotel: e.target.value || null })}
        placeholder="Claridge's"
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Location</div>
          <input
            style={inputStyle}
            value={candidate.location ?? ''}
            onChange={(e) => onChange({ location: e.target.value || null })}
            placeholder="London"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Tenure</div>
          <input
            style={inputStyle}
            value={candidate.tenure ?? ''}
            onChange={(e) => onChange({ tenure: e.target.value || null })}
            placeholder="8 yrs"
          />
        </div>
      </div>

      <div style={labelStyle}>Languages (comma-separated)</div>
      <input
        style={inputStyle}
        value={candidate.languages.join(', ')}
        onChange={(e) =>
          onChange({
            languages: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="EN, FR, IT"
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Tier</div>
          <select
            style={{ ...inputStyle, appearance: 'none' }}
            value={candidate.belinda_tier ?? ''}
            onChange={(e) =>
              onChange({
                belinda_tier: (e.target.value || null) as
                  | 'black_book'
                  | 'inner_circle'
                  | 'watching'
                  | null,
              })
            }
          >
            <option value="">—</option>
            <option value="black_book">{TIER_LABELS.black_book}</option>
            <option value="inner_circle">{TIER_LABELS.inner_circle}</option>
            <option value="watching">{TIER_LABELS.watching}</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Rating (1–10)</div>
          <input
            style={inputStyle}
            type="number"
            min={1}
            max={10}
            step={0.1}
            value={candidate.belinda_rating ?? ''}
            onChange={(e) =>
              onChange({
                belinda_rating: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      <div style={labelStyle}>Availability</div>
      <input
        style={inputStyle}
        value={candidate.availability ?? ''}
        onChange={(e) => onChange({ availability: e.target.value || null })}
        placeholder="Quietly looking"
      />

      <div style={{ ...labelStyle, marginTop: 24, color: theme.gold }}>Your signals</div>

      <div style={labelStyle}>Word on the street</div>
      <input
        style={inputStyle}
        value={candidate.signals.word_on_street ?? ''}
        onChange={(e) => onChangeSignal('word_on_street', e.target.value)}
        placeholder="What's being said in the industry"
      />

      <div style={labelStyle}>Chemistry</div>
      <input
        style={inputStyle}
        value={candidate.signals.chemistry ?? ''}
        onChange={(e) => onChangeSignal('chemistry', e.target.value)}
        placeholder="How they read in a room"
      />

      <div style={labelStyle}>Trajectory</div>
      <input
        style={inputStyle}
        value={candidate.signals.trajectory ?? ''}
        onChange={(e) => onChangeSignal('trajectory', e.target.value)}
        placeholder="Where they're headed"
      />

      <div style={labelStyle}>Gut note</div>
      <input
        style={inputStyle}
        value={candidate.signals.gut_note ?? ''}
        onChange={(e) => onChangeSignal('gut_note', e.target.value)}
        placeholder="Your instinct"
      />

      <div style={labelStyle}>Tags</div>
      <input
        style={inputStyle}
        value={candidate.tags.join(', ')}
        onChange={(e) =>
          onChange({
            tags: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="lifestyle, pre-opening, fluent French"
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button
          onClick={onRedo}
          disabled={saving}
          style={{
            padding: '11px 16px',
            background: 'transparent',
            color: theme.muted,
            border: `0.5px solid ${theme.line}`,
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          Re-record
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '11px 16px',
            background: saving ? 'rgba(184,150,107,0.25)' : theme.gold,
            color: saving ? theme.muted : theme.bg,
            border: 'none',
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save to network'}
        </button>
      </div>
    </div>
  );
}
