import "./journal-starlight.css";

// Only the exposed paper accepts a stamp. The game window, cards, controls,
// text and dialogs receive their usual input, including native touch gestures.
const paperSurfaces = [
  "html", "body", "#app", ".page-journal", ".page-journal > main", ".site-header",
  ".page-intro", ".page-intro > div:not(.date-stamp)", ".adventure-layout",
  ".page-memory-section", ".page-memory-cards", ".page-section-heading",
  ".page-section-heading > div", ".page-journal > footer",
].join(", ");

function isPaper(target: EventTarget | null) {
  return target instanceof Element && target.matches(paperSurfaces);
}

const constellations = [
  { name: "west", points: [[8, 48], [29, 33], [49, 40], [67, 17]] },
  { name: "east", points: [[8, 8], [29, 35], [52, 27], [72, 50]] },
  { name: "high", points: [[7, 20], [32, 32], [60, 17]] },
];

function constellationMarkup({ name, points }: typeof constellations[number]) {
  const stars = points.map(([x, y], i) => {
    const mark = i % 2 === 0
      ? '<path d="M0 -4.5 Q.7 -.8 3.8 0 Q.7 .8 0 4.5 Q-.7 .8 -3.8 0 Q-.7 -.8 0 -4.5Z"/>'
      : '<circle r="1.7"/>';
    return `<g transform="translate(${x} ${y})"><g class="journal-star" style="--phase:${-i * 1.7}s">${mark}</g></g>`;
  }).join("");
  return `<svg class="journal-constellation journal-constellation-${name}" viewBox="0 0 80 58" focusable="false">
    <polyline points="${points.map(point => point.join(",")).join(" ")}"/>${stars}</svg>`;
}

// Both rings, the perforation marks and the post-office cancellation are one
// small ink impression, centred on the star rather than the trailing waves.
const postmarkArt = `<svg viewBox="0 0 105 66" focusable="false">
  <g fill="none" stroke="currentColor">
    <circle cx="33" cy="33" r="29" stroke-width="1.5"/>
    <circle cx="33" cy="33" r="23"/>
    <circle cx="33" cy="33" r="26" stroke-dasharray="1 3" stroke-width="1.4"/>
    <path d="M60 24 C68 26 73 21 80 23 S92 27 101 23 M61 30 C69 32 74 27 81 29 S93 33 102 29 M61 36 C69 38 74 33 81 35 S93 39 102 35" stroke-width="1.3"/>
  </g>
  <g fill="currentColor">
    <path d="m33 17 3.5 7.4 8.1 1.2-5.8 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.8-5.7 8.1-1.2Z"/>
    <text x="33" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="6.2" letter-spacing="1.1">12·01</text>
  </g></svg>`;

export function mountJournalStarlight() {
  const app = document.getElementById("app")!;
  const layer = document.createElement("div");
  layer.className = "journal-starlight";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = constellations.map(constellationMarkup).join("");
  const groups = layer.querySelectorAll<SVGSVGElement>(".journal-constellation");
  const marks = document.createElement("div");
  layer.append(marks);
  app.prepend(layer);

  let frame = 0;
  let hover: { x: number; y: number } | null = null;
  let tap: { id: number; x: number; y: number; started: number } | null = null;
  function updateStars() {
    frame = 0;
    for (const group of groups) {
      const bounds = group.getBoundingClientRect();
      const dx = hover ? Math.max(bounds.left - hover.x, hover.x - bounds.right, 0) : Infinity;
      const dy = hover ? Math.max(bounds.top - hover.y, hover.y - bounds.bottom, 0) : Infinity;
      group.classList.toggle("is-lit", dx * dx + dy * dy < 100 * 100);
    }
  }
  function setHover(next: typeof hover) {
    if (!next && !hover) return;
    hover = next;
    if (!frame) frame = requestAnimationFrame(updateStars);
  }
  document.addEventListener("pointerdown", event => {
    tap = event.isPrimary && event.button === 0 && isPaper(event.target)
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, started: event.timeStamp }
      : null;
  }, { passive: true });
  document.addEventListener("pointermove", event => {
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 8) tap = null;
    setHover(event.pointerType === "mouse" && !event.buttons && isPaper(event.target)
      ? { x: event.clientX, y: event.clientY } : null);
  }, { passive: true });
  document.addEventListener("pointerup", event => {
    const start = tap;
    tap = null;
    if (!start || event.pointerId !== start.id || event.button !== 0 || event.timeStamp - start.started > 600 ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
        !isPaper(event.target) || document.getSelection()?.isCollapsed === false) return;
    const mark = document.createElement("span");
    mark.className = "journal-postmark";
    mark.style.left = event.clientX + "px";
    mark.style.top = event.clientY + "px";
    mark.innerHTML = postmarkArt;
    if (marks.childElementCount >= 5) marks.firstElementChild?.remove();
    marks.append(mark);
    window.setTimeout(() => mark.remove(), 1650);
  }, { passive: true });

  function resetPointer() {
    tap = null;
    setHover(null);
  }
  document.addEventListener("pointercancel", resetPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", resetPointer, { passive: true });
  window.addEventListener("blur", resetPointer);
  window.addEventListener("scroll", resetPointer, { passive: true });
  function syncVisibility() {
    layer.hidden = document.hidden;
    if (document.hidden) {
      resetPointer();
      cancelAnimationFrame(frame);
      frame = 0;
      for (const group of groups) group.classList.remove("is-lit");
      marks.replaceChildren();
    }
  }
  document.addEventListener("visibilitychange", syncVisibility);
  syncVisibility();
}
