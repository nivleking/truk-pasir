import type RAPIER from '@dimforge/rapier3d-compat';
import type { DriveCommands } from '../core/input';
import type { VehicleInfo } from '../core/vehicles';
import type { Box } from './parts';
import type { Chassis, ChassisConfig } from './chassis';

/** Extra rigid body of a vehicle (bed, arm, bucket) with the boxes the renderer should draw. */
export interface VehiclePart {
  body: RAPIER.RigidBody;
  boxes: Box[];
  color: number;
  /** Offset from the chassis at spawn, used to put the part back on reset. */
  spawnOffset: RAPIER.Vector;
  /** Index of a box that can be switched off (the tailgate), and whether it is currently shown. */
  toggleBox?: { index: number; visible(): boolean };
}

export interface CabSpec {
  halfWidth: number;
  height: number;
  halfLength: number;
  z: number;
}

/** Everything the game loop needs from a vehicle, whatever kind it is. */
export interface Vehicle {
  info: VehicleInfo;
  config: ChassisConfig;
  cab: CabSpec;
  chassis: Chassis;
  parts: VehiclePart[];
  /** Actuators (bed / arm / bucket) from player input. */
  actuate(cmd: DriveCommands, dt: number): void;
  /** World position of the carrier's center: bed or bucket. Used for hopper and dump zone checks. */
  carrierCenter(): RAPIER.Vector;
  /** Degrees the carrier is tipped for dumping; 0 = carrying position. */
  dumpAngle(): number;
  /** Text for the HUD, e.g. "bed 20°". */
  actuatorText(): string;
  resetActuators(): void;
  /** HUD hints */
  hints: { hauling: string; dumping: string; keys: string };
}
