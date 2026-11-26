// Shared helpers for Ridgeline Courier: a seeded PRNG and small math utilities.

/** Deterministic PRNG (mulberry32): the same seed always gives the same stream. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** Move `v` toward `target` by at most `step`. */
export const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
/** Degrees to radians. */
export const deg2rad = (d) => (d * Math.PI) / 180;
export const rad2deg = (r) => (r * 180) / Math.PI;

/** Format a number with one decimal, trimming ".0". */
export function fmt1(v) {
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
