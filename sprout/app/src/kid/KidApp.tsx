import { Moon, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ask, resolveQueued, type Deps } from '../pipeline/sprout';
import { firstName } from '../pipeline/redact';
import { useRoute, useSprout } from '../state';
import { Celebrate } from './Celebrate';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';
import { Garden } from './Garden';
import { dailyWonder, loadGame, newBadges, progress, type Badge } from './game';
import { KidHeader } from './KidHeader';
import { Mascot } from './Mascot';
import { useReadAloud } from './speech';
import { play, preloadSounds } from './sounds';
import { suggestionsFor } from './suggestions';
import { Thinking } from './Thinking';
import { TurnView, type TurnCtx } from './TurnView';
import './kid.css';
import './clay.css';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function KidApp() {
  const { ai, profile, policy, turns, setTurns, deviceReady, online } = useSprout();
  const [, go] = useRoute();
  const goRef = useRef(go);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  /** Quick device answers replaced by a bigger answer, kept so the child can look back at them. */
  const [previous, setPrevious] = useState<Record<string, string | undefined>>({});
  const [freshId, setFreshId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');

  // Safe gamification: garden, badges and celebrations, all derived from the conversation.
  const [game] = useState(loadGame);
  const prog = useMemo(() => progress(turns, game), [turns, game]);
  const [gardenOpen, setGardenOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<Badge | null>(null);
  const prevProg = useRef(prog);
  useEffect(() => {
    const earned = game.enabled ? newBadges(prevProg.current, prog) : [];
    prevProg.current = prog;
    if (earned.length) setCelebrate(earned[0]);
  }, [prog, game.enabled]);
  // Clear first, then set: screen readers announce even when two answers have the same text.
  const say = (msg: string) => {
    setAnnounce('');
    window.setTimeout(() => setAnnounce(msg), 60);
  };
  // True once an answer of this visit is on screen: the read-aloud voice starts loading after that.
  const [answered, setAnswered] = useState(false);
  const speech = useReadAloud(answered && pending === null);
  useEffect(() => { preloadSounds(); play('open'); }, []);
  const endRef = useRef<HTMLDivElement>(null);

  const deps: Deps = { ai, profile, policy, isOnline: () => navigator.onLine, deviceReady };
  const depsRef = useRef(deps);
  const turnsRef = useRef(turns);
  useEffect(() => { depsRef.current = deps; turnsRef.current = turns; goRef.current = go; });

  // Deferred refinement: when we are online, the big brain finishes any queued question.
  const inflight = useRef(new Set<string>());
  // Failed upgrades retry with backoff (30 s, 60 s, ... up to 5 min) instead of waiting
  // for the next offline/online flip.
  const retry = useRef(new Map<string, { at: number; n: number }>());
  const resolveAll = useCallback(async () => {
    if (!navigator.onLine || !depsRef.current.policy.allowCloud) return;
    for (const t of turnsRef.current.filter((x) => x.queued)) {
      const r = retry.current.get(t.id);
      if (inflight.current.has(t.id) || (r && Date.now() < r.at)) continue;
      inflight.current.add(t.id);
      try {
        const done = await resolveQueued(t, depsRef.current);
        retry.current.delete(t.id);
        if (t.answerWhere === 'device' && !done.queued) setPrevious((p) => ({ ...p, [t.id]: t.answer }));
        setTurns((prev) => prev.map((p) => (p.id === t.id ? done : p)));
        if (!done.queued) {
          play('answer');
          setFreshId(t.id);
          say(`The big brain added more. ${done.answer}`);
        }
      } catch (e) {
        console.warn('[sprout] queued question failed, will retry:', e);
        const n = (r?.n ?? 0) + 1;
        retry.current.set(t.id, { n, at: Date.now() + Math.min(300000, 30000 * 2 ** (n - 1)) });
      } finally {
        inflight.current.delete(t.id);
      }
    }
  }, [setTurns]);

  const queuedKey = turns.filter((t) => t.queued).map((t) => t.id).join(',');
  useEffect(() => { void resolveAll(); }, [resolveAll, online, queuedKey]);
  useEffect(() => {
    const onOnline = () => { retry.current.clear(); void resolveAll(); };
    window.addEventListener('online', onOnline);
    // Background retry tick while anything is still queued.
    const tick = queuedKey ? window.setInterval(() => void resolveAll(), 15000) : undefined;
    return () => { window.removeEventListener('online', onOnline); if (tick) clearInterval(tick); };
  }, [resolveAll, queuedKey]);

  // Let the upgraded answer animate for a moment, then settle.
  useEffect(() => {
    if (!freshId) return;
    document.getElementById(`turn-${freshId}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    const t = window.setTimeout(() => setFreshId(null), 4000);
    return () => clearTimeout(t);
  }, [freshId]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
  }, [turns.length, pending, failedQuestion]);

  const busy = pending !== null;
  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setText('');
    setFailedQuestion(null);
    setPending(q);
    play('send');
    try {
      const turn = await ask(q, depsRef.current);
      setTurns((prev) => [...prev, turn]);
      setAnswered(true);
      // Care messages get the softest, calmest sound; everything else a friendly chime.
      play(turn.route === 'distress' ? 'care' : 'answer');
      say(turn.answer);
    } catch (e) {
      // Keep the reason visible to grown-ups in the browser console; the child sees a calm reply.
      console.warn('[sprout] question failed:', e);
      play('care');
      setFailedQuestion(q);
    } finally {
      setPending(null);
    }
  };

  const suggestions = suggestionsFor(profile.ageBand);
  const ctx: TurnCtx = {
    profile,
    allowCloud: policy.allowCloud,
    previous,
    freshId,
    lastId: turns[turns.length - 1]?.id,
    speakingId: speech.speakingId,
    loadingSpeechId: speech.loadingId,
    loadingSpeechPercent: speech.loadingPercent,
    onPrepareSpeech: speech.prepare,
    canSpeak: speech.supported,
    onSpeak: speech.toggle,
    onAsk: (q) => void send(q),
    suggestions,
  };
  const empty = turns.length === 0 && !busy && !failedQuestion;

  return (
    // A tiny click for every button (the send and sound buttons have their own sounds).
    <div
      className="k-shell"
      onClickCapture={(e) => {
        const b = (e.target as HTMLElement).closest('button');
        // getAttribute: a button with no type attribute is still a plain button here, not the send button.
        if (b && b.getAttribute('type') !== 'submit' && !b.hasAttribute('data-no-tap')) play('tap');
      }}
    >
      <div className="k-app">
        <KidHeader
          name={firstName(profile.childName)}
          thinking={busy}
          deviceReady={deviceReady}
          online={online}
          onGrownUps={() => goRef.current('parent')}
          badges={game.enabled ? prog.earnedCount : undefined}
          onGarden={() => setGardenOpen(true)}
        />
        <main className="k-main">
          {!deviceReady && online && (
            <p className="k-banner">
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>Safety checks are running in cloud-safe mode. Your private details are still removed on this device first.</span>
            </p>
          )}
          {empty ? (
            <EmptyState suggestions={suggestions} onPick={(q) => void send(q)} wonder={game.enabled ? dailyWonder(profile.ageBand) : undefined} />
          ) : (
            <section className="k-convo" aria-label="Your conversation with Sprout">
              {turns.map((t) => <TurnView key={t.id} turn={t} ctx={ctx} />)}
              {pending && (
                <>
                  <div className="k-row k-row-me"><div className="k-bubble k-me">{pending}</div></div>
                  <Thinking />
                </>
              )}
              {failedQuestion && (
                <div className="k-row k-row-sprout">
                  <Mascot size={40} mood="calm" animated={false} />
                  <div className="k-bubble k-sprout">
                    <p className="k-answer">I couldn't reach my thinking just now. Let's wait a moment and try again!</p>
                    <button type="button" className="k-link" onClick={() => void send(failedQuestion)}>Try again</button>
                  </div>
                </div>
              )}
            </section>
          )}
          {game.enabled && prog.limitReached && !empty && (
            <div className="k-rest">
              <Mascot size={48} mood="calm" />
              <p><b>{prog.today} great questions today!</b> Your brain did lots of growing. Maybe time for a break, a book, or playing outside?</p>
              <Moon size={22} strokeWidth={1.75} aria-hidden="true" className="k-rest-icon" />
            </div>
          )}
          <div ref={endRef} />
          <div className="k-sr" role="status" aria-live="polite">{announce}</div>
        </main>
        <footer className="k-footer">
          <Composer value={text} onChange={setText} onSend={() => void send()} busy={busy} />
        </footer>
      </div>
      {gardenOpen && <Garden p={prog} onClose={() => setGardenOpen(false)} />}
      {celebrate && <Celebrate badge={celebrate} onDone={() => setCelebrate(null)} />}
    </div>
  );
}
