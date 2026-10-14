import type { Vec3 } from './chaseCam';
import type { DriveCommands } from './input';

export interface DriveConfig {
  engineForce: number;
  brakeForce: number;
  /** Light brake when no pedal is pressed (engine braking / rolling resistance). */
  coastBrake: number;
  /** Reverse gear gets this fraction of engine force. */
  reverseFactor: number;
}

/** Below this speed (km/h) pressing the opposite direction switches gear instead of braking. */
const GEAR_SWITCH_KMH = 2;

/** Decide engine and brake force from player intent and current forward speed (km/h, negative = reversing). */
export function driveForces(cmd: DriveCommands, speedKmh: number, cfg: DriveConfig) {
  if (cmd.handbrake) return { engine: 0, brake: cfg.brakeForce };
  if (cmd.throttle === 0) return { engine: 0, brake: cfg.coastBrake };

  const movingAgainstInput = Math.sign(speedKmh) === -Math.sign(cmd.throttle) && Math.abs(speedKmh) > GEAR_SWITCH_KMH;
  if (movingAgainstInput) return { engine: 0, brake: cfg.brakeForce };

  const power = cmd.throttle > 0 ? cfg.engineForce : cfg.engineForce * cfg.reverseFactor;
  return { engine: cmd.throttle * power, brake: 0 };
}

export function isOutOfBounds(p: Vec3): boolean {
  return p.y < -5;
}
