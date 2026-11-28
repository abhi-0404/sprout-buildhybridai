import type { AiClient, AiRequest, AiResult, DeviceStatus } from './types';

// Loads the Firebase AI Logic client (firebase/app, app-check, ai) on first use, so demo mode
// and the first paint never download the Firebase SDK.

type Impl = AiClient;
let loading: Promise<Impl> | null = null;

function impl(): Promise<Impl> {
  loading ??= import('./firebaseWeb').then((m) => {
    const ai = new m.FirebaseWebAi();
    // Remote Config can switch the cloud models without a redeploy (for example if a model runs
    // out of quota during judging). Applied when it arrives; the defaults work meanwhile.
    void import('../lib/config')
      .then((c) => c.loadRemoteValues())
      .then((v) => { if (v) ai.setCloudModels(v.cloudModel, v.cloudFallbacks); })
      .catch(() => { /* keep the defaults */ });
    return ai;
  });
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
