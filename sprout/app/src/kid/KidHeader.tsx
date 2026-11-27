import { Flower2, Lock, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Mascot } from './Mascot';
import { play, setSoundsOn, soundsOn } from './sounds';

const HOLD_MS = 1500;

/**
 * Status in a child's words. The technical name (on-device model, cloud-safe mode) is kept in
 * the tooltip and accessible label for grown-ups and judges.
 */
function StatusPill({ deviceReady, online }: { deviceReady: boolean; online: boolean }) {
  let tone: 'ready' | 'cloud' | 'offline';
  let label: string;
  let tech: string;
  if (deviceReady && online) { tone = 'ready'; label = 'Ready to help!'; tech = 'On-device model ready'; }
  else if (deviceReady) { tone = 'offline'; label = 'No internet, I can still help'; tech = 'Offline: on-device answers only'; }
  else if (online) { tone = 'cloud'; label = 'Ready to help!'; tech = 'Cloud-safe mode: no on-device model'; }
  else { tone = 'offline'; label = 'No internet right now'; tech = 'Offline, no on-device model'; }
  return (
    <span className={`k-pill tone-${tone}`} title={tech} aria-label={`${label} (${tech})`}>
      <span className="k-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Sounds on / off, remembered on this device. */
function SoundButton() {
  const [on, setOn] = useState(soundsOn);
  const toggle = () => {
    const next = !on;
    setSoundsOn(next);
    setOn(next);
    if (next) play('tap');
  };
  const Icon = on ? Volume2 : VolumeX;
  return (
    <button type="button" className="k-sound-btn" data-no-tap onClick={toggle} aria-pressed={on} aria-label="Sounds" title={on ? 'Sounds on' : 'Sounds off'}>
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

/** Opens the curiosity garden; shows how many badges are earned. */
function GardenButton({ badges, onOpen }: { badges: number; onOpen: () => void }) {
  return (
    <button type="button" className="k-garden-btn" onClick={onOpen} aria-label={`My garden, ${badges} badges`}>
      <span className="k-garden-orb" aria-hidden="true"><Flower2 size={18} strokeWidth={1.75} /></span>
      <span className="k-garden-count">{badges}</span>
    </button>
  );
}

/** Press and hold for 1.5 seconds so a child cannot open the grown-ups area by accident. */
function GrownUpsButton({ onOpen }: { onOpen: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'holding' | 'early'>('idle');
  const hold = useRef<number | undefined>(undefined);
  const hint = useRef<number | undefined>(undefined);
  const openRef = useRef(onOpen);
  useEffect(() => { openRef.current = onOpen; });
  useEffect(() => () => { clearTimeout(hold.current); clearTimeout(hint.current); }, []);

  const start = () => {
    if (hold.current !== undefined) return;
    clearTimeout(hint.current);
    setPhase('holding');
    hold.current = window.setTimeout(() => {
      hold.current = undefined;
      setPhase('idle');
      openRef.current();
    }, HOLD_MS);
  };
  const cancel = () => {
    if (hold.current === undefined) return;
    clearTimeout(hold.current);
    hold.current = undefined;
    setPhase('early');
    hint.current = window.setTimeout(() => setPhase('idle'), 1800);
  };

  const label = phase === 'holding' ? 'Keep holding…' : phase === 'early' ? 'Hold to open' : 'Grown-ups';
  return (
    <button
      type="button"
      className={`k-hold${phase === 'holding' ? ' is-holding' : ''}`}
      data-phase={phase}
      aria-label="Grown-ups area. Press and hold for one and a half seconds to open."
      onPointerDown={(e) => { if (e.pointerType !== 'mouse' || e.button === 0) start(); }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') cancel(); }}
      onBlur={cancel}
    >
      <span className="k-hold-fill" aria-hidden="true" />
      <span className="k-hold-label">
        <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="k-hold-text">{label}</span>
      </span>
    </button>
  );
}

export function KidHeader({ name, thinking, deviceReady, online, onGrownUps, badges, onGarden }: {
  name: string;
  thinking: boolean;
  deviceReady: boolean;
  online: boolean;
  onGrownUps: () => void;
  /** Earned badges; undefined when games are switched off. */
  badges?: number;
  onGarden: () => void;
}) {
  return (
    <header className="k-header">
      <Mascot size={56} mood={thinking ? 'thinking' : 'idle'} />
      <div className="k-greet">
        <h1 className="k-hello">Hi {name || 'friend'}!</h1>
        <div className="k-greet-row">
          <StatusPill deviceReady={deviceReady} online={online} />
        </div>
      </div>
      <SoundButton />
      {badges !== undefined && <GardenButton badges={badges} onOpen={onGarden} />}
      <GrownUpsButton onOpen={onGrownUps} />
    </header>
  );
}
