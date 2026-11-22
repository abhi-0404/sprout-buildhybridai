import type { AiClient, AiRequest, AiResult, DeviceStatus } from './types';

// Loads the Firebase AI Logic client (firebase/app, app-check, ai) on first use, so demo mode
// and the first paint never download the Firebase SDK.

type Impl = AiClient;
let loading: Promise<Impl> | null = null;

function impl(): Promise<Impl> {
  loading ??= import('./firebaseWeb').then((m) => new m.FirebaseWebAi());
  return loading;
}

export class LazyFirebaseAi implements AiClient {
  readonly platform = 'web' as const;

  async deviceStatus(): Promise<DeviceStatus> {
    return (await impl()).deviceStatus();
  }

  async prepareDevice(onProgress?: (fraction: number) => void): Promise<void> {
    return (await impl()).prepareDevice(onProgress);
  }

  async generate(req: AiRequest): Promise<AiResult> {
    return (await impl()).generate(req);
  }
}
