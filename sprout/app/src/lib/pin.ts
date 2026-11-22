import { load, save } from './storage';

// Parent PIN. Stored only on this device as a salted SHA-256 hash (never the PIN itself),
// with a lockout after repeated wrong guesses. It keeps a curious 9 to 12 year old out of the
// parent area; it is not protection against someone with full access to the device.

interface Stored { salt: string; hash: string }
interface Attempts { fails: number; lockedUntil: number }

const PIN_KEY = 'parentPin';
const TRY_KEY = 'parentPinAttempts';
export const MAX_TRIES = 5;
export const LOCK_MS = 60_000;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function digest(salt: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return hex(await crypto.subtle.digest('SHA-256', data));
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);

export function hasPin(): boolean {
  return load<Stored | null>(PIN_KEY, null) !== null;
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 to 8 digits');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  save(PIN_KEY, { salt, hash: await digest(salt, pin) } satisfies Stored);
  save(TRY_KEY, { fails: 0, lockedUntil: 0 } satisfies Attempts);
}

export function clearPin(): void {
  save(PIN_KEY, null);
}

/** Milliseconds until another attempt is allowed (0 when not locked). */
export function lockRemaining(now = Date.now()): number {
  const a = load<Attempts>(TRY_KEY, { fails: 0, lockedUntil: 0 });
  return Math.max(0, a.lockedUntil - now);
}

export async function checkPin(pin: string, now = Date.now()): Promise<'ok' | 'wrong' | 'locked'> {
  const stored = load<Stored | null>(PIN_KEY, null);
  if (!stored) return 'wrong';
  if (lockRemaining(now) > 0) return 'locked';
  const a = load<Attempts>(TRY_KEY, { fails: 0, lockedUntil: 0 });
  if ((await digest(stored.salt, pin)) === stored.hash) {
    save(TRY_KEY, { fails: 0, lockedUntil: 0 } satisfies Attempts);
    return 'ok';
  }
  const fails = a.fails + 1;
  save(TRY_KEY, { fails: fails >= MAX_TRIES ? 0 : fails, lockedUntil: fails >= MAX_TRIES ? now + LOCK_MS : 0 } satisfies Attempts);
  return fails >= MAX_TRIES ? 'locked' : 'wrong';
}
