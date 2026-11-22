import { useMemo } from 'react';
import { totals } from '../../pipeline/ledger';
import type { Topic } from '../../pipeline/types';
import { useRoute, useSprout } from '../../state';
import { TOPIC_EMOJI, topicLabel, usd } from '../shared';

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Kpi({ label, value, foot }: { label: string; value: string; foot?: string }) {
  return (
    <div className="p-kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {foot && <div className="foot">{foot}</div>}
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

  return (
    <>
      <section className={`p-privacy-hero${leaked ? ' leak' : ''}`} aria-label="Privacy">
        <div>
          <div className="big" aria-hidden="true">{t.identifiersSentToCloud}</div>
          <h2 style={{ marginTop: 6 }}>
            <span className="p-sr">{t.identifiersSentToCloud} </span>
            private details sent to the cloud
          </h2>
          <p className="p-muted p-small" style={{ marginTop: 4 }}>
            {leaked
              ? 'A private detail reached the cloud. Check the Activity tab and your profile list.'
              : 'Counted from the exact text that left this device, checked against your profile list.'}
          </p>
        </div>
        <div className="secondary">
          <div className="num">{t.personalDetailsHidden}</div>
          <div>private {t.personalDetailsHidden === 1 ? 'detail' : 'details'} kept on this device</div>
          <p className="p-muted p-small">Names, school and places replaced before any cloud call.</p>
        </div>
      </section>

      {t.questions === 0 ? (
        <section className="p-card p-empty">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="34" fill="var(--brand-soft)" />
            <path d="M36 52V34M36 34c0-8-6-12-14-12 0 8 6 12 14 12zM36 38c0-7 5-11 12-11 0 7-5 11-12 11z" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2>No questions yet</h2>
          <p className="p-muted" style={{ maxWidth: 420 }}>
            Hand the device to {profile.childName}. Their questions will appear here as counts, with the details of where each answer came from.
          </p>
          <button type="button" className="p-btn primary" onClick={() => navigate('kid')}>Hand it to {profile.childName}</button>
        </section>
      ) : (
        <>
          <div className="p-grid" role="list" aria-label="Key numbers">
            <div role="listitem"><Kpi label="Questions asked" value={String(t.questions)} /></div>
            <div role="listitem"><Kpi label="AI calls on this device" value={`${onDevicePct}%`} foot={`${t.deviceCalls} of ${t.aiCalls} calls`} /></div>
            <div role="listitem"><Kpi label="🌱 Answered on device" value={String(t.answeredOnDevice)} /></div>
            <div role="listitem"><Kpi label="☁️ Asked the big brain" value={String(t.answeredInCloud)} /></div>
            <div role="listitem"><Kpi label="💛 Care messages" value={String(t.scripted)} foot={t.distressEvents ? 'See the Alerts tab' : 'None needed'} /></div>
            <div role="listitem"><Kpi label="Answers checked and rewritten" value={String(t.refereeRewrites)} foot="The guardian reviewed cloud answers first" /></div>
          </div>

          <div className="p-grid-2">
            <section className="p-card" aria-labelledby="ov-split">
              <h2 id="ov-split" className="p-card-title">Where the AI ran</h2>
              <p className="p-card-sub">Every AI call, split by device and cloud.</p>
              <div className="p-bar" role="img" aria-label={`${t.deviceCalls} calls on device, ${t.cloudCalls} calls in the cloud`}>
                <span className="device" style={{ width: `${onDevicePct}%` }} />
                <span className="cloud" style={{ width: `${t.aiCalls ? 100 - onDevicePct : 0}%` }} />
              </div>
              <div className="p-legend">
                <span><i style={{ background: 'var(--brand)' }} />On device: <b>{t.deviceCalls}</b></span>
                <span><i style={{ background: 'var(--cloud)' }} />Cloud: <b>{t.cloudCalls}</b></span>
              </div>
            </section>

            <section className="p-card" aria-labelledby="ov-cost">
              <h2 id="ov-cost" className="p-card-title">Estimated cloud cost</h2>
              <p className="p-card-sub">Running on the device keeps the bill small.</p>
              <div className="p-cost">
                <div><div className="amt" style={{ color: 'var(--brand)' }}>{usd(t.estCloudCostUsd)}</div><div className="p-muted p-small">with Sprout</div></div>
                <div><div className="amt">{usd(t.estAllCloudCostUsd)}</div><div className="p-muted p-small">if every call ran in the cloud</div></div>
              </div>
              {saved > 0 && <p className="p-small" style={{ marginTop: 10 }}><span className="p-chip device">{saved}% saved</span></p>}
            </section>
          </div>

          <section className="p-card" aria-labelledby="ov-topics">
            <h2 id="ov-topics" className="p-card-title">What {profile.childName} is curious about</h2>
            <p className="p-card-sub">Topics only. The questions themselves stay hidden unless you choose to look.</p>
            {topics.length === 0 ? (
              <p className="p-muted">No topics recorded yet.</p>
            ) : (
              <div className="p-stack-sm">
                {topics.map(([topic, n]) => (
                  <div className="p-hbar" key={topic}>
                    <span>{TOPIC_EMOJI[topic]} {topicLabel(topic)}</span>
                    <span className="track" role="img" aria-label={`${n} of ${t.questions} questions`}>
                      <span className="fill" style={{ display: 'block', width: `${Math.max(4, (n / topMax) * 100)}%` }} />
                    </span>
                    <span className="n">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {t.distressEvents > 0 && (
            <section className="p-callout warn" role="status">
              <span aria-hidden="true">💛</span>
              <div>
                <strong>{t.distressEvents} care {t.distressEvents === 1 ? 'moment' : 'moments'}</strong>
                <p className="p-small">Sprout stepped in with a calm message. <button type="button" className="p-btn small" onClick={() => go('alerts')}>Open alerts</button></p>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
