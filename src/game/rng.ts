/** rand() as a non-negative 31-bit int. */
export function rand(): number {
  return (Math.random() * 0x7fffffff) | 0;
}

/** The original's ubiquitous range roll: `rand % max(1, max - min) + min` (max exclusive). */
export function rollRange(min: number, max: number): number {
  return (rand() % Math.max(1, max - min)) + min;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[rand() % arr.length];
}
