// Deterministic seeded RNG (mulberry32) — no external dependency needed for
// a generator this small. Same seed always produces the same sequence.
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted random pick: each item's chance is proportional to its weight.
// Falls back to the last item on float-rounding edge cases.
export function weightedPick<T>(
  rng: () => number,
  items: readonly T[],
  weights: readonly number[]
): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[items.length - 1];
}

// One draw, 0 (Monday) through 6 (Sunday).
export function pickDay(rng: () => number): number {
  return Math.floor(rng() * 7);
}

// Uniform random pick from a non-empty array.
export function pickUniform<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}
