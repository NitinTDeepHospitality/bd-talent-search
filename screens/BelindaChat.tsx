'use client';

import { useEffect, useRef, useState } from 'react';
import type { Theme, VoiceLevel } from '@/lib/theme';
import {
  type Candidate,
  type ChatMessage,
  BELINDA_CHAT_SEED,
  BELINDA_RESPONSES,
  RESOURCES,
} from '@/lib/data';

function Bubble({ theme, role, text }: { theme: Theme; role: 'me' | 'belinda'; text: string }) {
  const isMe = role === 'me';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: isMe ? '10px 14px' : '12px 16px',
          borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isMe ? theme.gold : 'rgba(245,239,230,0.06)',
          border: isMe ? 'none' : `0.5px solid ${theme.lineDark}`,
          color: isMe ? theme.bg : theme.paper,
          fontFamily: isMe ? theme.sans : theme.serif,
          fontSize: isMe ? 13 : 15,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble({ theme }: { theme: Theme }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '4px 18px 18px 18px',
          background: 'rgba(245,239,230,0.06)',
          border: `0.5px solid ${theme.lineDark}`,
          display: 'flex',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: theme.gold,
              animation: `bdpulse 1.2s ${i * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function BelindaChat({
  theme,
  seedCandidate,
  onClose,
}: {
  theme: Theme;
  voice: VoiceLevel;
  seedCandidate?: Candidate;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const base: ChatMessage[] = [...BELINDA_CHAT_SEED];
    if (seedCandidate) {
      base.push({
        role: 'me',
        text: `Tell me about ${seedCandidate.name.split(' ')[0]} — would she fit the Carlyle brief?`,
      });
      const key = seedCandidate.name.toLowerCase().split(' ')[0];
      const lines = BELINDA_RESPONSES[key] || BELINDA_RESPONSES.default;
      lines.forEach((t) => base.push({ role: 'belinda', text: t }));
    }
    return base;
  });
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const send = (text?: string) => {
    const t = text || draft;
    if (!t.trim()) return;
    setMessages((m) => [...m, { role: 'me', text: t }]);
    setDraft('');
    setTyping(true);
    const lowered = t.toLowerCase();
    let key = 'default';
    for (const k of Object.keys(BELINDA_RESPONSES)) {
      if (lowered.includes(k)) {
        key = k;
        break;
      }
    }
    const lines = BELINDA_RESPONSES[key];
    lines.forEach((line, i) => {
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'belinda', text: line }]);
        if (i === lines.length - 1) setTyping(false);
      }, 700 + i * 900);
    });
  };

  const suggestions = [
    'Who would you pair with a family-owned boutique?',
    'How do you read fit?',
    "What's your gut-check process?",
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.sans,
        color: theme.paper,
      }}
    >
      <div
        style={{
          padding: '58px 20px 14px',
          borderBottom: `0.5px solid ${theme.line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: `url(${RESOURCES.belinda}) center 20%/cover`,
            border: `0.5px solid ${theme.gold}`,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 20,
              color: theme.paper,
              fontWeight: 400,
            }}
          >
            Belinda <span style={{ fontStyle: 'italic', color: theme.gold }}>AI</span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: theme.muted,
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            <span style={{ color: '#8fcf82' }}>●</span> 40 years, on call
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((m, i) => (
          <Bubble key={i} theme={theme} role={m.role} text={m.text} />
        ))}
        {typing && <TypingBubble theme={theme} />}
      </div>

      <div
        style={{
          padding: '8px 20px 10px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(184,150,107,0.08)',
              border: `0.5px solid ${theme.line}`,
              color: theme.goldLight,
              fontSize: 11,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontFamily: theme.sans,
              letterSpacing: 0.2,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '10px 16px 30px',
          borderTop: `0.5px solid ${theme.line}`,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask her anything…"
          style={{
            flex: 1,
            background: theme.surface,
            border: `0.5px solid ${theme.line}`,
            borderRadius: 22,
            padding: '12px 18px',
            color: theme.paper,
            fontFamily: theme.sans,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: theme.gold,
            color: theme.bg,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 8l12-6-4 14-2-6-6-2z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
