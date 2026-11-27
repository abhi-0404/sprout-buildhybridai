import { ChevronDown, ChevronUp, Cloud, Heart, Lightbulb, Lock, Smile, Sprout, Square, Volume2, type LucideIcon } from 'lucide-react';
import type { Turn } from '../pipeline/sprout';

// Under each answer: one friendly "where did this come from" badge (tap to see the secret
// check) and a row of big buttons, so the child can keep going without typing.

const SOURCE: Record<Turn['answerWhere'], { icon: LucideIcon; label: string; tone: string }> = {
  device: { icon: Sprout, label: 'Sprout knew this!', tone: 'device' },
  cloud: { icon: Cloud, label: 'Asked the big brain', tone: 'cloud' },
  script: { icon: Heart, label: 'From Sprout', tone: 'script' },
};

export interface Followups {
  more: () => void;
  simpler: () => void;
}

export function SourceBar({ turn, open, panelId, onToggle, canSpeak, speaking, voiceLoading, voicePercent, onSpeak, followups }: {
  turn: Turn;
  open: boolean;
  panelId: string;
  onToggle: () => void;
  canSpeak: boolean;
  speaking: boolean;
  /** The neural voice is still getting ready (first use downloads it once). */
  voiceLoading?: boolean;
  /** Download percent on the very first use, when known. */
  voicePercent?: number;
  onSpeak: () => void;
  /** Only on the newest normal answer. */
  followups?: Followups;
}) {
  const s = SOURCE[turn.answerWhere];
  const SourceIcon = s.icon;
  const Caret = open ? ChevronUp : ChevronDown;
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
        <SourceIcon size={18} strokeWidth={1.75} aria-hidden="true" />
        <span>{s.label}</span>
        {turn.sample && <span className="k-badge-sample">sample, scripted answer</span>}
        {secrets && <span className="k-badge-lock"><Lock size={14} strokeWidth={1.75} aria-hidden="true" /> secrets kept</span>}
        <Caret className="k-badge-caret" size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {(canSpeak || followups) && (
        <div className="k-actions">
          {canSpeak && (
            <button type="button" className="k-act" aria-pressed={speaking} onClick={onSpeak}>
              {speaking ? <Square size={16} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={18} strokeWidth={1.75} aria-hidden="true" />}
              {voiceLoading ? `Warming up my voice…${voicePercent !== undefined ? ` ${voicePercent}%` : ''}` : speaking ? 'Stop' : 'Read to me'}
            </button>
          )}
          {followups && (
            <>
              <button type="button" className="k-act" onClick={followups.more}>
                <Lightbulb size={18} strokeWidth={1.75} aria-hidden="true" /> Tell me more
              </button>
              <button type="button" className="k-act" onClick={followups.simpler}>
                <Smile size={18} strokeWidth={1.75} aria-hidden="true" /> Easier please
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
