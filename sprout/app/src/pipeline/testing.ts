import type { AiClient, AiRequest, AiResult, DeviceStatus } from '../ai/types';
import type { ChildProfile } from './types';

export const DEMO_PROFILE: ChildProfile = {
  childName: 'Aarav Sharma',
  nicknames: ['Avi'],
  school: 'Green Park Public School',
  city: 'Pune',
  otherNames: ['Riya', 'Mrs Kapoor', 'Kabir'],
  places: ['Koregaon Park', 'Lane 7'],
  ageBand: '6-8',
};

type Responder = (req: AiRequest) => string;

/** Scripted AI client for tests and the eval harness. Records every request and where it ran. */
export class FakeAi implements AiClient {
  readonly platform = 'test' as const;
  readonly calls: { req: AiRequest; source: 'device' | 'cloud' }[] = [];

  constructor(
    private status: DeviceStatus = 'available',
    private responders: Partial<Record<AiRequest['task'], Responder>> = {},
  ) {}

  async deviceStatus() {
    return this.status;
  }
  async prepareDevice() {}

  async generate(req: AiRequest): Promise<AiResult> {
    const source =
      req.mode === 'only_cloud' || req.mode === 'prefer_cloud' || this.status !== 'available' ? 'cloud' : 'device';
    if (req.mode === 'only_device' && this.status !== 'available') throw new Error('device unavailable');
    this.calls.push({ req, source });
    const r = this.responders[req.task];
    const text = r ? r(req) : defaultResponse(req);
    return { text, source, latencyMs: source === 'device' ? 120 : 650 };
  }

  cloudPrompts(): string[] {
    return this.calls.filter((c) => c.source === 'cloud').map((c) => c.req.prompt);
  }
}

function defaultResponse(req: AiRequest): string {
  switch (req.task) {
    case 'guard': {
      const message = req.prompt.split('"""')[1] ?? '';
      return JSON.stringify({ category: 'ok', needsBigBrain: /\b(why|how|explain|story)\b/i.test(message), topic: 'science', names: [] });
    }
    case 'referee':
      return JSON.stringify({ verdict: 'pass', reason: 'fine' });
    case 'simplify':
      return 'A simpler answer.';
    case 'digest':
      return 'Weekly note.';
    default:
      return `Answer from ${req.mode}.`;
  }
}
