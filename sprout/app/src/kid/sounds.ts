import { Howl, Howler } from 'howler';

// Small, soft interface sounds (Kenney jingles and interface packs, CC0, see public/sounds/LICENSE.txt),
// played with howler.js. Each file ships as .ogg plus a .wav copy for browsers without Ogg
// (older iPhones). A grown-up or the child can switch them off; the choice is remembered.

export type Cue = 'open' | 'send' | 'thinking' | 'answer' | 'care' | 'coin' | 'tap';

/** Gentle levels: the tap is a quiet file so it gets more gain; the jingles stay low. */
const VOLUME: Record<Cue, number> = {
  open: 0.35, send: 0.3, thinking: 0.2, answer: 0.3, care: 0.3, coin: 0.4, tap: 0.35,
};

const KEY = 'sprout.sounds';
const howls = new Map<Cue, Howl>();

export function soundsOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setSoundsOn(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode: not remembered */ }
  if (!on) Howler.stop();
}

function howl(cue: Cue): Howl {
  let h = howls.get(cue);
  if (!h) {
    const base = `${import.meta.env.BASE_URL}sounds/${cue}`;
    h = new Howl({ src: [`${base}.ogg`, `${base}.wav`], volume: VOLUME[cue], preload: true });
    howls.set(cue, h);
  }
  return h;
}

/** Loads every sound so the first one plays without delay. */
export function preloadSounds(): void {
  if (typeof window === 'undefined' || !soundsOn()) return;
  (Object.keys(VOLUME) as Cue[]).forEach(howl);
}

export function play(cue: Cue): void {
  if (typeof window === 'undefined' || !soundsOn()) return;
  // Never start a sound before the page may play audio: the browser would hold it and play it
  // late, out of step with what is on screen.
  if (Howler.ctx && Howler.ctx.state !== 'running' && cue === 'open') return;
  try { howl(cue).play(); } catch { /* sound is a nicety, never an error */ }
}
