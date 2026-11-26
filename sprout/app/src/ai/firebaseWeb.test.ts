import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Firebase SDK is mocked: only the adapter's routing and source reporting are under test.
const calls: string[] = [];
const cloudConfigs: object[] = [];
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
  ThinkingLevel: { MINIMAL: 'MINIMAL', LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  getGenerativeModel: (_ai: unknown, p: { mode: string; inCloudParams?: { generationConfig?: object } }) => ({
    generateContent: async () => {
      cloudConfigs.push(p.inCloudParams?.generationConfig ?? {});
      calls.push(p.mode);
      const device = p.mode === 'prefer_on_device' || p.mode === 'only_on_device';
      if (device && onDeviceFails) throw new Error('QuotaExceededError');
      return { response: { text: () => 'ok', inferenceSource: reportedSource } };
    },
    initializeDeviceModel: async () => {},
  }),
}));
vi.mock('../lib/firebase', () => ({ getFirebaseApp: () => ({}) }));

import { answerThinkingLevel, FirebaseWebAi } from './firebaseWeb';

beforeEach(() => {
  calls.length = 0;
  cloudConfigs.length = 0;
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

  it('keeps answer thinking minimal so it cannot eat the answer token budget; safety checks keep default thinking', async () => {
    vi.stubEnv('VITE_CLOUD_THINKING', '');
    const ai = new FirebaseWebAi('gemini-3.5-flash');
    await ai.generate({ task: 'answer', mode: 'only_cloud', prompt: 'hi' });
    await ai.generate({ task: 'guard', mode: 'only_cloud', prompt: 'hi', jsonSchema: { type: 'object' } });
    vi.unstubAllEnvs();
    expect(cloudConfigs).toHaveLength(2);
    expect(cloudConfigs[0]).toMatchObject({ maxOutputTokens: 400, thinkingConfig: { thinkingLevel: 'MINIMAL' } });
    expect(cloudConfigs[1]).not.toHaveProperty('thinkingConfig');
  });
});

describe('answerThinkingLevel', () => {
  it('picks a level each model accepts', () => {
    expect(answerThinkingLevel('gemini-3.5-flash')).toBe('MINIMAL');
    expect(answerThinkingLevel('gemini-3.8-flash')).toBe('LOW');
    expect(answerThinkingLevel('gemini-2.5-flash')).toBeUndefined();
  });

  it('honours a valid override, any case, and ignores a typo', () => {
    expect(answerThinkingLevel('gemini-3.8-flash', 'medium')).toBe('MEDIUM');
    expect(answerThinkingLevel('gemini-3.5-flash', 'minimul')).toBe('MINIMAL');
    expect(answerThinkingLevel('gemini-3.8-flash', '')).toBe('LOW');
  });
});
