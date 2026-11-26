import {
  Bird, Bone, Bug, Cat, CircleDot, CircleHelp, CloudRain, Compass, Flower2, Microscope, Moon, Mountain,
  Orbit, PawPrint, Rainbow, Rocket, Sparkles, Sprout, Waves, type LucideIcon,
} from 'lucide-react';

// Line icons in place of emoji: emoji render as glossy 3D cartoons on Windows and clash with the calm
// look. The data files (suggestions.ts, game.ts) still carry emoji strings; they are mapped here by
// the emoji itself (suggestions) or by badge id (badges) and never shown as text.

const SUGGESTION_ICON: Record<string, LucideIcon> = {
  '\u{1F308}': Rainbow,
  '\u{1F41D}': Bug,
  '\u{1F995}': Bone,
  '\u{1F431}': Cat,
  '\u{1F30B}': Mountain,
  '\u{1F327}\u{FE0F}': CloudRain,
  '\u{1F30C}': Orbit,
  '\u{1F319}': Moon,
  '\u{1F54A}\u{FE0F}': Bird,
  '\u{1F573}\u{FE0F}': CircleDot,
};

const BADGE_ICON: Record<string, LucideIcon> = {
  first: Sprout,
  explorer: Compass,
  deep: Waves,
  scientist: Microscope,
  animals: PawPrint,
  space: Rocket,
  why: CircleHelp,
  gardener: Flower2,
};

export function SuggestionIcon({ emoji, size = 28 }: { emoji: string; size?: number }) {
  const Icon = SUGGESTION_ICON[emoji] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
}

export function BadgeIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = BADGE_ICON[id] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
}
