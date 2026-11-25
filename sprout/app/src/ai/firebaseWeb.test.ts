import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Firebase SDK is mocked: only the adapter's routing and source reporting are under test.
const calls: string[] = [];
let onDeviceFails = false;
let reportedSource: string | undefined = 'in_cloud';

vi.mock('firebase/ai', () => ({
  getAI: () => ({}),
  GoogleAIBackend: class {},
  InferenceMode: {
    ONLY_ON_DEVICE: 'only_on_device', PREFER_ON_DEVICE: 'prefer_on_device',
    PREFER_IN_CLOUD: 'prefer_in_cloud', ONLY_IN_CLOUD: 'only_in_cloud',
  },
  InferenceSource: { ON_DEVICE: 'on_device', IN_CLOUD: 'in_cloud' },
  getGenerativeModel: (_ai: unknown, p: { mode: string }) => ({
    generateContent: async () => {
      calls.push(p.mode);
      const device = p.mode === 'prefer_on_device' || p.mode === 'only_on_device';
      if (device && onDeviceFails) throw new Error('QuotaExceededError');
      return { response: { text: () => 'ok', inferenceSource: reportedSource } };
    },
    initializeDeviceModel: async () => {},
  }),
}));
vi.mock('../lib/firebase', () => ({ getFirebaseApp: () => ({}) }));

import { FirebaseWebAi } from './firebaseWeb';

beforeEach(() => {
  calls.length = 0;
  onDeviceFails = false;
  reportedSource = 'in_cloud';
});

describe('FirebaseWebAi.generate', () => {
  it('reports the source the SDK gives', async () => {
    reportedSource = 'on_device';
    const r = await new FirebaseWebAi('m').generate({ task: 'answer', mode: 'prefer_device', prompt: 'hi' });
    expect(r.source).toBe('device');
  });

  it('retries once in the cloud when prefer_device fails on device, and says cloud', async () => {
    onDeviceFails = true;
    const r = await new FirebaseWebAi('m').generate({ task: 'answer', mode: 'prefer_device', prompt: 'hi' });
    expect(calls).toEqual(['prefer_on_device', 'only_in_cloud']);
    expect(r.source).toBe('cloud');
  });

  it('never leaves the device for only_device: the error propagates', async () => {
    onDeviceFails = true;
    await expect(new FirebaseWebAi('m').generate({ task: 'guard', mode: 'only_device', prompt: 'hi' })).rejects.toThrow('QuotaExceededError');
    expect(calls).toEqual(['only_on_device']);
  });

  it('throws instead of guessing when the SDK does not report a source', async () => {
    reportedSource = undefined;
    await expect(new FirebaseWebAi('m').generate({ task: 'answer', mode: 'only_cloud', prompt: 'hi' })).rejects.toThrow(/did not report/);
  });
});
