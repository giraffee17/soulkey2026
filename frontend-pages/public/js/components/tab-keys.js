// Arrow key movement for a row of tabs (ARIA tabs pattern, Week 1 and Week 4).
// Pure function, so it is easy to test: which tab gets focus after a key press,
// or null when the key does not move focus. Left and Right wrap around the ends.
export function nextTabIndex(key, index, count) {
  if (count < 1 || index < 0 || index >= count) return null;
  switch (key) {
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
