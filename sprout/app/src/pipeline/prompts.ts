import { TOPICS, type AgeBand } from './types';

// Prompts and JSON schemas. Defaults live here; Remote Config can override the text
// (see src/lib/config.ts) so prompts can be tuned without shipping a new app build.

export const GUARD_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['ok', 'sensitive', 'unsafe', 'distress'] },
    needsBigBrain: { type: 'boolean' },
    topic: { type: 'string', enum: [...TOPICS] },
    names: { type: 'array', items: { type: 'string' } },
  },
  required: ['category', 'needsBigBrain', 'topic', 'names'],
} as const;

export const REFEREE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'simplify', 'block'] },
    reason: { type: 'string' },
  },
  required: ['verdict', 'reason'],
} as const;

const AGE_TEXT: Record<AgeBand, string> = {
  '6-8': 'a child aged 6 to 8',
  '9-12': 'a child aged 9 to 12',
};

export function guardPrompt(message: string, ageBand: AgeBand): string {
  return `You are a safety checker for a learning app used by ${AGE_TEXT[ageBand]}.
Read the child's message and return JSON only.

category:
- "ok": normal curious question or chat.
- "sensitive": fine to answer gently (death, body, scary news, war, puberty basics).
- "unsafe": asks for something harmful (weapons, drugs, dangerous stunts, adult content, hacking, bypassing parents).
- "distress": the child seems sad, scared, hurt, bullied, or in danger.
needsBigBrain: true if a good answer needs real explanation, a story, step-by-step help, or facts you are unsure of. false for greetings, spelling, simple definitions, yes/no facts, and quick math.
topic: the closest of ${TOPICS.join(', ')}.
names: every real person name, school name, street or place name that identifies the child or people they know. Do not include famous people, animals, or tokens in [BRACKETS]. Use [] if none.

Child's message:
"""${message}"""`;
}

export function answerPrompt(question: string, ageBand: AgeBand, where: 'device' | 'cloud'): string {
  // Short on purpose: quicker to make, read and check (a long answer made the referee ask for a
  // rewrite, which cost a whole extra call). "Tell me more" is one tap away.
  const length = where === 'device' ? '1 to 3 short sentences' : '2 to 4 short sentences';
  const words = ageBand === '6-8' ? 'very simple words a 6 year old knows' : 'clear, simple words';
  return `You are Sprout, a warm, curious helper for ${AGE_TEXT[ageBand]}.
Answer in ${length}, using ${words}. Be accurate and kind. Use a fun comparison when it helps.
Never ask for the child's name, school, address, photos, or other personal details.
Do not include links. If the question is about something dangerous, explain safety instead of how to do it.
Tokens in [BRACKETS] stand for private names; keep them exactly as written if you mention them.
For homework, help the child think it through with hints instead of giving only the final answer.

Question: ${question}`;
}

export function refereePrompt(question: string, answer: string, ageBand: AgeBand): string {
  return `You check answers before they are shown to ${AGE_TEXT[ageBand]}. Return JSON only.
verdict:
- "pass": accurate enough, kind, and fine for this age.
- "simplify": safe, but too complex, too graphic, or too scary for this age.
A short answer (up to 4 sentences) is not too long, and a friendly question back to the child is fine.
- "block": unsafe, adult, asks for personal info, or encourages risky behaviour.
reason: one short sentence.

Question: """${question}"""
Answer: """${answer}"""`;
}

export function simplifyPrompt(answer: string, ageBand: AgeBand): string {
  return `Rewrite this for ${AGE_TEXT[ageBand]} in at most 3 short, gentle sentences. Remove graphic or scary details but keep it truthful. Keep tokens in [BRACKETS] unchanged.

Text: """${answer}"""`;
}

export function digestPrompt(stats: string): string {
  return `You write a short, friendly weekly note for a parent about their child's questions in a learning app.
You only get topic counts and safety events, never the child's words. In 4 to 6 sentences: highlight curiosity themes, mention any safety events calmly, and suggest one conversation starter or activity related to the top topic.

Weekly data (JSON): ${stats}`;
}
