'use client';

import { useRef, useState } from 'react';
import type { Theme } from '@/lib/theme';
import { QUICK_CAPTURE_SAMPLE } from '@/lib/data';
import { Divider, ListeningDots } from '@/components/Shared';
import { PreviewBadge } from '@/components/PreviewBadge';
import { startRecording, transcribe, type RecorderController } from '@/lib/recorder';
import {
  extractCapture,
  saveCapture,
  type ExtractedRow,
  type ExtractedTodo,
} from '@/lib/api';
import { useRouter } from 'next/navigation';

type Phase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'extracting'
  | 'structured'
  | 'saving';

export function CaptureScreen({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState<ExtractedRow[] | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [todos, setTodos] = useState<ExtractedTodo[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const recorderRef = useRef<RecorderController | null>(null);
  // Demo fallback so the structured panel never renders empty in dev.
  const sample = QUICK_CAPTURE_SAMPLE;

  const reset = () => {
    setTranscript('');
    setExtracted(null);
    setHighlights([]);
    setTodos([]);
    setSaveNote(null);
  };

  const start = async () => {
    reset();
    try {
      recorderRef.current = await startRecording();
      setPhase('recording');
    } catch (e) {
      console.error('[BD] mic permission denied:', e);
    }
  };

  const stop = async () => {
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
      setTranscript('— transcription failed, please try again —');
      setPhase('structured');
      setExtracted([]);
      return;
    }

    setPhase('extracting');
    try {
      const result = await extractCapture(text);
      setExtracted(result.extracted);
      setHighlights(result.highlights ?? []);
      setTodos(result.todos ?? []);
    } catch (e) {
      console.error('[BD] extract-capture failed:', e);
      setExtracted([]);
      setHighlights([]);
      setTodos([]);
    } finally {
      setPhase('structured');
    }
  };

  const save = async () => {
    if (!transcript.trim() || transcript.startsWith('—')) return;
    setPhase('saving');
    setSaveNote(null);
    try {
      const r = await saveCapture({
        transcript,
        extracted: extracted ?? [],
        highlights,
        todos,
      });
      const todoCount = r.todo_ids.length;
      setSaveNote(
        todoCount > 0
          ? `Saved · ${todoCount} task${todoCount === 1 ? '' : 's'} added`
          : 'Saved to BD brain',
      );
      router.refresh();
    } catch (e) {
      console.error('[BD] save-capture failed:', e);
      setSaveNote('Save failed — try again.');
    } finally {
      setPhase('structured');
    }
  };

  const removeTodo = (idx: number) =>
    setTodos((ts) => ts.filter((_, i) => i !== idx));

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              Quick capture
            </div>
            <PreviewBadge theme={theme} status="real" note="recording → highlights → todos" />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 18,
              marginTop: 2,
              fontStyle: 'italic',
            }}
          >
            After the meeting
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px 30px' }}>
        {phase === 'idle' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                fontFamily: theme.serif,
                fontSize: 16,
                color: theme.goldLight,
                fontStyle: 'italic',
                marginBottom: 32,
                lineHeight: 1.4,
              }}
            >
              Just walked out of a meeting?
              <br />
              Tell me what you heard.
            </div>
            <button
              onClick={start}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                background: `radial-gradient(circle at 35% 30%, ${theme.goldLight}, ${theme.gold})`,
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 12px 40px ${theme.gold}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 4, background: '#c33' }} />
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

        {(phase === 'recording' || phase === 'transcribing' || phase === 'extracting') && (
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
                    height: 8 + Math.sin(Date.now() / 200 + i) * 14 + (i % 4) * 4,
                    animation: `bdpulse 0.8s ${i * 0.06}s infinite ease-in-out`,
                    opacity: 0.4 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>
            {phase === 'recording' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <button
                  onClick={stop}
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
                  Stop &amp; transcribe
                </button>
              </div>
            )}
            {phase === 'transcribing' && (
              <div style={{ marginTop: 8 }}>
                <ListeningDots theme={theme} label="Transcribing" />
              </div>
            )}
            {phase === 'extracting' && (
              <div style={{ marginTop: 8 }}>
                <ListeningDots theme={theme} label="Extracting briefs, contacts, tags" />
              </div>
            )}
          </div>
        )}

        {(phase === 'structured' || phase === 'saving') && (
          <div>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(245,239,230,0.04)',
                border: `0.5px solid ${theme.lineDark}`,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: theme.muted,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Transcript
              </div>
              <div
                style={{
                  fontFamily: theme.serif,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: theme.paper,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{transcript || sample.raw}&rdquo;
              </div>
            </div>

            {highlights.length > 0 && (
              <>
                <Divider theme={theme} label="Highlights" />
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {highlights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '10px 14px',
                        background: 'rgba(245,239,230,0.04)',
                        border: `0.5px solid ${theme.lineDark}`,
                        borderRadius: 10,
                        fontFamily: theme.serif,
                        fontSize: 13,
                        fontStyle: 'italic',
                        color: theme.paper,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: theme.gold, flexShrink: 0 }}>★</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {todos.length > 0 && (
              <>
                <Divider theme={theme} label="To do" />
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {todos.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '10px 14px',
                        background: 'rgba(184,150,107,0.06)',
                        border: `0.5px solid ${theme.line}`,
                        borderRadius: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          marginTop: 2,
                          borderRadius: 4,
                          border: `1px solid ${theme.gold}`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, fontSize: 13, color: theme.paper, lineHeight: 1.4 }}>
                        <div>{t.label}</div>
                        {t.due_hint && (
                          <div
                            style={{
                              fontSize: 10,
                              color: theme.goldLight,
                              marginTop: 3,
                              letterSpacing: 0.5,
                              textTransform: 'lowercase',
                            }}
                          >
                            due {t.due_hint}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeTodo(i)}
                        aria-label="remove"
                        style={{
                          width: 22,
                          height: 22,
                          background: 'transparent',
                          color: theme.muted,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Divider theme={theme} label="Structured" />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {((extracted && extracted.length > 0
                ? extracted
                : sample.extracted) as Array<{
                type: string;
                label: string;
                detail?: string;
              }>).map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'rgba(184,150,107,0.06)',
                    border: `0.5px solid ${theme.line}`,
                    borderRadius: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      letterSpacing: 1.5,
                      color: theme.gold,
                      textTransform: 'uppercase',
                      width: 64,
                      flexShrink: 0,
                      paddingTop: 3,
                      fontWeight: 500,
                    }}
                  >
                    {e.type}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: theme.paper,
                      lineHeight: 1.4,
                    }}
                  >
                    <div>{e.label}</div>
                    {'detail' in e && e.detail && (
                      <div
                        style={{
                          fontSize: 11,
                          color: theme.muted,
                          marginTop: 4,
                          fontFamily: theme.serif,
                          fontStyle: 'italic',
                        }}
                      >
                        {e.detail}
                      </div>
                    )}
                  </div>
                  <div style={{ color: theme.gold, fontSize: 14 }}>+</div>
                </div>
              ))}
            </div>

            <button
              onClick={save}
              disabled={phase === 'saving' || !transcript || transcript.startsWith('—')}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '14px',
                background: phase === 'saving' ? 'rgba(184,150,107,0.25)' : theme.gold,
                color: phase === 'saving' ? theme.muted : theme.bg,
                border: 'none',
                borderRadius: 999,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: phase === 'saving' ? 'wait' : 'pointer',
              }}
            >
              {phase === 'saving' ? 'Saving…' : 'Save to BD brain'}
            </button>
            {saveNote && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: theme.goldLight,
                  fontFamily: theme.serif,
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                {saveNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
