import type { Facing } from "./equipment";
import type { Point } from "./core";
import type { TownResidentId } from "./town-dialogue";
import type { GardenGuest } from "./garden-guests";
import { requestSceneImage } from "./texture-cache";

type Walker = TownResidentId | GardenGuest["id"] | "suyan";
const urls = import.meta.glob<string>("./assets/resident-walk/*.webp", { eager: true, import: "default", query: "?url&no-inline" });
const sheets = new Map<Walker, HTMLImageElement>();

/** Request on first use. A missing or loading sheet leaves the normal standing pose visible. */
export function prepareResidentWalk(id: Walker) {
  const previous = sheets.get(id);
  if (previous?.naturalWidth) return previous;
  const url = urls["./assets/resident-walk/" + id + ".webp"];
  if (!url) return;
  const image = requestSceneImage(url);
  sheets.set(id, image);
  if (image.naturalWidth) return image;
}

export function residentWalkFrame(id: Walker, distance: number) {
  const stride = id === "cat" ? 12 : 16;
  return Math.floor(distance * 4 / stride) % 4;
}

/** Twelve independent cels: front, right profile, back. The left profile faces the other way. */
export function drawResidentWalk(c: CanvasRenderingContext2D, id: Walker, foot: Point,
  facing: Facing, distance: number, height: number): boolean {
  const sheet = prepareResidentWalk(id);
  if (!sheet) return false;
  const row = facing === 0 ? 0 : facing === 3 ? 2 : 1;
  const col = residentWalkFrame(id, distance);
  const scale = height / 80;
  c.save();
  c.translate(foot.x, foot.y);
  if (facing === 1) c.scale(-1, 1);
  c.drawImage(sheet, col * 96, row * 96, 96, 96, -48 * scale, -90 * scale, 96 * scale, 96 * scale);
  c.restore();
  return true;
}
