// How hard a drag is bowing: the faster the pointer moves, the higher the level (0 to 1).
// When the pointer stops, the level fades, like a bow that has stopped moving.
const FULL_SPEED = 1; // pixels per millisecond for a full-strength bow
const SMOOTHING = 0.35; // share of each new speed reading that is kept
const FADE_MS = 160;

export class BowGesture {
  start(x, y, now) {
    this.last = { x, y, now };
    this.speed = 0;
  }

  move(x, y, now) {
    if (!this.last) return this.start(x, y, now);
    const elapsed = Math.max(1, now - this.last.now);
    const speed = Math.hypot(x - this.last.x, y - this.last.y) / elapsed;
    this.speed += (speed - this.speed) * SMOOTHING;
    this.last = { x, y, now };
  }

  levelAt(now) {
    if (!this.last) return 0;
    const still = Math.max(0, now - this.last.now);
    return Math.min(1, this.speed / FULL_SPEED) * Math.exp(-still / FADE_MS);
  }
}
