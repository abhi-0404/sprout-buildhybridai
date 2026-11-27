import type { AiClient, AiRequest, AiResult } from '../ai/types';
import { DEFAULT_HELPLINES, detectDistress, distressReply, type Helpline } from './distress';
import { parseGuard, parseReferee } from './json';
import { GUARD_SCHEMA, REFEREE_SCHEMA, answerPrompt, guardPrompt, refereePrompt, simplifyPrompt } from './prompts';
import { findKnownIdentifiers, redact, restore } from './redact';
import type {
  ChildProfile, DistressKind, DistressLevel, GuardVerdict, Redaction, RefereeVerdict, Route, Where,
} from './types';

// The Sprout pipeline: one child question in, one safe answer out, plus a full record of
// where every AI call ran and exactly what text (if any) left the device.
// Every failure path fails CLOSED: a fixed, safe reply, never an unchecked model answer.

export interface Policy {
  allowCloud: boolean;
  refereeCloudAnswers: boolean;
  helplines: Helpline[];
}

export const DEFAULT_POLICY: Policy = {
  allowCloud: true,
  refereeCloudAnswers: true,
  helplines: DEFAULT_HELPLINES.US,
};

export interface Deps {
  ai: AiClient;
  profile: ChildProfile;
  policy: Policy;
  isOnline: () => boolean;
  /** True when the on-device model is downloaded and ready. */
  deviceReady: boolean;
  /** Per-call timeout in ms (default 20 s). */
  timeoutMs?: number;
}

export interface Step {
  task: AiRequest['task'];
  where: Where;
  latencyMs: number;
  /** Exact text that left the device; undefined for on-device steps. */
  sentToCloud?: string;
  outChars: number;
  /** Cloud model that answered (cloud steps only; may be a fallback model on the free tier). */
  model?: string;
}

export type Mode = 'hybrid' | 'cloud-safe' | 'offline';

export interface Turn {
  id: string;
  at: number;
  /** Raw question. Stays on this device only. */
  question: string;
  /** The question with private details replaced by tokens. */
  sanitized: string;
  /** The child-derived text that actually left the device (undefined if nothing did). */
  cloudSaw?: string;
  redactions: Redaction[];
  mode: Mode;
  route: Route;
  answer: string;
  answerWhere: Where | 'script';
  guard?: GuardVerdict;
  /** The safety guard could not run yet (offline, no device model); it runs before any cloud call. */
  guardPending?: boolean;
  distress?: { level: Exclude<DistressLevel, 'none'>; kind: DistressKind };
  referee?: {
    verdict: RefereeVerdict;
    reason: string;
    where: Where;
    /**
     * The cloud answer before the guardian rewrote it (only for 'simplify'; never kept for
     * 'block', which could be unsafe). It is cloud OUTPUT of a sanitized question and stays in
     * this device's local turn history: it is never synced or sent anywhere.
     */
    original?: string;
  };
  steps: Step[];
  /** A bigger answer is waiting for connectivity. */
  queued: boolean;
  /** Created by "Try a sample family": never synced as a real alert. */
  sample?: boolean;
}

const BLOCKED_REPLY =
  "That's not something I can help with, but I'm happy to answer lots of other questions! If it's important, ask a grown-up you trust.";
const BLOCKED_ANSWER_REPLY =
  "Hmm, I couldn't find a good kid-friendly answer for that one. Try asking a grown-up, or ask me in a different way!";
const GUARD_FAILED_REPLY =
  "I couldn't double-check that question just now, so I'll skip it. Try asking it another way, or ask again in a moment!";
const OFFLINE_NO_DEVICE_REPLY =
  "I can't think right now because we're offline. I'll answer as soon as we're back online!";
const NO_CLOUD_REPLY =
  "I can't answer that one on this device right now. Try asking a grown-up, or ask me something else!";
const QUEUED_SUFFIX = "\n\n(I'll ask the big brain for a fuller answer when we're back online.)";

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Phone keyboards type curly quotes and other look-alikes; fold them before any rule runs. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[‘’‚‛ʼ`´′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[​-‍﻿]/g, '');
}

class LeakError extends Error {
  constructor(public found: string[]) {
    super(`Blocked cloud call: known identifiers present (${found.length})`);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`AI call timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * One AI call. `childText` is the child-derived part embedded in the prompt: the privacy gate
 * checks THAT (not the prompt template, whose words could collide with a profile term).
 */
async function call(deps: Deps, steps: Step[], req: AiRequest, childText: string): Promise<AiResult> {
  // prefer_device can still reach the cloud (SDK fallback, or the adapter's cloud retry after an
  // on-device error), so only only_device on a ready device skips the gate.
  const goesToCloud = req.mode !== 'only_device' || !deps.deviceReady;
  if (goesToCloud) {
    // Hard privacy gate: nothing with a known identifier is ever sent off the device.
    const found = findKnownIdentifiers(childText, deps.profile);
    if (found.length) throw new LeakError(found);
  }
  const r = await withTimeout(deps.ai.generate(req), deps.timeoutMs ?? 20000);
  // Source of truth for strict modes is the mode itself.
  const where: Where = req.mode === 'only_device' ? 'device' : req.mode === 'only_cloud' ? 'cloud' : r.source;
  steps.push({
    task: req.task,
    where,
    latencyMs: r.latencyMs,
    sentToCloud: where === 'cloud' ? req.prompt : undefined,
    outChars: r.text.length,
    ...(where === 'cloud' && r.model ? { model: r.model } : {}),
  });
  return r;
}

interface GuardRun {
  verdict: GuardVerdict;
  mode: Mode;
  /** False when no guard could run (offline without a device model). */
  ran: boolean;
  /** Child text sent to a cloud guard, if the guard ran in the cloud. */
  cloudSaw?: string;
}

/** Throws if a guard should have run but failed: callers must fail closed. */
async function runGuard(deps: Deps, steps: Step[], text: string): Promise<GuardRun> {
  const req = (mode: AiRequest['mode']): AiRequest => ({
    task: 'guard', mode, prompt: guardPrompt(text, deps.profile.ageBand), jsonSchema: GUARD_SCHEMA,
  });
  if (deps.deviceReady) {
    try {
      const r = await call(deps, steps, req('only_device'), text);
      return { verdict: parseGuard(r.text), mode: 'hybrid', ran: true };
    } catch {
      // Device guard failed: try the cloud-safe guard below.
    }
  }
  if (deps.isOnline() && deps.policy.allowCloud) {
    // Cloud-safe mode: the cloud guard only ever sees deterministically redacted text.
    const r = await call(deps, steps, req('only_cloud'), text);
    return { verdict: parseGuard(r.text), mode: 'cloud-safe', ran: true, cloudSaw: text };
  }
  if (deps.deviceReady) throw new Error('guard unavailable');
  return { verdict: { category: 'ok', needsBigBrain: true, topic: 'other', names: [] }, mode: 'offline', ran: false };
}

async function answerOn(deps: Deps, steps: Step[], where: Where, sanitized: string): Promise<AiResult> {
  const r = await call(deps, steps, {
    task: 'answer',
    mode: where === 'device' ? 'only_device' : 'only_cloud',
    prompt: answerPrompt(sanitized, deps.profile.ageBand, where),
  }, sanitized);
  // An empty answer (for example a model that spent its whole token budget thinking) is a failed
  // answer: never an empty bubble. Callers treat it like any other failed call.
  if (!r.text.trim()) throw new Error(`empty ${where} answer`);
  return r;
}

/** The on-device model checks the cloud's answer before the child sees it. Fails closed. */
async function referee(
  deps: Deps, steps: Step[], sanitized: string, answer: string,
): Promise<{ answer: string; referee: Turn['referee'] }> {
  const where: Where = deps.deviceReady ? 'device' : 'cloud';
  const mode = where === 'device' ? 'only_device' : 'only_cloud';
  let verdict: RefereeVerdict;
  let reason: string;
  try {
    const r = await call(deps, steps, {
      task: 'referee', mode, prompt: refereePrompt(sanitized, answer, deps.profile.ageBand), jsonSchema: REFEREE_SCHEMA,
    }, sanitized);
    ({ verdict, reason } = parseReferee(r.text));
  } catch {
    return { answer: BLOCKED_ANSWER_REPLY, referee: { verdict: 'block', reason: 'The answer could not be checked, so it was not shown', where } };
  }
  if (verdict === 'block') return { answer: BLOCKED_ANSWER_REPLY, referee: { verdict, reason, where } };
  if (verdict === 'simplify') {
    try {
      const s = await call(deps, steps, { task: 'simplify', mode, prompt: simplifyPrompt(answer, deps.profile.ageBand) }, '');
      if (!s.text.trim()) throw new Error('empty simplified answer');
      return { answer: s.text.trim(), referee: { verdict, reason, where, original: answer } };
    } catch {
      return { answer: BLOCKED_ANSWER_REPLY, referee: { verdict: 'block', reason: 'A gentler version could not be made', where } };
    }
  }
  return { answer, referee: { verdict, reason, where } };
}

type Shell = Omit<Turn, 'route' | 'answer' | 'answerWhere'>;

function distressTurn(shell: Shell, kind: DistressKind, level: Exclude<DistressLevel, 'none'>, deps: Deps): Turn {
  return {
    ...shell, route: 'distress', answerWhere: 'script',
    answer: distressReply(kind, deps.profile.ageBand, deps.policy.helplines),
    distress: { level, kind },
  };
}

/** Cloud answer + referee; falls back to the device answer if the cloud call fails. */
async function bigAnswer(shell: Shell, deps: Deps, steps: Step[]): Promise<Turn> {
  const { sanitized, redactions } = shell;
  let text: string;
  try {
    text = (await answerOn(deps, steps, 'cloud', sanitized)).text.trim();
  } catch (e) {
    if (e instanceof LeakError) return { ...shell, route: 'blocked', answerWhere: 'script', answer: BLOCKED_ANSWER_REPLY };
    if (!deps.deviceReady) throw e;
    const d = await answerOn(deps, steps, 'device', sanitized);
    return { ...shell, route: 'device', answerWhere: 'device', answer: restore(d.text.trim(), redactions, deps.profile) };
  }
  const checked = deps.policy.refereeCloudAnswers
    ? await referee(deps, steps, sanitized, text)
    : { answer: text, referee: undefined };
  return {
    ...shell, route: 'cloud', answerWhere: 'cloud', queued: false,
    cloudSaw: shell.cloudSaw ?? sanitized,
    answer: restore(checked.answer, redactions, deps.profile),
    referee: checked.referee?.original !== undefined
      ? { ...checked.referee, original: restore(checked.referee.original, redactions, deps.profile) }
      : checked.referee,
  };
}

export async function ask(rawQuestion: string, deps: Deps): Promise<Turn> {
  const question = normalizeText(rawQuestion);
  const steps: Step[] = [];
  const { profile, policy } = deps;
  const online = deps.isOnline() && policy.allowCloud;
  const base = { id: newId(), at: Date.now(), question, steps, queued: false };

  // 1. Deterministic layers first: they never depend on a model or the network.
  const distress = detectDistress(question);
  const first = redact(question, profile);
  const baseMode: Mode = deps.deviceReady ? 'hybrid' : online ? 'cloud-safe' : 'offline';

  // 2. Distress: answer immediately with the fixed reply. No model call, no waiting.
  if (distress.level !== 'none') {
    return distressTurn(
      { ...base, sanitized: first.text, redactions: first.redactions, mode: baseMode },
      distress.kind!, distress.level, deps,
    );
  }

  // 3. Guard (on-device when possible). If it should run but fails, fail closed.
  let g: GuardRun;
  try {
    g = await runGuard(deps, steps, first.text);
  } catch {
    return {
      ...base, sanitized: first.text, redactions: first.redactions, mode: baseMode,
      route: 'blocked', answerWhere: 'script', answer: GUARD_FAILED_REPLY,
    };
  }
  const { text: sanitized, redactions } = redact(question, profile, g.verdict.names);
  const shell: Shell = { ...base, sanitized, redactions, mode: g.mode, guard: g.verdict, cloudSaw: g.cloudSaw };

  if (g.verdict.category === 'distress') return distressTurn(shell, 'sad_or_scared', 'concern', deps);
  if (g.verdict.category === 'unsafe') return { ...shell, route: 'blocked', answerWhere: 'script', answer: BLOCKED_REPLY };

  // 4. No guard could run (offline, no device model): queue, and guard it before any cloud call.
  if (!g.ran) {
    if (!policy.allowCloud) return { ...shell, route: 'blocked', answerWhere: 'script', answer: NO_CLOUD_REPLY };
    return { ...shell, guardPending: true, route: 'queued', answerWhere: 'script', queued: true, answer: OFFLINE_NO_DEVICE_REPLY };
  }

  const wantsCloud = g.verdict.needsBigBrain || !deps.deviceReady;
  // 5a. Big question and online: cloud answer on sanitized text, refereed.
  if (wantsCloud && online) return bigAnswer(shell, deps, steps);
  // 5b. Device answers (simple question, or a quick answer now while a big one waits).
  if (deps.deviceReady) {
    const r = await answerOn(deps, steps, 'device', sanitized);
    const queued = g.verdict.needsBigBrain && policy.allowCloud && !deps.isOnline();
    return {
      ...shell, route: queued ? 'queued' : 'device', answerWhere: 'device', queued,
      answer: restore(r.text.trim(), redactions, profile) + (queued ? QUEUED_SUFFIX : ''),
    };
  }
  // 5c. No device model and the cloud is switched off.
  return { ...shell, route: 'blocked', answerWhere: 'script', answer: NO_CLOUD_REPLY };
}

/** Run a queued big question once connectivity returns. Guards it first if that never happened. */
export async function resolveQueued(turn: Turn, deps: Deps): Promise<Turn> {
  const steps: Step[] = [...turn.steps];
  let shell: Shell = { ...turn, steps };
  if (turn.guardPending) {
    const first = redact(turn.question, deps.profile);
    let g: GuardRun;
    try {
      g = await runGuard(deps, steps, first.text);
    } catch {
      return { ...shell, guardPending: false, queued: false, route: 'blocked', answerWhere: 'script', answer: GUARD_FAILED_REPLY };
    }
    if (!g.ran) return turn; // still cannot guard: stay queued
    const { text: sanitized, redactions } = redact(turn.question, deps.profile, g.verdict.names);
    shell = { ...shell, sanitized, redactions, guard: g.verdict, guardPending: false, cloudSaw: g.cloudSaw, mode: g.mode };
    if (g.verdict.category === 'distress') return { ...distressTurn(shell, 'sad_or_scared', 'concern', deps), queued: false };
    if (g.verdict.category === 'unsafe') return { ...shell, queued: false, route: 'blocked', answerWhere: 'script', answer: BLOCKED_REPLY };
  }
  return bigAnswer({ ...shell, queued: false }, deps, steps);
}
