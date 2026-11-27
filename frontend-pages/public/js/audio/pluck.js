// A plucked open string, made with the Karplus-Strong method: a short burst of noise
// goes round a delay one string period long, and each pass averages neighbouring samples,
// so the bright attack mellows and fades like a real plucked string.
// This is a synthesized stand-in until recorded string sounds arrive from R2 (PLAN.md week 2).

export const PLUCK_SECONDS = 2.5;
const LOSS = 0.996;
const PEAK = 0.6;
const FADE_SECONDS = 0.05;

// Returns the samples and the playback rate that tunes them to the exact pitch
// (the delay must be a whole number of samples, so its pitch is slightly off until corrected).
export function pluckSamples(frequencyHz, sampleRate, { seconds = PLUCK_SECONDS, random = Math.random } = {}) {
  // Averaging two neighbours adds half a sample of delay, so the loop really lasts period + 0.5.
  const exactPeriod = sampleRate / frequencyHz;
  const period = Math.max(2, Math.round(exactPeriod - 0.5));
  const samples = new Float32Array(Math.round(sampleRate * seconds));

  // A softened noise burst: a finger, not a pick.
  let soft = 0;
  for (let i = 0; i < Math.min(period, samples.length); i += 1) {
    soft = (soft + (random() * 2 - 1)) / 2;
    samples[i] = soft;
  }
  for (let i = period; i < samples.length; i += 1) {
    const before = i - period - 1 >= 0 ? samples[i - period - 1] : samples[i - period];
    samples[i] = LOSS * 0.5 * (samples[i - period] + before);
  }

  // Even loudness for every string, and a short fade so the end never clicks.
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0 ? PEAK / peak : 0;
  const fadeLength = Math.min(samples.length, Math.round(sampleRate * FADE_SECONDS));
  for (let i = 0; i < samples.length; i += 1) {
    const fromEnd = samples.length - 1 - i;
    samples[i] *= scale * (fromEnd < fadeLength ? fromEnd / fadeLength : 1);
  }

  return { samples, playbackRate: (period + 0.5) / exactPeriod };
}

// One buffer per pitch, made the first time that string is plucked (at most four).
const buffers = new Map();

export function playPluck(frequencyHz, { context, output }) {
  let entry = buffers.get(frequencyHz);
  if (!entry) {
    const { samples, playbackRate } = pluckSamples(frequencyHz, context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.copyToChannel(samples, 0);
    entry = { buffer, playbackRate };
    buffers.set(frequencyHz, entry);
  }
  const source = context.createBufferSource();
  source.buffer = entry.buffer;
  source.playbackRate.value = entry.playbackRate;
  source.connect(output);
  source.addEventListener("ended", () => source.disconnect(), { once: true });
  source.start();
}
