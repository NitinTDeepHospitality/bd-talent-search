// POST /api/transcribe — forwards browser-recorded audio to OpenAI Whisper.
// Auth is enforced in proxy.ts (unauth /api/* gets 401), so by the time we
// run, the caller is signed in.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not set' },
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
  // Whisper needs a filename hint to detect the format. MediaRecorder usually
  // produces webm/opus; if the browser sends mp4 instead, the extension is
  // still in the right ballpark for Whisper's autodetect.
  upstream.append('file', audio, 'recording.webm');
  upstream.append('model', 'whisper-1');
  upstream.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
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
