import { useEffect, useRef, useState } from 'react';
import { DEFAULT_HELPLINES } from '../pipeline/distress';
import { EMPTY_PROFILE, useRoute, useSprout } from '../state';
import { runSample, SAMPLE_PROFILE } from '../lib/sample';
import { ProfileForm } from './ProfileForm';
import { Icon, Logo, regionOf } from './shared';
import './parent.css';

// First run: a 3-step onboarding for the parent (the buyer). The last step collects the
// identifiers Sprout must hide, then hands the device to the child.

function DeviceVsCloud() {
  return (
    <svg className="p-illus" viewBox="0 0 480 230" role="img" aria-label="A question on the child's device has the name and school removed before it goes to the cloud.">
      {/* device */}
      <rect x="14" y="52" width="170" height="130" rx="16" fill="var(--surface)" className="stroke" strokeWidth="3" />
      <text x="99" y="40" textAnchor="middle" fontSize="13" fontWeight="700">Your child's device</text>
      <rect x="28" y="70" width="142" height="30" rx="15" fill="var(--warm-soft)" />
      <text x="99" y="90" textAnchor="middle" fontSize="12" style={{ fill: 'var(--warm)' }}>Aarav, Green Park School</text>
      <rect x="28" y="108" width="142" height="30" rx="15" fill="var(--brand-soft)" />
      <text x="99" y="128" textAnchor="middle" fontSize="12">why do volcanoes erupt?</text>
      <text x="99" y="164" textAnchor="middle" fontSize="11" className="muted">🌱 guardian runs here</text>
      {/* airlock */}
      <path d="M200 120h80" className="stroke" strokeWidth="3" strokeDasharray="6 6" fill="none" />
      <path d="M272 112l10 8-10 8" className="stroke" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(222 84)">
        <path d="M18 0l18 7v14c0 11-8 17-18 20C8 38 0 32 0 21V7z" fill="var(--brand)" />
        <path d="M10 21l6 6 12-12" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="240" y="152" textAnchor="middle" fontSize="11" className="muted">identity removed</text>
      {/* cloud */}
      <path d="M330 150a30 30 0 01-3-60 40 40 0 0176-8 34 34 0 0111 68z" fill="var(--cloud-soft)" className="cloudstroke" strokeWidth="3" transform="translate(0 6)" />
      <rect x="338" y="108" width="128" height="28" rx="14" fill="var(--surface)" />
      <text x="402" y="127" textAnchor="middle" fontSize="12">why do volcanoes erupt?</text>
      <text x="402" y="40" textAnchor="middle" fontSize="13" fontWeight="700">The big brain</text>
      <text x="402" y="184" textAnchor="middle" fontSize="11" className="muted">☁️ sees only this</text>
    </svg>
  );
}

const HOW: { ico: string; cls: string; title: string; text: string }[] = [
  { ico: '🌱', cls: '', title: 'An on-device guardian', text: 'A small AI on this device checks every message, answers simple questions offline, and hides your child\'s name, school and address first.' },
  { ico: '☁️', cls: 'cloud', title: 'The big brain sees only clean text', text: 'Hard "why" questions go to a bigger model, but only after the private details are removed. The guardian checks its answer before your child sees it.' },
  { ico: '💛', cls: 'care', title: 'You get alerts, not transcripts', text: 'If your child seems sad, scared or unsafe, Sprout replies with a calm, fixed message and tells you. Their everyday questions stay private to them.' },
];

export function Welcome() {
  const { profile, setProfile, policy, setPolicy, isDemo, ai, deviceReady, setTurns } = useSprout();
  const [, navigate] = useRoute();
  const [step, setStep] = useState(0);
  const head = useRef<HTMLHeadingElement>(null);

  useEffect(() => { head.current?.focus(); }, [step]);

  const [sampling, setSampling] = useState(false);
  const trySample = async () => {
    setSampling(true);
    try {
      setTurns([]);
      await runSample({ ai, policy, deviceReady, onTurn: (t) => setTurns((prev) => [...prev, { ...t, sample: true }]) });
      setPolicy({ ...policy, helplines: DEFAULT_HELPLINES.IN });
      setProfile(SAMPLE_PROFILE);
      navigate('kid');
    } catch {
      setTurns([]);
    } finally {
      setSampling(false);
    }
  };

  const save = (p: typeof profile, region: 'US' | 'IN') => {
    setProfile(p);
    setPolicy({ ...policy, helplines: DEFAULT_HELPLINES[region] });
    navigate('kid');
  };

  return (
    <main className="p-root p-welcome">
      <div className="p-welcome-inner">
        <div className="p-brand"><Logo /> Sprout</div>
        <ol className="p-steps" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => <li key={i} className={i <= step ? 'done' : ''} />)}
        </ol>

        {step === 0 && (
          <section className="p-card p-hero-card" aria-labelledby="w-h">
            <h1 id="w-h" ref={head} tabIndex={-1}>An AI your child can use. Their identity never leaves this device.</h1>
            <p className="p-lead">Sprout lets your 6 to 12 year old ask big questions, with a guardian on the device that hides who they are before anything goes online.</p>
            <DeviceVsCloud />
            <div className="p-nav-row">
              <button type="button" className="p-btn" disabled={sampling} onClick={trySample}>
                {sampling ? 'Loading sample…' : 'Try a sample family'}
              </button>
              <button type="button" className="p-btn primary" onClick={() => setStep(1)}>See how it works</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="p-card p-hero-card" aria-labelledby="w-h">
            <h1 id="w-h" ref={head} tabIndex={-1}>How Sprout keeps your child safe</h1>
            <ul className="p-list">
              {HOW.map((h) => (
                <li key={h.title}>
                  <span className={`ico ${h.cls}`} aria-hidden="true">{h.ico}</span>
                  <div><strong>{h.title}</strong><span className="p-muted">{h.text}</span></div>
                </li>
              ))}
            </ul>
            <div className="p-nav-row">
              <button type="button" className="p-btn" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="p-btn primary" onClick={() => setStep(2)}>Set up my child</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="p-card p-hero-card" aria-labelledby="w-h">
            <h1 id="w-h" ref={head} tabIndex={-1}>About your child</h1>
            <p className="p-muted">This is the list Sprout hides. You can change it any time in the parent area.</p>
            <ProfileForm
              initial={{ ...EMPTY_PROFILE, ...profile }}
              region={regionOf(policy.helplines)}
              submitLabel="Save and open Sprout"
              onSubmit={save}
              extra={<button type="button" className="p-btn" onClick={() => setStep(1)}>Back</button>}
            />
            {isDemo && (
              <p className="p-note" role="note">
                <Icon name="shield" /> Demo mode: the AI is simulated until Firebase is connected, but the privacy pipeline is real.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
