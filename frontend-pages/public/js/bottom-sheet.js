// The info panel becomes a bottom sheet on narrow screens (layout.css). While the sheet
// is closed its content sits off screen, so it is made inert: Tab and screen readers skip
// it until the sheet opens. Escape closes the sheet and puts focus back on its handle.
// Keep SHEET_QUERY in step with the max-width media queries in layout.css and components.css.
export const SHEET_QUERY = "(max-width: 760px)";

// Content is hidden only when the panel is a sheet and the sheet is closed.
export const contentIsInert = ({ isSheet, open }) => isSheet && !open;

export function createBottomSheet({ sheet, handle, content, media, labels }) {
  const life = new AbortController();
  const { signal } = life;
  let open = sheet.dataset.open === "true";
  let text = labels;

  const sync = () => {
    sheet.dataset.open = String(open);
    handle.setAttribute("aria-expanded", String(open));
    handle.textContent = open ? text.close : text.open;
    const inert = contentIsInert({ isSheet: media.matches, open });
    content.forEach((element) => { element.inert = inert; });
  };

  const setOpen = (next) => {
    open = Boolean(next);
    sync();
  };

  handle.addEventListener("click", () => setOpen(!open), { signal });
  sheet.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open || !media.matches) return;
    event.preventDefault();
    setOpen(false);
    handle.focus();
  }, { signal });
  // Turning a phone or resizing the window can switch between sheet and side panel.
  media.addEventListener("change", sync, { signal });
  sync();

  return {
    setOpen,
    isOpen: () => open,
    setLabels(next) {
      text = next;
      sync();
    },
    dispose: () => life.abort(),
  };
}
