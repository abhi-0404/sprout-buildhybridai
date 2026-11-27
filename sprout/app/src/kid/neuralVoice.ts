// Main-thread side of the Kokoro voice. The worker turns text into speech one sentence at a time;
// this side keeps the finished sentences, plays them gaplessly through Web Audio, and prepares new
// answers in the background once the voice is loaded, so "Read to me" starts without a wait.

export const VOICE = 'af_heart'; // Kokoro's highest-rated voice: warm and clear.
// A brighter, younger, more playful sound for children: speech is made a little slow and played a
// little fast, which lifts the pitch (about 1.5 semitones) while the pace stays calm.
const SPEED = 0.86;
const LIFT = 1.09;
const KEEP = 8; // prepared answers kept in memory (about 1-2 MB each)

type Out =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'chunk'; key: string; index: number; count: number; samples?: Float32Array; rate?: number }
  | { type: 'jobError'; key: string; message: string }
  | { type: 'error'; message: string };

/** After a failed load, the voice is left alone this long before it may try again. */
const RETRY_MS = 60_000;

interface Entry { count?: number; chunks: Array<{ samples: Float32Array; rate: number } | undefined> }

interface Player {
  key: string;
  next: number;
  nextAt: number;
  started: boolean;
  playing: Set<AudioBufferSourceNode>;
  onStart: () => void;
  onEnd: () => void;
  onError: () => void;
}

/** True when this device can run the neural voice: Web Workers, WebAssembly, Web Audio, enough
 *  memory (4 GB or more where the browser says), and the user has not asked to save data. */
export function neuralVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const audio = 'AudioContext' in window || 'webkitAudioContext' in window;
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && audio
    && (nav.deviceMemory === undefined || nav.deviceMemory >= 4)
    && !nav.connection?.saveData;
}

/** Voice state on <html data-neural-voice>, for tests and for curious grown-ups in dev tools. */
function mark(state: 'loading' | 'ready' | 'speaking' | 'broken'): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.neuralVoice = state;
}

class NeuralVoice {
  private worker?: Worker;
  private ctx?: AudioContext;
  private player?: Player;
  private cache = new Map<string, Entry>();
  /** The newest answer asked to be prepared before the voice was loaded. */
  private wanted?: string;
  private brokenAt = 0;
  private listeners = new Set<() => void>();
  ready = false;
  /** Download progress of the model file in percent (0-100), while it downloads. */
  progress = 0;

  /** True for a while after the model failed to load (offline, blocked, out of memory). */
  get broken(): boolean {
    return this.brokenAt > 0 && Date.now() - this.brokenAt < RETRY_MS;
  }

  /** Calls `fn` whenever ready, broken or progress changes. Returns the unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(): void { for (const fn of this.listeners) fn(); }

  private start(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<Out>) => this.onMessage(e.data);
    w.onerror = () => { this.worker?.terminate(); this.worker = undefined; this.breakDown(); };
    this.worker = w;
    mark('loading');
    return w;
  }

  /** Downloads (first time) and loads the model in the background, without sound. */
  warm(): void {
    if (this.ready || this.broken) return;
    this.start().postMessage({ type: 'warm' });
  }

  /** Makes the speech for an answer in the background, once the voice is loaded. */
  prepare(text: string): void {
    if (this.broken || this.cache.has(text)) return;
    if (!this.ready) { this.wanted = text; return; }
    // Only the newest answer is worth preparing: stop half-made older ones (not the one playing).
    for (const [key, entry] of this.cache) {
      const complete = entry.count !== undefined && entry.chunks.filter(Boolean).length >= entry.count;
      if (!complete && key !== this.player?.key) this.forget(key);
    }
    this.request(text, false);
  }

  speak(text: string, cb: { onStart: () => void; onEnd: () => void; onError: () => void }): void {
    this.stop();
    // Create / resume the audio context inside the tap, or mobile browsers keep it silent.
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    // iOS: play like media, so the ring/silent switch does not mute the voice (Safari 16.4+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) { try { session.type = 'playback'; } catch { /* not supported */ } }
    this.ctx ??= new Ctx();
    void this.ctx.resume();
    this.player = { key: text, next: 0, nextAt: 0, started: false, playing: new Set(), ...cb };
    const cached = this.cache.get(text);
    if (cached) {
      // Move it to the newest place, so it is the last to be dropped from memory.
      this.cache.delete(text);
      this.cache.set(text, cached);
      this.start().postMessage({ type: 'promote', key: text });
    } else this.request(text, true);
    this.pump();
  }

  stop(): void {
    const p = this.player;
    if (!p) return;
    this.player = undefined;
    for (const s of p.playing) { s.onended = null; try { s.stop(); } catch { /* already stopped */ } }
    if (this.ready) mark('ready');
  }

  private forget(key: string): void {
    this.cache.delete(key);
    this.worker?.postMessage({ type: 'drop', key });
  }

  private request(text: string, urgent: boolean): void {
    this.cache.set(text, { chunks: [] });
    // Drop the oldest answers beyond the limit, never the one playing.
    for (const key of [...this.cache.keys()]) {
      if (this.cache.size <= KEEP) break;
      if (key !== this.player?.key && key !== text) this.forget(key);
    }
    this.start().postMessage({ type: 'job', key: text, text, voice: VOICE, speed: SPEED, urgent });
  }

  private breakDown(): void {
    this.brokenAt = Date.now();
    this.ready = false;
    this.cache.clear();
    mark('broken');
    const p = this.player;
    this.stop();
    this.emit();
    p?.onError();
  }

  private failPlayer(): void {
    const p = this.player;
    this.stop();
    p?.onError();
  }

  /** Plays every sentence that is ready, in order; ends when the last one has played. */
  private pump(): void {
    const p = this.player;
    const ctx = this.ctx;
    if (!p || !ctx) return;
    const entry = this.cache.get(p.key);
    if (!entry) { this.failPlayer(); return; }
    for (let c = entry.chunks[p.next]; c; c = entry.chunks[p.next]) {
      const buf = ctx.createBuffer(1, c.samples.length, c.rate);
      buf.copyToChannel(c.samples as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = LIFT;
      src.connect(ctx.destination);
      const at = Math.max(ctx.currentTime + 0.02, p.nextAt);
      src.start(at);
      p.nextAt = at + buf.duration / LIFT + 0.12; // a small breath between sentences
      p.playing.add(src);
      src.onended = () => { p.playing.delete(src); this.pump(); };
      p.next++;
      if (!p.started) { p.started = true; mark('speaking'); p.onStart(); }
    }
    if (entry.count !== undefined && p.next >= entry.count && p.playing.size === 0 && this.player === p) {
      this.player = undefined;
      mark('ready');
      p.onEnd();
    }
  }

  private onMessage(m: Out): void {
    if (m.type === 'progress') {
      const pct = Math.round(m.progress);
      if (pct !== this.progress) { this.progress = pct; this.emit(); }
      return;
    }
    if (m.type === 'ready') {
      if (this.ready) return;
      this.ready = true;
      this.brokenAt = 0;
      mark('ready');
      this.emit();
      const w = this.wanted;
      this.wanted = undefined;
      if (w) this.prepare(w);
      return;
    }
    if (m.type === 'error') { this.breakDown(); return; }
    if (m.type === 'jobError') {
      this.cache.delete(m.key);
      if (this.player?.key === m.key) this.failPlayer();
      return;
    }
    const entry = this.cache.get(m.key);
    if (!entry) return;
    entry.count = m.count;
    if (m.samples && m.rate) entry.chunks[m.index] = { samples: m.samples, rate: m.rate };
    if (this.player?.key === m.key) this.pump();
  }
}

let instance: NeuralVoice | undefined;
export const neuralVoice = (): NeuralVoice => (instance ??= new NeuralVoice());

/** True when the model was downloaded on an earlier visit (then loading it is quick and free). */
export async function neuralVoiceCached(): Promise<boolean> {
  try {
    const c = await caches.open('transformers-cache');
    return (await c.keys()).some((r) => r.url.includes('Kokoro') && r.url.endsWith('.onnx'));
  } catch {
    return false;
  }
}
