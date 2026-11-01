import roomUrl from "../src/assets/room-interactive.webp";
import dewUrl from "../src/assets/morning-dew-flower.webp";
import { drawRoomWindow } from "../src/window-sky";
import { drawArcadeStall } from "../src/arcade-stall";
import { ARCADES } from "../src/town-data";
import type { GameId } from "../src/arcade-engines";
const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
const [room, dew] = await Promise.all([load(roomUrl), load(dewUrl)]);
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
section.innerHTML = `<h2>晨露花 · 四座周年摊位</h2><canvas width="1080" height="240" style="width:960px;max-width:100%"></canvas>`;
document.querySelector("#checks")!.append(section);
const c = section.querySelector("canvas")!.getContext("2d")!;
c.fillStyle = "#d9e8cb";
c.fillRect(0, 0, 1080, 240);
c.scale(2.5, 2.5);
c.imageSmoothingEnabled = false;
c.drawImage(dew, 10, 22, 40, 50);
Object.entries(ARCADES).forEach(([id, g], i) =>
  drawArcadeStall(c, { ...g, x: 95 + i * 90, y: 75 }, id as GameId),
);
