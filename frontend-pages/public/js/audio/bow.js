// A bowed open string. A bow pulls the string sideways and lets it snap back over and over,
// which makes a sawtooth-like wave; a gentle low-pass filter takes the buzz off the top.
// Its loudness follows the bow: faster bow, louder note; a still bow fades away.
// This is a synthesized stand-in until recorded string sounds arrive from R2 (PLAN.md week 2).

export const BOW_MAX_GAIN = 0.22;
const RESPONSE_SECONDS = 0.04;
const RELEASE_SECONDS = 0.08;
const STOP_AFTER_SECONDS = 0.5;

// Bow level (0 to 1) to loudness. Softer bows are still audible.
export function bowGain(level) {
  const clamped = Math.min(1, Math.max(0, Number(level) || 0));
  return BOW_MAX_GAIN * Math.sqrt(clamped);
}

export function createBowVoice({ context, output }, frequencyHz) {
  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = frequencyHz;

  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = Math.min(6000, frequencyHz * 9);
  tone.Q.value = 0.7;

  const volume = context.createGain();
  volume.gain.value = 0;

  oscillator.connect(tone).connect(volume).connect(output);
  oscillator.addEventListener("ended", () => volume.disconnect(), { once: true });
  oscillator.start();

  return {
    setLevel(level) {
      volume.gain.setTargetAtTime(bowGain(level), context.currentTime, RESPONSE_SECONDS);
    },
    stop() {
      const now = context.currentTime;
      volume.gain.setTargetAtTime(0, now, RELEASE_SECONDS);
      oscillator.stop(now + STOP_AFTER_SECONDS);
    },
  };
}
