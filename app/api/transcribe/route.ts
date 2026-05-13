// POST /api/transcribe — forwards browser-recorded audio to a Whisper
// endpoint. Currently using Groq (free tier, same model). Auth is enforced
// in proxy.ts (unauth /api/* gets 401), so by the time we run, the caller
// is signed in.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not set' },
      { status: 500 },
    );
  }

  const incoming = await request.formData();
  const audio = incoming.get('audio');
  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { error: 'audio field missing or not a file' },
      { status: 400 },
    );
  }

  const upstream = new FormData();
  // Filename hint so Whisper detects the container. MediaRecorder in the
  // browser produces webm/opus on Chrome and mp4 on Safari — webm covers
  // both for autodetect purposes since the magic bytes win over the name.
  upstream.append('file', audio, 'recording.webm');
  upstream.append('model', WHISPER_MODEL);
  upstream.append('response_format', 'json');

  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: 'whisper_failed', status: res.status, detail },
      { status: 502 },
    );
  }

  const { text } = (await res.json()) as { text: string };
  return NextResponse.json({ text });
}
