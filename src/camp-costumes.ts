import expressionsUrl from "./assets/meadow-camp-expressions.webp?no-inline";
import headsUrl from "./assets/meadow-camp-heads.webp?no-inline";
import { campExpressionRect, campHeadDrawings, type CampHeadPose } from "./camp-expression-cels";
import { artScale, cellHeight, cellWidth } from "./costume-frames";
import { loadSceneImage } from "./texture-cache";

export interface CampAvatarPose {
  expression: number;
  head?: CampHeadPose;
}

let expressions: HTMLImageElement | undefined;
let headSheet: HTMLImageElement | undefined;
export async function prepareCampCostumes() {
  [expressions, headSheet] = await Promise.all([loadSceneImage(expressionsUrl), loadSceneImage(headsUrl)]);
}

export function campHeadFrame(head: CampHeadPose, row: number) {
  if (head === "neutral" || !headSheet?.naturalWidth) return;
  return {image:headSheet, x:campHeadDrawings.indexOf(head)*cellWidth, y:row*cellHeight};
}

export function drawCampExpression(c: CanvasRenderingContext2D, cel: number, outfit: number, dx: number, dy: number) {
  if (cel < 0 || !expressions?.naturalWidth) return;
  const {x, y, width, height} = campExpressionRect;
  c.drawImage(expressions, cel * width, outfit * height, width, height,
    (x - cellWidth / 2) / artScale + dx, (y - cellHeight) / artScale + dy, width / artScale, height / artScale);
}
