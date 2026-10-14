export type Rank = 'S' | 'A' | 'B' | 'C';

export interface ScoreInput {
  loaded: number;
  delivered: number;
  seconds: number;
}

export interface Score {
  percent: number;
  timeBonus: number;
  total: number;
  rank: Rank;
}

/** Seconds under this earn a time bonus. */
const PAR_SECONDS = 90;
const BONUS_PER_SECOND = 5;

export function computeScore({ loaded, delivered, seconds }: ScoreInput): Score {
  const percent = loaded > 0 ? Math.min(100, Math.round((delivered / loaded) * 100)) : 0;
  const timeBonus = delivered > 0 ? Math.max(0, Math.round((PAR_SECONDS - seconds) * BONUS_PER_SECOND)) : 0;
  const rank: Rank = percent >= 90 ? 'S' : percent >= 75 ? 'A' : percent >= 50 ? 'B' : 'C';
  return { percent, timeBonus, total: percent * 10 + timeBonus, rank };
}
