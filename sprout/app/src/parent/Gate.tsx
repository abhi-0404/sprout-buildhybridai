import { useEffect, useRef, useState, type FormEvent } from 'react';
import { checkPin, hasPin, lockRemaining } from '../lib/pin';
import { Icon } from './shared';

// "Grown-ups only" gate. With a parent PIN (set in onboarding or Settings) it asks for the PIN
// and locks for a minute after 5 wrong tries. Without one it falls back to a multiplication
// question, which only slows down younger children, and suggests setting a PIN.

const KEY = 'sprout:parentUnlocked';

export function isUnlocked(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}
function remember(): void {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* session storage blocked: gate asks again next time */ }
}
export function lockAgain(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

const pick = () => ({ a: 6 + Math.floor(Math.random() * 6), b: 6 + Math.floor(Math.random() * 4) });

export function Gate({ onUnlock, onBack }: { onUnlock: () => void; onBack: () => void }) {
  const usePin = hasPin();
  const [q, setQ] = useState(pick);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockedMs, setLockedMs] = useState(() => (usePin ? lockRemaining() : 0));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  // Count down a lockout so the parent knows when to try again.
  useEffect(() => {
    if (lockedMs <= 0) return;
    const t = window.setInterval(() => setLockedMs(lockRemaining()), 1000);
    return () => clearInterval(t);
  }, [lockedMs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const pass = () => { remember(); onUnlock(); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (usePin) {
      const r = await checkPin(value.trim());
      if (r === 'ok') return pass();
      setValue('');
      if (r === 'locked') { setLockedMs(lockRemaining()); setError('Too many tries. Please wait a minute.'); }
      else setError('That PIN is not right.');
    } else {
      if (Number(value.trim()) === q.a * q.b) return pass();
      setError('Not quite. Here is a new one.');
      setValue('');
      setQ(pick());
    }
    input.current?.focus();
  };

  const locked = usePin && lockedMs > 0;

  return (
    <main className="p-root p-gate">
      <div className="p-card p-gate-card">
        <span className="lock"><Icon name="lock" /></span>
        <h1>Grown-ups only</h1>
        <p className="p-muted">
          This area has settings and your child's safety alerts. {usePin ? 'Enter your parent PIN.' : 'Answer to continue.'}
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label htmlFor="gate-a" className="p-gate-q">{usePin ? 'Parent PIN' : `What is ${q.a} x ${q.b}?`}</label>
          <input
            id="gate-a" ref={input} className="p-input" value={value} inputMode="numeric" autoComplete="off"
            type={usePin ? 'password' : 'text'} maxLength={usePin ? 8 : 4} disabled={locked}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError(null); }}
            aria-invalid={!!error} aria-describedby={error ? 'gate-err' : undefined}
          />
          {error && <span id="gate-err" className="p-error" role="alert">{error}</span>}
          {locked && <span className="p-muted" role="status">Try again in {Math.ceil(lockedMs / 1000)} s.</span>}
          <button type="submit" className="p-btn primary" disabled={locked}>Continue</button>
          <button type="button" className="p-btn ghost" onClick={onBack}>Back to Sprout</button>
        </form>
        {!usePin && (
          <p className="p-muted p-gate-hint">Tip: set a parent PIN in Settings so older kids can't get in.</p>
        )}
      </div>
    </main>
  );
}
