import roomUrl from "../src/assets/room-interactive.webp";
import dewUrl from "../src/assets/morning-dew-flower.webp";
import { drawRoomWindow } from "../src/window-sky";
import { drawArcadeStall } from "../src/arcade-stall";
import { ARCADES } from "../src/town-data";
import type { GameId } from "../src/arcade-engines";
import { sceneArtReady, drawKeepsake } from "../src/scene-art";
const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
const [room, dew] = await Promise.all([load(roomUrl), load(dewUrl), sceneArtReady]);
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
section.innerHTML = `<h2>晨露花 · 七座周年摊位</h2><canvas width="1750" height="360" style="width:1200px;max-width:100%"></canvas>`;
document.querySelector("#checks")!.append(section);
const c = section.querySelector("canvas")!.getContext("2d")!;
c.fillStyle = "#d9e8cb";
c.fillRect(0, 0, 1750, 360);
c.scale(2.5, 2.5);
c.imageSmoothingEnabled = false;
c.drawImage(dew, 10, 58, 40, 50);
Object.entries(ARCADES).forEach(([id, g], i) =>
  drawArcadeStall(c, { ...g, x: 95 + i * 90, y: 110 }, id as GameId),
);
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
