import type { Point } from "../src/core";
import type { World } from "../src/world";

/** DOM overlays are outside the map's own hit testing. Check the rendered tap surface too. */
export function checkTapSurface(world: World, id: string, point: Point) {
  world.canvas.scrollIntoView({ block: "center", behavior: "instant" });
  const frame = world.canvas.getBoundingClientRect();
  const projected = world.project(point);
  const hit = document.elementFromPoint(frame.left + projected.x * frame.width / 600,
    frame.top + projected.y * frame.height / 400);
  if (hit === world.canvas || (hit?.closest(".interaction-prompt") && world.activeCueId === id)) return;
  throw Error(`${id} 的地图点击位置被 ${hit?.className || hit?.tagName || "视口边缘"} 遮挡`);
}
