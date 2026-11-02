import stallsUrl from "./assets/anniversary-stalls-v12.webp";
import keepsakesUrl from "./assets/garden-keepsakes-v12.webp";
import skiesUrl from "./assets/window-skies-v12.webp";
import gateUrl from "./assets/town-gate-v13.webp";
export { stallsUrl, keepsakesUrl, skiesUrl, gateUrl };

const load = (src: string) => {
  const image = new Image();
  const ready = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("周年场景素材加载失败，请刷新重试。"));
  });
  image.src = src;
  return { image, ready };
};
const stalls = load(stallsUrl), keepsakes = load(keepsakesUrl), skies = load(skiesUrl), gate = load(gateUrl);
export const sceneArtReady = Promise.all([stalls.ready, keepsakes.ready, skies.ready, gate.ready]);
// The world load screen surfaces failures; keep rejected image promises handled before it subscribes.
void sceneArtReady.catch(() => {});
export const sceneArt = { stalls: stalls.image, keepsakes: keepsakes.image, skies: skies.image, gate: gate.image };
export const stallFrames = [
  { x: 7, y: 190, w: 486, h: 667 },
  { x: 523, y: 190, w: 488, h: 668 },
  { x: 1040, y: 190, w: 489, h: 668 },
];
export const keepsakeFrames = {
  star: { x: 85, y: 175, w: 770, h: 515 },
  wreath: { x: 1040, y: 45, w: 785, h: 765 },
};
export function drawKeepsake(c: CanvasRenderingContext2D, id: keyof typeof keepsakeFrames, x: number, y: number, width: number) {
  const image = sceneArt.keepsakes;
  if (!image.complete || !image.naturalWidth) return;
  const f = keepsakeFrames[id], height = width * f.h / f.w * (id === "wreath" ? 0.6 : 1);
  c.drawImage(image, f.x, f.y, f.w, f.h, x - width / 2, y - height + 4, width, height);
}
