// Makes a string shiver when it sounds: a tiny side-to-side offset that flips every frame,
// fading after a pluck and holding while it is bowed. Only the string's position changes
// (a transform); nothing is created per frame. Turned off with reduced motion.
const PLUCK_WIDTH = 0.09;
const BOW_WIDTH = 0.06;
const PLUCK_FADE_MS = 450;
const STILL = 0.003;

export class StringVibration {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.strings = new Map();
    this.flip = 1;
  }

  entry(id, object) {
    let entry = this.strings.get(id);
    if (!entry) {
      entry = { object, restX: object.position.x, pluckedAt: -Infinity, bowLevel: 0 };
      this.strings.set(id, entry);
    }
    return entry;
  }

  pluck(id, object, now) {
    if (this.enabled && object) this.entry(id, object).pluckedAt = now;
  }

  bow(id, object, level) {
    if (this.enabled && object) this.entry(id, object).bowLevel = Math.max(0, level);
  }

  // Moves the strings for this frame. Returns true while any string still moves.
  step(now) {
    this.flip = -this.flip;
    this.strings.forEach((entry, id) => {
      const plucked = PLUCK_WIDTH * Math.exp(-(now - entry.pluckedAt) / PLUCK_FADE_MS);
      const width = Math.max(plucked, BOW_WIDTH * entry.bowLevel);
      if (width < STILL) {
        entry.object.position.x = entry.restX;
        this.strings.delete(id);
        return;
      }
      entry.object.position.x = entry.restX + this.flip * width;
    });
    return this.strings.size > 0;
  }

  // Puts every string back where it was (when leaving Play or changing the model).
  reset() {
    this.strings.forEach((entry) => { entry.object.position.x = entry.restX; });
    this.strings.clear();
  }
}
