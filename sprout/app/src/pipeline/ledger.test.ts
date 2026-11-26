import { describe, expect, it } from 'vitest';
import { totals } from './ledger';
import type { Turn } from './sprout';

const turn = (over: Partial<Turn>): Turn => ({
  id: 't', at: 0, question: 'q', sanitized: 'q', redactions: [], mode: 'hybrid', route: 'device',
  answer: 'a', answerWhere: 'device', steps: [], ...over,
} as Turn);

describe('ledger totals', () => {
  it('is all zeros for no turns', () => {
    const t = totals([]);
    expect(t.questions).toBe(0);
    expect(t.aiCalls).toBe(0);
    expect(t.estCloudCostUsd).toBe(0);
    expect(t.topics).toEqual({});
  });

  it('counts where answers came from and splits calls by device and cloud', () => {
    const t = totals([
      turn({ answerWhere: 'device', steps: [{ task: 'guard', where: 'device', latencyMs: 1, outChars: 40 }] }),
      turn({
        answerWhere: 'cloud',
        steps: [
          { task: 'guard', where: 'device', latencyMs: 1, outChars: 40 },
          { task: 'answer', where: 'cloud', latencyMs: 1, sentToCloud: 'why is the sky blue', outChars: 400 },
        ],
      }),
      turn({ answerWhere: 'script' }),
    ] as Turn[]);
    expect(t.questions).toBe(3);
    expect([t.answeredOnDevice, t.answeredInCloud, t.scripted]).toEqual([1, 1, 1]);
    expect([t.aiCalls, t.deviceCalls, t.cloudCalls]).toEqual([3, 2, 1]);
  });

  it('only charges cloud steps, but prices every step for the all-cloud estimate', () => {
    const t = totals([
      turn({
        sanitized: 'x'.repeat(400),
        steps: [
          { task: 'guard', where: 'device', latencyMs: 1, outChars: 400 },
          { task: 'answer', where: 'cloud', latencyMs: 1, sentToCloud: 'y'.repeat(400), outChars: 400 },
        ],
      }),
    ], { inputPerM: 1, outputPerM: 1 });
    // cloud step: 100 in + 100 out tokens; device step: (400 + 400) / 4 = 200 in + 100 out tokens
    expect(t.estCloudCostUsd).toBeCloseTo(200 / 1e6, 12);
    expect(t.estAllCloudCostUsd).toBeCloseTo(500 / 1e6, 12);
  });

  it('counts a known identifier that reached the cloud', () => {
    const redactions = [{ token: '[CHILD]', kind: 'CHILD', original: 'Aarav', by: 'profile' }] as Turn['redactions'];
    const leaked = turn({ redactions, steps: [{ task: 'answer', where: 'cloud', latencyMs: 1, sentToCloud: 'Hi Aarav', outChars: 1 }] });
    const clean = turn({ redactions, steps: [{ task: 'answer', where: 'cloud', latencyMs: 1, sentToCloud: 'Hi [CHILD]', outChars: 1 }] });
    expect(totals([clean]).identifiersSentToCloud).toBe(0);
    expect(totals([leaked]).identifiersSentToCloud).toBe(1);
    expect(totals([clean]).personalDetailsHidden).toBe(1);
  });

  it('counts rewrites, distress, blocked turns and topics', () => {
    const t = totals([
      turn({ referee: { verdict: 'simplify', reason: '', where: 'device' }, guard: { category: 'ok', needsBigBrain: false, topic: 'science', names: [] } }),
      turn({ referee: { verdict: 'pass', reason: '', where: 'device' }, guard: { category: 'ok', needsBigBrain: false, topic: 'science', names: [] } }),
      turn({ distress: { level: 'concern', kind: 'bullying' } as Turn['distress'], route: 'blocked' as Turn['route'] }),
    ]);
    expect(t.refereeRewrites).toBe(1);
    expect(t.distressEvents).toBe(1);
    expect(t.blocked).toBe(1);
    expect(t.topics).toEqual({ science: 2 });
  });
});
