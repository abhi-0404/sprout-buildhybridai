import type { AiClient, AiRequest, AiResult, DeviceStatus } from './types';

// Demo mode: a scripted AI used when Firebase is not configured yet, so the full product
// (pipeline, routing, badges, ledger, parent views) can be explored without any keys.
// The real safety pipeline still runs; only the model calls are simulated.

export interface DemoSettings {
  deviceModel: boolean; // simulate a device with/without an on-device model
}

const ANSWERS: [RegExp, string][] = [
  [/volcano/i, 'Deep under the ground it is so hot that rock melts into gooey magma. Gas bubbles build up inside it, like shaking a soda bottle, and when the pressure gets too big, whoosh, the volcano erupts!'],
  [/sky.*blue|blue.*sky/i, 'Sunlight is made of all the colors mixed together. When it hits the air, the blue light bounces around the most, so blue spreads across the whole sky!'],
  [/bee|honey/i, 'Bees sip sweet nectar from flowers and carry it home in a special honey tummy. They pass it bee to bee and fan it with their wings until it gets thick and sticky: honey!'],
  [/dinosaur/i, 'Dinosaurs lived millions of years ago. The biggest ones, like Argentinosaurus, were longer than three school buses parked in a row!'],
  [/cat.*purr|purr/i, 'Cats purr by quickly buzzing tiny muscles in their throat. They often purr when they feel safe and cozy, a bit like a happy hum.'],
  [/rain/i, 'The sun warms water so it floats up as tiny invisible drops. High in the sky they cool down, join together into clouds, and when they get heavy they fall as rain.'],
  [/moon/i, 'The Moon does not make its own light. It shines because sunlight bounces off it, like a giant mirror in the night sky!'],
  [/war/i, 'A long time ago, many countries had a very big disagreement and fought each other, and it made many people sad. Afterwards, countries worked hard to make rules to help keep peace.'],
  [/\d+\s*[+\-x*]\s*\d+/i, 'Let us work it out together! Try counting it on your fingers or drawing little dots, then tell me what you get.'],
  [/what is a|what's a|what are/i, 'Great question! That is something you can find all around us. Want me to tell you a fun fact about it?'],
];

// What a big cloud model might say. Too heavy for a 7-year-old, so the on-device referee
// rewrites it in Demo mode and the before/after is visible without Firebase.
const CLOUD_RAW: [RegExp, string][] = [
  [/\b(world wars?|wars? (in|of|between|happen)|ww ?(1|2|i|ii))\b/i,'World War 2 began in 1939 when Germany invaded Poland. Over six years more than 70 million people were killed, including millions of civilians, and whole cities were bombed into ruins. It ended in 1945 after the atomic bombs destroyed Hiroshima and Nagasaki.'],
];

const BIG = /\b(why|how|explain|story|happen)\b/i;
const UNSAFE = /\b(weapon|gun|bomb|explode at home|drugs?|vape|hack|password|bypass|get around|adult video)\b/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function message(prompt: string): string {
  return prompt.split('"""')[1] ?? prompt.split('Question:').pop() ?? prompt;
}

function answerFor(q: string, where: 'device' | 'cloud'): string {
  const hit = ANSWERS.find(([re]) => re.test(q));
  const base = hit ? hit[1] : 'What a curious question! I think the best way to find out is to explore it together. What do you already know about it?';
  const raw = where === 'cloud' ? CLOUD_RAW.find(([re]) => re.test(q)) : undefined;
  if (raw && !/more simply|tell me more/i.test(q)) return raw[1];
  const first = base.split(/(?<=[.!?])\s+/)[0];
  // Follow-up buttons in the kid UI.
  if (/more simply/i.test(q)) return `Here it is in a tiny nutshell: ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  if (/tell me more/i.test(q)) return `${base} Fun fact: scientists still ask questions about this every day, just like you!`;
  if (where === 'device') return base.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return base;
}

export class DemoAi implements AiClient {
  readonly platform = 'web' as const;
  constructor(private settings: DemoSettings) {}

  async deviceStatus(): Promise<DeviceStatus> {
    return this.settings.deviceModel ? 'available' : 'unavailable';
  }

  async prepareDevice(onProgress?: (fraction: number) => void): Promise<void> {
    for (let i = 1; i <= 10; i++) {
      await sleep(120);
      onProgress?.(i / 10);
    }
  }

  async generate(req: AiRequest): Promise<AiResult> {
    const device = this.settings.deviceModel && (req.mode === 'only_device' || req.mode === 'prefer_device');
    if (req.mode === 'only_device' && !this.settings.deviceModel) throw new Error('device unavailable');
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (req.mode !== 'only_device' && req.mode !== 'prefer_device' && offline) throw new Error('offline');
    const latencyMs = device ? 180 + Math.round(Math.random() * 220) : 700 + Math.round(Math.random() * 600);
    await sleep(latencyMs);
    const where = device ? 'device' : 'cloud';
    const msg = message(req.prompt);
    let text: string;
    switch (req.task) {
      case 'guard':
        text = JSON.stringify({
          category: UNSAFE.test(msg) ? 'unsafe' : /\b(war|death|die[ds]?|blood)\b/i.test(msg) ? 'sensitive' : 'ok',
          needsBigBrain: BIG.test(msg),
          topic: /volcano|rain|sky|moon|science/i.test(msg) ? 'science' : /bee|cat|dog|dinosaur|animal/i.test(msg) ? 'animals' : /war|history|king/i.test(msg) ? 'history' : /\d/.test(msg) ? 'math' : 'other',
          names: [],
        });
        break;
      case 'referee':
        text = JSON.stringify(
          /war|fought/i.test(msg)
            ? { verdict: 'simplify', reason: 'Gentler wording for this age' }
            : { verdict: 'pass', reason: 'Kind, accurate and age-appropriate' },
        );
        break;
      case 'simplify':
        text = 'A long time ago, many countries disagreed and fought, which made lots of people sad. Since then, countries work together on rules to help keep the peace.';
        break;
      case 'digest':
        text = 'This week was full of curiosity, especially about science and animals. No worrying moments came up. Try a kitchen volcano with baking soda and vinegar together this weekend!';
        break;
      default:
        text = answerFor(message(req.prompt), where);
    }
    return { text, source: where, latencyMs };
  }
}
