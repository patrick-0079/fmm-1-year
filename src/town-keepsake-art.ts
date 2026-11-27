import url from "./assets/town-interiors/keepsakes.webp";
import shelfUrl from "./assets/shelf-keepsakes.webp?no-inline";
import { loadSceneImage, sceneImage } from "./texture-cache";
import frames from "./town-keepsake-frames.json";
import type { TownInteriorKey } from "./town-interior-id";

type Ink = CanvasRenderingContext2D;
let sheet: HTMLImageElement | undefined;
let loading: Promise<boolean> | undefined;
export const townKeepsakeArtReady = () => !!sheet;

export function prepareTownKeepsakeArt() {
  if (!loading) {
    loading = loadSceneImage(url).then(image => { sheet = image; return true; }).catch(() => { loading = undefined; return false; });
  }
  return loading;
}

function frameKey(key: TownInteriorKey, choice?: string): keyof typeof frames {
  if (key === "florist" && choice === "cream") return "florist-cream";
  if (key === "post" && choice === "lamps") return "post-lamps";
  if (key === "radio" && choice === "bells") return "radio-bells";
  return key;
}

// The source frames are the finished workbench pieces at three pixels per unit.
export function drawFinishedKeepsake(c: Ink, room: TownInteriorKey, choice: string | undefined, x: number, y: number, scale = 1) {
  if (!sheet) return;
  const [sx, sy, w, h, dx, dy] = frames[frameKey(room, choice)];
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(sheet, sx, sy, w, h, x + dx * scale, y + dy * scale, w * scale / 3, h * scale / 3);
  c.restore();
}

const receiptWidths = { florist: 112, baker: 117, maker: 106, post: 145, books: 198, radio: 139, hall: 158 };
const icons = new Map<readonly number[], HTMLCanvasElement>();
export function drawTownKeepsake(c: Ink, room: TownInteriorKey, choice?: string, x = 0, y = 0, size = 48) {
  if (!sheet) return;
  const source = frames[frameKey(room, choice)];
  let icon = icons.get(source);
  if (!icon) {
    icon = document.createElement("canvas");
    icon.width = 48; icon.height = 52;
    drawFinishedKeepsake(icon.getContext("2d", { willReadFrequently: true })!, room, choice, 24, 26, 44 / receiptWidths[room]);
    icons.set(source, icon);
  }
  c.save();
  c.imageSmoothingEnabled = true;
  c.drawImage(icon, x, y, size, size * 52 / 48);
  c.restore();
}

const shelf = sceneImage(shelfUrl);
export const prepareShelfKeepsakes = () => loadSceneImage(shelfUrl);
// Source positions and sizes in the 2× miniature shelf atlas.
const shelfFrames: Partial<Record<keyof typeof frames, [x: number, w: number]>> = {
  florist: [0, 24], "florist-cream": [28, 24], hall: [56, 74],
  post: [134, 58], "post-lamps": [196, 58], books: [258, 104],
};

export function drawShelfKeepsake(c: Ink, room: TownInteriorKey, choice: string | undefined, [x, y, w, h]: readonly number[]) {
  const key = frameKey(room, choice);
  const [, , sw, sh, dx, dy] = frames[key];
  const scale = Math.min((w - 6) * 3 / sw, (h - 3) * 3 / sh);
  const small = shelfFrames[key];
  if (small && shelf.naturalWidth) {
    const width = sw * scale / 3, height = sh * scale / 3;
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(shelf, small[0], 0, small[1], 40, x + (w - width) / 2, y + h - 1.2 - height, width, height);
    c.restore();
    return;
  }
  drawFinishedKeepsake(c, room, choice, x + w / 2 - scale * (dx + sw / 6), y + h - 1.2 - scale * (dy + sh / 3), scale);
}
