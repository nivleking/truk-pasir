import { describe, expect, it } from 'vitest';
import { DEFAULT_VEHICLE, findVehicle, VEHICLES, teamFor } from '../../src/core/vehicles';

describe('vehicle catalog', () => {
  it('has the dump truck, mining truck, wheel loader and excavator', () => {
    expect(VEHICLES.map((v) => v.id)).toEqual(['dump-truck', 'mining-truck', 'wheel-loader', 'excavator']);
  });

  it('every vehicle has a name, description and a positive load capacity', () => {
    for (const v of VEHICLES) {
      expect(v.name.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
      expect(v.capacity).toBeGreaterThan(0);
    }
  });

  it('ids are unique', () => {
    expect(new Set(VEHICLES.map((v) => v.id)).size).toBe(VEHICLES.length);
  });
});

describe('findVehicle', () => {
  it('finds by id', () => {
    expect(findVehicle('wheel-loader').kind).toBe('loader');
  });

  it('falls back to the default for unknown or missing ids', () => {
    expect(findVehicle('spaceship').id).toBe(DEFAULT_VEHICLE);
    expect(findVehicle(null).id).toBe(DEFAULT_VEHICLE);
  });
});

describe('team', () => {
  it('a dump vehicle with helper brings the wheel loader second', () => {
    expect(teamFor('mining-truck', true)).toEqual(['mining-truck', 'wheel-loader']);
  });
  it('no helper, or a loader as main vehicle, is a team of one', () => {
    expect(teamFor('dump-truck', false)).toEqual(['dump-truck']);
    expect(teamFor('wheel-loader', true)).toEqual(['wheel-loader']);
  });
});

describe('excavator team', () => {
  it('pairs the excavator with a dump truck, truck first', () => {
    expect(teamFor('excavator', false)).toEqual(['dump-truck', 'excavator']);
  });
});
