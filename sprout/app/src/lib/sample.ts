import type { AiClient } from '../ai/types';
import { DEFAULT_HELPLINES } from '../pipeline/distress';
import { ask, type Policy, type Turn } from '../pipeline/sprout';
import type { ChildProfile } from '../pipeline/types';

// "Try a sample family": a fictional profile plus a few questions run through the REAL
// pipeline (redaction, guard, routing, referee, distress), so a visitor sees every feature.

export const SAMPLE_PROFILE: ChildProfile = {
  childName: 'Aarav Sharma',
  nicknames: ['Avi'],
  school: 'Green Park Public School',
  city: 'Pune',
  otherNames: ['Riya', 'Mrs Kapoor'],
  places: ['Koregaon Park'],
  ageBand: '6-8',
};

export const SAMPLE_QUESTIONS = [
  'what is the moon made of?',
  "I'm Aarav from Green Park School, why do volcanoes explode?",
  'how do bees make honey?',
  'why did world war 2 happen?',
  "kids at school say i'm stupid and i don't want to go",
];

export async function runSample(opts: {
  ai: AiClient;
  policy: Policy;
  deviceReady: boolean;
  onTurn: (t: Turn) => void;
}): Promise<void> {
  const policy: Policy = { ...opts.policy, helplines: DEFAULT_HELPLINES.IN };
  for (const q of SAMPLE_QUESTIONS) {
    const turn = await ask(q, {
      ai: opts.ai, profile: SAMPLE_PROFILE, policy, isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false, deviceReady: opts.deviceReady,
    });
    opts.onTurn(turn);
  }
}
