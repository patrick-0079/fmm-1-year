import url from "./assets/town-interiors/keepsakes.webp";
import frames from "./town-keepsake-frames.json";
import type { TownInteriorKey } from "./town-interior-id";

type Ink = CanvasRenderingContext2D;
let sheet: HTMLImageElement | undefined;
let loading: Promise<boolean> | undefined;
export const townKeepsakeArtReady = () => !!sheet;

export function prepareTownKeepsakeArt() {
  if (!loading) {
    const image = new Image();
    image.src = url;
    loading = image.decode().then(() => { sheet = image; return true; }).catch(() => { loading = undefined; return false; });
  }
  return loading;
}

function frame(key: TownInteriorKey, choice?: string) {
  if (key === "florist" && choice === "cream") return frames["florist-cream"];
  if (key === "post" && choice === "lamps") return frames["post-lamps"];
  if (key === "radio" && choice === "bells") return frames["radio-bells"];
  return frames[key];
}

// The source frames are the finished workbench pieces at three pixels per unit.
export function drawFinishedKeepsake(c: Ink, room: TownInteriorKey, choice: string | undefined, x: number, y: number, scale = 1) {
  if (!sheet) return;
  const [sx, sy, w, h, dx, dy] = frame(room, choice);
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
  const source = frame(room, choice);
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

export function drawShelfKeepsake(c: Ink, room: TownInteriorKey, choice: string | undefined, [x, y, w, h]: readonly number[]) {
  const [, , sw, sh, dx, dy] = frame(room, choice);
  const scale = Math.min((w - 6) * 3 / sw, (h - 3) * 3 / sh);
  drawFinishedKeepsake(c, room, choice, x + w / 2 - scale * (dx + sw / 6), y + h - 1.2 - scale * (dy + sh / 3), scale);
}
