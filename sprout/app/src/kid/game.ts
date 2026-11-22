import { load, save } from '../lib/storage';
import type { Turn } from '../pipeline/sprout';
import type { AgeBand, Topic } from '../pipeline/types';

// Safe gamification. Rewards come from CURIOSITY (new topics, follow-ups, exploring), never from
// time spent. No streaks to lose. Safety moments and blocked questions never earn or cost
// anything. After the parent's daily limit, rewards pause and Sprout suggests a break.
// Everything is derived from the conversation history, so there is no separate score to game.

export interface GameSettings {
  enabled: boolean;
  /** Questions per day before Sprout suggests a break (rewards pause after it). */
  dailyLimit: number;
}
export const DEFAULT_GAME: GameSettings = { enabled: true, dailyLimit: 20 };
export const loadGame = (): GameSettings => ({ ...DEFAULT_GAME, ...load<Partial<GameSettings>>('game', {}) });
export const saveGame = (g: GameSettings) => save('game', g);

export interface Plant { topic: Topic; count: number; stage: 0 | 1 | 2 | 3 }
export interface Badge { id: string; icon: string; name: string; hint: string; earned: boolean }

export interface Progress {
  plants: Plant[];
  badges: Badge[];
  earnedCount: number;
  today: number;
  limitReached: boolean;
}

const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0);
const isFollowUp = (q: string) => /^(tell me more about|can you say that more simply\?)/i.test(q);

/** Only normal answered questions count. Distress, blocked and pending turns never earn rewards. */
function counted(turns: Turn[], limit: number): Turn[] {
  const perDay = new Map<number, number>();
  return turns.filter((t) => {
    if (t.route === 'distress' || t.route === 'blocked' || t.answerWhere === 'script') return false;
    const d = startOfDay(t.at);
    const n = (perDay.get(d) ?? 0) + 1;
    perDay.set(d, n);
    return n <= limit; // after the daily limit, rewards pause
  });
}

const stageFor = (n: number): Plant['stage'] => (n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

const BADGES: { id: string; icon: string; name: string; hint: string; test: (c: Turn[], topics: Map<Topic, number>) => boolean }[] = [
  { id: 'first', icon: '🌱', name: 'First Sprout', hint: 'Ask your very first question', test: (c) => c.length >= 1 },
  { id: 'explorer', icon: '🧭', name: 'Explorer', hint: 'Ask about 3 different topics', test: (_c, t) => t.size >= 3 },
  { id: 'deep', icon: '🤿', name: 'Deep Diver', hint: 'Tap "Tell me more"', test: (c) => c.some((t) => /^tell me more about/i.test(t.question)) },
  { id: 'scientist', icon: '🔬', name: 'Little Scientist', hint: 'Ask 3 science questions', test: (_c, t) => (t.get('science') ?? 0) + (t.get('nature') ?? 0) >= 3 },
  { id: 'animals', icon: '🐾', name: 'Animal Friend', hint: 'Ask 3 animal questions', test: (_c, t) => (t.get('animals') ?? 0) >= 3 },
  { id: 'space', icon: '🚀', name: 'Space Cadet', hint: 'Ask about space', test: (_c, t) => (t.get('space') ?? 0) >= 1 },
  { id: 'why', icon: '❓', name: 'Big Why', hint: 'Ask 5 "why" questions', test: (c) => c.filter((t) => /\bwhy\b/i.test(t.question)).length >= 5 },
  { id: 'gardener', icon: '🌻', name: 'Master Gardener', hint: 'Grow a plant into a flower', test: (_c, t) => [...t.values()].some((n) => n >= 6) },
];

export function progress(turns: Turn[], settings: GameSettings, now = Date.now()): Progress {
  const c = counted(turns, settings.dailyLimit);
  const topics = new Map<Topic, number>();
  for (const t of c) {
    if (isFollowUp(t.question)) continue; // follow-ups earn badges, not extra plant growth
    const topic = t.guard?.topic ?? 'other';
    topics.set(topic, (topics.get(topic) ?? 0) + 1);
  }
  const plants = [...topics.entries()]
    .filter(([topic]) => topic !== 'other')
    .map(([topic, count]) => ({ topic, count, stage: stageFor(count) }))
    .sort((a, b) => b.count - a.count);
  const badges = BADGES.map((b) => ({ id: b.id, icon: b.icon, name: b.name, hint: b.hint, earned: b.test(c, topics) }));
  const today = turns.filter((t) => t.route !== 'distress' && startOfDay(t.at) === startOfDay(now)).length;
  return { plants, badges, earnedCount: badges.filter((b) => b.earned).length, today, limitReached: today >= settings.dailyLimit };
}

/** Badges earned by the latest change (for a celebration). */
export function newBadges(before: Progress, after: Progress): Badge[] {
  const had = new Set(before.badges.filter((b) => b.earned).map((b) => b.id));
  return after.badges.filter((b) => b.earned && !had.has(b.id));
}

const WONDERS: Record<AgeBand, string[]> = {
  '6-8': [
    'Why do zebras have stripes?', 'How do fish breathe underwater?', 'Why is the ocean salty?',
    'How do birds know where to fly?', 'Why do we have to sleep?', 'How does a seed grow into a tree?',
    'Why does the Moon change shape?',
  ],
  '9-12': [
    'How do black holes form?', 'Why do we dream?', 'How does the internet reach my house?',
    'Why did the dinosaurs disappear?', 'How do volcanoes make new islands?', 'Why is space so cold?',
    'How do vaccines teach our body?',
  ],
};

/** One surprising question per day: a gentle reason to come back that ends after one question. */
export function dailyWonder(band: AgeBand, now = Date.now()): string {
  const list = WONDERS[band];
  return list[Math.floor(startOfDay(now) / 86_400_000) % list.length];
}

export const TOPIC_PLANT: Partial<Record<Topic, { name: string; flower: string }>> = {
  science: { name: 'Science', flower: '#7aa7f5' }, animals: { name: 'Animals', flower: '#f6a04d' },
  space: { name: 'Space', flower: '#a78bfa' }, nature: { name: 'Nature', flower: '#5fbf84' },
  math: { name: 'Math', flower: '#f472b6' }, reading: { name: 'Words', flower: '#facc15' },
  history: { name: 'History', flower: '#d97757' }, geography: { name: 'World', flower: '#38bdf8' },
  body: { name: 'Body', flower: '#fb7185' }, feelings: { name: 'Feelings', flower: '#fbbf24' },
  friends: { name: 'Friends', flower: '#f9a8d4' }, tech: { name: 'Tech', flower: '#94a3b8' },
  games: { name: 'Games', flower: '#4ade80' }, art: { name: 'Art', flower: '#e879f9' },
  music: { name: 'Music', flower: '#818cf8' }, sports: { name: 'Sports', flower: '#fb923c' },
  food: { name: 'Food', flower: '#facc15' },
};
