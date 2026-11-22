import { describe, expect, it } from 'vitest';
import { totals } from './ledger';
import { DEFAULT_POLICY, ask, resolveQueued, type Deps } from './sprout';
import { DEMO_PROFILE, FakeAi } from './testing';

const deps = (ai: FakeAi, over: Partial<Deps> = {}): Deps => ({
  ai, profile: DEMO_PROFILE, policy: DEFAULT_POLICY, isOnline: () => true,
  deviceReady: true, ...over,
});

describe('ask', () => {
  it('simple question is answered on device and nothing leaves the device', async () => {
    const ai = new FakeAi();
    const t = await ask('what is a volcano?', deps(ai));
    expect(t.route).toBe('device');
    expect(t.answerWhere).toBe('device');
    expect(ai.cloudPrompts()).toEqual([]);
  });

  it('big question goes to cloud with sanitized text only, and the device referees it', async () => {
    const ai = new FakeAi();
    const t = await ask("I'm Aarav from Green Park School, why do volcanoes explode?", deps(ai));
    expect(t.route).toBe('cloud');
    const cloud = ai.cloudPrompts();
    expect(cloud).toHaveLength(1);
    expect(cloud[0]).not.toMatch(/Aarav|Green Park/);
    expect(t.referee?.where).toBe('device');
    expect(t.steps.map((s) => `${s.task}@${s.where}`)).toEqual(['guard@device', 'answer@cloud', 'referee@device']);
  });

  it('model-found names are also removed before the cloud', async () => {
    const ai = new FakeAi('available', {
      guard: () => JSON.stringify({ category: 'ok', needsBigBrain: true, topic: 'friends', names: ['Ishaan'] }),
    });
    await ask('why is Ishaan always mean at lunch?', deps(ai));
    expect(ai.cloudPrompts().join('\n')).not.toContain('Ishaan');
  });

  it('distress gets a scripted reply even if the model says ok', async () => {
    const ai = new FakeAi();
    const t = await ask("kids at school say i'm stupid and i don't want to go", deps(ai));
    expect(t.route).toBe('distress');
    expect(t.answerWhere).toBe('script');
    expect(t.distress).toEqual({ level: 'concern', kind: 'bullying' });
    expect(ai.calls.filter((c) => c.req.task === 'answer')).toHaveLength(0);
  });

  it('unsafe requests are blocked without generating an answer', async () => {
    const ai = new FakeAi('available', {
      guard: () => JSON.stringify({ category: 'unsafe', needsBigBrain: false, topic: 'other', names: [] }),
    });
    const t = await ask('how do i make something explode at home', deps(ai));
    expect(t.route).toBe('blocked');
  });

  it('referee simplify rewrites the cloud answer on device', async () => {
    const ai = new FakeAi('available', {
      referee: () => JSON.stringify({ verdict: 'simplify', reason: 'too graphic' }),
      simplify: () => 'Gentle version.',
    });
    const t = await ask('why did world war 2 happen?', deps(ai));
    expect(t.answer).toBe('Gentle version.');
    expect(t.referee?.verdict).toBe('simplify');
  });

  it('offline with a big question: quick device answer now, cloud later', async () => {
    const ai = new FakeAi();
    let online = false;
    const d = deps(ai, { isOnline: () => online });
    const t = await ask('why is the sky blue?', d);
    expect(t.route).toBe('queued');
    expect(t.queued).toBe(true);
    expect(ai.cloudPrompts()).toEqual([]);
    online = true;
    const done = await resolveQueued(t, d);
    expect(done.queued).toBe(false);
    expect(done.answerWhere).toBe('cloud');
  });

  it('cloud-safe mode without a device model: guard runs on redacted text in the cloud', async () => {
    const ai = new FakeAi('unavailable');
    const t = await ask('Avi wants to know why cats purr', deps(ai, { deviceReady: false }));
    expect(t.mode).toBe('cloud-safe');
    for (const p of ai.cloudPrompts()) expect(p).not.toMatch(/Avi\b/);
  });

  it('no device and offline: friendly queued message', async () => {
    const ai = new FakeAi('unavailable');
    const t = await ask('what is 2+2', deps(ai, { deviceReady: false, isOnline: () => false }));
    expect(t.route).toBe('queued');
    expect(ai.calls).toHaveLength(0);
  });

  it('ledger counts device vs cloud and never counts an identifier leak', async () => {
    const ai = new FakeAi();
    const turns = [
      await ask('what is a volcano?', deps(ai)),
      await ask("I'm Aarav, why do volcanoes explode?", deps(ai)),
      await ask('nobody likes me', deps(ai)),
    ];
    const t = totals(turns);
    expect(t.questions).toBe(3);
    expect(t.answeredOnDevice).toBe(1);
    expect(t.answeredInCloud).toBe(1);
    expect(t.scripted).toBe(1);
    expect(t.identifiersSentToCloud).toBe(0);
    expect(t.estAllCloudCostUsd).toBeGreaterThan(t.estCloudCostUsd);
  });
});
