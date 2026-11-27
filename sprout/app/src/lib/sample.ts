import { DemoAi } from '../ai/demoAi';
import type { AiClient } from '../ai/types';
import { DEFAULT_HELPLINES } from '../pipeline/distress';
import { ask, type Policy, type Turn } from '../pipeline/sprout';
import type { ChildProfile } from '../pipeline/types';

// "Try a sample family": a fictional profile plus a few questions run through the REAL pipeline
// code, so a visitor sees every feature. The deterministic layers (redaction, privacy gate,
// distress rules, routing) really run; every model reply, including the guard and referee
// verdicts, is SCRIPTED (DemoAi) and every sample turn is labelled "sample" in the UI: the
// free Gemini tier allows only a few requests a day per model, and five sample questions made
// about 15 cloud calls before the kid view even opened. Real questions typed afterwards use the
// real models.

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

/** The scripted model used for the sample: simulates an on-device model too, so both routes show. */
export const sampleAi = (): AiClient => new DemoAi({ deviceModel: true, latencyScale: 0.1 });

export async function runSample(opts: {
  policy: Policy;
  onTurn: (t: Turn) => void;
  /** Tests only: defaults to the scripted sample model. */
  ai?: AiClient;
}): Promise<void> {
  const ai = opts.ai ?? sampleAi();
  const policy: Policy = { ...opts.policy, helplines: DEFAULT_HELPLINES.IN };
  for (const q of SAMPLE_QUESTIONS) {
    const turn = await ask(q, {
      ai, profile: SAMPLE_PROFILE, policy, isOnline: () => true, deviceReady: true,
    });
    opts.onTurn({ ...turn, sample: true });
  }
}
