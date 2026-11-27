/// <reference lib="webworker" />
// Runs the Kokoro neural voice (82M parameters, Apache-2.0) in a worker so the page stays smooth.
// Privacy: only the model weights are downloaded (once, then cached by the browser). The text is
// turned into speech here, on the device; it is never sent anywhere.
//
// One job runs at a time (the model cannot run two at once). Between sentences the worker picks
// the most urgent job: what the child asked to hear first, then answers prepared in advance.
import { env, KokoroTTS } from 'kokoro-js';
import ortWasm from 'sprout-ort-wasm?url';
import ortMjs from 'sprout-ort-mjs?url';
import { speechChunks } from './voiceText';

// The speech engine comes from this app, never from a CDN (see vite.config.ts).
env.wasmPaths = { wasm: ortWasm, mjs: ortMjs };

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

type In =
  | { type: 'warm' }
  | { type: 'job'; key: string; text: string; voice: string; speed: number; urgent: boolean }
  | { type: 'promote'; key: string }
  | { type: 'drop'; key: string };

interface Job { key: string; chunks: string[]; next: number; voice: string; speed: number; urgent: boolean; seq: number }

let tts: Promise<KokoroTTS> | null = null;
const jobs = new Map<string, Job>();
let seq = 0;
let running = false;

function load(): Promise<KokoroTTS> {
  tts ??= KokoroTTS.from_pretrained(MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') postMessage({ type: 'progress', progress: p.progress });
    },
  }).catch((e) => { tts = null; throw e; });
  return tts;
}

/** Urgent jobs first; within each group the newest wins (the newest answer is the one a child taps). */
function pick(): Job | undefined {
  let best: Job | undefined;
  for (const j of jobs.values()) {
    if (!best) best = j;
    else if (j.urgent !== best.urgent) { if (j.urgent) best = j; }
    else if (j.seq > best.seq) best = j;
  }
  return best;
}

async function run(): Promise<void> {
  if (running) return;
  running = true;
  try {
    let t: KokoroTTS;
    try {
      t = await load();
    } catch (err) {
      // Loading failed (offline, blocked, out of memory): nothing can be spoken. It may work later.
      jobs.clear();
      postMessage({ type: 'error', message: String(err) });
      return;
    }
    postMessage({ type: 'ready' });
    for (let j = pick(); j; j = pick()) {
      const index = j.next++;
      if (j.next >= j.chunks.length) jobs.delete(j.key);
      try {
        const audio = await t.generate(j.chunks[index], { voice: j.voice as never, speed: j.speed });
        const samples = new Float32Array(audio.audio);
        postMessage({ type: 'chunk', key: j.key, index, count: j.chunks.length, samples, rate: audio.sampling_rate }, [samples.buffer]);
      } catch (err) {
        // One sentence failed: give up on that answer only; the voice keeps working for others.
        jobs.delete(j.key);
        postMessage({ type: 'jobError', key: j.key, message: String(err) });
      }
    }
  } finally {
    running = false;
  }
}

self.onmessage = (e: MessageEvent<In>) => {
  const m = e.data;
  if (m.type === 'drop') { jobs.delete(m.key); return; }
  // The child wants to hear a prepared answer now: its remaining sentences go first.
  if (m.type === 'promote') { const j = jobs.get(m.key); if (j) { j.urgent = true; j.seq = ++seq; } return; }
  if (m.type === 'job') {
    const have = jobs.get(m.key);
    if (have) { have.urgent ||= m.urgent; have.seq = ++seq; }
    else {
      const chunks = speechChunks(m.text);
      if (!chunks.length) { postMessage({ type: 'chunk', key: m.key, index: -1, count: 0 }); return; }
      jobs.set(m.key, { key: m.key, chunks, next: 0, voice: m.voice, speed: m.speed, urgent: m.urgent, seq: ++seq });
    }
  }
  void run();
};
