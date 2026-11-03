/**
 * World (x, z) to mini-map pixels. +Z is up and +X is left, so the map matches what the
 * chase camera shows when you face +Z at spawn.
 */
export function toMap(p: { x: number; z: number }, half: number, size: number): { x: number; y: number } {
  const s = size / (2 * half);
  return { x: size / 2 - p.x * s, y: size / 2 - p.z * s };
}
