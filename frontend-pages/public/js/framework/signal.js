// Tiny signals, as built in the Week 5 lecture.
// A signal holds a value and re-runs only the effects that read it.

let currentEffect = null;

export function createSignal(initial) {
  let value = initial;
  const subscribers = new Set();

  const read = () => {
    if (currentEffect) {
      subscribers.add(currentEffect);
      currentEffect.sources.add(subscribers);
    }
    return value;
  };

  const write = (next) => {
    if (Object.is(next, value)) return;
    value = next;
    [...subscribers].forEach((run) => run());
  };

  return [read, write];
}

// Runs fn now and again whenever a signal it read changes.
// Returns a dispose function that stops it (call it in disconnectedCallback).
export function effect(fn) {
  const run = () => {
    run.sources.forEach((subscribers) => subscribers.delete(run));
    run.sources.clear();
    const previous = currentEffect;
    currentEffect = run;
    try {
      fn();
    } finally {
      currentEffect = previous;
    }
  };
  run.sources = new Set();
  run();
  return () => {
    run.sources.forEach((subscribers) => subscribers.delete(run));
    run.sources.clear();
  };
}
