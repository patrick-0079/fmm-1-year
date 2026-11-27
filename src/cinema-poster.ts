import cakeUrl from "./assets/anniversary-cake.webp";
import fufuUrl from "./assets/fufu-garments.webp";
import { gardenScreen } from "./cinema-config";
import { costumeFrame } from "./costume-frames";
import { sceneImage } from "./texture-cache";

const fufu = sceneImage(fufuUrl), cake = sceneImage(cakeUrl);
let poster: HTMLCanvasElement | undefined;
for (const image of [fufu, cake])
  image.addEventListener("load", () => { poster = undefined; }, { once: true });

/** A printed poster at four times the map resolution, still crisp in the tilted TV. */
export function anniversaryPoster() {
  if (poster) return poster;
  const { w, h } = gardenScreen;
  const canvas = document.createElement("canvas");
  canvas.width = w * 4;
  canvas.height = h * 4;
  const c = canvas.getContext("2d")!;
  c.scale(4, 4);

  const paper = c.createLinearGradient(0, h, w, 0);
  paper.addColorStop(0, "#f9bcca");
  paper.addColorStop(.55, "#ffded2");
  paper.addColorStop(1, "#fff0d5");
  c.fillStyle = paper;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff0da";
  c.beginPath();
  c.ellipse(19, 23, 17, 19, -.18, 0, Math.PI * 2);
  c.fill();

  // Two rows of gingham make a little tablecloth for the cake.
  c.fillStyle = "#ef9dae";
  c.fillRect(0, 40, w, 7);
  c.fillStyle = "#ffdcdc";
  for (let x = 0; x < w; x += 8) {
    c.fillRect(x, 40, 4, 3.5);
    c.fillRect(x + 4, 43.5, 4, 3.5);
  }
  if (fufu.naturalWidth) {
    const front = costumeFrame(0, 0);
    c.drawImage(fufu, front.x, front.y, front.w, front.h, -1, -1, 34.2, 43.7);
  }
  if (cake.naturalWidth) c.drawImage(cake, 18, 23, 27, 25);

  c.fillStyle = "#b84c70";
  c.textAlign = "center";
  c.font = 'bold 10px "Microsoft YaHei", "PingFang SC", sans-serif';
  c.fillText("芙芙", 71.5, 16.5);
  c.fillStyle = "#73314d";
  c.font = 'bold 11.5px "Microsoft YaHei", "PingFang SC", sans-serif';
  c.fillText("一周年快乐", 71.5, 32);
  c.fillStyle = "#c88047";
  for (const [x, y] of [[52, 11.5], [90, 11.5], [36, 7]]) {
    c.beginPath();
    c.moveTo(x, y - 2.8);
    c.lineTo(x + .7, y - .65);
    c.lineTo(x + 2.4, y);
    c.lineTo(x + .7, y + .65);
    c.lineTo(x, y + 2.8);
    c.lineTo(x - .7, y + .65);
    c.lineTo(x - 2.4, y);
    c.lineTo(x - .7, y - .65);
    c.fill();
  }
  poster = canvas;
  return poster;
}
