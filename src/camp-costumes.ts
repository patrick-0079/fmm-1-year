import bird from "./assets/meadow-camp-bird.webp?no-inline";
import birdSleeves from "./assets/meadow-camp-bird-sleeves.webp?no-inline";
import butterfly from "./assets/meadow-camp-butterfly.webp?no-inline";
import butterflySleeves from "./assets/meadow-camp-butterfly-sleeves.webp?no-inline";
import jelly from "./assets/meadow-camp-jelly.webp?no-inline";
import jellySleeves from "./assets/meadow-camp-jelly-sleeves.webp?no-inline";
import marshmallow from "./assets/meadow-camp-marshmallow.webp?no-inline";
import marshmallowSleeves from "./assets/meadow-camp-marshmallow-sleeves.webp?no-inline";
import type { CampEncounterId } from "./camp-encounters";
import { loadSceneImage } from "./texture-cache";

const sheets = {
  bird: [bird, birdSleeves], butterfly: [butterfly, butterflySleeves],
  jelly: [jelly, jellySleeves], marshmallow: [marshmallow, marshmallowSleeves],
} satisfies Record<CampEncounterId, [string, string]>;
const loaded = new Map<CampEncounterId, {body: HTMLImageElement; sleeves: HTMLImageElement}>();

export interface CampAvatarPose {
  id: CampEncounterId;
  frame: number;
  drawHeld?: (c: CanvasRenderingContext2D) => void;
}

export function prepareCampCostumes() {
  return Promise.all((Object.keys(sheets) as CampEncounterId[]).map(async id => {
    const [body, sleeves] = await Promise.all(sheets[id].map(url => loadSceneImage(url)));
    loaded.set(id, {body, sleeves});
  }));
}

export function campCostume(pose: CampAvatarPose, outfit: number) {
  const sheet = loaded.get(pose.id);
  if (!sheet) return;
  return {
    body: sheet.body, x: pose.frame * 144, y: outfit * 152, w: 144, h: 152,
    drawSleeves(c: CanvasRenderingContext2D) {
      c.drawImage(sheet.sleeves, pose.frame * 144, outfit * 72, 144, 72, -18, -22, 36, 18);
    },
  };
}
