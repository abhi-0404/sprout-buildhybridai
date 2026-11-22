import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { firebaseConfigured } from '../lib/firebaseEnv';
import { getFamilyLink, syncAlerts } from '../lib/family';
import { load, save } from '../lib/storage';
import { useRoute, useSprout } from '../state';
import { Gate, isUnlocked } from './Gate';
import { Activity } from './sections/Activity';
import { Alerts } from './sections/Alerts';
import { Digest } from './sections/Digest';
import { Family } from './sections/Family';
import { Overview } from './sections/Overview';
import { Settings } from './sections/Settings';
import { Icon, Logo, getAlerts, type SectionDef } from './shared';
import { Welcome } from './Welcome';
import './parent.css';

// The parent area: a gate, then a dashboard with six sections.
// Routes: #/parent and #/parent/<section>.

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview', icon: 'home', title: 'Overview', blurb: 'Your child\'s privacy and activity at a glance.' },
  { id: 'alerts', label: 'Alerts', icon: 'bell', title: 'Alerts', blurb: 'Moments when Sprout stepped in with a care message.' },
  { id: 'activity', label: 'Activity', icon: 'list', title: 'Activity', blurb: 'What was asked, where it ran, and what was hidden.' },
  { id: 'digest', label: 'Weekly note', icon: 'note', title: 'Weekly note', blurb: 'A short summary written from counts only, never from conversations.' },
  { id: 'settings', label: 'Settings', icon: 'gear', title: 'Settings', blurb: 'Profile, safety choices and device checks.' },
  { id: 'family', label: 'Family sync', icon: 'people', title: 'Family sync', blurb: 'Get alerts on your own phone.' },
];

export function ParentApp() {
  const { profile, turns, online } = useSprout();
  const [route, navigate] = useRoute();
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const seg = route.split('/')[1] ?? '';
  const active = SECTIONS.find((s) => s.id === seg) ?? SECTIONS[0];

  const alerts = useMemo(() => getAlerts(turns), [turns]);
  const [seenAt, setSeenAt] = useState<number>(() => load('alertsSeenAt', 0));
  const prev = useRef(active.id);
  useEffect(() => {
    // Alerts count as seen once the parent has looked at them and moved on.
    if (prev.current === 'alerts' && active.id !== 'alerts') {
      const now = Date.now();
      setSeenAt(now);
      save('alertsSeenAt', now);
    }
    prev.current = active.id;
  }, [active.id]);
  const unseen = alerts.filter((a) => a.turn.at > seenAt).length;

  // Sync alert events (kind, level, time only) to the family, if a family is linked.
  useEffect(() => {
    if (!unlocked || !firebaseConfigured || !online) return;
    const link = getFamilyLink();
    if (!link || link.role === 'pending') return;
    syncAlerts(link.id, alerts.map((a) => ({ id: a.turn.id, kind: a.kind, level: a.level, at: a.turn.at }))).catch(() => {});
  }, [unlocked, online, alerts]);

  const main = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    main.current?.focus();
  }, [active.id]);

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} onBack={() => navigate('kid')} />;
  if (!profile.childName) return <Welcome />;

  const go = (id: string) => navigate(`parent/${id}`);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SECTIONS.findIndex((s) => s.id === active.id);
    let n = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % SECTIONS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + SECTIONS.length) % SECTIONS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = SECTIONS.length - 1;
    else return;
    e.preventDefault();
    go(SECTIONS[n].id);
    requestAnimationFrame(() => document.getElementById(`tab-${SECTIONS[n].id}`)?.focus());
  };

  return (
    <div className="p-root p-shell">
      <header className="p-top">
        <div className="p-brand">
          <Logo />
          <span>Sprout<small>Grown-ups area for {profile.childName}'s device</small></span>
        </div>
        <button type="button" className="p-btn" onClick={() => navigate('kid')}>
          <Icon name="back" /> <span className="p-back-long">Back to Sprout</span><span className="p-back-short">Back</span>
        </button>
      </header>

      <div className="p-tabs" role="tablist" aria-label="Parent sections" onKeyDown={onKey}>
        {SECTIONS.map((s) => {
          const sel = s.id === active.id;
          return (
            <button
              key={s.id} id={`tab-${s.id}`} type="button" role="tab" className="p-tab" aria-selected={sel}
              aria-controls={`panel-${s.id}`} tabIndex={sel ? 0 : -1} onClick={() => go(s.id)}
            >
              <Icon name={s.icon} />
              {s.label}
              {s.id === 'alerts' && unseen > 0 && !sel && (
                <span className="p-badge-count" aria-label={`${unseen} new alerts`}>{unseen}</span>
              )}
            </button>
          );
        })}
      </div>

      <main className="p-main">
        <div className="p-section-head">
          <h1 ref={main} tabIndex={-1}>{active.title}</h1>
          <p>{active.blurb}</p>
        </div>
        <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`} className="p-stack">
          {active.id === 'overview' && <Overview go={go} />}
          {active.id === 'alerts' && <Alerts seenAt={seenAt} />}
          {active.id === 'activity' && <Activity />}
          {active.id === 'digest' && <Digest />}
          {active.id === 'settings' && <Settings />}
          {active.id === 'family' && <Family />}
        </div>
      </main>
    </div>
  );
}
