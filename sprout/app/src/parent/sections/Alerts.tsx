import { useMemo } from 'react';
import { useRoute, useSprout } from '../../state';
import { EMERGENCY, GUIDANCE, KIND_LABEL, fmtTime, getAlerts, regionOf } from '../shared';

export function Alerts({ seenAt }: { seenAt: number }) {
  const { turns, policy, profile } = useSprout();
  const [, navigate] = useRoute();
  const alerts = useMemo(() => getAlerts(turns), [turns]);
  const emergency = EMERGENCY[regionOf(policy.helplines)];

  if (alerts.length === 0) {
    return (
      <section className="p-card p-empty">
        <span style={{ fontSize: '2.5rem' }} aria-hidden="true">💛</span>
        <h2>No alerts</h2>
        <p className="p-muted" style={{ maxWidth: 440 }}>
          If {profile.childName} says something that sounds sad, scared or unsafe, Sprout replies with a calm fixed message and the moment will show up here, with guidance for talking about it.
        </p>
        <button type="button" className="p-btn" onClick={() => navigate('parent/activity')}>See activity</button>
      </section>
    );
  }

  return (
    <>
      <p className="p-muted p-small">
        You see the message because this is your own device. Alerts synced to your phone never include it.
        Sprout is a helper, not a counselor: these notes are starting points for a conversation.
      </p>
      <ul className="p-timeline" aria-label="Alerts, most urgent first">
        {alerts.map(({ turn, kind, level }) => {
          const g = GUIDANCE[kind];
          return (
            <li key={turn.id}>
              <article className={`p-card p-alert ${level}`} aria-label={`${KIND_LABEL[kind]}, ${level}`}>
                <div className="p-spread">
                  <h2>{KIND_LABEL[kind]}</h2>
                  <div className="p-row">
                    {turn.at > seenAt && <span className="p-chip outline">New</span>}
                    <span className={`p-chip ${level === 'urgent' ? 'danger' : 'care'}`}>{level === 'urgent' ? 'Urgent' : 'Concern'}</span>
                    <span className="p-muted p-small">{fmtTime(turn.at)}</span>
                  </div>
                </div>
                <blockquote className="msg" style={{ margin: 0 }}>{turn.question}</blockquote>
                <div className="guide">
                  <p><strong>{g.intro}</strong></p>
                  <ul>{g.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </div>
                <div>
                  <h3 className="p-small" style={{ marginBottom: 6 }}>Helplines</h3>
                  <ul className="p-lines">
                    {policy.helplines.map((h) => (
                      <li key={h.label}><span>{h.label}</span><b>{h.contact}</b></li>
                    ))}
                    <li><span>Immediate danger</span><b>call {emergency}</b></li>
                  </ul>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
