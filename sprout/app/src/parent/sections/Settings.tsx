import { useState } from 'react';
import { DEFAULT_HELPLINES } from '../../pipeline/distress';
import { EMPTY_PROFILE, useRoute, useSprout } from '../../state';
import { DeviceCheck } from '../DeviceCheck';
import { lockAgain } from '../Gate';
import { GameSettings } from '../GameSettings';
import { PinSetup } from '../PinSetup';
import { ProfileForm } from '../ProfileForm';
import { Icon, Switch, regionOf } from '../shared';

export function Settings() {
  const { profile, setProfile, policy, setPolicy, isDemo, demo, setDemo, turns, clearTurns } = useSprout();
  const [, navigate] = useRoute();
  const [saved, setSaved] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  return (
    <>
      <section className="p-sec" aria-labelledby="st-profile">
        <h2 id="st-profile" className="p-sec-title">Child profile</h2>
        <p className="p-sec-sub">Everything here is hidden from the big brain.</p>
        <ProfileForm
          initial={{ ...EMPTY_PROFILE, ...profile }}
          region={regionOf(policy.helplines)}
          submitLabel="Save profile"
          savedNote={saved}
          onSubmit={(p, region) => {
            setProfile(p);
            setPolicy({ ...policy, helplines: DEFAULT_HELPLINES[region] });
            setSaved('Saved');
            window.setTimeout(() => setSaved(null), 2500);
          }}
        />
        <h3 className="p-h3 p-after-form">Helplines shown for {regionOf(policy.helplines) === 'IN' ? 'India' : 'the United States'}</h3>
        <ul className="p-lines">
          {policy.helplines.map((h) => <li key={h.label}><span>{h.label}</span><b>{h.contact}</b></li>)}
        </ul>
      </section>

      <section className="p-sec" aria-labelledby="st-games-title">
        <h2 id="st-games-title" className="p-sec-title">Learning games</h2>
        <GameSettings />
      </section>

      <section className="p-sec" aria-labelledby="st-pin">
        <h2 id="st-pin" className="p-sec-title">Parent PIN</h2>
        <PinSetup />
      </section>

      <section className="p-sec" aria-labelledby="st-safety">
        <h2 id="st-safety" className="p-sec-title">Safety choices</h2>
        <p className="p-sec-sub">Control what Sprout may do.</p>
        <Switch
          id="allow-cloud"
          label="Let Sprout ask the big brain"
          hint="Hard questions can go to a larger cloud model, with private details removed first. Turn off to keep every answer on this device."
          checked={policy.allowCloud}
          onChange={(v) => setPolicy({ ...policy, allowCloud: v })}
        />
        <Switch
          id="referee"
          label="Check big brain answers on this device"
          hint="The on-device guardian reviews each cloud answer and rewrites it if it is not right for the age band."
          checked={policy.refereeCloudAnswers}
          onChange={(v) => setPolicy({ ...policy, refereeCloudAnswers: v })}
        />
      </section>

      {isDemo && (
        <section className="p-sec" aria-labelledby="st-demo">
          <h2 id="st-demo" className="p-sec-title">Demo controls</h2>
          <p className="p-sec-sub">Demo mode uses a scripted AI. The privacy pipeline is real.</p>
          <Switch
            id="sim-device"
            label="Simulate on-device model"
            hint="Turn off to see how Sprout behaves on a device with no on-device model (cloud-safe mode). In real mode this is Gemini Nano in Chrome or on Android."
            checked={demo.deviceModel}
            onChange={(v) => setDemo({ ...demo, deviceModel: v })}
          />
        </section>
      )}

      <DeviceCheck />

      <section className="p-sec p-stack-sm" aria-labelledby="st-data">
        <h2 id="st-data" className="p-sec-title">Conversation history</h2>
        <p className="p-sec-sub">{turns.length} {turns.length === 1 ? 'conversation is' : 'conversations are'} stored on this device only. Clearing removes questions, answers and totals. Safety alerts are kept, so they cannot be erased by mistake (or on purpose).</p>
        {!confirm ? (
          <div><button type="button" className="p-btn danger" onClick={() => { setConfirm(true); setCleared(false); }} disabled={turns.length === 0}>Clear conversation history</button></div>
        ) : (
          <div className="p-confirm" role="alert">
            <strong>Delete {turns.length} conversations (safety alerts are kept)? This cannot be undone.</strong>
            <button type="button" className="p-btn danger" onClick={() => { clearTurns(); setConfirm(false); setCleared(true); }}>Yes, delete</button>
            <button type="button" className="p-btn" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        )}
        {cleared && <p className="p-chip device" role="status"><Icon name="check" size={14} />History cleared</p>}
      </section>

      <section className="p-sec p-spread">
        <div>
          <h2 className="p-sec-title">Lock this area</h2>
          <p className="p-muted p-small">Return to {profile.childName}'s screen. The grown-ups question is asked again next time.</p>
        </div>
        <button type="button" className="p-btn" onClick={() => { lockAgain(); navigate('kid'); }}>Lock and go back</button>
      </section>
    </>
  );
}
