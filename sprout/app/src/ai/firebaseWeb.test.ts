import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Firebase SDK is mocked: only the adapter's routing and source reporting are under test.
const calls: string[] = [];
const cloudConfigs: object[] = [];
let onDeviceFails = false;
let reportedSource: string | undefined = 'in_cloud';
const cloudModelsUsed: string[] = [];
/** Cloud model name -> HTTP status it fails with. */
let cloudStatus: Record<string, number> = {};
/** Cloud model name -> artificial delay (ms). */
let slowModels: Record<string, number> = {};

vi.mock('firebase/ai', () => ({
  getAI: () => ({}),
  GoogleAIBackend: class {},
  InferenceMode: {
    ONLY_ON_DEVICE: 'only_on_device', PREFER_ON_DEVICE: 'prefer_on_device',
    PREFER_IN_CLOUD: 'prefer_in_cloud', ONLY_IN_CLOUD: 'only_in_cloud',
  },
  InferenceSource: { ON_DEVICE: 'on_device', IN_CLOUD: 'in_cloud' },
  ThinkingLevel: { MINIMAL: 'MINIMAL', LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  getGenerativeModel: (_ai: unknown, p: { mode: string; inCloudParams?: { model?: string; generationConfig?: object } }) => ({
    generateContent: async () => {
      cloudConfigs.push(p.inCloudParams?.generationConfig ?? {});
      calls.push(p.mode);
      const device = p.mode === 'prefer_on_device' || p.mode === 'only_on_device';
      if (device && onDeviceFails) throw new Error('QuotaExceededError');
      const model = p.inCloudParams?.model ?? '';
      if (!device) cloudModelsUsed.push(model);
      if (!device && slowModels[model]) await new Promise((r) => setTimeout(r, slowModels[model]));
      const status = cloudStatus[model];
      if (!device && status) throw Object.assign(new Error(`[${status} ] failed`), { customErrorData: { status } });
      return { response: { text: () => 'ok', inferenceSource: reportedSource } };
    },
    initializeDeviceModel: async () => {},
  }),
}));
vi.mock('../lib/firebase', () => ({ getFirebaseApp: () => ({}) }));

import { answerThinkingConfig, answerThinkingLevel, cloudModelList, FirebaseWebAi, isModelUnavailable, SHORT_SKIP_MS, SKIP_MS } from './firebaseWeb';

beforeEach(() => {
  calls.length = 0;
  cloudConfigs.length = 0;
  cloudModelsUsed.length = 0;
  cloudStatus = {};
  slowModels = {};
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

describe('cloud model fallback', () => {
  const ask = (ai: FirebaseWebAi, mode: 'only_cloud' | 'prefer_device' | 'only_device' = 'only_cloud') =>
    ai.generate({ task: 'answer', mode, prompt: 'hi' });

  it('moves to the next model on a 429 and skips the spent one on the next call', async () => {
    cloudStatus = { a: 429 };
    const ai = new FirebaseWebAi('a', 'b,c');
    expect((await ask(ai)).text).toBe('ok');
    expect(cloudModelsUsed).toEqual(['a', 'b']);
    await ask(ai);
    expect(cloudModelsUsed).toEqual(['a', 'b', 'b']);
  });

  it('also skips a model that does not exist (404)', async () => {
    cloudStatus = { a: 404, b: 404 };
    await ask(new FirebaseWebAi('a', 'b,c'));
    expect(cloudModelsUsed).toEqual(['a', 'b', 'c']);
  });

  it('does not fall back on other errors (for example a bad request)', async () => {
    cloudStatus = { a: 400 };
    await expect(ask(new FirebaseWebAi('a', 'b'))).rejects.toThrow('[400');
    expect(cloudModelsUsed).toEqual(['a']);
  });

  it('throws the last quota error when every model is spent, then retries the primary later', async () => {
    cloudStatus = { a: 429, b: 429 };
    let t = 1000;
    const ai = new FirebaseWebAi('a', 'b', () => t);
    await expect(ask(ai)).rejects.toThrow('[429');
    expect(cloudModelsUsed).toEqual(['a', 'b']);
    // All skipped: still asks the primary once instead of failing without a request.
    await expect(ask(ai)).rejects.toThrow('[429');
    expect(cloudModelsUsed).toEqual(['a', 'b', 'a']);
    // After the skip window the whole list is tried again.
    cloudStatus = {};
    t += SKIP_MS + 1;
    await ask(ai);
    expect(cloudModelsUsed).toEqual(['a', 'b', 'a', 'a']);
  });

  it('prefer_device: device first, then the cloud chain', async () => {
    onDeviceFails = true;
    cloudStatus = { a: 429 };
    const r = await ask(new FirebaseWebAi('a', 'b'), 'prefer_device');
    expect(r.source).toBe('cloud');
    expect(calls).toEqual(['prefer_on_device', 'only_in_cloud', 'prefer_on_device', 'only_in_cloud']);
    expect(cloudModelsUsed).toEqual(['a', 'b']);
  });

  it('only_device never touches the cloud chain', async () => {
    onDeviceFails = true;
    await expect(ask(new FirebaseWebAi('a', 'b'), 'only_device')).rejects.toThrow('QuotaExceededError');
    expect(cloudModelsUsed).toEqual([]);
  });

  it('fallback models get their own thinking level, not the primary override', async () => {
    vi.stubEnv('VITE_CLOUD_THINKING', 'LOW');
    cloudStatus = { 'gemini-3.5-flash': 429 };
    await ask(new FirebaseWebAi('gemini-3.5-flash', 'gemini-2.5-flash'));
    vi.unstubAllEnvs();
    expect(cloudConfigs[0]).toMatchObject({ thinkingConfig: { thinkingLevel: 'LOW' } });
    // gemini-2.5-flash thinks by default: a zero budget keeps the 400 token answer whole.
    expect(cloudConfigs[1]).toMatchObject({ thinkingConfig: { thinkingBudget: 0 } });
  });

  it('safety checks (JSON) use the same chain and report which model answered', async () => {
    cloudStatus = { a: 429 };
    const r = await new FirebaseWebAi('a', 'x-lite').generate({ task: 'guard', mode: 'only_cloud', prompt: 'hi', jsonSchema: { type: 'object' } });
    expect(cloudModelsUsed).toEqual(['a', 'x-lite']);
    expect(r.model).toBe('x-lite');
  });

  it('reports the model only for cloud results', async () => {
    expect((await ask(new FirebaseWebAi('a', 'b'))).model).toBe('a');
    reportedSource = 'on_device';
    expect((await ask(new FirebaseWebAi('a', 'b'), 'prefer_device')).model).toBeUndefined();
  });

  it('a fallback model that rejects the request (400) is skipped, so the chain goes on', async () => {
    cloudStatus = { a: 429, b: 400 };
    await ask(new FirebaseWebAi('a', 'b,c'));
    expect(cloudModelsUsed).toEqual(['a', 'b', 'c']);
  });

  it('an overloaded model (503) is skipped', async () => {
    cloudStatus = { a: 503 };
    await ask(new FirebaseWebAi('a', 'b'));
    expect(cloudModelsUsed).toEqual(['a', 'b']);
  });

  it('cloudModelList: defaults, custom list, empty turns fallback off, no duplicates', () => {
    expect(cloudModelList('x')[0]).toBe('x');
    expect(cloudModelList('x').length).toBeGreaterThan(1);
    expect(cloudModelList('x', ' y , x,z ')).toEqual(['x', 'y', 'z']);
    expect(cloudModelList('x', '')).toEqual(['x']);
  });

  it('isModelUnavailable reads the status or the message', () => {
    expect(isModelUnavailable({ customErrorData: { status: 429 } })).toBe(true);
    expect(isModelUnavailable(new Error('[GoogleGenerativeAI Error]: [429 ] You exceeded your current quota'))).toBe(true);
    expect(isModelUnavailable(new Error('RESOURCE_EXHAUSTED'))).toBe(true);
    expect(isModelUnavailable({ customErrorData: { status: 400 } })).toBe(false);
    expect(isModelUnavailable(new Error('network down'))).toBe(false);
    expect(isModelUnavailable(null)).toBe(false);
  });
});

describe('fallback timing and skip rules', () => {
  const ask = (ai: FirebaseWebAi) => ai.generate({ task: 'answer', mode: 'only_cloud', prompt: 'hi' });

  it('a fallback 400 is passed over but not skipped: the next request tries it again', async () => {
    cloudStatus = { a: 429, b: 400 };
    const ai = new FirebaseWebAi('a', 'b,c');
    await ask(ai);
    await ask(ai);
    expect(cloudModelsUsed).toEqual(['a', 'b', 'c', 'b', 'c']);
  });

  it('an overloaded model (503) is skipped only for a short time', async () => {
    cloudStatus = { a: 503 };
    let t = 0;
    const ai = new FirebaseWebAi('a', 'b', () => t);
    await ask(ai);
    cloudStatus = {};
    t += SHORT_SKIP_MS + 1;
    await ask(ai);
    expect(cloudModelsUsed).toEqual(['a', 'b', 'a']);
    expect(SHORT_SKIP_MS).toBeLessThan(SKIP_MS);
  });

  it('a model slower than the per-attempt limit hands over to the next one', async () => {
    slowModels = { a: 200 };
    const r = await new FirebaseWebAi('a', 'b', () => Date.now(), 30)
      .generate({ task: 'guard', mode: 'only_cloud', prompt: 'hi', jsonSchema: {} });
    expect(r.model).toBe('b');
  });
});

describe('answerThinkingConfig', () => {
  it('uses a zero budget for gemini-2.5-flash, nothing for 2.5-flash-lite, a level otherwise', () => {
    expect(answerThinkingConfig('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(answerThinkingConfig('gemini-2.5-flash-lite')).toBeUndefined();
    expect(answerThinkingConfig('gemini-3.5-flash-lite')).toEqual({ thinkingLevel: 'MINIMAL' });
    expect(answerThinkingConfig('gemini-3.8-flash')).toEqual({ thinkingLevel: 'LOW' });
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
