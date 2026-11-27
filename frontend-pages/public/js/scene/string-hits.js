// Finds which string the pointer is on. Strings are only a few pixels wide on screen,
// so instead of hitting the thin 3D mesh, each string is a line on screen (nut to bridge)
// and the nearest line within reach wins. Plain numbers in, so it is easy to test.

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

// lines: [{ id, a: {x, y}, b: {x, y} }] in screen pixels. reach: how far away still counts.
export function nearestString(point, lines, reach) {
  let best = null;
  for (const { id, a, b } of lines) {
    const distance = distanceToSegment(point, a, b);
    if (distance <= reach && (!best || distance < best.distance)) best = { id, distance };
  }
  return best?.id ?? null;
}
