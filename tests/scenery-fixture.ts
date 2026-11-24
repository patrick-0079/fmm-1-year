import roomUrl from "../src/assets/room-interactive.webp";
import dewUrl from "../src/assets/morning-dew-flower.webp";
import { drawRoomWindow } from "../src/window-sky";
import { townAttractionSpots } from "../src/town-attraction-layout";
import townUrl from "../src/assets/anniversary-town-v13.webp";
import { prepareSceneArt, drawKeepsake } from "../src/scene-art";
const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
const [room, dew, town] = await Promise.all([load(roomUrl), load(dewUrl), load(townUrl),
  prepareSceneArt("room"), prepareSceneArt("garden")]);
for (const phase of ["dawn", "day", "dusk", "night"] as const) {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${phase}</h2><canvas width="600" height="240" style="width:480px;height:192px;max-width:100%"></canvas>`;
  document.querySelector("#checks")!.append(section);
  const c = section.querySelector("canvas")!.getContext("2d")!;
  c.scale(4, 4);
  c.translate(-230, -8);
  c.imageSmoothingEnabled = false;
  c.drawImage(room, 0, 0, 600, 400);
  drawRoomWindow(c, phase, room);
}
const section = document.createElement("section");
section.innerHTML = `<h2>晨露花</h2><canvas width="144" height="144"></canvas>`;
document.querySelector("#checks")!.append(section);
const c = section.querySelector("canvas")!.getContext("2d")!;
c.fillStyle = "#d9e8cb";
c.fillRect(0, 0, 144, 144);
c.scale(2, 2);
c.imageSmoothingEnabled = false;
c.drawImage(dew, 16, 10, 40, 50);
for (const spot of townAttractionSpots) {
  const section = document.createElement("section");
  section.dataset.attraction = spot.id;
  section.innerHTML = `<h2>${spot.title}</h2><canvas width="570" height="420" style="max-width:100%"></canvas>`;
  document.querySelector("#checks")!.append(section);
  const c = section.querySelector("canvas")!.getContext("2d")!;
  c.scale(3, 3);
  const { x, y, w, h } = spot.cue!.objectBox!;
  c.translate(95 - spot.x - x - w / 2, 61 - spot.y - y - h / 2);
  c.imageSmoothingEnabled = false;
  c.drawImage(town, 0, 0);
}
const keepsakes = document.createElement("section");
keepsakes.innerHTML = `<h2>庭院星屑与花环</h2><canvas width="500" height="180" style="max-width:100%"></canvas>`;
document.querySelector("#checks")!.append(keepsakes);
const k = keepsakes.querySelector("canvas")!.getContext("2d")!;
k.fillStyle = "#b6cda4";
k.fillRect(0, 0, 500, 180);
k.scale(4, 4);
k.imageSmoothingEnabled = false;
drawKeepsake(k, "star", 30, 36, 29);
drawKeepsake(k, "wreath", 90, 36, 31);
