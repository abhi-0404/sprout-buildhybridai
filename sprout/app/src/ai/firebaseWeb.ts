import {
  getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, ThinkingLevel,
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

/** Rejects with a 504-style error when one cloud attempt is too slow. The request itself cannot be
 *  cancelled; its late result is ignored. */
function withAttemptLimit<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(attemptTimeout()), ms); });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

interface LanguageModelGlobal {
  availability(opts?: object): Promise<DeviceStatus>;
}

/**
 * Thinking level for capped text answers. Thinking tokens count against maxOutputTokens: with the
 * model's default thinking, a 400 token cap left a kid's answer cut off mid-sentence (383 of 400
 * tokens spent thinking). MINIMAL keeps answers whole and fast, but models differ: gemini-3.8-flash
 * rejects MINIMAL (LOW is its lowest) and Gemini 2.5 models reject thinkingLevel entirely (undefined
 * here means: send no thinkingConfig). VITE_CLOUD_THINKING overrides; an unknown value is ignored.
 */
export function answerThinkingLevel(model: string, override?: string): string | undefined {
  const levels = Object.values(ThinkingLevel) as string[];
  const wanted = override?.trim().toUpperCase();
  if (wanted && levels.includes(wanted)) return wanted;
  if (/gemini-2\./.test(model)) return undefined;
  if (/gemini-3\.8/.test(model)) return ThinkingLevel.LOW;
  return ThinkingLevel.MINIMAL;
}

/** The thinkingConfig for a capped text answer. Gemini 2.5 models take a token budget instead of a
 *  level: gemini-2.5-flash thinks by default, so its budget is set to 0 to keep the 400 token answer
 *  whole. gemini-2.5-flash-lite does not think by default, so it gets nothing. */
export function answerThinkingConfig(model: string, override?: string): { thinkingLevel: string } | { thinkingBudget: number } | undefined {
  if (/gemini-2\.5-flash(?!-lite)/.test(model)) return { thinkingBudget: 0 };
  const level = answerThinkingLevel(model, override);
  return level ? { thinkingLevel: level } : undefined;
}

/** Cloud models tried in order when one is over quota. Each Gemini model has its own free-tier
 *  daily limit per project (20 requests for gemini-3.5-flash), so a short list multiplies it. */
// Probed 2026-11-27 for this project: gemini-3.5-flash-lite answers (text and JSON); the gemini-2.5
// models are retired for new users (404); gemini-3.8-flash returned 500 "high demand" after 96 s.
export const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash-lite'];

/** How long a model that answered 429 (quota) or 404 (not available) is skipped. */
export const SKIP_MS = 10 * 60 * 1000;
/** Shorter skip for a model that was overloaded (500, 503) or too slow (504, see ATTEMPT_MS). */
export const SHORT_SKIP_MS = 60 * 1000;
/** Per-model limit for one cloud attempt, so a slow primary still leaves time for the fallback
 *  inside the pipeline's 20 s timeout (the free tier has taken 24 s and 96 s on a single call). */
export const ATTEMPT_MS = 8000;

/** The model list: primary first, then the fallbacks (comma list in VITE_CLOUD_FALLBACKS, or the
 *  defaults; an empty value turns fallback off), without duplicates. */
export function cloudModelList(primary: string, fallbacks?: string): string[] {
  const rest = fallbacks === undefined
    ? DEFAULT_FALLBACK_MODELS
    : fallbacks.split(',').map((m) => m.trim()).filter(Boolean);
  return [...new Set([primary, ...rest])];
}

/** HTTP status of a Firebase AI fetch error, from customErrorData or the "[429 ...]" message. */
export function errorStatus(e: unknown): number | undefined {
  const status = (e as { customErrorData?: { status?: number } } | null)?.customErrorData?.status;
  if (typeof status === 'number') return status;
  const msg = e instanceof Error ? e.message : String(e);
  const m = /\[(\d{3})\b/.exec(msg);
  if (m) return Number(m[1]);
  return /RESOURCE_EXHAUSTED|exceeded your current quota/i.test(msg) ? 429 : undefined;
}

/** True for errors that mean "this model cannot serve now, another one may": quota (429), model
 *  not found / not enabled (404), overloaded (500 "high demand", 503) or too slow (504, our own
 *  per-attempt limit). Anything else (bad request, safety, network) is rethrown. */
export function isModelUnavailable(e: unknown): boolean {
  const s = errorStatus(e);
  return s === 429 || s === 404 || s === 500 || s === 503 || s === 504;
}

/** How long to skip a model after an "unavailable" error: long for quota and missing models
 *  (they will not recover soon), short for overload and slowness (often gone in a minute). */
export function skipFor(e: unknown): number {
  const s = errorStatus(e);
  return s === 429 || s === 404 ? SKIP_MS : SHORT_SKIP_MS;
}

function attemptTimeout(): Error {
  return Object.assign(new Error('[504] cloud attempt took too long'), { customErrorData: { status: 504 } });
}

export class FirebaseWebAi implements AiClient {
  readonly platform = 'web' as const;
  private ai: AI;
  private models = new Map<string, GenerativeModel>();
  private cloudModels: string[];
  /** Model name -> time (ms) until which it is skipped. */
  private skipUntil = new Map<string, number>();

  constructor(
    private cloudModel = import.meta.env.VITE_CLOUD_MODEL || 'gemini-3.5-flash',
    fallbacks: string | undefined = import.meta.env.VITE_CLOUD_FALLBACKS,
    private now: () => number = () => Date.now(),
    private attemptMs = ATTEMPT_MS,
  ) {
    this.ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
    this.cloudModels = cloudModelList(cloudModel, fallbacks);
  }

  private model(mode: AiMode, cloudModel: string, jsonSchema?: object): GenerativeModel {
    const key = `${cloudModel}|${mode}|${jsonSchema ? JSON.stringify(jsonSchema) : 'text'}`;
    let m = this.models.get(key);
    if (!m) {
      // The thinking override is tuned for the primary model; fallbacks use their own safe level.
      const thinking = answerThinkingConfig(
        cloudModel,
        cloudModel === this.cloudModel ? import.meta.env.VITE_CLOUD_THINKING : undefined,
      );
      m = getGenerativeModel(this.ai, {
        mode: MODE[mode],
        inCloudParams: {
          model: cloudModel,
          // JSON tasks (guard, referee) are the safety checks: no token cap, so they keep the
          // model's default thinking. Only capped text answers get the reduced thinking level.
          generationConfig: jsonSchema
            ? { responseMimeType: 'application/json', responseJsonSchema: jsonSchema as never, temperature: 0 }
            : {
                temperature: 0.6, maxOutputTokens: 400,
                ...(thinking ? { thinkingConfig: thinking as never } : {}),
              },
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
    await this.model('prefer_device', this.cloudModel).initializeDeviceModel(onProgress);
  }

  async generate(req: AiRequest): Promise<AiResult> {
    const t0 = performance.now();
    const { res, model } = await this.withFallback(req);
    // The SDK always sets inferenceSource. Never guess it: the privacy ledger depends on it.
    const src = res.response.inferenceSource;
    if (src !== InferenceSource.ON_DEVICE && src !== InferenceSource.IN_CLOUD) {
      throw new Error('The AI SDK did not report where the request ran');
    }
    const source = src === InferenceSource.ON_DEVICE ? 'device' : 'cloud';
    return {
      text: res.response.text(), source, latencyMs: Math.round(performance.now() - t0),
      ...(source === 'cloud' ? { model } : {}),
    };
  }

  /** Tries each cloud model in turn while one is unavailable (quota, missing, overloaded, too
   *  slow), or while a fallback model rejects the request (400). */
  private async withFallback(req: AiRequest) {
    // only_device never reaches the cloud, so there is nothing to fall back between.
    if (req.mode === 'only_device') return { res: await this.once(req, this.cloudModel), model: this.cloudModel };
    // The safety checks (guard, referee) use the same chain. The published evals measure the
    // on-device rules alone; each cloud step still records the model that answered (Activity).
    const t = this.now();
    const ready = this.cloudModels.filter((m) => (this.skipUntil.get(m) ?? 0) <= t);
    // All skipped: try the primary anyway rather than fail without asking.
    const order = ready.length ? ready : [this.cloudModel];
    const cloudOnly = req.mode === 'only_cloud' || req.mode === 'prefer_cloud';
    let last: unknown;
    for (const name of order) {
      try {
        const attempt = this.once(req, name);
        // Cloud modes get a per-model limit so a slow model hands over to the next in time.
        // (prefer_device may be loading the on-device model, which can legitimately take long.)
        const res = cloudOnly ? await withAttemptLimit(attempt, this.attemptMs) : await attempt;
        return { res, model: name };
      } catch (e) {
        // A fallback model that rejects this one request (400) is passed over but not skipped:
        // a 400 can be specific to the request, so it must not take the model away from others.
        const badFallback = name !== this.cloudModel && errorStatus(e) === 400;
        if (!isModelUnavailable(e) && !badFallback) throw e;
        if (!badFallback) this.skipUntil.set(name, this.now() + skipFor(e));
        last = e;
      }
    }
    throw last;
  }

  private async once(req: AiRequest, cloudModel: string) {
    try {
      return await this.model(req.mode, cloudModel, req.jsonSchema).generateContent(req.prompt);
    } catch (e) {
      // PREFER_ON_DEVICE rethrows when the on-device call itself fails (for example a quota error),
      // it only falls back to the cloud when the model is unavailable. Retry once in the cloud, but
      // only for prefer_device: only_device must never leave the device.
      // A cloud-side quota/availability error already came from the cloud: let the chain move on.
      if (req.mode !== 'prefer_device' || isModelUnavailable(e)) throw e;
      return await this.model('only_cloud', cloudModel, req.jsonSchema).generateContent(req.prompt);
    }
  }
}
