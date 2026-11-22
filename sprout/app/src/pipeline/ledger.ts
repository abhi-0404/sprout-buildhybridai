import type { Topic } from './types';
import type { Turn } from './sprout';

// Safety Ledger: totals shown to the parent. Built from Turn records on the device; only the
// aggregate numbers below are synced to the cloud, never questions or answers.

/** Estimated list price per million tokens for the cloud model (configurable). */
export interface Pricing {
  inputPerM: number;
  outputPerM: number;
}
export const DEFAULT_PRICING: Pricing = { inputPerM: 0.3, outputPerM: 2.5 };

const tokens = (chars: number) => Math.ceil(chars / 4);

export interface LedgerTotals {
  questions: number;
  aiCalls: number;
  deviceCalls: number;
  cloudCalls: number;
  answeredOnDevice: number;
  answeredInCloud: number;
  scripted: number;
  personalDetailsHidden: number;
  /** Known identifiers that reached the cloud. The pipeline's gate keeps this at 0. */
  identifiersSentToCloud: number;
  refereeRewrites: number;
  distressEvents: number;
  blocked: number;
  estCloudCostUsd: number;
  /** What the same calls would cost if every one of them ran in the cloud. */
  estAllCloudCostUsd: number;
  topics: Partial<Record<Topic, number>>;
}

export function totals(turns: Turn[], pricing: Pricing = DEFAULT_PRICING): LedgerTotals {
  const t: LedgerTotals = {
    questions: turns.length, aiCalls: 0, deviceCalls: 0, cloudCalls: 0, answeredOnDevice: 0,
    answeredInCloud: 0, scripted: 0, personalDetailsHidden: 0, identifiersSentToCloud: 0,
    refereeRewrites: 0, distressEvents: 0, blocked: 0, estCloudCostUsd: 0, estAllCloudCostUsd: 0, topics: {},
  };
  for (const turn of turns) {
    if (turn.answerWhere === 'device') t.answeredOnDevice++;
    else if (turn.answerWhere === 'cloud') t.answeredInCloud++;
    else t.scripted++;
    t.personalDetailsHidden += turn.redactions.length;
    if (turn.referee && turn.referee.verdict !== 'pass') t.refereeRewrites++;
    if (turn.distress) t.distressEvents++;
    if (turn.route === 'blocked') t.blocked++;
    if (turn.guard) t.topics[turn.guard.topic] = (t.topics[turn.guard.topic] ?? 0) + 1;
    for (const s of turn.steps) {
      t.aiCalls++;
      const inTok = tokens((s.sentToCloud ?? '').length || turn.sanitized.length + 400);
      const cost = (inTok * pricing.inputPerM + tokens(s.outChars) * pricing.outputPerM) / 1e6;
      t.estAllCloudCostUsd += cost;
      if (s.where === 'device') t.deviceCalls++;
      else {
        t.cloudCalls++;
        t.estCloudCostUsd += cost;
        for (const r of turn.redactions) if (s.sentToCloud?.includes(r.original)) t.identifiersSentToCloud++;
      }
    }
  }
  return t;
}
