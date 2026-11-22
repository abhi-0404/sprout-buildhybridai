import { useRef } from 'react';
import { useLocalVoiceInput } from './speech';

export function Composer({ value, onChange, onSend, busy }: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const voice = useLocalVoiceInput((t) => onChange(t));
  const canSend = value.trim().length > 0 && !busy;

  return (
    <div className="k-composer-wrap">
      <form
        className="k-composer"
        onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}
      >
        <label htmlFor="k-input" className="k-sr">Type your question for Sprout</label>
        <input
          id="k-input"
          ref={input}
          className="k-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={voice.listening ? 'Listening…' : 'Ask me anything…'}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={300}
        />
        {voice.available && (
          <button
            type="button"
            className={`k-round k-mic${voice.listening ? ' is-on' : ''}`}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? 'Stop listening' : 'Speak your question'}
            onClick={() => { voice.toggle(); input.current?.focus(); }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button type="submit" className="k-round k-send" disabled={!canSend} aria-label="Send question">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path d="M5 12h13m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {(voice.listening || voice.problem) && (
        <p className="k-voice-note" role="status">
          {voice.problem || '🎤 Listening happens on this device. Your voice never leaves it.'}
        </p>
      )}
    </div>
  );
}
