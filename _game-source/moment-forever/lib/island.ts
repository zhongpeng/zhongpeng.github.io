export type Point = { x: number; z: number };
export type Obstacle = Point & { radius: number };
export const START: Point = { x: -17, z: 10 };
export const LIGHTHOUSE: Point = { x: 19, z: -13 };
export const REGION_NAMES = ['童年的花园', '关系的海岸', '成长的山丘'] as const;
export function regionAt(p: Point) {
  return p.x < -8 ? 0 : p.x > 9 ? 2 : 1;
}
export function heightAt(x: number, z: number) {
  return (
    0.12 +
    1.9 * Math.exp(-((x - 17) ** 2 + (z + 9) ** 2) / 145) +
    0.35 * Math.exp(-((x + 17) ** 2 + z ** 2) / 95)
  );
}
export function isLand(x: number, z: number, margin = 0) {
  return (x / 29) ** 2 + (z / 21) ** 2 < (1 - margin) ** 2;
}
export function canStand(p: Point, obstacles: Obstacle[]) {
  return (
    isLand(p.x, p.z, 0.06) &&
    !obstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.radius + 0.36)
  );
}
export function stepPosition(
  p: Point,
  delta: Point,
  obstacles: Obstacle[],
): Point {
  const next = { x: p.x + delta.x, z: p.z + delta.z };
  if (canStand(next, obstacles)) return next;
  const xOnly = { x: next.x, z: p.z };
  if (canStand(xOnly, obstacles)) return xOnly;
  const zOnly = { x: p.x, z: next.z };
  return canStand(zOnly, obstacles) ? zOnly : p;
}
// Small navigation grid keeps tap-to-walk routes on land and around solid scenery.
export function findPath(
  start: Point,
  target: Point,
  obstacles: Obstacle[],
): Point[] {
  const grid = 1;
  const key = (p: Point) => `${p.x},${p.z}`;
  const snap = (p: Point) => ({
    x: Math.round(p.x / grid) * grid,
    z: Math.round(p.z / grid) * grid,
  });
  const source = snap(start);
  let end = snap(target);
  if (!canStand(end, obstacles)) {
    let candidate: Point | undefined;
    let distance = Infinity;
    for (let x = -3; x <= 3; x++)
      for (let z = -3; z <= 3; z++) {
        const p = { x: end.x + x, z: end.z + z };
        const d = Math.hypot(p.x - target.x, p.z - target.z);
        if (canStand(p, obstacles) && d < distance) {
          candidate = p;
          distance = d;
        }
      }
    if (!candidate) return [];
    end = candidate;
  }
  const startKey = key(source),
    endKey = key(end);
  const open = [source];
  const came = new Map<string, Point>();
  const g = new Map([[startKey, 0]]);
  const closed = new Set<string>();
  for (let iteration = 0; open.length && iteration < 4000; iteration++) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      const score = (p: Point) =>
        (g.get(key(p)) ?? Infinity) + Math.hypot(end.x - p.x, end.z - p.z);
      if (score(open[i]) < score(open[best])) best = i;
    }
    const current = open.splice(best, 1)[0];
    const ck = key(current);
    if (ck === endKey) {
      const path: Point[] = [end];
      let p = current;
      while (key(p) !== startKey) {
        const previous = came.get(key(p));
        if (!previous) break;
        path.push(previous);
        p = previous;
      }
      return path.reverse().slice(1);
    }
    closed.add(ck);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const next = { x: current.x + dx, z: current.z + dz },
          nk = key(next);
        if (closed.has(nk) || !canStand(next, obstacles)) continue;
        if (
          dx &&
          dz &&
          (!canStand({ x: current.x + dx, z: current.z }, obstacles) ||
            !canStand({ x: current.x, z: current.z + dz }, obstacles))
        )
          continue;
        const cost = (g.get(ck) ?? 0) + Math.hypot(dx, dz);
        if (cost >= (g.get(nk) ?? Infinity)) continue;
        came.set(nk, current);
        g.set(nk, cost);
        if (!open.some((p) => key(p) === nk)) open.push(next);
      }
  }
  return [];
}

export const TREE_POSITIONS: Point[] = [
  { x: -24, z: 0 },
  { x: -24, z: -4 },
  { x: -19, z: -12 },
  { x: -13, z: -15 },
  { x: -8, z: -13 },
  { x: -25, z: 5 },
  { x: -13, z: 5 },
  { x: -10, z: 11 },
  { x: -5, z: -8 },
  { x: 0, z: -13 },
  { x: 5, z: -11 },
  { x: 10, z: -16 },
  { x: 23, z: -7 },
  { x: 25, z: 1 },
  { x: 17, z: 8 },
  { x: 10, z: 7 },
  { x: -2, z: 16 },
  { x: -16, z: 13 },
  { x: 4, z: -16 },
];
export const WORLD_OBSTACLES: Obstacle[] = [
  ...TREE_POSITIONS.map((p) => ({ ...p, radius: 0.7 })),
  { x: -20, z: -7.8, radius: 1.8 },
  { x: 19, z: -13, radius: 1.15 },
];
