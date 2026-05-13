// Browser MediaRecorder helper. Returns a controller you can stop to get
// the final Blob.

export type RecorderController = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

export async function startRecording(): Promise<RecorderController> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Pick the first MIME type the browser supports. Whisper can ingest webm
  // and mp4 directly; both come out of MediaRecorder on modern browsers.
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t));

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  const cleanup = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
    cancel: () => {
      try {
        recorder.stop();
      } finally {
        cleanup();
      }
    },
  };
}

export async function transcribe(audio: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('audio', audio);
  const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`transcribe failed: ${res.status} ${detail}`);
  }
  const { text } = (await res.json()) as { text: string };
  return text;
}
