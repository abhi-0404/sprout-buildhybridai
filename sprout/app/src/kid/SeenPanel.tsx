import { Cloud, Lock, ShieldCheck, Sprout } from 'lucide-react';
import { useState } from 'react';
import type { Step, Turn } from '../pipeline/sprout';
import type { ChildProfile } from '../pipeline/types';
import { KIND_LABEL, highlightQuestion, splitSanitized } from './seen';

// "Secret check": in a child's words, what they said next to what the big brain heard.
// The technical record (each step, where it ran, how long it took) sits in a grown-ups
// section underneath, for parents and judges.

const TASK_LABEL: Record<Step['task'], string> = {
  guard: 'Safety check',
  answer: 'Wrote the answer',
  referee: 'Checked the answer',
  simplify: 'Made it gentler',
  digest: 'Summary',
};

function refereeLine(r: NonNullable<Turn['referee']>): string {
  const who = r.where === 'device' ? 'Checked on this device' : 'Checked for safety';
  if (r.verdict === 'simplify') return `${who}: rewritten to be gentler`;
  if (r.verdict === 'block') return `${who}: swapped for a safer reply`;
  return `${who}: looks good`;
}

const SNIPPET_CHARS = 150;

/** Before/after of the on-device guardian: the cloud's raw answer next to the one the child got. */
function BeforeAfter({ original, rewritten, reason }: { original: string; rewritten: string; reason: string }) {
  const [all, setAll] = useState(false);
  // Count code points so an emoji is never cut in half.
  const chars = Array.from(original);
  const long = chars.length > SNIPPET_CHARS;
  const shown = all || !long ? original : `${chars.slice(0, SNIPPET_CHARS).join('').trimEnd()}...`;
  return (
    <div className="k-ba" role="group" aria-label="What the guardian changed">
      <div className="k-seen-row">
        <span className="k-seen-who">Big brain said</span>
        <p className="k-ba-before">{shown}</p>
        {long && (
          <button type="button" className="k-ba-more" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
      <div className="k-seen-row">
        <span className="k-seen-who">Sprout's guardian made it</span>
        <p className="k-ba-after">{rewritten}</p>
      </div>
      {reason && <p className="k-ba-why"><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" /> <span>Why: {reason}</span></p>}
    </div>
  );
}

export function SeenPanel({ turn, profile, id }: { turn: Turn; profile: ChildProfile; id: string }) {
  const leftDevice = turn.steps.some((s) => s.sentToCloud);
  const typed = highlightQuestion(turn.question, turn.redactions, profile);
  const seen = splitSanitized(turn.cloudSaw ?? turn.sanitized);

  return (
    <section id={id} className="k-seen" aria-label="Secret check">
      <h3 className="k-seen-title"><Lock size={18} strokeWidth={1.75} aria-hidden="true" /> Secret check</h3>
      <div className="k-seen-rows">
        <div className="k-seen-row">
          <span className="k-seen-who">You said</span>
          <p>
            {typed.map((s, i) =>
              s.kind ? <mark key={i} className="k-secret">{s.text}</mark> : <span key={i}>{s.text}</span>,
            )}
          </p>
        </div>
        {leftDevice ? (
          <div className="k-seen-row">
            <span className="k-seen-who">The big brain only heard</span>
            <p>
              {seen.map((s, i) =>
                s.kind
                  ? <span key={i} className="k-token"><Lock size={12} strokeWidth={2} aria-hidden="true" />{KIND_LABEL[s.kind]}</span>
                  : <span key={i}>{s.text}</span>,
              )}
            </p>
          </div>
        ) : (
          <p className="k-seen-none"><Sprout size={18} strokeWidth={1.75} aria-hidden="true" /> This stayed right here. Nobody else saw it!</p>
        )}
      </div>

      {turn.steps.length > 0 && (
        <details className="k-grownup">
          <summary>For grown-ups: how Sprout answered</summary>
          <ul className="k-steps-list">
            {turn.steps.map((s, i) => (
              <li key={i}>
                {s.where === 'device' ? <Sprout size={16} strokeWidth={1.75} aria-hidden="true" /> : <Cloud size={16} strokeWidth={1.75} aria-hidden="true" />}
                <span className="k-step-name">{TASK_LABEL[s.task]}</span>
                <span className="k-step-where">{s.where === 'device' ? 'on this device' : 'cloud (Gemini)'}</span>
                <span className="k-step-ms">{s.latencyMs} ms</span>
              </li>
            ))}
          </ul>
          {turn.referee && <p className="k-referee"><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" /> <span>{refereeLine(turn.referee)}</span></p>}
          {/* The raw answer was judged too heavy for the child, so it lives only behind the grown-ups fold. */}
          {turn.referee?.verdict === 'simplify' && turn.referee.original && (
            <BeforeAfter original={turn.referee.original} rewritten={turn.answer} reason={turn.referee.reason} />
          )}
          {turn.redactions.length > 0 && (
            <p className="k-seen-note">Highlighted words were replaced on this device before anything was sent.</p>
          )}
        </details>
      )}
    </section>
  );
}
