import { useState } from 'react';
import { loadGame, saveGame, type GameSettings as Game } from '../kid/game';
import { Switch } from './shared';

/** Parent controls for the kid's curiosity garden and badges. */
export function GameSettings() {
  const [g, setG] = useState<Game>(loadGame);
  const update = (next: Game) => { setG(next); saveGame(next); };
  return (
    <div className="p-stack-sm">
      <p className="p-card-sub">
        Sprout rewards curiosity, not screen time: a garden that grows with new topics and badges for exploring.
        There are no streaks to lose, safety moments never earn rewards, and after the daily limit rewards pause and Sprout suggests a break.
      </p>
      <Switch
        id="st-games"
        checked={g.enabled}
        onChange={(enabled) => update({ ...g, enabled })}
        label="Garden, badges and daily wonder"
        hint="Turn off for a plain question-and-answer helper."
      />
      <label className="p-field">
        <span>Suggest a break after</span>
        <select className="p-input" value={g.dailyLimit} onChange={(e) => update({ ...g, dailyLimit: Number(e.target.value) })} disabled={!g.enabled}>
          {[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} questions a day</option>)}
        </select>
      </label>
    </div>
  );
}
