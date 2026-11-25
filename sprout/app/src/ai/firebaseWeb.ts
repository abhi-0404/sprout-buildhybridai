import {
  getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource,
  type AI, type GenerativeModel, type HybridParams,
} from 'firebase/ai';
import { getFirebaseApp } from '../lib/firebase';
import type { AiClient, AiMode, AiRequest, AiResult, DeviceStatus } from './types';

// Web implementation of AiClient using Firebase AI Logic hybrid inference.
// On-device: Chrome's built-in Gemini Nano (Prompt API). In cloud: Gemini via Firebase.

const MODE: Record<AiMode, HybridParams['mode']> = {
  only_device: InferenceMode.ONLY_ON_DEVICE,
  prefer_device: InferenceMode.PREFER_ON_DEVICE,
  prefer_cloud: InferenceMode.PREFER_IN_CLOUD,
  only_cloud: InferenceMode.ONLY_IN_CLOUD,
};

const TEXT_EN = [{ type: 'text' as const, languages: ['en'] }];

interface LanguageModelGlobal {
  availability(opts?: object): Promise<DeviceStatus>;
}

export class FirebaseWebAi implements AiClient {
  readonly platform = 'web' as const;
  private ai: AI;
  private models = new Map<string, GenerativeModel>();

  constructor(private cloudModel = import.meta.env.VITE_CLOUD_MODEL || 'gemini-3.8-flash') {
    this.ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  }

  private model(mode: AiMode, jsonSchema?: object): GenerativeModel {
    const key = `${mode}|${jsonSchema ? JSON.stringify(jsonSchema) : 'text'}`;
    let m = this.models.get(key);
    if (!m) {
      m = getGenerativeModel(this.ai, {
        mode: MODE[mode],
        inCloudParams: {
          model: this.cloudModel,
          generationConfig: jsonSchema
            ? { responseMimeType: 'application/json', responseJsonSchema: jsonSchema as never, temperature: 0 }
            : { temperature: 0.6, maxOutputTokens: 400 },
        },
        onDeviceParams: {
          createOptions: { expectedInputs: TEXT_EN, expectedOutputs: TEXT_EN },
          promptOptions: jsonSchema ? { responseConstraint: jsonSchema } : undefined,
        },
      });
      this.models.set(key, m);
    }
    return m;
  }

  async deviceStatus(): Promise<DeviceStatus> {
    const lm = (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
    if (!lm) return 'unavailable';
    try {
      return await lm.availability({ expectedInputs: TEXT_EN, expectedOutputs: TEXT_EN });
    } catch {
      return 'unavailable';
    }
  }

  async prepareDevice(onProgress?: (fraction: number) => void): Promise<void> {
    await this.model('prefer_device').initializeDeviceModel(onProgress);
  }

  async generate(req: AiRequest): Promise<AiResult> {
    const t0 = performance.now();
    let res;
    try {
      res = await this.model(req.mode, req.jsonSchema).generateContent(req.prompt);
    } catch (e) {
      // PREFER_ON_DEVICE rethrows when the on-device call itself fails (for example a quota error),
      // it only falls back to the cloud when the model is unavailable. Retry once in the cloud, but
      // only for prefer_device: only_device must never leave the device.
      if (req.mode !== 'prefer_device') throw e;
      res = await this.model('only_cloud', req.jsonSchema).generateContent(req.prompt);
    }
    // The SDK always sets inferenceSource. Never guess it: the privacy ledger depends on it.
    const src = res.response.inferenceSource;
    if (src !== InferenceSource.ON_DEVICE && src !== InferenceSource.IN_CLOUD) {
      throw new Error('The AI SDK did not report where the request ran');
    }
    const source = src === InferenceSource.ON_DEVICE ? 'device' : 'cloud';
    return { text: res.response.text(), source, latencyMs: Math.round(performance.now() - t0) };
  }
}
