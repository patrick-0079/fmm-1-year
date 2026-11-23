/** The browser flows the original paragraphs into adjacent sheets, keeping
 * Chinese line breaking and emoji intact at the player's actual font size. */
export function mountMailPages(sheet: HTMLElement) {
  const viewport = sheet.querySelector<HTMLElement>(".memory-detail")!;
  const text = viewport.querySelector<HTMLElement>(".letter-text")!;
  viewport.setAttribute("aria-label", "信件正文，可用左右键翻页");
  const navigation = document.createElement("nav");
  navigation.className = "mail-leaves";
  navigation.setAttribute("aria-label", "信纸翻页");
  navigation.innerHTML = `<button type="button" class="mail-page-prev" title="上一页 · ←">上一页</button>
    <span class="mail-page-count" aria-live="polite" aria-atomic="true"></span>
    <button type="button" class="mail-page-next" title="下一页 · →">下一页</button>`;
  sheet.append(navigation);
  const previous = navigation.querySelector<HTMLButtonElement>(".mail-page-prev")!;
  const next = navigation.querySelector<HTMLButtonElement>(".mail-page-next")!;
  const counter = navigation.querySelector<HTMLElement>(".mail-page-count")!;
  let width = 0, count = 1, index = 0, bookmark = 0;

  // Keep a character on the page through font, orientation and viewport changes.
  // Use the rendered column width here: an opening sheet may still be scaling.
  function pageAtOffset(node: Text, offset: number) {
    const glyph = document.createRange();
    glyph.setStart(node, offset);
    glyph.setEnd(node, offset + 1);
    const bounds = text.getBoundingClientRect();
    const box = glyph.getBoundingClientRect();
    return Math.max(0, Math.min(count - 1, Math.floor((box.left + box.width / 2 - bounds.left) / bounds.width)));
  }

  function firstOffset(page: number) {
    const node = text.firstChild;
    if (!page || !(node instanceof Text)) return 0;
    let low = 0, high = node.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (pageAtOffset(node, mid) < page) low = mid + 1;
      else high = mid;
    }
    return Math.min(low, node.length - 1);
  }

  function show(page: number, remember = true) {
    index = Math.min(count - 1, Math.max(0, page));
    if (remember) bookmark = firstOffset(index);
    text.style.transform = `translateX(${-index * width}px)`;
    navigation.hidden = count <= 1;
    previous.setAttribute("aria-disabled", String(index === 0));
    next.setAttribute("aria-disabled", String(index === count - 1));
    const label = `${index + 1} / ${count}`;
    if (counter.textContent !== label) counter.textContent = label;
    counter.setAttribute("aria-label", `第 ${index + 1} 页，共 ${count} 页`);
  }

  function measure() {
    if (sheet.hidden) return;
    // The sheet scales out of the envelope. Columns use its layout width,
    // independent of the transient on-screen width during that animation.
    width = Number.parseFloat(getComputedStyle(text).width);
    if (!width || !viewport.clientHeight) return;
    count = Math.max(1, Math.ceil((text.scrollWidth - 1) / width));
    // Short notes can expose the whole painted margin. Longer letters use the
    // same paper with a narrower illustrated frame around the writing area.
    let writingRoom = false;
    if (count === 1 && text.lastChild instanceof Text && text.lastChild.length) {
      const last = text.lastChild;
      const end = document.createRange();
      end.setStart(last, last.length - 1);
      end.setEnd(last, last.length);
      const rect = sheet.getBoundingClientRect();
      writingRoom = end.getBoundingClientRect().bottom < rect.top + rect.height * .47;
    }
    sheet.classList.toggle("has-writing-room", writingRoom);
    const node = text.firstChild;
    show(bookmark && node instanceof Text ? pageAtOffset(node, bookmark) : 0, false);
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
      bookmark = 0;
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
