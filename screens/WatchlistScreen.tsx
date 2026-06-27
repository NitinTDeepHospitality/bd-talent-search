'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import type { Candidate, CandidateChange, LinkedInImport } from '@/lib/data';
import { PreviewBadge } from '@/components/PreviewBadge';
import { TierMark } from '@/components/Shared';
import { importLinkedinExport, type ImportResult } from '@/lib/api';

// Days since lastContactAt, formatted compactly. Returns null if no date.
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

function freshnessLabel(days: number | null): { label: string; color: string } {
  if (days == null) return { label: 'no contact logged', color: '#f0a3a3' };
  if (days <= 14) return { label: `Spoke ${days}d ago`, color: '#bfe5b6' };
  if (days <= 60) return { label: `Spoke ${days}d ago`, color: '#e8d18a' };
  if (days < 365)
    return { label: `Spoke ${Math.round(days / 30)} mo ago`, color: '#f0a3a3' };
  return {
    label: `Spoke ${(days / 365).toFixed(1).replace(/\.0$/, '')} yr ago`,
    color: '#f0a3a3',
  };
}

function relativeAge(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? '1 hr ago' : `${h} hrs ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const mo = Math.round(d / 30);
  return mo === 1 ? '1 month ago' : `${mo} months ago`;
}

export function WatchlistScreen({
  theme,
  candidates,
  changes = [],
  latestImport = null,
  onClose,
  onOpenCandidate,
}: {
  theme: Theme;
  candidates: Candidate[];
  changes?: CandidateChange[];
  latestImport?: LinkedInImport | null;
  onClose: () => void;
  onOpenCandidate: (c: Candidate) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Map candidate dbId -> count of unacknowledged changes, so each row
  // knows whether to render a MOVED pill without re-filtering changes
  // per render.
  const changesByCandidate = new Map<string, CandidateChange[]>();
  for (const ch of changes) {
    const arr = changesByCandidate.get(ch.candidateId) ?? [];
    arr.push(ch);
    changesByCandidate.set(ch.candidateId, arr);
  }

  const watched = candidates
    .filter((c) => c.isWatched)
    .slice()
    .sort((a, b) => {
      // Candidates with unacked changes float to the top; otherwise
      // most-recent-contact first.
      const ac = a.dbId ? changesByCandidate.get(a.dbId)?.length ?? 0 : 0;
      const bc = b.dbId ? changesByCandidate.get(b.dbId)?.length ?? 0 : 0;
      if (ac !== bc) return bc - ac;
      const ad = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
      const bd = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
      return bd - ad;
    });

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await importLinkedinExport(f);
      setImportResult(result);
      router.refresh();
    } catch (err) {
      console.error('[BD] linkedin import failed:', err);
      const msg = err instanceof Error ? err.message : 'unknown error';
      setImportError(
        msg.includes('413')
          ? 'File too large (max 20MB).'
          : msg.includes('400')
            ? 'That doesn’t look like a LinkedIn Connections export. Make sure you uploaded Connections.csv from the ZIP.'
            : 'Import failed. Try again.',
      );
    } finally {
      setImporting(false);
    }
  };

  const lastImportAge = relativeAge(latestImport?.importedAt ?? null);

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
              Watchlist
            </div>
            <PreviewBadge
              theme={theme}
              status="real"
              note={`${watched.length} watched · ${changes.length} unread`}
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
            Your golden{' '}
            <span style={{ fontStyle: 'italic', color: theme.goldLight }}>list</span>
          </div>
        </div>
      </div>

      {/* LinkedIn import controls — the engine behind change detection */}
      <div
        style={{
          margin: '0 20px 18px',
          padding: 14,
          background: 'rgba(184,150,107,0.06)',
          border: `0.5px solid ${theme.line}`,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1.8,
              color: theme.gold,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Refresh from LinkedIn
          </div>
          {lastImportAge && (
            <div style={{ fontSize: 10, color: theme.muted }}>
              Last: {lastImportAge}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: theme.muted,
            fontFamily: theme.serif,
            fontStyle: 'italic',
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Settings &rarr; Data Privacy &rarr; <strong style={{ color: theme.paper, fontStyle: 'normal' }}>Get a copy of your data</strong> &rarr;
          request Connections. LinkedIn emails you a ZIP within ~24 hours.
          Upload <strong style={{ color: theme.paper, fontStyle: 'normal' }}>Connections.csv</strong> here — I&rsquo;ll diff against your network and surface every move.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <button
          onClick={onPickFile}
          disabled={importing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 16px',
            background: importing ? 'rgba(184,150,107,0.25)' : theme.gold,
            color: importing ? theme.muted : theme.bg,
            border: 'none',
            borderRadius: 999,
            fontFamily: theme.sans,
            fontSize: 11.5,
            letterSpacing: 1.4,
            fontWeight: 600,
            textTransform: 'uppercase',
            cursor: importing ? 'wait' : 'pointer',
            minHeight: 42,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {importing ? 'Importing…' : 'Upload Connections.csv'}
        </button>

        {importResult && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(143,207,130,0.10)',
              border: '0.5px solid rgba(143,207,130,0.4)',
              borderRadius: 10,
              fontSize: 12,
              color: '#bfe5b6',
              lineHeight: 1.45,
            }}
          >
            Matched <strong>{importResult.matchedRows}</strong> of {importResult.totalRows.toLocaleString()} connections.{' '}
            {importResult.changesDetected > 0
              ? `Detected ${importResult.changesDetected} ${importResult.changesDetected === 1 ? 'change' : 'changes'}. Watched candidates who moved will appear at the top.`
              : 'No changes since last refresh.'}
          </div>
        )}
        {importError && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(226,91,91,0.10)',
              border: '0.5px solid rgba(226,91,91,0.4)',
              borderRadius: 10,
              fontSize: 12,
              color: '#f0a3a3',
              fontStyle: 'italic',
              fontFamily: theme.serif,
            }}
          >
            {importError}
          </div>
        )}
      </div>

      {watched.length === 0 ? (
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
          No one on the watchlist yet.
          <br />
          Open any candidate&rsquo;s profile and tap the{' '}
          <span style={{ color: theme.gold }}>★</span> to start watching.
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
          {watched.map((c) => {
            const days = daysSince(c.lastContactAt);
            const fresh = freshnessLabel(days);
            const candidateChanges = c.dbId
              ? changesByCandidate.get(c.dbId) ?? []
              : [];
            const hasMoved = candidateChanges.length > 0;
            return (
              <button
                key={c.id}
                onClick={() => onOpenCandidate(c)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: hasMoved
                    ? 'rgba(226,91,91,0.10)'
                    : 'rgba(245,239,230,0.04)',
                  border: hasMoved
                    ? '0.5px solid rgba(226,91,91,0.45)'
                    : `0.5px solid ${theme.lineDark}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignItems: 'center',
                }}
              >
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
                    {hasMoved && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: 'rgba(226,91,91,0.20)',
                          border: '0.5px solid rgba(226,91,91,0.6)',
                          fontSize: 8.5,
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                          color: '#f0a3a3',
                          fontWeight: 700,
                          fontFamily: theme.sans,
                        }}
                      >
                        ● Moved
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: theme.muted,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.current}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <TierMark theme={theme} tier={c.belindaTier} />
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: 0.8,
                        color: fresh.color,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {fresh.label}
                    </span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, color: theme.gold }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 2.5l2.95 6.6 7.05.8-5.3 4.85 1.5 7.25L12 18.4l-6.2 3.6 1.5-7.25L2 9.9l7.05-.8L12 2.5z"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
