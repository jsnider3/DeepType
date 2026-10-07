import { describe, expect, it } from 'vitest';
import { MAP_NODES, trailBetween } from '../src/game/mapdata';

describe('adventure map graph', () => {
  it('has 36 nodes indexed by level, with valid exits', () => {
    expect(MAP_NODES).toHaveLength(36);
    MAP_NODES.forEach((n, i) => {
      expect(n.level).toBe(i);
      for (const e of n.next) expect(e).toBeGreaterThan(-1);
      for (const e of n.next) expect(e).toBeLessThan(36);
    });
  });

  it('reaches the final level (35) from the port on every route', () => {
    const ends = new Set<number>();
    const walk = (i: number, depth: number) => {
      const exits = MAP_NODES[i].next.filter((e) => !MAP_NODES[e].secret);
      if (!exits.length) ends.add(i);
      expect(depth).toBeLessThan(20);
      for (const e of exits) walk(e, depth + 1);
    };
    walk(0, 0);
    expect([...ends]).toEqual([35]);
  });

  it('offers each secret level from exactly one parent', () => {
    for (const s of MAP_NODES.filter((n) => n.secret)) {
      expect(MAP_NODES.filter((n) => n.next.includes(s.level))).toHaveLength(1);
    }
  });

  it('places trail dots between nodes', () => {
    expect(trailBetween(MAP_NODES[0], MAP_NODES[1]).slice(0, 3)).toEqual([[129, 50], [136, 55], [143, 59]]);
  });
});
