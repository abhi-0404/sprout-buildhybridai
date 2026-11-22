import { describe, expect, it } from 'vitest';
import { DemoAi } from '../ai/demoAi';
import { splitSanitized, stripQueuedNote } from '../kid/seen';
import { mergePolicy } from '../lib/config';
import { weeklyStats } from '../parent/sections/Digest';
import { getAlerts } from '../parent/shared';
import { extractJson, parseGuard, parseReferee } from './json';
import { totals } from './ledger';
import { DEFAULT_POLICY, ask, type Deps, type Turn } from './sprout';
import { DEMO_PROFILE, FakeAi } from './testing';

const deps = (ai: Deps['ai'], over: Partial<Deps> = {}): Deps => ({
  ai, profile: DEMO_PROFILE, policy: DEFAULT_POLICY, isOnline: () => true, deviceReady: true, ...over,
});

describe('json parsing', () => {
  it('extracts JSON from fenced or chatty model output', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson('no json here')).toThrow();
  });
  it('guard: invalid enums fall back to safe defaults and names are cleaned', () => {
    const g = parseGuard('{"category":"party","needsBigBrain":"yes","topic":"zzz","names":["Riya", 3, "x", ""]}');
    expect(g).toEqual({ category: 'ok', needsBigBrain: false, topic: 'other', names: ['Riya'] });
  });
  it('referee: unknown verdict fails toward the safer rewrite', () => {
    expect(parseReferee('{"verdict":"maybe"}').verdict).toBe('simplify');
  });
});

describe('ledger', () => {
  it('counts an identifier that reached the cloud (the metric is real, not hard-coded)', () => {
    const leaky: Turn = {
      id: 't', at: 0, question: 'Aarav asks', sanitized: '[CHILD] asks', mode: 'hybrid', route: 'cloud',
      answer: 'a', answerWhere: 'cloud', queued: false,
      redactions: [{ token: '[CHILD]', kind: 'CHILD', original: 'Aarav', by: 'profile' }],
      steps: [{ task: 'answer', where: 'cloud', latencyMs: 1, outChars: 10, sentToCloud: 'Aarav asks' }],
    };
    expect(totals([leaky]).identifiersSentToCloud).toBe(1);
  });
  it('cloud cost is never above the all-cloud cost', async () => {
    const ai = new FakeAi();
    const turns = [await ask('what is a cat?', deps(ai)), await ask('why do cats purr?', deps(ai))];
    const t = totals(turns);
    expect(t.estCloudCostUsd).toBeLessThanOrEqual(t.estAllCloudCostUsd);
    expect(t.deviceCalls + t.cloudCalls).toBe(t.aiCalls);
  });
});

describe('remote config merge', () => {
  it('remote config can tighten but never loosen the parent choice', () => {
    const off = { ...DEFAULT_POLICY, allowCloud: false, refereeCloudAnswers: true };
    expect(mergePolicy(off, { allowCloud: true }).allowCloud).toBe(false);
    expect(mergePolicy(off, { refereeCloudAnswers: false }).refereeCloudAnswers).toBe(true);
    expect(mergePolicy(DEFAULT_POLICY, { allowCloud: false }).allowCloud).toBe(false);
    expect(mergePolicy(DEFAULT_POLICY, null)).toEqual(DEFAULT_POLICY);
  });
});

describe('weekly note privacy', () => {
  it('the data sent for the weekly note contains no question text, answers or names', async () => {
    const ai = new FakeAi();
    const turns = [
      await ask("I'm Aarav from Green Park School, why do volcanoes explode?", deps(ai)),
      await ask('my friend Riya says hi, what is a moon?', deps(ai)),
      await ask('nobody likes me', deps(ai)),
    ];
    const sent = JSON.stringify(weeklyStats(turns));
    for (const banned of ['Aarav', 'Green Park', 'Riya', 'volcano', 'moon', 'nobody likes', 'Answer from']) {
      expect(sent).not.toContain(banned);
    }
  });
});

describe('kid helpers', () => {
  it('splits sanitized text into plain and token segments', () => {
    const segs = splitSanitized("I'm [CHILD] from [SCHOOL_1]!");
    expect(segs.map((s) => s.text)).toEqual(["I'm ", '[CHILD]', ' from ', '[SCHOOL_1]', '!']);
  });
  it('strips the queued note so the kid UI can show its own tag', () => {
    expect(stripQueuedNote("Short answer.\n\n(I'll ask the big brain for a fuller answer when we're back online.)")).toBe('Short answer.');
  });
});

describe('parent alerts', () => {
  it('lists urgent alerts before concern alerts', async () => {
    const ai = new FakeAi();
    const turns = [await ask('nobody likes me', deps(ai)), await ask('i want to die', deps(ai))];
    const alerts = getAlerts(turns);
    expect(alerts.map((a) => a.level)).toEqual(['urgent', 'concern']);
  });
});

describe('demo AI', () => {
  it('routes simple questions to the device and big ones to the cloud', async () => {
    const ai = new DemoAi({ deviceModel: true });
    const simple = await ask('what is the moon made of?', deps(ai));
    const big = await ask('why do volcanoes explode?', deps(ai));
    expect(simple.answerWhere).toBe('device');
    expect(big.answerWhere).toBe('cloud');
  }, 20000);
  it('without a device model everything goes through cloud-safe mode', async () => {
    const ai = new DemoAi({ deviceModel: false });
    const t = await ask('what is the moon made of?', deps(ai, { deviceReady: false }));
    expect(t.mode).toBe('cloud-safe');
  }, 20000);
});
