import { useEffect, useRef, useState } from 'react';
import { Mascot } from './Mascot';

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

/** Opens the curiosity garden; shows how many badges are earned. */
function GardenButton({ badges, onOpen }: { badges: number; onOpen: () => void }) {
  return (
    <button type="button" className="k-garden-btn" onClick={onOpen} aria-label={`My garden, ${badges} badges`}>
      <span className="k-garden-orb" aria-hidden="true">🌻</span>
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
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M7 11V8a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
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
      <Mascot size={52} mood={thinking ? 'thinking' : 'idle'} />
      <div className="k-greet">
        <h1 className="k-hello">Hi {name || 'friend'}!</h1>
        <div className="k-greet-row">
          <StatusPill deviceReady={deviceReady} online={online} />
        </div>
      </div>
      {badges !== undefined && <GardenButton badges={badges} onOpen={onGarden} />}
      <GrownUpsButton onOpen={onGrownUps} />
    </header>
  );
}
