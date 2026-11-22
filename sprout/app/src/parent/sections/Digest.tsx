import { useState } from 'react';
import { totals } from '../../pipeline/ledger';
import { digestPrompt } from '../../pipeline/prompts';
import type { Turn } from '../../pipeline/sprout';
import { load, save } from '../../lib/storage';
import { useSprout } from '../../state';
import { fmtTime } from '../shared';

// The weekly note is the one place a cloud model sees anything about the child, so the payload
// is built from counts only and shown to the parent verbatim.

const WEEK = 7 * 24 * 60 * 60 * 1000;

interface Saved { text: string; sent: string; at: number; source: 'device' | 'cloud' }

/** Counts and topic labels only. No questions, answers, names or any other text from the child. */
export function weeklyStats(turns: Turn[], now = Date.now()) {
  const week = turns.filter((t) => t.at >= now - WEEK);
  const t = totals(week);
  const safety: Record<string, number> = {};
  for (const turn of week) if (turn.distress) safety[turn.distress.kind] = (safety[turn.distress.kind] ?? 0) + 1;
  return {
    period: 'last 7 days',
    questions: t.questions,
    answeredOnDevice: t.answeredOnDevice,
    answeredByBigBrain: t.answeredInCloud,
    careMessages: t.scripted,
    answersRewrittenForAge: t.refereeRewrites,
    blockedRequests: t.blocked,
    topics: t.topics,
    safetyEvents: { total: t.distressEvents, byKind: safety },
  };
}

export function Digest() {
  const { ai, turns, online, isDemo, policy } = useSprout();
  const [saved, setSaved] = useState<Saved | null>(() => load<Saved | null>('digest', null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stats = weeklyStats(turns);

  const write = async () => {
    setError(null);
    if (!policy.allowCloud) {
      setError('The big brain is switched off in Settings, so the weekly note cannot be written.');
      return;
    }
    setBusy(true);
    const sent = JSON.stringify(stats, null, 2);
    try {
      const r = await ai.generate({ task: 'digest', mode: 'only_cloud', prompt: digestPrompt(JSON.stringify(stats)) });
      const next: Saved = { text: r.text.trim(), sent, at: Date.now(), source: r.source };
      setSaved(next);
      save('digest', next);
    } catch (e) {
      const msg = (e as Error).message || '';
      setError(
        !online || /offline|network|fetch/i.test(msg)
          ? 'You are offline. The note is written by the big brain, so try again when you are connected. Nothing was sent.'
          : `The note could not be written right now. Nothing personal was sent. ${msg}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const none = stats.questions === 0;
  const preview = JSON.stringify(stats, null, 2);

  return (
    <>
      <section className="p-card">
        <h2 className="p-card-title">This week in a few sentences</h2>
        <p className="p-card-sub">
          The big brain writes the note from the numbers below. It never sees a question, an answer or a name.
        </p>
        <div className="p-row">
          <button type="button" className="p-btn primary" onClick={write} disabled={busy || none || (!online && !isDemo)}>
            {busy ? 'Writing...' : 'Write this week\'s note'}
          </button>
          {none && <span className="p-muted p-small">No questions in the last 7 days yet.</span>}
          {!online && !isDemo && <span className="p-muted p-small">You are offline.</span>}
        </div>
        {error && <p className="p-callout danger" role="alert" style={{ marginTop: 14 }}>{error}</p>}
      </section>

      {saved && (
        <section className="p-card p-stack-sm" aria-live="polite">
          <div className="p-spread">
            <h2>Your weekly note</h2>
            <span className="p-muted p-small">Written {fmtTime(saved.at)}</span>
          </div>
          <div className="p-note-box">{saved.text}</div>
          <details className="p-details">
            <summary>What was sent</summary>
            <pre>{saved.sent}</pre>
          </details>
          <p className="p-muted p-small">This is the exact JSON that left the device for this note. It has counts and topic labels only, so no transcript was shared.</p>
        </section>
      )}

      {!saved && (
        <section className="p-card">
          <details className="p-details">
            <summary>What would be sent</summary>
            <pre>{preview}</pre>
          </details>
        </section>
      )}
    </>
  );
}
