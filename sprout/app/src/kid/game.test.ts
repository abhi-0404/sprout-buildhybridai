import { describe, expect, it } from 'vitest';
import type { Turn } from '../pipeline/sprout';
import type { Topic } from '../pipeline/types';
import { DEFAULT_GAME, dailyWonder, newBadges, progress } from './game';

let n = 0;
const turn = (question: string, topic: Topic, over: Partial<Turn> = {}): Turn => ({
  id: `t${n++}`, at: Date.now(), question, sanitized: question, redactions: [], mode: 'hybrid',
  route: 'device', answer: 'a', answerWhere: 'device', steps: [], queued: false,
  guard: { category: 'ok', needsBigBrain: false, topic, names: [] }, ...over,
});

describe('safe gamification', () => {
  it('plants grow with curiosity per topic', () => {
    const p = progress([turn('why a', 'science'), turn('why b', 'science'), turn('why c', 'science'), turn('cat?', 'animals')], DEFAULT_GAME);
    expect(p.plants.find((x) => x.topic === 'science')?.stage).toBe(2);
    expect(p.plants.find((x) => x.topic === 'animals')?.stage).toBe(1);
  });

  it('distress and blocked turns never earn rewards', () => {
    const p = progress([
      turn('nobody likes me', 'feelings', { route: 'distress', answerWhere: 'script' }),
      turn('bad thing', 'other', { route: 'blocked', answerWhere: 'script' }),
    ], DEFAULT_GAME);
    expect(p.earnedCount).toBe(0);
    expect(p.plants).toHaveLength(0);
  });

  it('rewards pause after the daily limit (no incentive to binge)', () => {
    const many = Array.from({ length: 10 }, (_, i) => turn(`q${i}`, 'science'));
    const p = progress(many, { enabled: true, dailyLimit: 3 });
    expect(p.plants[0].count).toBe(3);
    expect(p.limitReached).toBe(true);
  });

  it('reports newly earned badges for a celebration', () => {
    const before = progress([], DEFAULT_GAME);
    const after = progress([turn('why is the sky blue', 'science')], DEFAULT_GAME);
    expect(newBadges(before, after).map((b) => b.id)).toEqual(['first']);
  });

  it('"Tell me more" earns Deep Diver but does not inflate plant growth', () => {
    const p = progress([turn('why is the sky blue', 'science'), turn('Tell me more about: why is the sky blue', 'science')], DEFAULT_GAME);
    expect(p.badges.find((b) => b.id === 'deep')?.earned).toBe(true);
    expect(p.plants[0].count).toBe(1);
  });

  it('the daily wonder is stable within a day and changes across days', () => {
    const day = new Date('2026-11-15T09:00:00').getTime();
    expect(dailyWonder('6-8', day)).toBe(dailyWonder('6-8', day + 3_600_000));
    expect(dailyWonder('6-8', day)).not.toBe(dailyWonder('6-8', day + 86_400_000));
  });
});
