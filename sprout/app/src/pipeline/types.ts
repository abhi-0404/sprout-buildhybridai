// Core types shared by the Sprout pipeline. Pure TypeScript: no Firebase or DOM imports,
// so the same pipeline runs on web, inside Capacitor (Android/iOS) and in unit tests.

export type AgeBand = '6-8' | '9-12';

/** Set up by the parent. Stored only on the child's device, never synced. */
export interface ChildProfile {
  childName: string;
  nicknames: string[];
  school: string;
  city: string;
  /** Siblings, friends, teachers, parents: any name that should never leave the device. */
  otherNames: string[];
  /** Street names, neighbourhoods, building names. */
  places: string[];
  ageBand: AgeBand;
}

export type RedactionKind = 'CHILD' | 'NAME' | 'SCHOOL' | 'PLACE' | 'ADDRESS' | 'PHONE' | 'EMAIL' | 'NUMBER';

export interface Redaction {
  token: string; // e.g. [NAME_1]
  kind: RedactionKind;
  original: string;
  /** 'profile' = known identifier, 'pattern' = regex, 'model' = found by the on-device model. */
  by: 'profile' | 'pattern' | 'model';
}

export interface RedactionResult {
  text: string;
  redactions: Redaction[];
}

export type DistressKind = 'self_harm' | 'abuse' | 'online_danger' | 'bullying' | 'sad_or_scared';
export type DistressLevel = 'none' | 'concern' | 'urgent';

export interface DistressSignal {
  level: DistressLevel;
  kind?: DistressKind;
  matched?: string;
}

export type GuardCategory = 'ok' | 'sensitive' | 'unsafe' | 'distress';

export const TOPICS = [
  'science', 'animals', 'space', 'nature', 'math', 'reading', 'history', 'geography',
  'body', 'feelings', 'friends', 'tech', 'games', 'art', 'music', 'sports', 'food', 'other',
] as const;
export type Topic = (typeof TOPICS)[number];

export interface GuardVerdict {
  category: GuardCategory;
  needsBigBrain: boolean;
  topic: Topic;
  /** Names of people or places the model spotted that the deterministic layer missed. */
  names: string[];
}

export type RefereeVerdict = 'pass' | 'simplify' | 'block';

export type Route = 'device' | 'cloud' | 'distress' | 'blocked' | 'queued';

export type Where = 'device' | 'cloud';
