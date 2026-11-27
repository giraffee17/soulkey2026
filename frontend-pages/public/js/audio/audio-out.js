// One shared AudioContext for every sound. It is made on the first pluck or bow,
// because browsers only allow sound after the visitor has clicked, tapped or pressed a key.
// Every voice plays into `output`. The concert hall echo (the echo Worker, PLAN.md week 2)
// will sit between `output` and the speakers, so every sound gets it without other changes.
const OUTPUT_GAIN = 0.8;

let shared = null;

export function audioOut(Context = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  if (!shared) {
    const context = new Context();
    const output = context.createGain();
    output.gain.value = OUTPUT_GAIN;
    output.connect(context.destination);
    shared = { context, output };
  }
  if (shared.context.state === "suspended") shared.context.resume();
  return shared;
}
