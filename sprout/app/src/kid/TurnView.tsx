import { Hourglass, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Turn } from '../pipeline/sprout';
import type { ChildProfile } from '../pipeline/types';
import { CareCard } from './CareCard';
import { SuggestionIcon } from './icons';
import { Mascot } from './Mascot';
import { SeenPanel } from './SeenPanel';
import { stripQueuedNote } from './seen';
import { SourceBar } from './SourceBar';
import type { Suggestion } from './suggestions';

export interface TurnCtx {
  profile: ChildProfile;
  allowCloud: boolean;
  /** The quick device answer kept in memory after the big brain upgraded a queued turn. */
  previous: Record<string, string | undefined>;
  freshId: string | null;
  lastId: string | undefined;
  speakingId: string | null;
  loadingSpeechId?: string | null;
  loadingSpeechPercent?: number;
  /** Prepares the read-aloud audio for an answer in the background. */
  onPrepareSpeech?: (text: string) => void;
  canSpeak: boolean;
  onSpeak: (id: string, text: string) => void;
  onAsk: (q: string) => void;
  suggestions: Suggestion[];
}

export function TurnView({ turn, ctx }: { turn: Turn; ctx: TurnCtx }) {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const panelId = `seen-${turn.id}`;
  const prev = ctx.previous[turn.id];
  const upgraded = prev !== undefined && turn.route === 'cloud';
  const shown = quick && prev !== undefined ? stripQueuedNote(prev) : stripQueuedNote(turn.answer);
  const fresh = ctx.freshId === turn.id;

  // Follow-up buttons only on the newest normal answer, so the child can keep going without typing.
  const canFollow = turn.id === ctx.lastId && (turn.route === 'device' || turn.route === 'cloud' || turn.route === 'queued');
  const topic = turn.question.replace(/^(Tell me more about|Can you say that more simply\?)\s*:?\s*/i, '');
  const isLast = turn.id === ctx.lastId;
  const prepareSpeech = ctx.onPrepareSpeech;
  useEffect(() => { if (isLast && prepareSpeech) prepareSpeech(shown); }, [isLast, shown, prepareSpeech]);
  const bar = (
    <SourceBar
      turn={turn}
      open={open}
      panelId={panelId}
      onToggle={() => setOpen((o) => !o)}
      canSpeak={ctx.canSpeak}
      speaking={ctx.speakingId === turn.id}
      voiceLoading={ctx.loadingSpeechId === turn.id}
      voicePercent={ctx.loadingSpeechId === turn.id ? ctx.loadingSpeechPercent : undefined}
      onSpeak={() => ctx.onSpeak(turn.id, shown)}
      followups={canFollow ? {
        more: () => ctx.onAsk(`Tell me more about: ${topic}`),
        simpler: () => ctx.onAsk(`Can you say that more simply? ${topic}`),
      } : undefined}
    />
  );
  const panel = open && <SeenPanel turn={turn} profile={ctx.profile} id={panelId} />;

  let body;
  if (turn.route === 'distress') {
    const notify = turn.distress?.level === 'urgent' || turn.distress?.level === 'concern';
    body = (
      <div className="k-col-sprout">
        <CareCard answer={turn.answer} notified={notify} />
        {bar}
        {panel}
      </div>
    );
  } else if (turn.route === 'blocked') {
    body = (
      <div className="k-col-sprout">
        <div className="k-soft">
          <p className="k-answer">{turn.answer}</p>
          {turn.id === ctx.lastId && (
            <>
              <p className="k-soft-ask">Want to try one of these?</p>
              <ul className="k-chips k-chips-small">
                {ctx.suggestions.slice(0, 3).map((s) => (
                  <li key={s.text}>
                    <button type="button" className="k-chip" onClick={() => ctx.onAsk(s.text)}>
                      <span className="k-chip-icon"><SuggestionIcon emoji={s.emoji} size={22} /></span>{s.text}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {bar}
        {panel}
      </div>
    );
  } else {
    body = (
      <div className="k-col-sprout">
        <div className={`k-bubble k-sprout${fresh ? ' is-fresh' : ''}`}>
          {upgraded && (
            <p className="k-added"><Sparkles size={16} strokeWidth={1.75} aria-hidden="true" /> {quick ? 'The quick answer from this device' : 'The big brain added more'}</p>
          )}
          <p className="k-answer">{shown}</p>
          {turn.queued && ctx.allowCloud && (
            <p className="k-queued"><Hourglass size={16} strokeWidth={1.75} aria-hidden="true" /> The big brain will add more when we&rsquo;re online</p>
          )}
          {upgraded && (
            <button type="button" className="k-link" onClick={() => setQuick((q) => !q)}>
              {quick ? 'Back to the big brain answer' : 'See the quick answer'}
            </button>
          )}
        </div>
        {bar}
        {panel}
      </div>
    );
  }

  return (
    <article id={`turn-${turn.id}`} className="k-turn">
      <div className="k-row k-row-me"><div className="k-bubble k-me">{turn.question}</div></div>
      <div className="k-row k-row-sprout">
        {turn.route !== 'distress' && <Mascot size={40} mood="idle" animated={false} />}
        {body}
      </div>
    </article>
  );
}
