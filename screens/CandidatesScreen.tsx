'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import type { Candidate, CandidateChange } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';
import { TierMark } from '@/components/Shared';
import { bulkDeleteCandidates } from '@/lib/api';

function relativeContact(iso: string | null | undefined): {
  label: string;
  color: string;
} {
  if (!iso) return { label: 'never spoken', color: '#f0a3a3' };
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return { label: 'never spoken', color: '#f0a3a3' };
  const days = Math.floor(ms / 86400000);
  if (days < 1) return { label: 'today', color: '#bfe5b6' };
  if (days === 1) return { label: 'yesterday', color: '#bfe5b6' };
  if (days <= 14) return { label: `${days}d ago`, color: '#bfe5b6' };
  if (days <= 60) return { label: `${days}d ago`, color: '#e8d18a' };
  if (days < 365) return { label: `${Math.round(days / 30)}mo ago`, color: '#f0a3a3' };
  return {
    label: `${(days / 365).toFixed(1).replace(/\.0$/, '')}yr ago`,
    color: '#f0a3a3',
  };
}

const TIER_RANK: Record<Candidate['belindaTier'], number> = {
  'Black Book': 0,
  'Inner circle': 1,
  Watching: 2,
};

type SortKey = 'recent' | 'tier' | 'name';

export function CandidatesScreen({
  theme,
  candidates,
  changes = [],
  onClose,
  onOpenCandidate,
  onAddCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  /** Unacknowledged changes — drives the MOVED pill. */
  changes?: CandidateChange[];
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
  onAddCandidate: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  // Multi-select state. Off by default; tapping "Select" turns it on
  // and changes the row tap behaviour from "open detail" to "toggle".
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const toggleSelected = (dbId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dbId)) next.delete(dbId);
      else next.add(dbId);
      return next;
    });
  };

  const onBulkDelete = async () => {
    if (selectedIds.size === 0 || deleting) return;
    const n = selectedIds.size;
    const ok = window.confirm(
      `Delete ${n} candidate${n === 1 ? '' : 's'} from your network?\n\nThis removes their signals, tags, career history, and any shortlist references. It cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteCandidates(ids);
      exitSelection();
      router.refresh();
      // Quiet success — server-rendered list will be empty of these.
      // Only alert when something unexpected happened (count mismatch).
      if (result.deleted < ids.length) {
        window.alert(
          `Deleted ${result.deleted} of ${ids.length}. The rest were already gone.`,
        );
      }
    } catch (e) {
      console.error('[BD] bulk-delete failed:', e);
      window.alert('Delete failed. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Map dbId → unacked change count so each row can render a MOVED pill
  // without re-filtering changes per render.
  const movedByDbId = useMemo(() => {
    const m = new Map<string, number>();
    for (const ch of changes) {
      m.set(ch.candidateId, (m.get(ch.candidateId) ?? 0) + 1);
    }
    return m;
  }, [changes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = candidates.filter((c) => {
      if (!q) return true;
      const hay = [
        c.name,
        c.current,
        c.location,
        c.currentLocation ?? '',
        c.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...matches].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'tier') {
        const ta = TIER_RANK[a.belindaTier] ?? 9;
        const tb = TIER_RANK[b.belindaTier] ?? 9;
        if (ta !== tb) return ta - tb;
        return (b.belindaRating ?? 0) - (a.belindaRating ?? 0);
      }
      // recent (default): unacked changes float to the top, then most
      // recent contact, then highest rating.
      const ma = a.dbId ? movedByDbId.get(a.dbId) ?? 0 : 0;
      const mb = b.dbId ? movedByDbId.get(b.dbId) ?? 0 : 0;
      if (ma !== mb) return mb - ma;
      const ad = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
      const bd = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (b.belindaRating ?? 0) - (a.belindaRating ?? 0);
    });
    return sorted;
  }, [candidates, query, sort, movedByDbId]);

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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2,
                color: theme.gold,
                textTransform: 'uppercase',
              }}
            >
              Candidates
            </div>
            <PreviewBadge
              theme={theme}
              status="real"
              note={`${candidates.length} in your network`}
            />
          </div>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            Your <span style={{ fontStyle: 'italic', color: theme.goldLight }}>network</span>
          </div>
        </div>
      </div>

      {/* Add + search */}
      <div style={{ padding: '0 20px 12px' }}>
        <button
          onClick={onAddCandidate}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 16px',
            background: theme.gold,
            color: theme.bg,
            border: 'none',
            borderRadius: 12,
            fontFamily: theme.sans,
            fontSize: 12,
            letterSpacing: 1.5,
            fontWeight: 600,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Add a candidate
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, hotel, tag…"
          style={{
            width: '100%',
            marginTop: 10,
            background: 'rgba(245,239,230,0.04)',
            border: `0.5px solid ${theme.lineDark}`,
            borderRadius: 10,
            padding: '10px 14px',
            color: theme.paper,
            fontFamily: theme.sans,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Sort pills + Select toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 20px 12px',
          fontFamily: theme.sans,
        }}
      >
        {(
          [
            { id: 'recent', label: 'Recent' },
            { id: 'tier', label: 'Tier' },
            { id: 'name', label: 'A–Z' },
          ] as Array<{ id: SortKey; label: string }>
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSort(opt.id)}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              background: sort === opt.id ? theme.gold : 'transparent',
              color: sort === opt.id ? theme.bg : theme.paper,
              border: `0.5px solid ${sort === opt.id ? theme.gold : theme.line}`,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: sort === opt.id ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {query && (
          <div style={{ fontSize: 10, color: theme.muted, alignSelf: 'center' }}>
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </div>
        )}
        <button
          onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          style={{
            padding: '5px 11px',
            borderRadius: 999,
            background: selectionMode ? theme.gold : 'transparent',
            color: selectionMode ? theme.bg : theme.paper,
            border: `0.5px solid ${selectionMode ? theme.gold : theme.line}`,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontWeight: selectionMode ? 600 : 400,
          }}
        >
          {selectionMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            margin: '20px',
            padding: 28,
            border: `0.5px dashed ${theme.line}`,
            borderRadius: 14,
            textAlign: 'center',
            color: theme.muted,
            fontFamily: theme.serif,
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {query
            ? `No candidates match "${query}".`
            : 'No candidates yet. Tap "Add a candidate" to dictate or upload a CV.'}
        </div>
      ) : (
        <div
          style={{
            padding: '0 20px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filtered.map((c) => {
            const contact = relativeContact(c.lastContactAt);
            const moved = c.dbId ? (movedByDbId.get(c.dbId) ?? 0) > 0 : false;
            const isSelected = c.dbId ? selectedIds.has(c.dbId) : false;
            // In selection mode a candidate without a dbId (i.e. a mock
            // fallback row) can't be deleted — disable the tap entirely
            // so the user doesn't think they ticked something.
            const selectable = selectionMode && Boolean(c.dbId);
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (selectable) toggleSelected(c.dbId!);
                  else if (!selectionMode) onOpenCandidate(c);
                }}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: isSelected
                    ? 'rgba(184,150,107,0.18)'
                    : moved
                      ? 'rgba(226,91,91,0.10)'
                      : 'rgba(245,239,230,0.04)',
                  border: isSelected
                    ? `0.5px solid ${theme.gold}`
                    : moved
                      ? '0.5px solid rgba(226,91,91,0.45)'
                      : `0.5px solid ${theme.lineDark}`,
                  borderRadius: 12,
                  cursor: selectionMode && !selectable ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  alignItems: 'center',
                  opacity: selectionMode && !selectable ? 0.5 : 1,
                }}
              >
                {selectionMode && (
                  <div
                    aria-hidden
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: `1.5px solid ${isSelected ? theme.gold : theme.line}`,
                      background: isSelected ? theme.gold : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.bg,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6.5l2.5 2.5L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                )}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: c.photo
                      ? `url(${c.photo}) center/cover`
                      : 'rgba(184,150,107,0.18)',
                    border: `0.5px solid ${theme.gold}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontSize: 16,
                        color: theme.paper,
                        fontWeight: 400,
                      }}
                    >
                      {c.name}
                    </div>
                    {c.isWatched && (
                      <span style={{ color: theme.gold, fontSize: 12 }} title="On watchlist">
                        ★
                      </span>
                    )}
                    {moved && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: 'rgba(226,91,91,0.20)',
                          border: '0.5px solid rgba(226,91,91,0.6)',
                          fontSize: 8.5,
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                          color: '#f0a3a3',
                          fontWeight: 700,
                        }}
                      >
                        ● Moved
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.muted,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.current || '—'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <TierMark theme={theme} tier={c.belindaTier} />
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: 0.8,
                        color: contact.color,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {contact.label}
                    </span>
                  </div>
                </div>
                <svg
                  width="10"
                  height="14"
                  viewBox="0 0 10 14"
                  style={{ flexShrink: 0 }}
                  aria-hidden
                >
                  <path
                    d="M2 2l6 5-6 5"
                    stroke={theme.gold}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            );
          })}
          {/* Spacer so the last row clears the sticky action bar when in
              selection mode — sized to bar height + safe-area. */}
          {selectionMode && <div style={{ height: 92 }} />}
        </div>
      )}

      {/* Sticky bulk-action bar — visible only in selection mode.
          Anchored to the bottom of the AddCandidate-style scroll
          container so it stays in view as Belinda scrolls. */}
      {selectionMode && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 0,
            padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
            background: 'rgba(14,12,10,0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `0.5px solid ${theme.gold}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              fontFamily: theme.sans,
              fontSize: 12,
              color: theme.paper,
              letterSpacing: 0.3,
            }}
          >
            <span style={{ fontWeight: 600 }}>{selectedIds.size}</span>{' '}
            <span style={{ color: theme.muted }}>
              selected{selectedIds.size === 0 ? ' — tap candidates to add' : ''}
            </span>
          </div>
          <button
            onClick={exitSelection}
            style={{
              padding: '11px 14px',
              background: 'transparent',
              color: theme.muted,
              border: `0.5px solid ${theme.line}`,
              borderRadius: 999,
              fontSize: 10.5,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: theme.sans,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onBulkDelete}
            disabled={selectedIds.size === 0 || deleting}
            style={{
              padding: '11px 16px',
              background:
                selectedIds.size === 0 || deleting
                  ? 'rgba(226,91,91,0.20)'
                  : '#e25b5b',
              color:
                selectedIds.size === 0 || deleting ? theme.muted : '#fff',
              border: 'none',
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor:
                selectedIds.size === 0 ? 'not-allowed' : deleting ? 'wait' : 'pointer',
              fontFamily: theme.sans,
            }}
          >
            {deleting
              ? 'Deleting…'
              : selectedIds.size === 0
                ? 'Delete'
                : `Delete ${selectedIds.size}`}
          </button>
        </div>
      )}
    </div>
  );
}
