import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, type Turn } from '../pipeline/sprout';
import { runSample, SAMPLE_QUESTIONS } from './sample';

const policy = { ...DEFAULT_POLICY };

describe('runSample', () => {
  it('runs every sample question with the scripted model, labels each turn, and still catches distress', async () => {
    const turns: Turn[] = [];
    const t0 = Date.now();
    await runSample({ policy, onTurn: (t) => turns.push(t) });
    expect(turns).toHaveLength(SAMPLE_QUESTIONS.length);
    expect(turns.every((t) => t.sample === true)).toBe(true);
    // The real pipeline still runs: the bullying message goes the distress route, and the
    // name and school in the volcano question are redacted.
    expect(turns.at(-1)!.route).toBe('distress');
    expect(turns[1].redactions.length).toBeGreaterThan(0);
    // Both routes show: some answers on the (simulated) device, some from the (scripted) big brain.
    expect(turns.some((t) => t.answerWhere === 'cloud')).toBe(true);
    expect(turns.some((t) => t.answerWhere === 'device')).toBe(true);
    // Fast enough that the kid view opens almost at once.
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});
