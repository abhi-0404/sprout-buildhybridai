import { beforeEach, describe, expect, it } from 'vitest';
import { LOCK_MS, MAX_TRIES, checkPin, hasPin, isValidPin, lockRemaining, setPin } from './pin';

// Minimal localStorage for Node.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
});

describe('parent PIN', () => {
  it('validates 4 to 8 digits only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12345678')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('stores a salted hash, never the PIN itself', async () => {
    await setPin('4821');
    expect(hasPin()).toBe(true);
    expect(localStorage.getItem('sprout:parentPin')).not.toContain('4821');
  });

  it('accepts the right PIN and rejects a wrong one', async () => {
    await setPin('4821');
    expect(await checkPin('0000')).toBe('wrong');
    expect(await checkPin('4821')).toBe('ok');
  });

  it(`locks for a minute after ${MAX_TRIES} wrong tries, even for the right PIN`, async () => {
    await setPin('4821');
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_TRIES - 1; i++) expect(await checkPin('1111', t0)).toBe('wrong');
    expect(await checkPin('1111', t0)).toBe('locked');
    expect(await checkPin('4821', t0 + 1000)).toBe('locked');
    expect(lockRemaining(t0 + 1000)).toBeGreaterThan(0);
    expect(await checkPin('4821', t0 + LOCK_MS + 1)).toBe('ok');
  });

  it('two devices with the same PIN get different hashes (salted)', async () => {
    await setPin('4821');
    const a = localStorage.getItem('sprout:parentPin');
    await setPin('4821');
    expect(localStorage.getItem('sprout:parentPin')).not.toBe(a);
  });
});
