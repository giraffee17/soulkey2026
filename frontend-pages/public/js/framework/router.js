// Hash router (Week 5): #/part/bridge selects the bridge, #/ clears it.
// The URL and the store stay in sync in both directions.
import { effect } from "./signal.js";

export function parseHash(hash) {
  const match = /^#\/part\/([a-z-]+)$/.exec(hash);
  return match ? match[1] : null;
}

export function hashFor(partId) {
  return partId ? `#/part/${partId}` : "#/";
}

export function startRouter(store, win = window) {
  const fromUrl = () => store.selectPart(parseHash(win.location.hash));
  fromUrl();
  win.addEventListener("hashchange", fromUrl);

  const stopEffect = effect(() => {
    const next = hashFor(store.selectedPart());
    if (win.location.hash !== next && !(next === "#/" && win.location.hash === "")) {
      win.history.replaceState(null, "", next);
    }
  });

  return () => {
    win.removeEventListener("hashchange", fromUrl);
    stopEffect();
  };
}
