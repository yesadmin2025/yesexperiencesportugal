/** Ref callback: brings a just-mounted success message into view and moves focus to it. */
export function revealSuccess(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView?.({ block: "center", behavior: "auto" });
    el.focus({ preventScroll: true });
  });
}
