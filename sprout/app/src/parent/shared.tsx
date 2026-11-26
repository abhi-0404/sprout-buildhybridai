import {
  Activity, Apple, ArrowLeft, Bell, BookOpen, Check, ChevronDown, Cloud, Divide, FlaskConical, Gamepad2, Handshake,
  Heart, HeartPulse, Hourglass, House, Landmark, Laptop, Leaf, Lock, Map as MapIcon, MessageCircle, Music,
  NotebookText, Palette, PawPrint, Rocket, Settings, ShieldAlert, ShieldCheck, Smartphone, Sprout, Trophy, Users,
  type LucideIcon,
} from 'lucide-react';
import type { Helpline } from '../pipeline/distress';
import type { Turn } from '../pipeline/sprout';
import type { DistressKind, Topic } from '../pipeline/types';

// Small shared pieces for the parent experience: icons, formatting, calm guidance copy.

export type IconName =
  | 'home' | 'bell' | 'list' | 'note' | 'gear' | 'people' | 'lock' | 'shield' | 'shield-alert'
  | 'chevron' | 'back' | 'sprout' | 'cloud' | 'heart' | 'check' | 'hourglass' | 'phone';

const ICONS: Record<IconName, LucideIcon> = {
  home: House, bell: Bell, list: Activity, note: NotebookText, gear: Settings, people: Users,
  lock: Lock, shield: ShieldCheck, 'shield-alert': ShieldAlert, chevron: ChevronDown, back: ArrowLeft,
  sprout: Sprout, cloud: Cloud, heart: Heart, check: Check, hourglass: Hourglass,
  phone: Smartphone,
};

/** Line icon (lucide). Decorative: always hidden from screen readers, the label sits beside it. */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path d="M16 25v-9M16 16c0-4-3-6-7-6 0 4 3 6 7 6zM16 18c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Switch with a visible label and description, usable with a keyboard and screen reader. */
export function Switch({
  id, label, hint, checked, onChange, disabled,
}: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="p-switch">
      <div className="txt">
        <label htmlFor={id}><strong>{label}</strong></label>
        {hint && <span className="p-muted p-small" id={`${id}-hint`}>{hint}</span>}
      </div>
      <span className="p-toggle">
        <input
          id={id} type="checkbox" role="switch" checked={checked} disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="track" aria-hidden="true" />
      </span>
    </div>
  );
}

export const usd = (n: number) => (n === 0 ? '$0.00' : `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}`);

const TIME = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtTime = (at: number) => TIME.format(new Date(at));

export function ago(at: number, now = Date.now()): string {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const TOPIC_ICON: Record<Topic, LucideIcon> = {
  science: FlaskConical, animals: PawPrint, space: Rocket, nature: Leaf, math: Divide, reading: BookOpen,
  history: Landmark, geography: MapIcon, body: HeartPulse, feelings: Heart, friends: Handshake, tech: Laptop,
  games: Gamepad2, art: Palette, music: Music, sports: Trophy, food: Apple, other: MessageCircle,
};

export const topicLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Route badge for a turn: sprout = on device, cloud = big brain, heart = care message. */
export function routeBadge(t: Turn): { Icon: LucideIcon; label: string; cls: 'device' | 'cloud' | 'care' } {
  if (t.answerWhere === 'script') return { Icon: Heart, label: 'Care message', cls: 'care' };
  if (t.answerWhere === 'cloud') return { Icon: Cloud, label: 'Big brain', cls: 'cloud' };
  return { Icon: Sprout, label: 'On this device', cls: 'device' };
}

export const KIND_LABEL: Record<DistressKind, string> = {
  self_harm: 'Thoughts of self-harm',
  abuse: 'Possible abuse',
  online_danger: 'Online danger',
  bullying: 'Bullying',
  sad_or_scared: 'Feeling sad or scared',
};

export interface Guidance {
  intro: string;
  tips: string[];
}

/** Calm, non-clinical guidance for a parent. Sprout is an assistant, not a counselor. */
export const GUIDANCE: Record<DistressKind, Guidance> = {
  self_harm: {
    intro: 'Stay calm and make time today. Your child reached out, which is a good sign.',
    tips: [
      'Sit close, stay calm and ask directly and kindly: "I saw you were feeling really low. Are you thinking about hurting yourself?" Asking does not plant the idea.',
      'Listen more than you talk. Do not promise to keep it secret, and do not punish or panic.',
      'Call a helpline below together, or contact your child\'s doctor or school counselor today.',
      'If you think your child is in immediate danger, call your local emergency number now and stay with them.',
    ],
  },
  abuse: {
    intro: 'Take this seriously and stay gentle. Your child may be hinting at something that happened to them or around them.',
    tips: [
      'Find a private, calm moment. Say "Thank you for telling me. It is not your fault."',
      'Let your child say what they want to in their own words. Avoid leading questions or asking them to repeat it many times.',
      'Write down what they said and when. Contact the school, a doctor or a child protection helpline below.',
      'If a child is in danger right now, call your local emergency number.',
    ],
  },
  online_danger: {
    intro: 'Someone online may have asked your child for something unsafe. A calm talk matters more than a telling-off.',
    tips: [
      'Reassure your child: they are not in trouble for telling you.',
      'Look together at who they are talking to. Do not delete anything yet, it may be useful as evidence.',
      'Block and report the account on the platform. Remind your child never to share photos, an address or to meet anyone from online.',
      'If someone is pressuring or threatening your child, contact the police or a child protection helpline.',
    ],
  },
  bullying: {
    intro: 'Your child may be dealing with unkind treatment at school or online.',
    tips: [
      'Start with feelings: "That sounds really hard. I am glad you told someone. I am on your side."',
      'Ask open questions: what happened, how often, who saw it. Avoid "just ignore them" as a first answer.',
      'Keep a short record of dates and what was said, then speak to the teacher or school counselor together.',
      'Help your child plan: who they can sit with, which adult they can go to, and what they can say.',
    ],
  },
  sad_or_scared: {
    intro: 'Your child expressed a hard feeling. Most of the time a warm check-in is all that is needed.',
    tips: [
      'Choose a relaxed moment, like a walk or bedtime, and say "I noticed you have had a tough time lately. Want to tell me about it?"',
      'Name the feeling without fixing it straight away: "That sounds scary."',
      'Keep routines steady (sleep, meals, play) and watch for changes over the next few days.',
      'If it keeps coming up or gets worse, talk to your child\'s doctor or school counselor.',
    ],
  },
};

export type Region = 'US' | 'IN';
export const regionOf = (helplines: Helpline[]): Region =>
  helplines.some((h) => /1098|14416/.test(h.contact)) ? 'IN' : 'US';
export const EMERGENCY: Record<Region, string> = { US: '911', IN: '112' };

export interface SectionDef { id: string; label: string; icon: IconName; title: string; blurb: string }

export interface AlertTurn {
  turn: Turn;
  kind: DistressKind;
  level: 'concern' | 'urgent';
}

/** Turns that triggered a safety response, urgent first, then newest first. */
export function getAlerts(turns: Turn[]): AlertTurn[] {
  return turns
    .filter((t) => t.distress)
    .map((t) => ({ turn: t, kind: t.distress!.kind, level: t.distress!.level }))
    .sort((a, b) => Number(b.level === 'urgent') - Number(a.level === 'urgent') || b.turn.at - a.turn.at);
}
