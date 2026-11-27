import { test } from "node:test";
import assert from "node:assert/strict";
import { pluckSamples } from "../frontend-pages/public/js/audio/pluck.js";
import { bowGain, BOW_MAX_GAIN } from "../frontend-pages/public/js/audio/bow.js";
import { createStringPlayer } from "../frontend-pages/public/js/audio/string-player.js";

// A repeatable "random" so the tests never change.
function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

const rms = (samples, from, to) => Math.sqrt(samples.slice(from, to).reduce((sum, v) => sum + v * v, 0) / (to - from));

test("a pluck lasts the planned time, stays within its peak and fades away", () => {
  const rate = 48000;
  const { samples } = pluckSamples(196, rate, { random: seeded() });
  assert.equal(samples.length, rate * 2.5);
  assert.ok(samples.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0) <= 0.6 + 1e-6);
  assert.ok(rms(samples, rate * 2, rate * 2.4) < rms(samples, 0, rate * 0.2) * 0.5);
  assert.equal(samples[samples.length - 1], 0); // no click at the end
});

test("the playback rate tunes each pluck to its exact pitch", () => {
  for (const hz of [196, 293.66, 440, 659.26]) {
    for (const rate of [44100, 48000]) {
      const { playbackRate } = pluckSamples(hz, rate, { seconds: 0.05, random: seeded() });
      const period = Math.round(rate / hz - 0.5);
      const sounding = (rate / (period + 0.5)) * playbackRate;
      assert.ok(Math.abs(sounding - hz) < 1e-9, `${hz} Hz at ${rate}`);
      assert.ok(Math.abs(playbackRate - 1) < 0.01); // a tiny correction, never a different note
    }
  }
});

test("bow loudness grows with the bow level and stays within its limit", () => {
  assert.equal(bowGain(0), 0);
  assert.equal(bowGain(1), BOW_MAX_GAIN);
  assert.equal(bowGain(5), BOW_MAX_GAIN);
  assert.equal(bowGain(-1), 0);
  assert.ok(bowGain(0.25) > 0 && bowGain(0.25) < bowGain(0.5));
});

test("the player keeps one bow voice per string and lets it go at level 0", () => {
  const made = [];
  const plucked = [];
  const player = createStringPlayer({
    out: () => "output",
    pluck: (hz, out) => plucked.push([hz, out]),
    createVoice: (out, hz) => {
      const voice = { hz, levels: [], stopped: false, setLevel: (level) => voice.levels.push(level), stop: () => { voice.stopped = true; } };
      made.push(voice);
      return voice;
    },
  });

  player.pluck(440);
  assert.deepEqual(plucked, [[440, "output"]]);

  player.bow("string-d", 293.66, 0.5);
  player.bow("string-d", 293.66, 0.8);
  assert.equal(made.length, 1);
  assert.deepEqual(made[0].levels, [0.5, 0.8]);

  player.bow("string-d", 293.66, 0);
  assert.equal(made[0].stopped, true);
  player.bow("string-d", 293.66, 0); // letting go twice is harmless

  player.bow("string-g", 196, 0.3);
  player.bow("string-e", 659.26, 0.3);
  player.stopAll();
  assert.ok(made.slice(1).every((voice) => voice.stopped));
});
