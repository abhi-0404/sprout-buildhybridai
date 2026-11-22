import type { AgeBand } from '../pipeline/types';

export interface Suggestion {
  emoji: string;
  text: string;
}

const YOUNG: Suggestion[] = [
  { emoji: '🌈', text: 'Why is the sky blue?' },
  { emoji: '🐝', text: 'How do bees make honey?' },
  { emoji: '🦕', text: 'What is a dinosaur?' },
  { emoji: '🐱', text: 'Why do cats purr?' },
  { emoji: '🌋', text: 'What is a volcano?' },
  { emoji: '🌧️', text: 'Where does rain come from?' },
];

const OLDER: Suggestion[] = [
  { emoji: '🌋', text: 'Why do volcanoes erupt?' },
  { emoji: '🐝', text: 'How do bees make honey?' },
  { emoji: '🌌', text: 'Why is the sky blue?' },
  { emoji: '🌙', text: 'How does the Moon shine?' },
  { emoji: '🕊️', text: 'Why do countries go to war?' },
  { emoji: '🕳️', text: 'What are black holes?' },
];

export const suggestionsFor = (band: AgeBand): Suggestion[] => (band === '9-12' ? OLDER : YOUNG);
