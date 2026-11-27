// Turns pluck and bow requests into sound. One bow voice per string at a time;
// a bow level of 0 lets that string's note fade out.
// The voices and the audio output are passed in, so tests can use fakes.
import { audioOut } from "./audio-out.js";
import { playPluck } from "./pluck.js";
import { createBowVoice } from "./bow.js";

export function createStringPlayer({ out = audioOut, pluck = playPluck, createVoice = createBowVoice } = {}) {
  const bows = new Map();

  return {
    pluck(frequencyHz) {
      pluck(frequencyHz, out());
    },

    bow(partId, frequencyHz, level) {
      let voice = bows.get(partId);
      if (!(level > 0)) {
        voice?.stop();
        bows.delete(partId);
        return;
      }
      if (!voice) {
        voice = createVoice(out(), frequencyHz);
        bows.set(partId, voice);
      }
      voice.setLevel(level);
    },

    stopAll() {
      bows.forEach((voice) => voice.stop());
      bows.clear();
    },
  };
}
