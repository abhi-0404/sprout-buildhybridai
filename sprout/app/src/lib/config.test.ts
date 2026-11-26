import { describe, expect, it, vi } from 'vitest';

vi.mock('./firebaseEnv', () => ({ firebaseConfigured: false }));
import { loadRemotePolicy, mergePolicy } from './config';
import { DEFAULT_POLICY } from '../pipeline/sprout';

describe('mergePolicy', () => {
  it('keeps the local policy when there is no remote patch', () => {
    expect(mergePolicy(DEFAULT_POLICY, null)).toBe(DEFAULT_POLICY);
  });

  it('never turns the big brain back on after the parent turned it off', () => {
    const local = { ...DEFAULT_POLICY, allowCloud: false };
    expect(mergePolicy(local, { allowCloud: true }).allowCloud).toBe(false);
  });

  it('lets remote config switch the cloud off', () => {
    expect(mergePolicy(DEFAULT_POLICY, { allowCloud: false }).allowCloud).toBe(false);
  });

  it('keeps the referee on if either side wants it', () => {
    expect(mergePolicy({ ...DEFAULT_POLICY, refereeCloudAnswers: true }, { refereeCloudAnswers: false }).refereeCloudAnswers).toBe(true);
    expect(mergePolicy({ ...DEFAULT_POLICY, refereeCloudAnswers: false }, { refereeCloudAnswers: true }).refereeCloudAnswers).toBe(true);
    expect(mergePolicy({ ...DEFAULT_POLICY, refereeCloudAnswers: false }, {}).refereeCloudAnswers).toBe(false);
  });

  it('takes remote helplines only when given', () => {
    const helplines = [...DEFAULT_POLICY.helplines].reverse();
    expect(mergePolicy(DEFAULT_POLICY, { helplines }).helplines).toBe(helplines);
    expect(mergePolicy(DEFAULT_POLICY, {}).helplines).toBe(DEFAULT_POLICY.helplines);
  });
});

describe('loadRemotePolicy', () => {
  it('returns null in demo mode without touching Firebase', async () => {
    expect(await loadRemotePolicy()).toBeNull();
  });
});
