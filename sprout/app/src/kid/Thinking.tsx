import { useEffect, useState } from 'react';
import { Mascot } from './Mascot';
import { play } from './sounds';

// A calm hint of what Sprout does before answering. The pipeline really does these steps in order.
const HINTS = ['Hiding private details…', 'Checking it is safe…', 'Thinking it over…'];

export function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => Math.min(n + 1, HINTS.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  // A soft drop as each step begins, so the wait feels alive (not on the first: the send sound plays).
  useEffect(() => { if (i > 0) play('thinking'); }, [i]);
  return (
    <div className="k-row k-row-sprout">
      <Mascot size={40} mood="thinking" />
      <div className="k-bubble k-sprout k-thinking">
        <span className="k-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="k-thinking-hint">{HINTS[i]}</span>
      </div>
    </div>
  );
}
