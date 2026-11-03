import { describe, expect, it } from 'vitest';
import { axisAngle, mulQuat, rotateByQuat, yawTiltQuat } from '../../src/core/quat';

describe('rotateByQuat', () => {
  it('identity leaves the vector unchanged', () => {
    expect(rotateByQuat({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 0, w: 1 })).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('90° around Y turns +Z into +X', () => {
    const s = Math.SQRT1_2;
    const v = rotateByQuat({ x: 0, y: 0, z: 1 }, { x: 0, y: s, z: 0, w: s });
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it('positive rotation around X tips +Z downward', () => {
    const a = 0.3;
    const v = rotateByQuat({ x: 0, y: 0, z: 1 }, { x: Math.sin(a / 2), y: 0, z: 0, w: Math.cos(a / 2) });
    expect(v.y).toBeCloseTo(-Math.sin(a));
    expect(v.z).toBeCloseTo(Math.cos(a));
  });
});

describe('yawTiltQuat', () => {
  it('positive tilt raises the +Z end', () => {
    const v = rotateByQuat({ x: 0, y: 0, z: 1 }, yawTiltQuat(0, 30));
    expect(v.y).toBeCloseTo(0.5);
  });
  it('yaw 90 turns +Z toward +X', () => {
    const v = rotateByQuat({ x: 0, y: 0, z: 1 }, yawTiltQuat(90, 0));
    expect(v.x).toBeCloseTo(1);
  });
});

describe('quat helpers', () => {
  it('composes rotations: yaw 90 then tilt 30 equals yawTiltQuat', () => {
    const q = mulQuat(axisAngle('y', Math.PI / 2), axisAngle('x', (-30 * Math.PI) / 180));
    const r = yawTiltQuat(90, 30);
    for (const k of ['x', 'y', 'z', 'w'] as const) expect(q[k]).toBeCloseTo(r[k]);
  });
});
