import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectDistress } from './distress';
import { DEFAULT_POLICY, ask } from './sprout';
import { DEMO_PROFILE, FakeAi } from './testing';

// Deterministic evaluation over four synthetic sets:
//  - shared/eval/questions.jsonl : development set, used while the rules were written.
//  - shared/eval/heldout.jsonl   : first held-out set. Its misses were later used to widen
//                                  the rules, so it now counts as development data too.
//  - shared/eval/heldout2.jsonl  : second blind set. Its misses also widened the rules, so it
//                                  is development data now too.
//  - shared/eval/heldout3.jsonl  : third blind set, written by a separate author without seeing
//                                  the rules or the other sets. This is the honest number to quote.
// Worst case on purpose: the fake guard sends EVERY question to the cloud and finds no extra
// names, so this measures the deterministic privacy layer alone (no help from the model).
// The test asserts zero leaks for the development set only. The held-out set is reported
// honestly (leaks are logged and written to docs/EVAL.md) and never fails the run.

interface Item {
  id: string;
  text: string;
  mustHide: string[];
  expectDistress: 'none' | 'concern' | 'urgent';
  expectKind: string | null;
  bigQuestion: boolean;
  category: string;
  note?: string;
}

const root = resolve(__dirname, '../../..');

function load(file: string): Item[] {
  return readFileSync(resolve(root, file), 'utf8')
    .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const forceCloud = () => JSON.stringify({ category: 'ok', needsBigBrain: true, topic: 'other', names: [] });

interface SetResult {
  count: number;
  hidden: number;
  hiddenQuestions: number;
  cloudCalls: number;
  leaks: string[];
  overRedacted: number;
  cleanCount: number;
  urgent: [number, number];
  concern: [number, number];
  falseAlarms: string[];
  noneCount: number;
  missed: string[];
  failures: string[];
}

async function evaluate(items: Item[]): Promise<SetResult> {
  const leaks: string[] = [];
  const failures: string[] = [];
  let cloudCalls = 0;
  let overRedacted = 0;
  const cleanItems = items.filter((i) => i.mustHide.length === 0 && i.expectDistress === 'none');
  for (const deviceReady of [true, false]) {
    for (const item of items) {
      const ai = new FakeAi(deviceReady ? 'available' : 'unavailable', { guard: forceCloud });
      try {
        const turn = await ask(item.text, {
          ai, profile: DEMO_PROFILE, policy: DEFAULT_POLICY, isOnline: () => true, deviceReady,
        });
        if (deviceReady && cleanItems.includes(item) && turn.redactions.length > 0) overRedacted++;
      } catch (e) {
        failures.push(`${item.id} (${deviceReady ? 'hybrid' : 'cloud-safe'}): threw ${(e as Error).message}`);
      }
      const sent = ai.cloudPrompts().join('\n');
      cloudCalls += ai.cloudPrompts().length;
      for (const h of item.mustHide) {
        // Whole-word match: "Avi" must not count as found inside "behaviour".
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
        if (re.test(sent)) leaks.push(`${item.id} (${deviceReady ? 'hybrid' : 'cloud-safe'}): "${h}" in "${item.text}"`);
      }
    }
  }

  const rows = items.map((i) => ({ i, got: detectDistress(i.text) }));
  const want = (lvl: string) => rows.filter((r) => r.i.expectDistress === lvl);
  const caught = (lvl: string) => want(lvl).filter((r) => r.got.level !== 'none').length;
  const falseAlarms = want('none').filter((r) => r.got.level !== 'none');
  const missed = rows.filter((r) => r.i.expectDistress !== 'none' && r.got.level === 'none');
  return {
    count: items.length,
    hidden: items.reduce((n, i) => n + i.mustHide.length, 0),
    hiddenQuestions: items.filter((i) => i.mustHide.length).length,
    cloudCalls,
    leaks,
    overRedacted,
    cleanCount: cleanItems.length,
    urgent: [caught('urgent'), want('urgent').length],
    concern: [caught('concern'), want('concern').length],
    falseAlarms: falseAlarms.map((r) => `${r.i.id}: "${r.i.text}" -> ${r.got.kind}`),
    noneCount: want('none').length,
    missed: missed.map((r) => `${r.i.id}: "${r.i.text}" (expected ${r.i.expectDistress})`),
    failures,
  };
}

function section(title: string, intro: string, file: string, r: SetResult): string {
  const list = (head: string, xs: string[]) => (xs.length ? `${head}\n\n${xs.map((x) => `- ${x}`).join('\n')}\n\n` : '');
  return `## ${title}

${intro}

Source: \`${file}\` (${r.count} synthetic questions).

| Metric | Result |
|---|---|
| Private details that must stay hidden | ${r.hidden} across ${r.hiddenQuestions} questions |
| Cloud prompts inspected | ${r.cloudCalls} |
| **Private details that reached the cloud** | **${r.leaks.length}** |
| Clean questions changed by redaction (over-redaction) | ${r.overRedacted} of ${r.cleanCount} |
| Urgent distress caught (deterministic layer) | ${r.urgent[0]} of ${r.urgent[1]} |
| Concern distress caught (deterministic layer) | ${r.concern[0]} of ${r.concern[1]} |
| False alarms on non-distress questions | ${r.falseAlarms.length} of ${r.noneCount} |

${list('Missed distress phrasings (the on-device guard is the second layer for these):', r.missed)}${list('False alarms:', r.falseAlarms)}${list('Leaks (private detail present in a prompt sent to the cloud):', r.leaks)}${list('Pipeline errors:', r.failures)}`;
}

describe('privacy and safety eval', () => {
  it('evaluates the development set and the held-out set', async () => {
    const dev = load('shared/eval/questions.jsonl');
    const held = load('shared/eval/heldout.jsonl');
    const held2 = load('shared/eval/heldout2.jsonl');
    const blind = load('shared/eval/heldout3.jsonl');
    const devResult = await evaluate(dev);
    const heldResult = await evaluate(held);
    const held2Result = await evaluate(held2);
    const blindResult = await evaluate(blind);

    const report = `# Sprout deterministic eval

Generated by \`pnpm eval\`. All questions are synthetic (no real people, schools or contact details).
Worst case: every question is forced to the cloud, with and without an on-device model, and no help
from the model's name detection. Real runs add the on-device model on top of this layer.

${section(
      'Development set',
      'Used while the rules were written, so these numbers are optimistic by construction. The eval test asserts zero leaks here.',
      'shared/eval/questions.jsonl', devResult)}
${section(
      'Blind held-out set (quote these numbers)',
      'Written by a separate author who never saw the detection rules or the other sets. Misses and leaks are reported exactly as found; this set does not fail the build.',
      'shared/eval/heldout3.jsonl', blindResult)}
${section(
      'Second held-out set (now used for development)',
      'Written blind, then its misses were used to widen the rules, so its numbers are no longer an unbiased estimate.',
      'shared/eval/heldout2.jsonl', held2Result)}
${section(
      'First held-out set (now used for development)',
      'Originally written blind. Its misses were then used to widen the rules, so its numbers are no longer an unbiased estimate.',
      'shared/eval/heldout.jsonl', heldResult)}`;
    writeFileSync(resolve(root, 'docs/EVAL.md'), report);
    console.log(report);
    if (heldResult.leaks.length) console.warn(`HELD-OUT LEAKS: ${heldResult.leaks.length}\n${heldResult.leaks.join('\n')}`);

    expect(devResult.leaks).toEqual([]);
    expect(devResult.failures).toEqual([]);
  });
});
