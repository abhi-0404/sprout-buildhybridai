import { useMemo } from 'react';
import { totals } from '../../pipeline/ledger';
import type { Topic } from '../../pipeline/types';
import { useRoute, useSprout } from '../../state';
import { Icon, TOPIC_ICON, topicLabel, usd, type IconName } from '../shared';
import { MessageCircle } from 'lucide-react';

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Kpi({ label, value, foot, icon }: { label: string; value: string; foot?: string; icon?: IconName }) {
  return (
    <div className="p-kpi">
      <dt>{icon && <Icon name={icon} size={16} />}{label}</dt>
      <dd className="value">{value}</dd>
      {foot && <dd className="foot">{foot}</dd>}
    </div>
  );
}

export function Overview({ go }: { go: (id: string) => void }) {
  const { turns, profile } = useSprout();
  const [, navigate] = useRoute();
  const t = useMemo(() => totals(turns), [turns]);
  const onDevicePct = pct(t.deviceCalls, t.aiCalls);
  const topics = useMemo(
    () => (Object.entries(t.topics) as [Topic, number][]).sort((a, b) => b[1] - a[1]),
    [t.topics],
  );
  const topMax = topics[0]?.[1] ?? 1;
  const leaked = t.identifiersSentToCloud > 0;
  const saved = t.estAllCloudCostUsd > 0 ? Math.round((1 - t.estCloudCostUsd / t.estAllCloudCostUsd) * 100) : 0;
  const hasSample = turns.some((x) => x.sample);

  return (
    <>
      {hasSample && (
        <p className="p-note" role="note">
          <Icon name="note" size={16} />
          <span>These numbers include the sample family. Its privacy and distress rules really ran on this device, but every AI reply (answers, guard and referee verdicts) was scripted: no AI model was called and nothing was sent to the cloud.</span>
        </p>
      )}
      <section className={`p-privacy-hero${leaked ? ' leak' : ''}`} aria-label="Privacy">
        <div className="primary">
          <div className="big" aria-hidden="true">{t.identifiersSentToCloud}</div>
          <h2>
            <Icon name={leaked ? 'shield-alert' : 'shield'} />
            <span className="p-sr">{t.identifiersSentToCloud} </span>
            private details sent to the cloud
          </h2>
          <p className="p-muted p-small">
            {leaked
              ? 'A private detail reached the cloud. Check the Activity tab and your profile list.'
              : 'Counted from the exact text that left this device, checked against your profile list.'}
          </p>
        </div>
        <div className="secondary">
          <div className="num">{t.personalDetailsHidden}</div>
          <div className="lbl">private {t.personalDetailsHidden === 1 ? 'detail' : 'details'} kept on this device</div>
          <p className="p-muted p-small">Names, school and places replaced before any cloud call.</p>
        </div>
      </section>

      {t.questions === 0 ? (
        <section className="p-sec p-empty">
          <Icon name="sprout" size={28} />
          <h2>No questions yet</h2>
          <p className="p-muted">
            Hand the device to {profile.childName}. Their questions will appear here as counts, with the details of where each answer came from.
          </p>
          <button type="button" className="p-btn primary" onClick={() => navigate('kid')}>Hand it to {profile.childName}</button>
        </section>
      ) : (
        <>
          <dl className="p-kpis">
            <Kpi label="Questions asked" value={String(t.questions)} />
            <Kpi label="AI calls on this device" value={`${onDevicePct}%`} foot={`${t.deviceCalls} of ${t.aiCalls} calls`} />
            <Kpi icon="sprout" label="Answered on device" value={String(t.answeredOnDevice)} />
            <Kpi icon="cloud" label="Asked the big brain" value={String(t.answeredInCloud)} />
            <Kpi icon="heart" label="Care messages" value={String(t.scripted)} foot={t.distressEvents ? 'See the Alerts tab' : 'None needed'} />
            <Kpi label="Answers checked and rewritten" value={String(t.refereeRewrites)} foot="The guardian reviewed cloud answers first" />
          </dl>

          <div className="p-grid-2">
            <section className="p-sec" aria-labelledby="ov-split">
              <h2 id="ov-split" className="p-sec-title">Where the AI ran</h2>
              <p className="p-sec-sub">Every AI call, split by device and cloud.</p>
              <div className="p-bar" role="img" aria-label={`${t.deviceCalls} calls on device, ${t.cloudCalls} calls in the cloud`}>
                <span className="device" style={{ width: `${onDevicePct}%` }} />
                <span className="cloud" style={{ width: `${t.aiCalls ? 100 - onDevicePct : 0}%` }} />
              </div>
              <div className="p-legend">
                <span><i style={{ background: 'var(--brand)' }} />On device: <b>{t.deviceCalls}</b></span>
                <span><i style={{ background: 'var(--cloud)' }} />Cloud: <b>{t.cloudCalls}</b></span>
              </div>
            </section>

            <section className="p-sec" aria-labelledby="ov-cost">
              <h2 id="ov-cost" className="p-sec-title">Estimated cloud cost</h2>
              <p className="p-sec-sub">Running on the device keeps the bill small.</p>
              <div className="p-cost">
                <div><div className="amt">{usd(t.estCloudCostUsd)}</div><div className="p-muted p-small">with Sprout</div></div>
                <div><div className="amt amt-alt">{usd(t.estAllCloudCostUsd)}</div><div className="p-muted p-small">if every call ran in the cloud</div></div>
              </div>
              {saved > 0 && <p className="p-small p-saved"><span className="p-chip device">{saved}% saved</span></p>}
            </section>
          </div>

          <section className="p-sec" aria-labelledby="ov-topics">
            <h2 id="ov-topics" className="p-sec-title">What {profile.childName} is curious about</h2>
            <p className="p-sec-sub">Topics only. The questions themselves stay hidden unless you choose to look.</p>
            {topics.length === 0 ? (
              <p className="p-muted">No topics recorded yet.</p>
            ) : (
              <div className="p-stack-sm">
                {topics.map(([topic, n]) => {
                  const TopicIcon = TOPIC_ICON[topic] ?? MessageCircle;
                  return (
                  <div className="p-hbar" key={topic}>
                    <span className="lbl"><TopicIcon size={16} strokeWidth={1.75} aria-hidden="true" />{topicLabel(topic)}</span>
                    <span className="track" role="img" aria-label={`${n} of ${t.questions} questions`}>
                      <span className="fill" style={{ display: 'block', width: `${Math.max(4, (n / topMax) * 100)}%` }} />
                    </span>
                    <span className="n">{n}</span>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          {t.distressEvents > 0 && (
            <section className="p-callout warn" role="status">
              <Icon name="heart" />
              <div className="p-stack-sm">
                <strong>{t.distressEvents} care {t.distressEvents === 1 ? 'moment' : 'moments'}</strong>
                <p className="p-small">Sprout stepped in with a calm message.</p>
                <div><button type="button" className="p-btn small" onClick={() => go('alerts')}>Open alerts</button></div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
