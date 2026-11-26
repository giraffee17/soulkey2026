// A chosen part's name and info table sit at the top of the panel, above the parts list.
// If the panel was scrolled down to the list when a part is picked, the new info would
// stay out of sight (and on a phone, so would the "Hide parts" handle). So every change
// of selection puts the panel back at its top. It jumps rather than glides: smooth
// scrolling is not transform or opacity motion (Week 3), and a jump needs no reduced
// motion exception.
import { effect } from "./framework/signal.js";

// box: the scrolling panel element. selected: the store's selectedPart signal.
// Returns a dispose function that stops following the selection.
export function keepPanelTopInView({ box, selected }) {
  return effect(() => {
    selected();
    if (box.scrollTop > 0) box.scrollTop = 0;
  });
}
