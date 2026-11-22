import { useEffect } from 'react';
import type { Badge } from './game';
import { Mascot } from './Mascot';

const COLORS = ['#ff9fa8', '#ffd166', '#7aa7f5', '#5fbf84', '#a78bfa', '#fb923c'];

/** A short, joyful moment when a new badge is earned. Confetti is skipped with reduced motion. */
export function Celebrate({ badge, onDone }: { badge: Badge; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="k-celebrate" role="status" aria-live="polite" onClick={onDone}>
      <div className="k-confetti" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 41) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 6) * 0.08}s` }} />
        ))}
      </div>
      <div className="k-celebrate-card">
        <Mascot size={72} mood="party" />
        <div>
          <p className="k-celebrate-kicker">New badge!</p>
          <p className="k-celebrate-name"><span aria-hidden="true">{badge.icon}</span> {badge.name}</p>
        </div>
      </div>
    </div>
  );
}
