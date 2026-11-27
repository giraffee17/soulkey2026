// Play mode keys (PLAN.md, Interaction rules): 1 to 4 pluck the open strings in order,
// holding Shift with the number bows that string instead.
// Uses the key's place on the keyboard (event.code), because Shift + 1 types "!" on most layouts.
const NUMBER_KEY = /^(?:Digit|Numpad)([1-9])$/;

export function playKeyAction(event, stringCount) {
  const match = NUMBER_KEY.exec(event.code ?? "");
  if (!match || event.ctrlKey || event.metaKey || event.altKey) return null;
  const index = Number(match[1]) - 1;
  if (index >= stringCount) return null;
  return { index, bow: Boolean(event.shiftKey) };
}

// Keys typed into a text field are text, not notes.
export function isTypingTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
}
