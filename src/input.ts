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
      "input,textarea,select,[contenteditable=true],.reader-body,.inventory-panel,.inline-help",
    )
  );
}
