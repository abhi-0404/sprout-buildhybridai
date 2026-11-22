import { TOPICS, type GuardVerdict, type RefereeVerdict, type Topic } from './types';

/** Models sometimes wrap JSON in prose or code fences: take the first {...} block. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(text.slice(start, end + 1));
}

export function parseGuard(text: string): GuardVerdict {
  const raw = extractJson(text) as Record<string, unknown>;
  const category = ['ok', 'sensitive', 'unsafe', 'distress'].includes(raw.category as string)
    ? (raw.category as GuardVerdict['category'])
    : 'ok';
  const topic = (TOPICS as readonly string[]).includes(raw.topic as string) ? (raw.topic as Topic) : 'other';
  const names = Array.isArray(raw.names)
    ? raw.names.filter((n): n is string => typeof n === 'string' && n.trim().length >= 2).slice(0, 20)
    : [];
  return { category, needsBigBrain: raw.needsBigBrain === true, topic, names };
}

export function parseReferee(text: string): { verdict: RefereeVerdict; reason: string } {
  const raw = extractJson(text) as Record<string, unknown>;
  const verdict = ['pass', 'simplify', 'block'].includes(raw.verdict as string)
    ? (raw.verdict as RefereeVerdict)
    : 'simplify'; // unknown output: fail toward the safer rewrite
  return { verdict, reason: typeof raw.reason === 'string' ? raw.reason : '' };
}
