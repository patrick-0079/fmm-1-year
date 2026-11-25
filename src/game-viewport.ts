/** Keep the map and its normal controls in view when the player enters or returns to it. */
export function revealGame(canvas: HTMLCanvasElement) {
  const viewport = canvas.closest<HTMLElement>(".game-viewport");
  if (!viewport || document.fullscreenElement) return;
  const visible = window.visualViewport;
  if (visible && visible.scale !== 1) return;
  const style = getComputedStyle(viewport);
  const insetTop = parseFloat(style.scrollMarginTop);
  const top = (visible?.offsetTop ?? 0) + insetTop;
  const height = (visible?.height ?? document.documentElement.clientHeight) - insetTop - parseFloat(style.scrollMarginBottom);
  const panel = viewport.getBoundingClientRect();
  let bottom = panel.bottom;
  if (panel.height > height) {
    // On short displays the status notes may extend below the play controls.
    const map = canvas.getBoundingClientRect();
    bottom = Math.max(map.bottom, ...Array.from(
      viewport.querySelectorAll<HTMLElement>(".scene-nav, .touch-controls"),
      element => element.getBoundingClientRect().bottom,
    ));
    if (bottom - panel.top > height) bottom = map.bottom;
  }
  const shift = panel.top < top ? panel.top - top : Math.max(0, bottom - (top + height));
  if (Math.abs(shift) >= 1) window.scrollBy({ top: shift, behavior: "instant" });
}

export function fitGameViewport(game: HTMLElement) {
  const canvas = game.querySelector<HTMLCanvasElement>("#world")!;
  const bar = game.querySelector<HTMLElement>(".window-bar")!;
  const nav = game.querySelector<HTMLElement>(".scene-nav")!;
  const touch = game.querySelector<HTMLElement>(".touch-controls")!;
  function measure() {
    game.style.setProperty("--bar-height", bar.offsetHeight + "px");
    if (getComputedStyle(game).getPropertyValue("--side-controls").trim() === "1") return;
    game.style.setProperty("--nav-height", nav.offsetHeight + "px");
    // The arcade and cinema temporarily hide the D-pad. Keep the map scale stable.
    if (touch.offsetHeight) game.style.setProperty("--dpad-height", touch.offsetHeight + "px");
  }
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  });
  for (const row of [bar, nav, touch]) observer.observe(row);
  measure();

  let scrollFrame = 0, settleTimer = 0;
  function cancelAlignment() {
    cancelAnimationFrame(scrollFrame);
    window.clearTimeout(settleTimer);
  }
  function alignToolbar() {
    const visible = window.visualViewport;
    if ((visible && visible.scale !== 1) || document.fullscreenElement || document.querySelector("dialog[open]")) return;
    const map = canvas.getBoundingClientRect();
    if (map.bottom <= 0 || map.top >= innerHeight) return;
    const margin = parseFloat(getComputedStyle(bar.parentElement!).scrollMarginTop);
    const top = bar.getBoundingClientRect().top - (visible?.offsetTop ?? 0) - margin;
    if (Math.abs(top) >= 1) window.scrollBy({ top, behavior: "instant" });
  }
  function resized() {
    cancelAlignment();
    if (!game.querySelector(".intro-screen.dismissed") || (document.activeElement !== document.body && !game.contains(document.activeElement))) return;
    // Mobile rotation can finish reflowing the page header after the resize event.
    scrollFrame = requestAnimationFrame(alignToolbar);
    settleTimer = window.setTimeout(alignToolbar, 180);
  }
  for (const event of ["pointerdown", "wheel", "keydown"]) window.addEventListener(event, cancelAlignment, { passive: true });
  window.addEventListener("resize", resized);
  window.visualViewport?.addEventListener("resize", resized);
}
