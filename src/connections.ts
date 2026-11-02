import type { SceneId } from "./maps";
import { sceneArt } from "./scene-art";
import { townGates, gardenGateStones, type TownGate } from "./gate-layout";

export function drawGate(c: CanvasRenderingContext2D, g: TownGate) {
  const image = sceneArt.gate;
  if (!image.complete || !image.naturalWidth) return;
  c.save();
  c.drawImage(image, g.x - g.width / 2, g.y - g.width + 2, g.width, g.width);
  c.fillStyle = "#71503c";
  c.font = `${g.width > 80 ? 7 : 6}px "Microsoft YaHei","PingFang SC",sans-serif`;
  c.textAlign = "center";
  c.fillText(g.title, g.x, g.y - g.width * 0.77, g.width * 0.36);
  c.restore();
}

export function connectionLayers(scene: SceneId) {
  return townGates.filter((g) => g.scene === scene)
    .map((g) => ({ y: g.y + 3, draw: (c: CanvasRenderingContext2D) => drawGate(c, g) }));
}

export function drawConnections(c: CanvasRenderingContext2D, scene: SceneId) {
  if (scene !== "garden") return;
  c.save();
  // No pasted brick rectangle over flowers/fencing: a small stepping-stone trail.
  for (const [i, p] of gardenGateStones.entries()) {
    c.fillStyle = "#6a795330";
    c.beginPath(); c.ellipse(p.x + 1, p.y + 2, 10, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = i % 2 ? "#dcc79f" : "#e6cfaa";
    c.strokeStyle = "#bfa783"; c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(p.x - 10, p.y); c.lineTo(p.x - 6, p.y - 5);
    c.lineTo(p.x + 5, p.y - 5); c.lineTo(p.x + 10, p.y - 1);
    c.lineTo(p.x + 7, p.y + 4); c.lineTo(p.x - 6, p.y + 4);
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = "#f4e1bf";
    c.beginPath(); c.moveTo(p.x - 5, p.y - 3); c.lineTo(p.x + 5, p.y - 3); c.stroke();
  }
  c.restore();
}
