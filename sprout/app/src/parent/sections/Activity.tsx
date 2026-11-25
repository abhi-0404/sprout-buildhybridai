import { useId, useMemo, useState, type ReactNode } from 'react';
import type { Turn } from '../../pipeline/sprout';
import { useRoute, useSprout } from '../../state';
import { Icon, Switch, TOPIC_EMOJI, fmtTime, routeBadge, topicLabel } from '../shared';

/** Highlights each hidden original in the raw question. */
function Marked({ text, hidden }: { text: string; hidden: string[] }): ReactNode {
  const parts = hidden.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!parts.length) return text;
  const esc = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return text.split(new RegExp(`(${esc})`, 'gi')).map((s, i) =>
    parts.some((p) => p.toLowerCase() === s.toLowerCase()) ? <mark key={i}>{s}</mark> : s,
  );
}

function Item({ turn, showText, ageBand }: { turn: Turn; showText: boolean; ageBand: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const b = routeBadge(turn);
  const topic = turn.guard?.topic ?? (turn.distress ? 'feelings' : 'other');
  const cloud = turn.steps.filter((s) => s.where === 'cloud');
  return (
    <li className={`p-item${open ? ' open' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="emoji" aria-hidden="true">{TOPIC_EMOJI[topic]}</span>
        <span className="meta">
          <span className="title">
            {showText ? turn.question : `${topicLabel(topic)} question`}
          </span>
          <span className="sub">
            <span>{fmtTime(turn.at)}</span>
            <span className={`p-chip ${b.cls}`}><span aria-hidden="true">{b.emoji}</span> {b.label}</span>
            {turn.redactions.length > 0 && (
              <span className="p-chip outline">{turn.redactions.length} private {turn.redactions.length === 1 ? 'detail' : 'details'} hidden</span>
            )}
            {turn.distress && <span className="p-chip danger">Safety moment</span>}
            {turn.queued && <span className="p-chip outline">Waiting for the big brain</span>}
            {turn.route === 'blocked' && <span className="p-chip outline">Blocked</span>}
          </span>
        </span>
        <span className="chev"><Icon name="chevron" /></span>
      </button>
      {open && (
        <div className="p-detail" id={id}>
          {showText ? (
            <>
              <div className="p-split">
                <div><h4>What was typed</h4><p><Marked text={turn.question} hidden={turn.redactions.map((r) => r.original)} /></p></div>
                <div><h4>What the big brain saw</h4><p>{cloud.length ? (turn.sanitized || 'Nothing') : 'Nothing. This stayed on the device.'}</p></div>
              </div>
              {turn.referee?.verdict === 'simplify' && turn.referee.original ? (
                <div className="p-split">
                  <div><h4>Big brain said</h4><p>{turn.referee.original}</p></div>
                  <div><h4>Guardian made it right for ages {ageBand}</h4><p>{turn.answer}</p></div>
                </div>
              ) : (
                <div className="p-split">
                  <div><h4>Sprout answered</h4><p>{turn.answer}</p></div>
                </div>
              )}
            </>
          ) : (
            <p className="p-muted p-small">
              {cloud.length
                ? `The big brain received ${cloud.length} ${cloud.length === 1 ? 'request' : 'requests'} with private details already removed.`
                : 'Nothing left this device for this question.'}{' '}
              Turn on "Show questions and answers" to compare the original with what the cloud saw.
            </p>
          )}
          {turn.referee && turn.referee.verdict !== 'pass' && (
            <p className="p-small"><span className="p-chip care">Answer {turn.referee.verdict === 'block' ? 'blocked' : 'rewritten'}</span> {turn.referee.reason}</p>
          )}
          <div>
            <h4 className="p-small" style={{ marginBottom: 6 }}>Steps</h4>
            <ul className="p-steps-list">
              {turn.steps.length === 0 && <li className="p-muted">No AI calls (a fixed care message was used).</li>}
              {turn.steps.map((s, i) => (
                <li key={i}>
                  <span className={`p-chip ${s.where === 'device' ? 'device' : 'cloud'}`}>{s.where === 'device' ? '🌱 device' : '☁️ cloud'}</span>
                  <b>{s.task}</b>
                  <span className="p-muted">{s.latencyMs} ms</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

export function Activity() {
  const { turns, profile } = useSprout();
  const [, navigate] = useRoute();
  const [showText, setShowText] = useState(false);
  const list = useMemo(() => [...turns].sort((a, b) => b.at - a.at), [turns]);

  return (
    <>
      <section className="p-card">
        <Switch
          id="show-text"
          label="Show questions and answers"
          hint={`${profile.childName}'s conversations are hidden by default. Looking at every question can make a child feel watched, and most of what they ask is simply curiosity. Alerts already tell you when something needs attention.`}
          checked={showText}
          onChange={setShowText}
        />
      </section>
      {list.length === 0 ? (
        <section className="p-card p-empty">
          <span style={{ fontSize: '2.5rem' }} aria-hidden="true">🌱</span>
          <h2>Nothing to show yet</h2>
          <p className="p-muted">Activity appears here once {profile.childName} asks a question.</p>
          <button type="button" className="p-btn primary" onClick={() => navigate('kid')}>Hand it to {profile.childName}</button>
        </section>
      ) : (
        <ul className="p-timeline">
          {list.map((t) => <Item key={t.id} turn={t} showText={showText} ageBand={profile.ageBand} />)}
        </ul>
      )}
    </>
  );
}
