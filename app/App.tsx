'use client';

import { useState } from 'react';
import { THEMES, VOICE_LEVELS, DENSITIES } from '@/lib/theme';
import { JOBS, type Candidate, type Opportunity } from '@/lib/data';
import { IOSDevice } from '@/components/IOSDevice';
import { Wordmark } from '@/components/Shared';
import { TweaksPanel, type Tweaks } from '@/components/TweaksPanel';
import { HomeScreen, type VoiceQuery } from '@/screens/HomeScreen';
import { VoiceResult } from '@/screens/VoiceResult';
import { CaptureScreen } from '@/screens/CaptureScreen';
import { transcribe } from '@/lib/recorder';
import { parseQuery } from '@/lib/api';
import { OpportunityScreen } from '@/screens/OpportunityScreen';
import { SwipeScreen } from '@/screens/SwipeScreen';
import { DetailScreen } from '@/screens/DetailScreen';
import { MatchScreen } from '@/screens/MatchScreen';
import { BelindaChat } from '@/screens/BelindaChat';

const TWEAK_DEFAULTS: Tweaks = {
  theme: 'editorial',
  density: 'photo',
  role: 'General Manager',
  voice: 'subtle',
};

type Route =
  | { name: 'home' }
  | { name: 'voice' }
  | { name: 'capture' }
  | { name: 'opps' }
  | { name: 'swipe' }
  | { name: 'detail'; candidate: Candidate }
  | { name: 'match'; candidate: Candidate }
  | { name: 'chat'; candidate?: Candidate };

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'voice', label: 'Voice' },
  { id: 'capture', label: 'Capture' },
  { id: 'opps', label: 'Opps' },
  { id: 'swipe', label: 'Swipe' },
  { id: 'chat', label: 'Ask' },
] as const;

const CAPTIONS: Record<string, string> = {
  home: "01 — Belinda's morning",
  voice: '02 — Voice search',
  capture: '03 — Capture intel after a meeting',
  opps: '04 — Opportunities the world surfaces',
  swipe: '05 — Curated candidates',
  detail: '06 — Full profile',
  match: '07 — A match worth a conversation',
  chat: '08 — Ask Belinda',
};

export default function App({
  initialCandidates,
  initialOpportunities = [],
}: {
  initialCandidates: Candidate[];
  initialOpportunities?: Opportunity[];
}) {
  const candidates = initialCandidates;
  const opportunities = initialOpportunities;
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [lastCandidate, setLastCandidate] = useState<Candidate>(candidates[0]);
  // Voice flow has two async phases — transcription and parse-query.
  // null fields mean "still working"; a value (including '' for transcript)
  // means that phase finished. matchedIds: null = parse-query in flight,
  // [] = parse-query failed or returned nothing.
  const [voiceResult, setVoiceResult] = useState<{
    transcript: string | null;
    matchedIds: string[] | null;
    reasoning: string | null;
    tags: string[] | null;
  }>({ transcript: null, matchedIds: null, reasoning: null, tags: null });

  const theme = THEMES[tweaks.theme] || THEMES.editorial;
  const voice = VOICE_LEVELS[tweaks.voice] || VOICE_LEVELS.prominent;
  const density = DENSITIES[tweaks.density] || DENSITIES.photo;

  const update = (k: keyof Tweaks, v: string) => {
    setTweaks((t) => ({ ...t, [k]: v }));
  };

  const goHome = () => setRoute({ name: 'home' });

  const handleVoice = async (q: VoiceQuery) => {
    setRoute({ name: 'voice' });
    setVoiceResult({
      transcript: null,
      matchedIds: null,
      reasoning: null,
      tags: null,
    });

    let transcript: string;
    if ('text' in q) {
      transcript = q.text;
    } else {
      try {
        transcript = await transcribe(q.audio);
      } catch (e) {
        console.error('[BD] transcribe failed:', e);
        setVoiceResult({
          transcript: '',
          matchedIds: [],
          reasoning: '',
          tags: [],
        });
        return;
      }
    }

    // Transcript ready — show it while we wait on parse-query.
    setVoiceResult({
      transcript,
      matchedIds: null,
      reasoning: null,
      tags: null,
    });

    try {
      const parsed = await parseQuery(transcript);
      setVoiceResult({
        transcript,
        matchedIds: parsed.matchedIds,
        reasoning: parsed.reasoning,
        tags: parsed.tags,
      });
    } catch (e) {
      console.error('[BD] parse-query failed:', e);
      setVoiceResult({
        transcript,
        matchedIds: [],
        reasoning:
          "I couldn't pull that apart — try rephrasing or check the logs.",
        tags: [],
      });
    }
  };
  const openDetail = (c: Candidate) => {
    setLastCandidate(c);
    setRoute({ name: 'detail', candidate: c });
  };
  const openMatch = (c: Candidate) => {
    setLastCandidate(c);
    setRoute({ name: 'match', candidate: c });
  };
  const openChat = (c?: Candidate) => {
    if (c) setLastCandidate(c);
    setRoute({ name: 'chat', candidate: c });
  };

  const screen = (() => {
    switch (route.name) {
      case 'home':
        return (
          <HomeScreen
            theme={theme}
            onVoice={handleVoice}
            onCapture={() => setRoute({ name: 'capture' })}
            onOpps={() => setRoute({ name: 'opps' })}
            onSwipe={() => setRoute({ name: 'swipe' })}
          />
        );
      case 'voice':
        return (
          <VoiceResult
            theme={theme}
            candidates={candidates}
            userTranscript={voiceResult.transcript}
            matchedIds={voiceResult.matchedIds}
            reasoning={voiceResult.reasoning}
            userTags={voiceResult.tags}
            onClose={goHome}
            onPickCandidate={openDetail}
            onSwipeAll={() => setRoute({ name: 'swipe' })}
          />
        );
      case 'capture':
        return <CaptureScreen theme={theme} onClose={goHome} />;
      case 'opps':
        return (
          <OpportunityScreen
            theme={theme}
            candidates={candidates}
            opportunities={opportunities}
            onClose={goHome}
            onOpenCandidate={openDetail}
          />
        );
      case 'detail':
        return (
          <DetailScreen
            theme={theme}
            voice={voice}
            candidate={route.candidate}
            onClose={goHome}
            onShortlist={() => openMatch(route.candidate)}
            onAsk={() => openChat(route.candidate)}
          />
        );
      case 'match':
        return (
          <MatchScreen
            theme={theme}
            candidate={route.candidate}
            job={JOBS[0]}
            onDismiss={goHome}
            onMessage={goHome}
            onAsk={() => openChat(route.candidate)}
          />
        );
      case 'chat':
        return (
          <BelindaChat
            theme={theme}
            voice={voice}
            seedCandidate={route.candidate}
            onClose={goHome}
          />
        );
      case 'swipe':
      default:
        return (
          <SwipeScreen
            theme={theme}
            voice={voice}
            density={density}
            role={tweaks.role}
            candidates={candidates}
            onReveal={openDetail}
            onMatch={openMatch}
            onBelindaAsk={openChat}
          />
        );
    }
  })();

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 30% 20%, #1a1512 0%, #0B0907 55%, #040302 100%)',
        padding: '40px 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: theme.sans,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <Wordmark theme={theme} size={11} />
        <div
          style={{
            marginTop: 14,
            fontSize: 10,
            letterSpacing: 3,
            color: theme.muted,
            textTransform: 'uppercase',
          }}
        >
          A concept for institutionalising Belinda&apos;s craft
        </div>
      </div>

      <div data-screen-label="iPhone">
        <IOSDevice width={402} height={860} dark>
          {screen}
        </IOSDevice>
      </div>

      <div
        style={{
          marginTop: 22,
          textAlign: 'center',
          fontFamily: theme.sans,
          fontSize: 11,
          color: theme.muted,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {CAPTIONS[route.name]}
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          gap: 0,
          flexWrap: 'wrap',
          justifyContent: 'center',
          background: 'rgba(184,150,107,0.06)',
          border: `0.5px solid ${theme.line}`,
          borderRadius: 999,
          padding: 4,
          maxWidth: 460,
        }}
      >
        {NAV_ITEMS.map((t) => {
          const active = route.name === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'chat') setRoute({ name: 'chat', candidate: lastCandidate });
                else setRoute({ name: t.id } as Route);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: active ? theme.gold : 'transparent',
                color: active ? theme.bg : theme.paper,
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.sans,
                fontSize: 11,
                letterSpacing: 1.3,
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setTweaksOpen((o) => !o)}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: tweaksOpen ? theme.gold : 'transparent',
            color: tweaksOpen ? theme.bg : theme.paper,
            border: 'none',
            cursor: 'pointer',
            fontFamily: theme.sans,
            fontSize: 11,
            letterSpacing: 1.3,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Tweaks
        </button>
      </div>

      {tweaksOpen && (
        <TweaksPanel
          theme={theme}
          tweaks={tweaks}
          update={update}
          onClose={() => setTweaksOpen(false)}
        />
      )}
    </div>
  );
}
