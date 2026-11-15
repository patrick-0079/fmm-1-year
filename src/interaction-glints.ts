import type { Hotspot, SceneId } from "./maps.ts";
import { resolveCue, type InteractionCueKind } from "./interaction-cues.ts";

export interface InteractionGlint {
  id: string;
  x: number;
  y: number;
  opacity: number;
  color: string;
  bubble: boolean;
  active: boolean;
}
function phaseOf(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) / 0x100000000 * 7.5;
}
const palette: Record<InteractionCueKind, string> = {
  talk: "#fff4dc", pet: "#fff4dc", collect: "#ffedbd", read: "#ffedc8", rest: "#d8eee1",
  celebrate: "#f9d9e2", game: "#cfe9e7", exit: "#d8eee7", mechanism: "#e7dbba",
};

/** Caller supplies only available, visible objects. Natural lights are untouched. */
export function sampleInteractionGlints(
  spots: readonly Hotspot[], scene: SceneId, time: number, reducedMotion: boolean, activeId: string,
): InteractionGlint[] {
  const glints: InteractionGlint[] = [];
  for (const spot of spots) {
    const cue = resolveCue(spot, scene), active = spot.id === activeId;
    if (cue.natural || cue.kind === "exit") continue;
    const bubble = cue.kind === "talk" || cue.kind === "pet";
    if (bubble && !active) continue;
    const phase = (time + phaseOf(scene + "/" + spot.id)) % 7.5;
    const pulse = phase < 1.2 ? Math.sin(phase / 1.2 * Math.PI) : 0;
    const opacity = bubble ? .96 : active ? .78 : reducedMotion ? .32 : pulse * .48;
    if (opacity < .035) continue;
    glints.push({ id: spot.id, x: spot.x + cue.anchor.x, y: spot.y + cue.anchor.y,
      opacity, color: palette[cue.kind], bubble, active });
  }
  // A selected object always keeps its detail. The rest are ranked by their
  // staggered shimmer, not hotspot array order, so the map never flashes at once.
  return glints.sort((a, b) => Number(b.active) - Number(a.active) || b.opacity - a.opacity).slice(0, 4);
}

function sparkle(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = "#765d4a";
  c.globalAlpha *= .26; c.fillRect(x - size, y + 1, size * 2 + 1, 1); c.fillRect(x, y - size + 1, 1, size * 2 + 1);
  c.globalAlpha /= .26;
  c.fillStyle = color;
  c.fillRect(x - size, y, size * 2 + 1, 1); c.fillRect(x, y - size, 1, size * 2 + 1);
  c.fillStyle = "#fffdf1"; c.fillRect(x, y, 1, 1);
}

export function drawInteractionGlints(
  c: CanvasRenderingContext2D, spots: readonly Hotspot[], scene: SceneId,
  time: number, reducedMotion: boolean, activeId: string,
) {
  // Do not let off-screen objects consume the four-object visual budget.
  const matrix = c.getTransform();
  const visible = spots.filter(spot => {
    const anchor = resolveCue(spot, scene).anchor, x = spot.x + anchor.x, y = spot.y + anchor.y;
    const px = matrix.a * x + matrix.c * y + matrix.e, py = matrix.b * x + matrix.d * y + matrix.f;
    return px > -18 && px < c.canvas.width + 18 && py > -18 && py < c.canvas.height + 18;
  });
  for (const glint of sampleInteractionGlints(visible, scene, time, reducedMotion, activeId)) {
    c.save();
    c.globalAlpha *= glint.opacity;
    if (glint.bubble) {
      const x = Math.round(glint.x), y = Math.round(glint.y);
      c.fillStyle = "#806752";
      c.fillRect(x - 5, y - 4, 10, 7); c.fillRect(x - 6, y - 3, 12, 5);
      c.fillRect(x - 3, y + 3, 3, 2);
      c.fillStyle = "#fff5df";
      c.fillRect(x - 4, y - 3, 8, 5); c.fillRect(x - 5, y - 2, 10, 3);
      c.fillRect(x - 2, y + 2, 2, 1);
      c.fillStyle = "#ad837e";
      for (const dx of [-2.5, 0, 2.5]) c.fillRect(x + dx - .5, y - 1, 1, 1);
    } else {
      sparkle(c, glint.x, glint.y, glint.active ? 2 : 1, glint.color);
      c.globalAlpha *= .5;
      sparkle(c, glint.x + 5, glint.y + 3, 0, glint.color);
    }
    c.restore();
  }
}
