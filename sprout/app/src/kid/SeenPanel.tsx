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

export function SeenPanel({ turn, profile, id }: { turn: Turn; profile: ChildProfile; id: string }) {
  const leftDevice = turn.steps.some((s) => s.sentToCloud);
  const typed = highlightQuestion(turn.question, turn.redactions, profile);
  const seen = splitSanitized(turn.cloudSaw ?? turn.sanitized);

  return (
    <section id={id} className="k-seen" aria-label="Secret check">
      <h3 className="k-seen-title"><span aria-hidden="true">🔒</span> Secret check</h3>
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
                  ? <span key={i} className="k-token">🔒 {KIND_LABEL[s.kind]}</span>
                  : <span key={i}>{s.text}</span>,
              )}
            </p>
          </div>
        ) : (
          <p className="k-seen-none"><span aria-hidden="true">🌱</span> This stayed right here. Nobody else saw it!</p>
        )}
      </div>

      {turn.steps.length > 0 && (
        <details className="k-grownup">
          <summary>For grown-ups: how Sprout answered</summary>
          <ul className="k-steps-list">
            {turn.steps.map((s, i) => (
              <li key={i}>
                <span aria-hidden="true">{s.where === 'device' ? '🌱' : '☁️'}</span>
                <span className="k-step-name">{TASK_LABEL[s.task]}</span>
                <span className="k-step-where">{s.where === 'device' ? 'on this device' : 'cloud (Gemini)'}</span>
                <span className="k-step-ms">{s.latencyMs} ms</span>
              </li>
            ))}
          </ul>
          {turn.referee && <p className="k-referee">🛡️ {refereeLine(turn.referee)}</p>}
          {turn.redactions.length > 0 && (
            <p className="k-seen-note">Highlighted words were replaced on this device before anything was sent.</p>
          )}
        </details>
      )}
    </section>
  );
}
