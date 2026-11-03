export type VehicleId = 'dump-truck' | 'mining-truck' | 'wheel-loader' | 'excavator';

export interface VehicleInfo {
  id: VehicleId;
  /** 'dump' = tilting bed at the back, 'loader' = bucket on a lifting arm at the front, 'excavator' = digs a pile into a truck */
  kind: 'dump' | 'loader' | 'excavator';
  name: string;
  description: string;
  /** Max grains per load at the hopper */
  capacity: number;
}

export const VEHICLES: readonly VehicleInfo[] = [
  {
    id: 'dump-truck',
    kind: 'dump',
    name: 'Dump Truck',
    description: 'Nimble and balanced. Great for beginners.',
    capacity: 350,
  },
  {
    id: 'mining-truck',
    kind: 'dump',
    name: 'Mining Truck',
    description: 'A giant: biggest load, but heavy and wide.',
    capacity: 600,
  },
  {
    id: 'wheel-loader',
    kind: 'loader',
    name: 'Wheel Loader',
    description: 'Bucket up front. Raise the arm (E/Q), tip the bucket (X/Z).',
    capacity: 100,
  },
  {
    id: 'excavator',
    kind: 'excavator',
    name: 'Excavator',
    description: 'Dig the sand pile and load a dump truck yourself. No hopper on this job.',
    capacity: 350,
  },
];

export const DEFAULT_VEHICLE: VehicleId = 'dump-truck';

export function findVehicle(id: string | null): VehicleInfo {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES.find((v) => v.id === DEFAULT_VEHICLE)!;
}

/** Vehicles on the map: the chosen one first, plus the wheel loader as helper for dump vehicles. */
export function teamFor(id: string, helper: boolean): VehicleId[] {
  const main = findVehicle(id);
  // The excavator always works with a dump truck; the truck is slot 0 because it carries the round.
  if (main.kind === 'excavator') return ['dump-truck', 'excavator'];
  return helper && main.kind === 'dump' ? [main.id, 'wheel-loader'] : [main.id];
}
