'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { scheduleFollowUp } from '@/lib/api';

/**
 * Compact, full-bleed bottom sheet for picking a follow-up time. Posts
 * to /api/calendar/event which creates an Outlook event via Microsoft
 * Graph and persists the same time locally on the candidate/company.
 */
export function FollowUpDialog({
  theme,
  open,
  onClose,
  subject,
  candidateId,
  companyId,
}: {
  theme: Theme;
  open: boolean;
  onClose: () => void;
  /** Default event title; user can override. */
  subject: string;
  candidateId?: string;
  companyId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(subject);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ webLink: string | null; startsAt: string } | null>(null);

  // When opened: default to tomorrow at 10:00, reset state, and update
  // the subject if the caller passed a fresh one.
  useEffect(() => {
    if (!open) return;
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setDate(t.toISOString().slice(0, 10));
    setTime('10:00');
    setDuration(30);
    setNotes('');
    setError(null);
    setDone(null);
    setTitle(subject);
  }, [open, subject]);

  if (!open) return null;

  const submit = async () => {
    if (!date || !time) {
      setError('Pick a date and time.');
      return;
    }
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    setSaving(true);
    setError(null);
    try {
      const result = await scheduleFollowUp({
        subject: title,
        startsAt,
        durationMinutes: duration,
        bodyHtml: notes ? `<p>${escapeHtml(notes)}</p>` : undefined,
        candidateId,
        companyId,
      });
      setDone({ webLink: result.web_link, startsAt: result.starts_at });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: theme.surface,
          borderTop: `0.5px solid ${theme.line}`,
          borderRadius: '16px 16px 0 0',
          padding: '20px 22px calc(28px + env(safe-area-inset-bottom))',
          fontFamily: theme.sans,
          color: theme.paper,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 20,
              fontStyle: 'italic',
              color: theme.paper,
            }}
          >
            Schedule follow-up
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.muted,
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {done ? (
          <div>
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(143,207,130,0.10)',
                border: '0.5px solid rgba(143,207,130,0.4)',
                borderRadius: 10,
                fontFamily: theme.serif,
                fontStyle: 'italic',
                color: '#bfe5b6',
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Added to your Outlook calendar ·{' '}
              {new Date(done.startsAt).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {done.webLink && (
                <a
                  href={done.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: 'transparent',
                    color: theme.goldLight,
                    textDecoration: 'none',
                    border: `0.5px solid ${theme.gold}`,
                    borderRadius: 999,
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}
                >
                  Open in Outlook
                </a>
              )}
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: theme.gold,
                  color: theme.bg,
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 10,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <Label theme={theme}>Subject</Label>
            <Input theme={theme} value={title} onChange={setTitle} />

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Label theme={theme}>Date</Label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={baseInputStyle(theme)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label theme={theme}>Time</Label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={baseInputStyle(theme)}
                />
              </div>
            </div>

            <Label theme={theme}>Duration</Label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ ...baseInputStyle(theme), appearance: 'none' }}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
            </select>

            <Label theme={theme}>Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's this about?"
              style={{ ...baseInputStyle(theme), minHeight: 50, fontFamily: theme.serif }}
            />

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: 'rgba(226,91,91,0.10)',
                  border: '0.5px solid rgba(226,91,91,0.4)',
                  borderRadius: 10,
                  fontFamily: theme.serif,
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: '#f0a3a3',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '11px 16px',
                  background: 'transparent',
                  color: theme.muted,
                  border: `0.5px solid ${theme.line}`,
                  borderRadius: 999,
                  fontSize: 10,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: theme.sans,
                }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  background: saving ? 'rgba(184,150,107,0.25)' : theme.gold,
                  color: saving ? theme.muted : theme.bg,
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: theme.sans,
                }}
              >
                {saving ? 'Adding…' : 'Add to Outlook'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function baseInputStyle(theme: Theme) {
  return {
    width: '100%',
    background: theme.bg,
    border: `0.5px solid ${theme.lineDark}`,
    borderRadius: 8,
    padding: '8px 10px',
    color: theme.paper,
    fontFamily: theme.sans,
    fontSize: 13,
    outline: 'none',
    marginTop: 4,
  } as const;
}

function Label({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 1.5,
        color: theme.muted,
        textTransform: 'uppercase',
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  theme,
  value,
  onChange,
}: {
  theme: Theme;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={baseInputStyle(theme)}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
