import "./quiet-star-effect.css";

const ns = "http://www.w3.org/2000/svg";
const colors = ["#ffe7ac", "#cce4d6", "#efd0d8"];
const points = [[18, 64], [48, 90], [96, 101], [148, 94], [194, 73], [222, 38]];

/** A finite, decorative flourish. Its host owns its lifetime and input. */
export function showQuietStarEffect(host: HTMLElement, id: string, variant: "name" | "bottle") {
  clearQuietStarEffect(host);
  const effect = document.createElementNS(ns, "svg");
  effect.classList.add("quiet-star-effect");
  effect.dataset.variant = variant;
  effect.setAttribute("viewBox", "0 0 240 120");
  effect.setAttribute("aria-hidden", "true");
  effect.setAttribute("focusable", "false");
  // Stable colors when a player revisits a star, without touching saved progress.
  const tint = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  const trail = document.createElementNS(ns, "path");
  trail.classList.add("quiet-star-trail");
  trail.setAttribute("d", "M18 64 Q43 104 96 101 Q181 99 222 38");
  trail.setAttribute("pathLength", "1");
  trail.setAttribute("stroke", colors[tint]);
  effect.append(trail);
  for (const [index, [x, y]] of points.entries()) {
    const star = document.createElementNS(ns, "g");
    star.setAttribute("transform", `translate(${x} ${y})`);
    const light = document.createElementNS(ns, "path");
    light.classList.add("quiet-star-glint");
    light.setAttribute("d", "M-1-6H1V-2H3V-1H6V1H3V2H1V6H-1V2H-3V1H-6V-1H-3V-2H-1Z");
    light.setAttribute("fill", colors[(tint + index) % colors.length]);
    light.style.setProperty("--glint-delay", `${index * .16}s`);
    star.append(light);
    effect.append(star);
  }
  host.append(effect);
}

export function clearQuietStarEffect(host: HTMLElement) {
  host.querySelectorAll(".quiet-star-effect").forEach(effect => effect.remove());
}
