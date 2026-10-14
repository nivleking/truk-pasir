import { VEHICLES, type VehicleId } from './vehicles';

export type UpgradeId = 'engine' | 'bed' | 'tires';

export interface Career {
  money: number;
  owned: VehicleId[];
  upgrades: Record<UpgradeId, number>;
}

export const MAX_UPGRADE = 3;
export const VEHICLE_PRICES: Record<VehicleId, number> = { 'dump-truck': 0, 'wheel-loader': 1500, 'mining-truck': 3000 };
export const UPGRADES: { id: UpgradeId; name: string; effect: string }[] = [
  { id: 'engine', name: 'Engine', effect: '+15% power' },
  { id: 'bed', name: 'Bigger Bed', effect: '+15% load' },
  { id: 'tires', name: 'Tires', effect: 'more grip' },
];
const PER_GRAIN = 2;
const PER_STAR = 100;

export const newCareer = (): Career => ({ money: 0, owned: ['dump-truck'], upgrades: { engine: 0, bed: 0, tires: 0 } });

export const owns = (c: Career, id: VehicleId) => c.owned.includes(id);

export function earnings(delivered: number, stars: number): number {
  return Math.max(0, delivered) * PER_GRAIN + Math.max(0, stars) * PER_STAR;
}

export function buyVehicle(c: Career, id: VehicleId): Career | null {
  const price = VEHICLE_PRICES[id];
  if (owns(c, id) || c.money < price) return null;
  return { ...c, money: c.money - price, owned: [...c.owned, id] };
}

export const upgradeCost = (_id: UpgradeId, level: number) => 600 * 2 ** level;

export function buyUpgrade(c: Career, id: UpgradeId): Career | null {
  const level = c.upgrades[id];
  if (level >= MAX_UPGRADE) return null;
  const cost = upgradeCost(id, level);
  if (c.money < cost) return null;
  return { ...c, money: c.money - cost, upgrades: { ...c.upgrades, [id]: level + 1 } };
}

/** Engine force and capacity multipliers, and extra tire friction, from the bought upgrades. */
export function tuning(c: Career): { engine: number; capacity: number; grip: number } {
  return { engine: 1 + 0.15 * c.upgrades.engine, capacity: 1 + 0.15 * c.upgrades.bed, grip: 0.25 * c.upgrades.tires };
}

export function parseCareer(raw: string | null): Career {
  const c = newCareer();
  if (!raw) return c;
  try {
    const d = JSON.parse(raw) as Partial<Record<keyof Career, unknown>>;
    if (typeof d !== 'object' || d === null) return c;
    if (typeof d.money === 'number' && d.money >= 0) c.money = Math.floor(d.money);
    if (Array.isArray(d.owned))
      for (const id of d.owned) if (VEHICLES.some((v) => v.id === id) && !c.owned.includes(id)) c.owned.push(id as VehicleId);
    const u = d.upgrades as Record<string, unknown> | undefined;
    if (u && typeof u === 'object')
      for (const k of ['engine', 'bed', 'tires'] as const)
        if (typeof u[k] === 'number') c.upgrades[k] = Math.max(0, Math.min(MAX_UPGRADE, Math.floor(u[k] as number)));
    return c;
  } catch {
    return c;
  }
}
