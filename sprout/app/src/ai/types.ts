// Platform-neutral AI client. Implementations:
//  - web: Firebase AI Logic JS SDK hybrid inference (src/ai/firebaseWeb.ts)
//  - android / ios: Capacitor plugin calling the native Firebase AI Logic SDKs
//  - tests: scripted fakes
import type { Where } from '../pipeline/types';

export type AiMode = 'only_device' | 'prefer_device' | 'prefer_cloud' | 'only_cloud';

export type AiTask = 'guard' | 'answer' | 'referee' | 'simplify' | 'digest';

export interface AiRequest {
  task: AiTask;
  mode: AiMode;
  prompt: string;
  /** JSON schema; when set the model must return JSON matching it. */
  jsonSchema?: object;
}

export interface AiResult {
  text: string;
  /** Where the request actually ran, read from the SDK (inferenceSource / modelVersion). */
  source: Where;
  latencyMs: number;
  /** Cloud model that answered (cloud results only), for the parent's Activity ledger. */
  model?: string;
}

export type DeviceStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface AiClient {
  readonly platform: 'web' | 'android' | 'ios' | 'test';
  deviceStatus(): Promise<DeviceStatus>;
  /** Must be called from a user gesture on web (Chrome needs it to download the model). */
  prepareDevice(onProgress?: (fraction: number) => void): Promise<void>;
  generate(req: AiRequest): Promise<AiResult>;
}

export class DeviceUnavailableError extends Error {
  constructor() {
    super('On-device model is not available');
  }
}
