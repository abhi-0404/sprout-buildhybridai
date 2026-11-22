import type { Turn } from '../pipeline/sprout';

// Under each answer: one friendly "where did this come from" badge (tap to see the secret
// check) and a row of big buttons, so the child can keep going without typing.

const SOURCE: Record<Turn['answerWhere'], { icon: string; label: string; tone: string }> = {
  device: { icon: '🌱', label: 'Sprout knew this!', tone: 'device' },
  cloud: { icon: '☁️', label: 'Asked the big brain', tone: 'cloud' },
  script: { icon: '💛', label: 'From Sprout', tone: 'script' },
};

export interface Followups {
  more: () => void;
  simpler: () => void;
}

export function SourceBar({ turn, open, panelId, onToggle, canSpeak, speaking, onSpeak, followups }: {
  turn: Turn;
  open: boolean;
  panelId: string;
  onToggle: () => void;
  canSpeak: boolean;
  speaking: boolean;
  onSpeak: () => void;
  /** Only on the newest normal answer. */
  followups?: Followups;
}) {
  const s = SOURCE[turn.answerWhere];
  const secrets = turn.redactions.length > 0;
  return (
    <div className="k-under">
      <button
        type="button"
        className={`k-badge tone-${s.tone}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        title="See what stayed secret"
      >
        <span aria-hidden="true">{s.icon}</span>
        <span>{s.label}</span>
        {secrets && <span className="k-badge-lock"><span aria-hidden="true">🔒</span> secrets kept</span>}
        <span className="k-badge-caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {(canSpeak || followups) && (
        <div className="k-actions">
          {canSpeak && (
            <button type="button" className="k-act" aria-pressed={speaking} onClick={onSpeak}>
              <span aria-hidden="true">{speaking ? '⏹️' : '🔊'}</span> {speaking ? 'Stop' : 'Read to me'}
            </button>
          )}
          {followups && (
            <>
              <button type="button" className="k-act" onClick={followups.more}>
                <span aria-hidden="true">🤔</span> Tell me more
              </button>
              <button type="button" className="k-act" onClick={followups.simpler}>
                <span aria-hidden="true">🧸</span> Easier please
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
