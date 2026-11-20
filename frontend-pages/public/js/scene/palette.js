// Reads the scene colors from the CSS tokens, so colors live in one place (tokens.css).
const KEYS = ["wood", "maple", "ebony", "metal", "string", "hair", "ivory", "highlight"];

export function readPalette(element = document.documentElement) {
  const style = getComputedStyle(element);
  return Object.fromEntries(KEYS.map((key) => [key, style.getPropertyValue(`--scene-${key}`).trim()]));
}
