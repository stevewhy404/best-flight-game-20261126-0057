// Ridgeline Courier — delivery legs: three sorties across the valley.
// Each leg: take off, fly its rings, land at the other strip.

export const LEGS = [
  {
    name: 'PINEFIELD → EAGLE ROCK',
    from: 0,
    to: 1,
    cargo: 'Medical supplies for the ridge clinic',
    brief: 'Take off from Pinefield, thread rings 1-2-3, land at Eagle Rock.',
  },
  {
    name: 'EAGLE ROCK → PINEFIELD',
    from: 1,
    to: 0,
    cargo: 'Spare parts for the valley radio mast',
    brief: 'Head back west. The middle ring sits high — mind your fuel.',
  },
  {
    name: 'PINEFIELD → EAGLE ROCK',
    from: 0,
    to: 1,
    cargo: 'A birthday cake. Do not shake it.',
    brief: 'Final run. Low ring over the river, then a high one. Gentle landings!',
  },
];

/** Fresh run state: leg 0, no rings flown, full score counters. */
export function makeRun() {
  return {
    leg: 0,
    passed: [false, false, false],
    score: 0,
    delivered: 0,
    time: 0,
    message: '',
    messageUntil: 0,
    finished: false,
    started: false,
  };
}

/** Rings the plane just flew through this tick (indices into the leg's rings). */
export function ringsFlown(plane, rings, passed) {
  const hit = [];
  rings.forEach((ring, i) => {
    if (passed[i]) return;
    const dx = plane.x - ring.x;
    const dy = plane.alt - ring.alt;
    if (dx * dx + dy * dy < ring.r * ring.r) hit.push(i);
  });
  return hit;
}

/** Points for a ring: base 250, plus a speed bonus for threading it fast. */
export function ringPoints(plane) {
  return 250 + Math.round(plane.speed);
}
