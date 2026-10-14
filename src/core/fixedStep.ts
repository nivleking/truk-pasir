/**
 * Fixed-timestep accumulator: turns variable frame time into a whole number
 * of physics steps, so the simulation behaves the same at any FPS.
 */
export interface FixedStep {
  /** Add elapsed seconds; returns how many physics steps to run now. */
  advance(dtSeconds: number): number;
  /** Fraction of the next step already elapsed, for render interpolation. */
  alpha(): number;
}

export function createFixedStep(stepSeconds: number, maxStepsPerFrame = 5): FixedStep {
  let accumulator = 0;
  const epsilon = 1e-9;

  return {
    advance(dtSeconds) {
      accumulator += dtSeconds;
      let steps = 0;
      while (accumulator + epsilon >= stepSeconds && steps < maxStepsPerFrame) {
        accumulator -= stepSeconds;
        steps++;
      }
      // Hit the cap: drop the backlog instead of trying to catch up forever.
      if (steps === maxStepsPerFrame && accumulator >= stepSeconds) accumulator = 0;
      if (accumulator < 0) accumulator = 0;
      return steps;
    },
    alpha() {
      return accumulator / stepSeconds;
    },
  };
}
