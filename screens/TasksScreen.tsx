'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { PreviewBadge } from '@/components/PreviewBadge';
import { completeTodo, type SavedTodo } from '@/lib/api';

function whenLabel(iso: string | null): string | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.round((due - now) / 86400000);
  if (Number.isNaN(days)) return null;
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return 'overdue · yesterday';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'next week' : `in ${weeks} weeks`;
  }
  return new Date(iso).toLocaleDateString();
}

function dueColor(theme: Theme, iso: string | null): string {
  if (!iso) return theme.muted;
  const due = new Date(iso).getTime();
  const now = Date.now();
  if (due < now) return '#f0a3a3'; // overdue red
  const days = (due - now) / 86400000;
  if (days < 3) return theme.goldLight;
  return theme.muted;
}

export function TasksScreen({
  theme,
  todos,
  onClose,
}: {
  theme: Theme;
  todos: SavedTodo[];
  onClose: () => void;
}) {
  const router = useRouter();
  // Local optimistic strikethrough — when she taps, we mark visually and
  // fire the PATCH; router.refresh() pulls the fresh server state.
  const [pending, setPending] = useState<Set<string>>(new Set());

  const toggle = async (id: string) => {
    setPending((s) => new Set(s).add(id));
    try {
      await completeTodo(id, true);
      router.refresh();
    } catch (e) {
      console.error('[BD] complete-todo failed:', e);
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const open = todos.filter((t) => !t.completed && !pending.has(t.id));

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
              Tasks
            </div>
            <PreviewBadge theme={theme} status="real" note={`${open.length} open`} />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            What's owed
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 20px 30px' }}>
        {open.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              fontFamily: theme.serif,
              fontStyle: 'italic',
              fontSize: 14,
              color: theme.muted,
            }}
          >
            Nothing on your plate.
            <br />
            <span style={{ fontSize: 12 }}>
              Tasks appear here after a Capture memo.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {open.map((t) => {
              const dueAt = whenLabel(t.due_at);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'rgba(184,150,107,0.06)',
                    border: `0.5px solid ${theme.line}`,
                    borderRadius: 12,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: theme.sans,
                    color: theme.paper,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      borderRadius: 5,
                      border: `1.5px solid ${theme.gold}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    <div style={{ fontSize: 14, color: theme.paper }}>{t.label}</div>
                    {(dueAt || t.detail) && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: dueColor(theme, t.due_at),
                          fontStyle: 'italic',
                          fontFamily: theme.serif,
                        }}
                      >
                        {[dueAt, t.detail].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
