'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { ListeningDots } from '@/components/Shared';
import { PreviewBadge } from '@/components/PreviewBadge';
import {
  startRecording,
  transcribe,
  type RecorderController,
  type RecorderState,
} from '@/lib/recorder';
import {
  extractCandidate,
  extractCandidateFromCV,
  saveCandidate,
  type ExtractedCandidate,
} from '@/lib/api';

type Phase =
  | 'idle'
  | 'requesting-mic'   // getUserMedia in flight
  | 'recording'        // recording with audio
  | 'silent'           // recording but no audio detected
  | 'transcribing'
  | 'extracting'
  | 'review'
  | 'saving';

const TIER_LABELS: Record<'black_book' | 'inner_circle' | 'watching', string> = {
  black_book: 'Black Book',
  inner_circle: 'Inner Circle',
  watching: 'Watching',
};

const READINESS_LABELS: Record<'ready' | 'passive' | 'settled', string> = {
  ready: 'Ready to move',
  passive: 'Open to right brief',
  settled: 'Settled, not moving',
};

// Empty strings / 0s / false stand in for "not specified" — matches the
// shape Claude returns under the Anthropic structured-output union cap.
// The server route normalises these to NULL before persisting.
function emptyCandidate(): ExtractedCandidate {
  return {
    name: '',
    age: 0,
    current_title: '',
    current_hotel: '',
    tenure: '',
    current_location: '',
    open_to_locations: [],
    nationalities: [],
    languages: [],
    last_job_change_date: '',
    last_contact_at: '',
    move_readiness: null,
    family_travels: false,
    child_education_required: false,
    belinda_tier: null,
    belinda_rating: 0,
    availability: '',
    quote: '',
    linkedin_url: '',
    signals: {
      word_on_street: '',
      chemistry: '',
      trajectory: '',
      gut_note: '',
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
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const recorderRef = useRef<RecorderController | null>(null);
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  // Tick the recording-duration counter while the user holds the mic
  // open. Resets to 0 every time we re-enter recording.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'silent') return;
    const startedAt = Date.now() - recordingSecs * 1000;
    const id = setInterval(() => {
      setRecordingSecs(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const beginRecord = async () => {
    setError(null);
    setConfirmed(null);
    setRecordingSecs(0);
    setAudioLevel(0);
    setPhase('requesting-mic');
    try {
      recorderRef.current = await startRecording({
        onState: (s: RecorderState) => {
          // Mirror the recorder's lifecycle into the UI so Belinda can
          // see exactly what state we're in.
          if (s === 'recording') setPhase('recording');
          else if (s === 'silent') setPhase('silent');
        },
        onLevel: (l) => setAudioLevel(l),
      });
    } catch {
      setPhase('idle');
      setError(
        'Microphone permission denied. On iPad: Settings → Safari → Camera & Microphone → Allow.',
      );
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
      if (blob.size === 0) {
        setError('No audio recorded. Try again — make sure your mic is unmuted.');
        setPhase('idle');
        return;
      }
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

  const uploadCV = async (file: File) => {
    setError(null);
    setConfirmed(null);
    setTranscript(`Uploaded CV: ${file.name}`);
    setPhase('extracting');
    try {
      const extracted = await extractCandidateFromCV(file);
      setCandidate(extracted);
      setPhase('review');
      if (!extracted.name) {
        setError(
          'I couldn’t read a name off that CV. Edit below or try another file.',
        );
      }
    } catch (e) {
      console.error('[BD] extract-candidate-cv failed:', e);
      const msg = e instanceof Error ? e.message : 'unknown error';
      setError(
        msg.includes('413')
          ? 'CV file too large (max 8MB).'
          : msg.includes('415')
            ? 'Only PDF CVs supported for now.'
            : 'Couldn’t read that CV. Try another file or use the voice flow.',
      );
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
      // Empty string stands in for "not specified"; server normalises.
      signals: { ...c.signals, [k]: v },
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

            {/* "Or upload a CV" — alternate path when she has the candidate's
                CV in email rather than dictating from memory. */}
            <div
              style={{
                margin: '28px auto 0',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                maxWidth: 240,
              }}
            >
              <div style={{ flex: 1, height: 0.5, background: theme.lineDark }} />
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: theme.muted,
                  textTransform: 'uppercase',
                }}
              >
                or
              </div>
              <div style={{ flex: 1, height: 0.5, background: theme.lineDark }} />
            </div>
            <input
              ref={cvInputRef}
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCV(f);
                // Reset so the same file can be picked again on retry.
                e.target.value = '';
              }}
            />
            <button
              onClick={() => cvInputRef.current?.click()}
              style={{
                marginTop: 16,
                padding: '10px 18px',
                background: 'transparent',
                color: theme.goldLight,
                border: `0.5px solid ${theme.gold}`,
                borderRadius: 999,
                fontFamily: theme.sans,
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Upload a CV (PDF)
            </button>
          </div>
        )}

        {phase === 'requesting-mic' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <ListeningDots theme={theme} label="Waiting for microphone permission" />
            <div
              style={{
                marginTop: 16,
                fontSize: 11,
                color: theme.muted,
                maxWidth: 280,
                margin: '16px auto 0',
                lineHeight: 1.45,
              }}
            >
              Tap &ldquo;Allow&rdquo; on the permission prompt. If you don&rsquo;t see one,
              check Settings → Safari → Camera &amp; Microphone.
            </div>
          </div>
        )}

        {(phase === 'recording' || phase === 'silent') && (
          <div>
            {/* Live level meter — the bar heights scale with the input
                audio level so Belinda can see the app is hearing her. */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 4,
                marginBottom: 16,
                height: 56,
                alignItems: 'flex-end',
              }}
            >
              {Array.from({ length: 24 }).map((_, i) => {
                // Mix the live level with a per-bar bias so the meter
                // stays animated even at low signal, but reacts to loud
                // input visibly.
                const bias = 8 + (i % 4) * 5;
                const live = Math.min(1, audioLevel * 6);
                const reactive = bias + live * 40 * (0.6 + ((i * 7) % 5) / 10);
                return (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      borderRadius: 2,
                      height: reactive,
                      background:
                        phase === 'silent'
                          ? 'rgba(226,91,91,0.55)'
                          : theme.gold,
                      transition: 'height 0.1s linear, background 0.2s',
                      opacity: 0.55 + ((i * 3) % 4) * 0.1,
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: phase === 'silent' ? '#f0a3a3' : theme.gold,
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {phase === 'silent' ? '● Recording — no audio' : '● Recording'}{' '}
              <span style={{ color: theme.muted, fontWeight: 400, marginLeft: 6 }}>
                {String(Math.floor(recordingSecs / 60)).padStart(1, '0')}:
                {String(recordingSecs % 60).padStart(2, '0')}
              </span>
            </div>

            {phase === 'silent' && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: theme.muted,
                  marginBottom: 18,
                  fontStyle: 'italic',
                  fontFamily: theme.serif,
                }}
              >
                Check the mic on your iPad isn&rsquo;t muted, then keep talking.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
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
        value={candidate.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. Sophie Laurent"
      />

      <div style={labelStyle}>Current title</div>
      <input
        style={inputStyle}
        value={candidate.current_title}
        onChange={(e) => onChange({ current_title: e.target.value })}
        placeholder="General Manager"
      />

      <div style={labelStyle}>Current hotel</div>
      <input
        style={inputStyle}
        value={candidate.current_hotel}
        onChange={(e) => onChange({ current_hotel: e.target.value })}
        placeholder="Claridge's"
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Current location</div>
          <input
            style={inputStyle}
            value={candidate.current_location}
            onChange={(e) => onChange({ current_location: e.target.value })}
            placeholder="London"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Tenure</div>
          <input
            style={inputStyle}
            value={candidate.tenure}
            onChange={(e) => onChange({ tenure: e.target.value })}
            placeholder="8 yrs"
          />
        </div>
      </div>

      <div style={labelStyle}>Open to (comma-separated)</div>
      <input
        style={inputStyle}
        value={candidate.open_to_locations.join(', ')}
        onChange={(e) =>
          onChange({
            open_to_locations: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="Mediterranean, GCC, Switzerland"
      />

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
            value={candidate.belinda_rating || ''}
            onChange={(e) =>
              onChange({
                belinda_rating: e.target.value ? Number(e.target.value) : 0,
              })
            }
          />
        </div>
      </div>

      <div style={labelStyle}>Availability</div>
      <input
        style={inputStyle}
        value={candidate.availability}
        onChange={(e) => onChange({ availability: e.target.value })}
        placeholder="Quietly looking"
      />

      <div style={labelStyle}>LinkedIn URL</div>
      <input
        style={inputStyle}
        type="url"
        value={candidate.linkedin_url}
        onChange={(e) => onChange({ linkedin_url: e.target.value })}
        placeholder="https://linkedin.com/in/…"
      />

      <div style={{ ...labelStyle, marginTop: 24, color: theme.gold }}>Mobility &amp; recency</div>

      <div style={labelStyle}>Move readiness</div>
      <select
        style={{ ...inputStyle, appearance: 'none' }}
        value={candidate.move_readiness ?? ''}
        onChange={(e) =>
          onChange({
            move_readiness: (e.target.value || null) as
              | 'ready'
              | 'passive'
              | 'settled'
              | null,
          })
        }
      >
        <option value="">—</option>
        <option value="ready">{READINESS_LABELS.ready}</option>
        <option value="passive">{READINESS_LABELS.passive}</option>
        <option value="settled">{READINESS_LABELS.settled}</option>
      </select>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Last job change</div>
          <input
            style={inputStyle}
            type="date"
            value={candidate.last_job_change_date}
            onChange={(e) =>
              onChange({ last_job_change_date: e.target.value })
            }
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Last spoke</div>
          <input
            style={inputStyle}
            type="date"
            value={candidate.last_contact_at}
            onChange={(e) =>
              onChange({ last_contact_at: e.target.value })
            }
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            fontSize: 12,
            color: theme.paper,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={candidate.family_travels}
            onChange={(e) =>
              onChange({ family_travels: e.target.checked })
            }
          />
          Family travels
        </label>
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            fontSize: 12,
            color: theme.paper,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={candidate.child_education_required}
            onChange={(e) =>
              onChange({
                child_education_required: e.target.checked,
              })
            }
          />
          Schools required
        </label>
      </div>

      <div style={{ ...labelStyle, marginTop: 24, color: theme.gold }}>Your signals</div>

      <div style={labelStyle}>Word on the street</div>
      <input
        style={inputStyle}
        value={candidate.signals.word_on_street}
        onChange={(e) => onChangeSignal('word_on_street', e.target.value)}
        placeholder="What's being said in the industry"
      />

      <div style={labelStyle}>Chemistry</div>
      <input
        style={inputStyle}
        value={candidate.signals.chemistry}
        onChange={(e) => onChangeSignal('chemistry', e.target.value)}
        placeholder="How they read in a room"
      />

      <div style={labelStyle}>Trajectory</div>
      <input
        style={inputStyle}
        value={candidate.signals.trajectory}
        onChange={(e) => onChangeSignal('trajectory', e.target.value)}
        placeholder="Where they're headed"
      />

      <div style={labelStyle}>Gut note</div>
      <input
        style={inputStyle}
        value={candidate.signals.gut_note}
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
