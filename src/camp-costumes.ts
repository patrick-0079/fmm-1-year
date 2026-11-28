import expressionsUrl from "./assets/meadow-camp-expressions.webp?no-inline";
import type { CampEncounterId } from "./camp-encounters";
import { campExpressionCel, campExpressionRect } from "./camp-expression-cels";
import { artScale, cellHeight, cellWidth } from "./costume-frames";
import { loadSceneImage } from "./texture-cache";

export interface CampAvatarPose {
  id: CampEncounterId;
  frame: number;
}

let expressions: HTMLImageElement | undefined;
export async function prepareCampCostumes() {
  expressions = await loadSceneImage(expressionsUrl);
}

export function drawCampExpression(c: CanvasRenderingContext2D, pose: CampAvatarPose, outfit: number) {
  const cel = campExpressionCel(pose.id, pose.frame);
  if (cel < 0 || !expressions?.naturalWidth) return;
  const {x, y, width, height} = campExpressionRect;
  c.drawImage(expressions, cel * width, outfit * height, width, height,
    (x - cellWidth / 2) / artScale, (y - cellHeight) / artScale, width / artScale, height / artScale);
}
