'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { ListeningDots } from '@/components/Shared';
import { PreviewBadge } from '@/components/PreviewBadge';
import { startRecording, transcribe, type RecorderController } from '@/lib/recorder';
import { extractClient, saveClient, type ExtractedClient } from '@/lib/api';

type Phase = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'review' | 'saving';

const TYPE_LABELS: Record<NonNullable<ExtractedClient['type']>, string> = {
  third_party_operator: 'Operator',
  luxury_collection: 'Luxury collection',
  family_office: 'Family office',
  developer: 'Developer',
  big_chain: 'Big chain',
};

function emptyClient(): ExtractedClient {
  return {
    name: null,
    type: null,
    status: 'active',
    hq_city: null,
    last_contact_at: null,
    notes: null,
    briefs: [],
    contacts: [],
  };
}

export function AddClient({
  theme,
  onClose,
}: {
  theme: Theme;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [client, setClient] = useState<ExtractedClient>(emptyClient());
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
      const extracted = await extractClient(text);
      setClient(extracted);
      setPhase('review');
      if (!extracted.name) {
        setError("I couldn't catch a client name. Edit below or record again.");
      }
    } catch (e) {
      console.error('[BD] extract-client failed:', e);
      setError('Couldn’t extract the client. Try recording again.');
      setPhase('idle');
    }
  };

  const save = async () => {
    if (!client.name?.trim() || !client.type) {
      setError('Name and type are both required.');
      return;
    }
    setPhase('saving');
    setError(null);
    try {
      const saved = await saveClient(client);
      const n = saved.brief_ids.length;
      setConfirmed(
        n > 0
          ? `${saved.name} added · ${n} brief${n === 1 ? '' : 's'}`
          : `${saved.name} added to your book`,
      );
      router.refresh();
      setClient(emptyClient());
      setTranscript('');
      setPhase('idle');
    } catch (e) {
      console.error('[BD] save-client failed:', e);
      setError('Save failed. Try again.');
      setPhase('review');
    }
  };

  const upd = (patch: Partial<ExtractedClient>) =>
    setClient((c) => ({ ...c, ...patch }));

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
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
              Add a client
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
            Into your book
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
          {confirmed} ✓
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
              Tell me about one client.
              <br />
              Who they are, what type of operator,
              <br />
              and what roles they have open.
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

            {/* "Or type it in" — alternate path for when she has the
                facts already and doesn't want to dictate. Drops straight
                into the review form with empty fields, then saves through
                the same /api/clients endpoint. */}
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
            <button
              onClick={() => {
                setTranscript('(typed manually — no transcript)');
                setClient(emptyClient());
                setPhase('review');
              }}
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
                  d="M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Type it in instead
            </button>
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
            client={client}
            transcript={transcript}
            saving={phase === 'saving'}
            onChange={upd}
            onSave={save}
            onRedo={() => {
              setClient(emptyClient());
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
  client,
  transcript,
  saving,
  onChange,
  onSave,
  onRedo,
}: {
  theme: Theme;
  client: ExtractedClient;
  transcript: string;
  saving: boolean;
  onChange: (patch: Partial<ExtractedClient>) => void;
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
        value={client.name ?? ''}
        onChange={(e) => onChange({ name: e.target.value || null })}
        placeholder="e.g. Aimbridge, Faena Group"
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Type *</div>
          <select
            style={{ ...inputStyle, appearance: 'none' }}
            value={client.type ?? ''}
            onChange={(e) =>
              onChange({
                type: (e.target.value || null) as ExtractedClient['type'],
              })
            }
          >
            <option value="">—</option>
            <option value="third_party_operator">{TYPE_LABELS.third_party_operator}</option>
            <option value="luxury_collection">{TYPE_LABELS.luxury_collection}</option>
            <option value="family_office">{TYPE_LABELS.family_office}</option>
            <option value="developer">{TYPE_LABELS.developer}</option>
            <option value="big_chain">{TYPE_LABELS.big_chain}</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Status</div>
          <select
            style={{ ...inputStyle, appearance: 'none' }}
            value={client.status ?? 'active'}
            onChange={(e) =>
              onChange({ status: e.target.value as 'active' | 'dormant' })
            }
          >
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>HQ city</div>
          <input
            style={inputStyle}
            value={client.hq_city ?? ''}
            onChange={(e) => onChange({ hq_city: e.target.value || null })}
            placeholder="Dallas, Paris…"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Last spoke</div>
          <input
            style={inputStyle}
            type="date"
            value={client.last_contact_at ?? ''}
            onChange={(e) => onChange({ last_contact_at: e.target.value || null })}
          />
        </div>
      </div>

      <div style={labelStyle}>Notes</div>
      <textarea
        style={{ ...inputStyle, minHeight: 60, fontFamily: theme.serif, fontStyle: 'italic' }}
        value={client.notes ?? ''}
        onChange={(e) => onChange({ notes: e.target.value || null })}
        placeholder="Anything else worth remembering"
      />

      {client.briefs.length > 0 && (
        <>
          <div style={{ ...labelStyle, marginTop: 24, color: theme.gold }}>
            Open briefs ({client.briefs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {client.briefs.map((b, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(184,150,107,0.06)',
                  border: `0.5px solid ${theme.line}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: theme.paper,
                }}
              >
                <div style={{ fontWeight: 500 }}>{b.role}</div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: theme.goldLight,
                    fontFamily: theme.serif,
                    fontStyle: 'italic',
                  }}
                >
                  {[b.hotel_name, b.city, b.opening_date].filter(Boolean).join(' · ') ||
                    '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {client.contacts.length > 0 && (
        <>
          <div style={{ ...labelStyle, marginTop: 24, color: theme.gold }}>
            People ({client.contacts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {client.contacts.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(245,239,230,0.04)',
                  border: `0.5px solid ${theme.lineDark}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: theme.paper,
                }}
              >
                {p.name}
                {p.role && <span style={{ color: theme.muted }}> · {p.role}</span>}
              </div>
            ))}
          </div>
        </>
      )}

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
          {saving ? 'Saving…' : 'Save to book'}
        </button>
      </div>
    </div>
  );
}
