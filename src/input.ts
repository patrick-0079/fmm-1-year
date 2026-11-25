/** Keep browser shortcuts, text selection and assistive controls available. */
export function reservedShortcut(
  event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "isComposing">,
) {
  return event.ctrlKey || event.metaKey || event.altKey || event.isComposing;
}

export function readingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      "input,textarea,select,[contenteditable=true],[data-page-ui],.game-letter-reader,.reader-body,.meadow-star-reader,.star-bottle-page,.inventory-panel,.debug-dock,.mine-rules",
    )
  );
}

export function debugTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(".debug-dock");
}
