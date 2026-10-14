import { computeScore, type Score } from './score';

export type RoundState = 'ready' | 'loading' | 'hauling' | 'dumping' | 'settling' | 'finished';

export interface RoundInput {
  /** Grains spawned into the bed this round. */
  loaded: number;
  /** Grains currently resting inside the dump zone. */
  delivered: number;
  bedUnderHopper: boolean;
  bedInZone: boolean;
  /** Degrees */
  bedAngle: number;
  /** Team mode: the player says the dump is done (scraping finished). */
  finishPressed?: boolean;
}

export interface Round {
  readonly state: RoundState;
  readonly seconds: number;
  readonly result: Score | null;
  update(dt: number, input: RoundInput): void;
  reset(): void;
}

/**
 * One load: fill at the hopper -> haul -> raise the bed in the zone -> lower it,
 * then wait `settleSeconds` for falling sand to land before scoring.
 */
export function createRound(cfg: { dumpAngle: number; settleSeconds: number; manualFinish?: boolean }): Round {
  let state: RoundState = 'ready';
  let seconds = 0;
  let result: Score | null = null;
  let settle = 0;
  let armed = false;

  return {
    get state() {
      return state;
    },
    get seconds() {
      return seconds;
    },
    get result() {
      return result;
    },
    update(dt, i) {
      if (state === 'finished') return;
      if (state === 'ready' && i.loaded > 0) state = 'loading';
      if (state === 'ready') return;

      seconds += dt;
      if (state === 'hauling' && i.bedUnderHopper) state = 'loading';
      else if (state === 'loading' && !i.bedUnderHopper) state = 'hauling';
      if (state === 'hauling' && i.bedInZone && i.bedAngle >= cfg.dumpAngle) state = 'dumping';
      if (state === 'settling') {
        if (i.bedAngle > 0) {
          state = 'dumping';
        } else if (cfg.manualFinish && !armed) {
          // Team mode: time keeps running while the helper scrapes up spilled sand.
          if (i.finishPressed) {
            armed = true;
            settle = 0;
            seconds -= dt;
          }
          return;
        } else {
          settle += dt;
          if (settle >= cfg.settleSeconds) {
            state = 'finished';
            seconds -= settle; // settle time is not the player's time
            result = computeScore({ loaded: i.loaded, delivered: i.delivered, seconds });
          }
          return;
        }
      }
      if (state === 'dumping' && i.bedAngle === 0) {
        state = 'settling';
        settle = 0;
        armed = false;
      }
    },
    reset() {
      state = 'ready';
      seconds = 0;
      result = null;
      armed = false;
    },
  };
}
