export interface HighScore {
  name: string;
  score: number;
  percent: number;
  seconds: number;
  /** YYYY-MM-DD */
  date: string;
  /** VehicleId; missing on scores saved before vehicles existed */
  vehicle?: string;
  /** Level id; missing on scores saved before levels existed */
  level?: string;
}

export const MAX_SCORES = 10;
const MAX_NAME = 12;

export function sanitizeName(raw: string): string {
  const name = raw.trim().slice(0, MAX_NAME);
  return name || 'Driver';
}

/** Insert and keep the best MAX_SCORES, best first; ties keep the older entry ahead. */
export function addScore(list: readonly HighScore[], entry: HighScore): HighScore[] {
  return [...list, entry].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
}

const isHighScore = (x: unknown): x is HighScore => {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    typeof o.score === 'number' &&
    typeof o.percent === 'number' &&
    typeof o.seconds === 'number' &&
    typeof o.date === 'string'
  );
};

/** Parse stored JSON defensively: anything unexpected becomes an empty list. */
export function parseScores(raw: string | null): HighScore[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isHighScore) : [];
  } catch {
    return [];
  }
}
