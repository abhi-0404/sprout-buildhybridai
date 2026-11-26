import { Lock, Sparkles } from 'lucide-react';
import { SuggestionIcon } from './icons';
import { Mascot } from './Mascot';
import type { Suggestion } from './suggestions';

/** First screen for the child: big picture cards to tap, so reading and typing are optional. */
export function EmptyState({ suggestions, onPick, wonder }: {
  suggestions: Suggestion[];
  onPick: (q: string) => void;
  /** Today's wonder question (undefined when games are off). */
  wonder?: string;
}) {
  return (
    <section className="k-empty" aria-labelledby="k-empty-title">
      <div className="k-empty-mascot"><Mascot size={104} mood="happy" /></div>
      <h2 id="k-empty-title" className="k-empty-title">What do you wonder about?</h2>
      <p className="k-empty-sub">Tap a picture, or ask me your own question.</p>
      {wonder && (
        <button type="button" className="k-wonder" onClick={() => onPick(wonder)}>
          <span className="k-wonder-orb" aria-hidden="true"><Sparkles size={22} strokeWidth={1.75} /></span>
          <span className="k-wonder-text"><span className="k-wonder-kicker">Today's wonder</span>{wonder}</span>
        </button>
      )}
      <ul className="k-cards">
        {suggestions.map((s, i) => (
          <li key={s.text}>
            <button type="button" className={`k-card tint-${i % 6}`} onClick={() => onPick(s.text)}>
              <span className="k-card-icon"><SuggestionIcon emoji={s.emoji} size={26} /></span>
              <span className="k-card-text">{s.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="k-empty-privacy"><Lock size={16} strokeWidth={1.75} aria-hidden="true" /> I keep your name and school a secret.</p>
    </section>
  );
}
