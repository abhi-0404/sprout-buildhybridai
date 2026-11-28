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
// Probed 2026-11-28: gemini-flash-lite-latest answers text and JSON in 1-2 s (an alias; if it shares
// a quota with 3.5-flash-lite it simply 429s fast and is skipped). Not used: gemini-flash-latest and
// gemini-3.8-flash (20-99 s), gemma-4-31b-it (19 s, its JSON calls were overloaded, and its text
// output included its own reasoning, which must never reach a child).
export const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];

/** Set on the error when every cloud model is out of quota, missing, overloaded or too slow. */
export const CLOUD_UNAVAILABLE = 'sproutCloudUnavailable';

/** How long a model that answered 429 (quota) or 404 (not available) is skipped. */
export const SKIP_MS = 10 * 60 * 1000;
/** Shorter skip for a model that was overloaded (500, 503) or too slow (504, see ATTEMPT_MS). */
export const SHORT_SKIP_MS = 60 * 1000;
/** Per-model limit for one cloud attempt, so a slow primary still leaves time for the fallback
 *  inside the pipeline's 20 s timeout (the free tier has taken 24 s and 96 s on a single call). */
export const ATTEMPT_MS = 8000;
/** Total time for one request across all models: under the pipeline's 20 s call timeout, so a
 *  request that runs out of models or time ends as a tagged "busy" error, not a plain timeout. */
export const BUDGET_MS = 18000;

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

const SKIP_KEY = 'sprout.modelSkip';

/** Saved skips still in the future (bad or missing data gives none). Exported for tests. */
export function loadSkips(now: number): Map<string, number> {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(SKIP_KEY) ?? '{}') as Record<string, unknown>;
    return new Map(Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > now));
  } catch {
    return new Map();
  }
}

/** Saves the skips that have not expired yet. Exported for tests. */
export function saveSkips(skips: Map<string, number>, now: number): void {
  const live = [...skips].filter(([, until]) => until > now);
  try { globalThis.localStorage?.setItem(SKIP_KEY, JSON.stringify(Object.fromEntries(live))); } catch { /* not remembered */ }
}

function attemptTimeout(): Error {
  return Object.assign(new Error('[504] cloud attempt took too long'), { customErrorData: { status: 504 } });
}

export class FirebaseWebAi implements AiClient {
  readonly platform = 'web' as const;
  private ai: AI;
  private models = new Map<string, GenerativeModel>();
  private cloudModels: string[];
  /** Model name -> time (ms) until which it is skipped. Kept across page loads, so a model that
   *  is out of its daily quota is not asked again (about 2 s lost) on every visit. */
  private skipUntil: Map<string, number>;

  constructor(
    private cloudModel = import.meta.env.VITE_CLOUD_MODEL || 'gemini-3.5-flash',
    fallbacks: string | undefined = import.meta.env.VITE_CLOUD_FALLBACKS,
    private now: () => number = () => Date.now(),
    private attemptMs = ATTEMPT_MS,
    private budgetMs = BUDGET_MS,
  ) {
    this.ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
    this.cloudModels = cloudModelList(cloudModel, fallbacks);
    this.skipUntil = loadSkips(this.now());
    this.tunedModel = cloudModel;
  }

  /** The model VITE_CLOUD_THINKING was tuned for (the build-time primary), fixed for life. */
  private tunedModel: string;

  /** Switches the cloud models at run time (from Remote Config). Names that do not look like a
   *  model id are ignored, so a typo in the console cannot break the app. Empty values (the Remote
   *  Config defaults) change nothing, so the build's own settings stay in force until someone
   *  actually sets a value in the console. */
  setCloudModels(primary: string, fallbacks: string): void {
    const valid = (m: string) => /^[a-z0-9][a-z0-9.-]{2,63}$/.test(m);
    const p = primary.trim();
    const list = fallbacks.split(',').map((m) => m.trim()).filter(valid);
    const rest = list.length ? list : this.cloudModels.slice(1);
    if (valid(p)) this.cloudModel = p;
    else if (!list.length) return;
    this.cloudModels = [...new Set([this.cloudModel, ...rest])];
  }

  private model(mode: AiMode, cloudModel: string, jsonSchema?: object): GenerativeModel {
    // On-device modes share one model object whatever the cloud model is (prepareDevice set it up).
    const cloudPart = mode === 'only_device' ? 'device' : cloudModel;
    const key = `${cloudPart}|${mode}|${jsonSchema ? JSON.stringify(jsonSchema) : 'text'}`;
    let m = this.models.get(key);
    if (!m) {
      // The thinking override is tuned for the build-time primary; other models use their own
      // safe level (even if Remote Config makes one of them the primary).
      const thinking = answerThinkingConfig(
        cloudModel,
        cloudModel === this.tunedModel ? import.meta.env.VITE_CLOUD_THINKING : undefined,
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
    // Fixed for this request, even if Remote Config switches models while it runs.
    const primary = this.cloudModel;
    const ready = this.cloudModels.filter((m) => (this.skipUntil.get(m) ?? 0) <= t);
    // All skipped: try the primary anyway rather than fail without asking.
    const order = ready.length ? ready : [primary];
    const cloudOnly = req.mode === 'only_cloud' || req.mode === 'prefer_cloud';
    let last: unknown;
    let allUnavailable = true;
    for (const [i, name] of order.entries()) {
      try {
        const attempt = this.once(req, name);
        // Cloud modes get a per-model limit so a slow model hands over to the next in time; the
        // last model gets the rest of the request's budget. (prefer_device may be loading the
        // on-device model, which can legitimately take long.)
        const left = Math.max(1, this.budgetMs - (this.now() - t));
        const limit = i < order.length - 1 ? Math.min(this.attemptMs, left) : left;
        const res = cloudOnly ? await withAttemptLimit(attempt, limit) : await attempt;
        return { res, model: name };
      } catch (e) {
        // A fallback model that rejects this one request (400) is passed over but not skipped:
        // a 400 can be specific to the request, so it must not take the model away from others.
        const badFallback = name !== primary && errorStatus(e) === 400;
        if (!isModelUnavailable(e) && !badFallback) throw e;
        if (badFallback) allUnavailable = false;
        if (!badFallback) {
          this.skipUntil.set(name, this.now() + skipFor(e));
          // Only quota and missing-model skips (10 min) outlast a reload; overload skips are short.
          if (skipFor(e) === SKIP_MS) saveSkips(this.skipUntil, this.now());
        }
        last = e;
      }
    }
    // Every model is out of quota or busy: tag the error so the app can say so honestly.
    if (allUnavailable && last && typeof last === 'object') Object.assign(last, { [CLOUD_UNAVAILABLE]: true });
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
