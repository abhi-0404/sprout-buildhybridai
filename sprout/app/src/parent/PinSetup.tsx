import { useState, type FormEvent } from 'react';
import { hasPin, isValidPin, setPin } from '../lib/pin';
import { Icon } from './shared';

/** Set or change the parent PIN. The PIN is stored only as a salted hash on this device. */
export function PinSetup({ onDone }: { onDone?: () => void }) {
  const [exists, setExists] = useState(hasPin);
  const [pin, setPinValue] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidPin(pin)) return setMsg({ ok: false, text: 'Use 4 to 8 digits.' });
    if (pin !== again) return setMsg({ ok: false, text: 'The two PINs do not match.' });
    await setPin(pin);
    setExists(true);
    setPinValue('');
    setAgain('');
    setMsg({ ok: true, text: 'PIN saved. The grown-ups area now asks for it.' });
    onDone?.();
  };

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  return (
    <form className="p-stack-sm" onSubmit={(e) => void submit(e)}>
      <p className="p-sec-sub">
        {exists
          ? 'A PIN is set. Enter a new one to change it.'
          : 'Older kids can solve the math question. A PIN keeps the grown-ups area (alerts and settings) for you.'}
      </p>
      <div className="p-form-cols">
        <label className="p-field">
          <span>{exists ? 'New PIN' : 'PIN'} (4 to 8 digits)</span>
          <input className="p-input" type="password" inputMode="numeric" autoComplete="new-password"
            value={pin} onChange={(e) => { setPinValue(digits(e.target.value)); setMsg(null); }} />
        </label>
        <label className="p-field">
          <span>Repeat PIN</span>
          <input className="p-input" type="password" inputMode="numeric" autoComplete="new-password"
            value={again} onChange={(e) => { setAgain(digits(e.target.value)); setMsg(null); }} />
        </label>
      </div>
      {msg && <p className={msg.ok ? 'p-chip device' : 'p-error'} role={msg.ok ? 'status' : 'alert'}>{msg.ok && <Icon name="check" size={14} />}{msg.text}</p>}
      <div><button type="submit" className="p-btn primary" disabled={!pin || !again}>{exists ? 'Change PIN' : 'Set PIN'}</button></div>
    </form>
  );
}
