import { Lock, Moon, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BadgeIcon } from './icons';
import { TOPIC_PLANT, type Badge, type Plant, type Progress } from './game';

/** A clay pot with a plant that grows with curiosity: sprout, bud, flower. */
function Pot({ plant }: { plant: Plant }) {
  const color = TOPIC_PLANT[plant.topic]?.flower ?? '#5fbf84';
  const s = plant.stage;
  return (
    <div className="k-pot">
      <svg viewBox="0 0 100 110" width="92" height="100" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`pot-${plant.topic}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8734a" /><stop offset="45%" stopColor="#e89b6c" /><stop offset="100%" stopColor="#a8583a" />
          </linearGradient>
          <radialGradient id={`fl-${plant.topic}`} cx="38%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7" /><stop offset="40%" stopColor={color} /><stop offset="100%" stopColor={color} />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="104" rx="30" ry="4" fill="rgba(0,0,0,.14)" />
        {/* stem grows with stage */}
        <path d={`M50 70 C50 ${70 - 12 * s} 50 ${66 - 14 * s} 50 ${62 - 14 * s}`} stroke="#2f8a58" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d={`M50 ${66 - 8 * s} C40 ${62 - 8 * s} 32 ${64 - 8 * s} 28 ${56 - 8 * s} C38 ${52 - 8 * s} 46 ${56 - 8 * s} 50 ${66 - 8 * s} Z`} fill="#4fbf7c" />
        <path d={`M50 ${62 - 10 * s} C60 ${58 - 10 * s} 68 ${60 - 10 * s} 72 ${52 - 10 * s} C62 ${48 - 10 * s} 54 ${52 - 10 * s} 50 ${62 - 10 * s} Z`} fill="#3fa56a" />
        {s >= 2 && <circle cx="50" cy={60 - 14 * s} r={s === 3 ? 7 : 6} fill={`url(#fl-${plant.topic})`} />}
        {s === 3 && [0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="50" cy={60 - 14 * s - 11} rx="6" ry="9" fill={`url(#fl-${plant.topic})`} transform={`rotate(${a} 50 ${60 - 14 * s})`} />
        ))}
        {s === 3 && <circle cx="50" cy={60 - 14 * s} r="5.5" fill="#ffd166" />}
        {/* clay pot */}
        <path d="M24 70 h52 l-6 32 a4 4 0 0 1 -4 3 H34 a4 4 0 0 1 -4 -3 Z" fill={`url(#pot-${plant.topic})`} />
        <rect x="20" y="64" width="60" height="10" rx="5" fill="#d98458" />
        <rect x="24" y="65.5" width="26" height="3" rx="1.5" fill="#fff" opacity=".35" />
      </svg>
      <span className="k-pot-name">{TOPIC_PLANT[plant.topic]?.name ?? plant.topic}</span>
      <span className="k-pot-count">{plant.count} {plant.count === 1 ? 'question' : 'questions'}</span>
    </div>
  );
}

function BadgeCoin({ b }: { b: Badge }) {
  return (
    <li className={`k-coin${b.earned ? ' is-earned' : ''}`} title={b.hint}>
      <span className="k-coin-face" aria-hidden="true">{b.earned ? <BadgeIcon id={b.id} size={22} /> : <Lock size={18} strokeWidth={1.75} />}</span>
      <span className="k-coin-name">{b.earned ? b.name : 'Locked'}</span>
      <span className="k-coin-hint">{b.hint}</span>
    </li>
  );
}

export function Garden({ p, onClose }: { p: Progress; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="k-sheet-backdrop" onClick={onClose}>
      <section className="k-sheet" role="dialog" aria-modal="true" aria-labelledby="k-garden-title" onClick={(e) => e.stopPropagation()}>
        <header className="k-sheet-head">
          <h2 id="k-garden-title">My curiosity garden</h2>
          <button ref={closeRef} type="button" className="k-sheet-close" onClick={onClose} aria-label="Close garden"><X size={20} strokeWidth={1.75} aria-hidden="true" /></button>
        </header>
        {p.plants.length === 0 ? (
          <p className="k-sheet-empty">Ask a question and watch your first plant grow!</p>
        ) : (
          <div className="k-pots">{p.plants.map((pl) => <Pot key={pl.topic} plant={pl} />)}</div>
        )}
        <h3 className="k-sheet-sub">Explorer badges <span>{p.earnedCount} of {p.badges.length}</span></h3>
        <ul className="k-coins">{p.badges.map((b) => <BadgeCoin key={b.id} b={b} />)}</ul>
        {p.limitReached && (
          <p className="k-rest-note"><Moon size={18} strokeWidth={1.75} aria-hidden="true" /> Your garden is resting for today. It grows again tomorrow!</p>
        )}
      </section>
    </div>
  );
}
