/** The browser flows the original paragraphs into adjacent sheets, keeping
 * Chinese line breaking and emoji intact at the player's actual font size. */
export function mountMailPages(sheet: HTMLElement) {
  const viewport = sheet.querySelector<HTMLElement>(".memory-detail")!;
  const text = viewport.querySelector<HTMLElement>(".letter-text")!;
  viewport.setAttribute("aria-label", "信件正文，可用左右键翻页");
  const navigation = document.createElement("nav");
  navigation.className = "mail-leaves";
  navigation.setAttribute("aria-label", "信纸翻页");
  navigation.innerHTML = `<button type="button" class="mail-page-prev" aria-label="上一页" title="上一页 · ←"></button>
    <span class="mail-page-count" aria-live="polite" aria-atomic="true"></span>
    <button type="button" class="mail-page-next" aria-label="下一页" title="下一页 · →"></button>`;
  sheet.append(navigation);
  const previous = navigation.querySelector<HTMLButtonElement>(".mail-page-prev")!;
  const next = navigation.querySelector<HTMLButtonElement>(".mail-page-next")!;
  const counter = navigation.querySelector<HTMLElement>(".mail-page-count")!;
  let width = 0, count = 1, index = 0;

  function show(page: number) {
    index = Math.min(count - 1, Math.max(0, page));
    text.style.transform = `translateX(${-index * width}px)`;
    navigation.hidden = count <= 1;
    previous.setAttribute("aria-disabled", String(index === 0));
    next.setAttribute("aria-disabled", String(index === count - 1));
    counter.textContent = `${index + 1} / ${count}`;
    counter.setAttribute("aria-label", `第 ${index + 1} 页，共 ${count} 页`);
  }

  function measure() {
    if (sheet.hidden) return;
    // The sheet scales out of the envelope. Columns use its layout width,
    // independent of the transient on-screen width during that animation.
    width = Number.parseFloat(getComputedStyle(text).width);
    if (!width || !viewport.clientHeight) return;
    const oldCount = count;
    count = Math.max(1, Math.ceil((text.scrollWidth - 1) / width));
    // Keep the same part of a long letter when the device is rotated.
    const page = oldCount > 1 ? Math.round(index / (oldCount - 1) * (count - 1)) : 0;
    show(page);
  }

  previous.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  function keydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let page: number;
    switch (event.key) {
      case "ArrowLeft": case "ArrowUp": case "PageUp": page = index - 1; break;
      case "ArrowRight": case "ArrowDown": case "PageDown": page = index + 1; break;
      case "Home": page = 0; break;
      case "End": page = count - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    show(page);
  }
  sheet.addEventListener("keydown", keydown);
  const observer = new ResizeObserver(measure);
  observer.observe(viewport);
  document.fonts.addEventListener("loadingdone", measure);
  return {
    open(body: string) {
      index = 0;
      text.textContent = body;
      measure();
    },
    dispose() {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
      sheet.removeEventListener("keydown", keydown);
    },
  };
}
