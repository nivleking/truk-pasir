import { parseScores, type HighScore } from './core/highScores';
import { parseCareer, type Career } from './core/career';
import { parseProgress, type Progress } from './core/levels';

const SCORES_KEY = 'truk-pasir:scores';
const NAME_KEY = 'truk-pasir:name';

// Storage can be blocked (private mode etc.), so every access is wrapped; the game works without it.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const loadScores = () => parseScores(read(SCORES_KEY));
export const saveScores = (list: HighScore[]) => write(SCORES_KEY, JSON.stringify(list));
export const loadName = () => read(NAME_KEY) ?? '';
export const saveName = (name: string) => write(NAME_KEY, name);

const VEHICLE_KEY = 'truk-pasir:vehicle';
export const loadVehicle = () => read(VEHICLE_KEY);
export const saveVehicle = (id: string) => write(VEHICLE_KEY, id);

const HELPER_KEY = 'truk-pasir:helper';
export const loadHelper = () => read(HELPER_KEY) !== '0';
export const saveHelper = (on: boolean) => write(HELPER_KEY, on ? '1' : '0');

const LEVEL_KEY = 'truk-pasir:level';
export const loadLevel = () => read(LEVEL_KEY);
export const saveLevel = (id: string) => write(LEVEL_KEY, id);

const PROGRESS_KEY = 'truk-pasir:progress';
export const loadProgress = () => parseProgress(read(PROGRESS_KEY));
export const saveProgress = (p: Progress) => write(PROGRESS_KEY, JSON.stringify(p));

const CAREER_KEY = 'truk-pasir:career';
export const loadCareer = () => parseCareer(read(CAREER_KEY));
export const saveCareer = (c: Career) => write(CAREER_KEY, JSON.stringify(c));

export type GameMode = 'career' | 'free';
const MODE_KEY = 'truk-pasir:mode';
export const loadMode = (): GameMode => (read(MODE_KEY) === 'free' ? 'free' : 'career');
export const saveMode = (m: GameMode) => write(MODE_KEY, m);

export type TimeOfDay = 'day' | 'evening';
const TIME_KEY = 'truk-pasir:time';
export const loadTime = (): TimeOfDay => (read(TIME_KEY) === 'evening' ? 'evening' : 'day');
export const saveTime = (t: TimeOfDay) => write(TIME_KEY, t);
