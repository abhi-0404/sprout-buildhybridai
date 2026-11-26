import { useEffect, useRef, useState } from 'react';
import { DEFAULT_HELPLINES } from '../pipeline/distress';
import { EMPTY_PROFILE, useRoute, useSprout } from '../state';
import { runSample, SAMPLE_PROFILE } from '../lib/sample';
import { ProfileForm } from './ProfileForm';
import { Icon, Logo, regionOf, type IconName } from './shared';
import './parent.css';

// First run: a 3-step onboarding for the parent (the buyer). The last step collects the
// identifiers Sprout must hide, then hands the device to the child.

/** The promise, shown with the real pipeline's own output: the child's sentence on the device,
 *  the guardian's swap, and the exact text the cloud receives ([CHILD], [SCHOOL_1] are the real tokens). */
function Journey() {
  return (
    <figure className="p-journey" aria-labelledby="j-cap">
      <figcaption id="j-cap" className="p-sr">
        On the child's device the question includes their name and school. Sprout's guardian swaps them for tags, so the cloud only receives the question.
      </figcaption>
      <div className="j-card j-device" aria-hidden="true">
        <p className="j-where"><Icon name="phone" size={16} /> Typed on your child's device</p>
        <p className="j-msg">Hi, I'm <mark className="j-secret">Aarav</mark> from <mark className="j-secret">Green Park School</mark>. Why do volcanoes erupt?</p>
      </div>
      <div className="j-gate" aria-hidden="true">
        <span className="j-stamp" aria-hidden="true"><Icon name="shield" size={22} /></span>
        <span>The guardian on the device swaps the name and school for tags</span>
      </div>
      <div className="j-card j-cloud" aria-hidden="true">
        <p className="j-where"><Icon name="cloud" size={16} /> All the cloud AI receives</p>
        <p className="j-msg">Hi, I'm <span className="j-token">[CHILD]</span> from <span className="j-token">[SCHOOL_1]</span>. Why do volcanoes erupt?</p>
      </div>
    </figure>
  );
}

const HOW: { ico: IconName; cls: string; title: string; text: string }[] = [
  { ico: 'sprout', cls: '', title: 'An on-device guardian', text: 'A small AI on this device checks every message, answers simple questions offline, and hides your child\'s name, school and address first.' },
  { ico: 'cloud', cls: 'cloud', title: 'The big brain sees only clean text', text: 'Hard "why" questions go to a bigger model, but only after the private details are removed. The guardian checks its answer before your child sees it.' },
  { ico: 'heart', cls: 'care', title: 'You get alerts, not transcripts', text: 'If your child seems sad, scared or unsafe, Sprout replies with a calm, fixed message and tells you. Their everyday questions stay private to them.' },
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
      <div className={`p-welcome-inner${step === 0 ? ' wide' : ''}`}>
        <div className="p-spread">
          <div className="p-brand"><Logo /> Sprout</div>
          <span className="p-muted p-small">Step {step + 1} of 3</span>
        </div>
        <ol className="p-steps" aria-hidden="true">
          {[0, 1, 2].map((i) => <li key={i} className={i <= step ? 'done' : ''} />)}
        </ol>

        {step === 0 && (
          <section className="p-hero p-hero-split" aria-labelledby="w-h">
            <div className="p-hero-copy">
              <h1 id="w-h" ref={head} tabIndex={-1}>An AI your child can use. Their identity never leaves this device.</h1>
              <p className="p-lead">Sprout lets your 6 to 12 year old ask big questions, with a guardian on the device that hides who they are before anything goes online.</p>
              <div className="p-cta-row">
                <button type="button" className="p-btn primary" disabled={sampling} onClick={trySample}>
                  {sampling ? 'Loading sample…' : 'Try a sample family'}
                </button>
                <button type="button" className="p-btn" onClick={() => setStep(1)}>See how it works</button>
              </div>
            </div>
            <Journey />
          </section>
        )}

        {step === 1 && (
          <section className="p-hero" aria-labelledby="w-h">
            <h1 id="w-h" ref={head} tabIndex={-1}>How Sprout keeps your child safe</h1>
            <ul className="p-list">
              {HOW.map((h) => (
                <li key={h.title}>
                  <span className={`ico ${h.cls}`}><Icon name={h.ico} size={20} /></span>
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
          <section className="p-hero" aria-labelledby="w-h">
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
                <Icon name="shield" size={16} /> Demo mode: the AI is simulated until Firebase is connected, but the privacy pipeline is real.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
