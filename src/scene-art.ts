import stallsUrl from "./assets/anniversary-stalls-v12.webp";
import keepsakesUrl from "./assets/garden-keepsakes-v12.webp";
import skiesUrl from "./assets/window-skies-v12.webp";
import gateUrl from "./assets/country-wicket-v18.webp";
import bassUrl from "./assets/white-bass-v18.webp";
import type { SceneId } from "./maps";
export { stallsUrl, keepsakesUrl, skiesUrl };

export const sceneArt = {stalls:new Image(), keepsakes:new Image(), skies:new Image(), gate:new Image(), bass:new Image()};
type Prop = keyof typeof sceneArt;
const urls: Record<Prop,string> = {stalls:stallsUrl, keepsakes:keepsakesUrl, skies:skiesUrl, gate:gateUrl, bass:bassUrl};
const propsByScene: Record<SceneId,Prop[]> = {
  room:["skies","bass"], garden:["keepsakes","gate"], challenge:["keepsakes"],
  town:["stalls","gate"], meadow:[], ruins:[],
};
const requests = new Map<Prop,Promise<void>>();
export function prepareSceneArt(scene: SceneId) {
  return Promise.all(propsByScene[scene].map(key => {
    const pending=requests.get(key);
    if (pending) return pending;
    const image=sceneArt[key];
    image.fetchPriority="high";
    image.src=urls[key];
    const ready=image.decode().catch(error=>{ requests.delete(key); throw error; });
    requests.set(key,ready);
    return ready;
  }));
}
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
