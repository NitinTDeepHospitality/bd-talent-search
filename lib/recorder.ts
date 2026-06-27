// Browser MediaRecorder helper. Returns a controller you can stop to get
// the final Blob.
//
// Why the extra machinery (state + level callbacks + silence detection):
// Belinda is on iPad Safari, where the mic-permission prompt can be
// missed, MediaRecorder can produce a valid Blob with no audio in it
// (muted mic, system input switched away), and the recorder UI used to
// give zero feedback while any of that was happening. Now the recorder
// reports its lifecycle so the UI can show "Waiting for mic permission",
// "Recording" with a real-time level meter, and "No audio detected" if
// nothing is reaching the input for ~3 seconds.

export type RecorderState =
  | 'pending-permission' // getUserMedia in flight
  | 'recording' // actively recording, audio detected
  | 'silent' // recording but no audio detected for SILENCE_GRACE_MS
  | 'stopped';

export type RecorderCallbacks = {
  /** Called whenever state transitions. */
  onState?: (s: RecorderState) => void;
  /**
   * Called ~10×/s with the current RMS audio level in [0, 1]. Use it to
   * drive a waveform / level meter so the user sees the app is hearing
   * them.
   */
  onLevel?: (level: number) => void;
};

export type RecorderController = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

const SILENCE_THRESHOLD = 0.01; // RMS below this = effectively quiet
const SILENCE_GRACE_MS = 3000; // how long quiet must persist to fire "silent"

export async function startRecording(
  callbacks: RecorderCallbacks = {},
): Promise<RecorderController> {
  callbacks.onState?.('pending-permission');

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Pick the first MIME type the browser supports. Whisper can ingest webm
  // and mp4 directly; both come out of MediaRecorder on modern browsers.
  // iOS Safari only supports audio/mp4 — order matters when iterating.
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

  // Web Audio analyser for real-time level + silence detection. We sample
  // the input via AnalyserNode rather than the recorder itself because
  // MediaRecorder doesn't expose levels at all.
  const AudioCtor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let levelTimer: ReturnType<typeof setInterval> | null = null;
  let lastLoudAt = Date.now();
  let silenceFired = false;
  let stateNow: RecorderState = 'recording';

  if (AudioCtor) {
    audioCtx = new AudioCtor();
    // iOS Safari may suspend new contexts until a user gesture; resume() is
    // a no-op when it's already running.
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {
        /* ignore */
      });
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    levelTimer = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      // RMS over the buffer, normalised from [0..255] (centred at 128) to
      // [0..1].
      let sumSquares = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / buf.length);
      callbacks.onLevel?.(rms);

      if (rms > SILENCE_THRESHOLD) {
        lastLoudAt = Date.now();
        if (stateNow === 'silent') {
          stateNow = 'recording';
          callbacks.onState?.('recording');
          silenceFired = false;
        }
      } else if (
        !silenceFired &&
        Date.now() - lastLoudAt > SILENCE_GRACE_MS &&
        stateNow !== 'silent'
      ) {
        stateNow = 'silent';
        silenceFired = true;
        callbacks.onState?.('silent');
      }
    }, 100);
  }

  // Pass timeslice so iOS Safari emits dataavailable events during the
  // recording (not just on stop). Without this, the recorder can sit
  // silent for the whole take and we wouldn't know it had failed mid-way.
  recorder.start(250);
  callbacks.onState?.('recording');

  const cleanup = () => {
    if (levelTimer) clearInterval(levelTimer);
    levelTimer = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {
        /* ignore */
      });
      audioCtx = null;
    }
    stream.getTracks().forEach((t) => t.stop());
    callbacks.onState?.('stopped');
  };

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
