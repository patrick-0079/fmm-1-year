import type { TownInteriorKey } from "./town-interior-id";

// Each keepsake uses the same outline in the bag, at the workbench and on the HUD.
const drawings: Record<TownInteriorKey, [string, string][]> = {
  florist: [
    ["#e7b4c0", "M22 13 Q15 4 22 3Q29 0 25 14 L22 18"],
    ["#f2e9d6", "M15 13L37 17L32 49L11 45Z"],
    ["#83a285", "M21 41Q20 33 27 27L29 29Q28 36 21 41Z"],
    ["#cb91b2", "M25 32Q17 29 21 23Q23 21 26 24Q33 20 34 26Q32 31 25 32Z"],
    ["", "M15 42L20 19M21 40L28 26M24 32L22 26M27 29L31 26"],
  ],
  baker: [
    ["#b36d5d", "M6 20H42V38Q42 45 24 46Q6 45 6 38Z"],
    ["#f6d6a0", "M6 20Q7 12 24 12Q41 12 42 20Q40 28 24 29Q6 28 6 20Z"],
    ["#ca6976", "M17 20Q18 16 24 19Q31 17 32 21Q28 27 25 26Q20 26 17 20Z"],
    ["#8ba177", "M22 19L24 16L27 18L26 21Z"],
    ["", "M9 34Q24 39 39 34M20 21L21 22M27 23L29 22"],
  ],
  maker: [
    ["#be8c55", "M41 29A17 18 0 1 1 7 29A17 18 0 1 1 41 29Z"],
    ["#eac984", "M40 26A16 16 0 1 1 8 26A16 16 0 1 1 40 26Z"],
    ["#6d5a6a", "M24 15L27 22L35 23L29 28L31 36L24 32L17 36L19 28L13 23L21 22Z"],
    ["", "M13 20Q16 14 22 13M33 35L36 31"],
  ],
  post: [
    ["#f7e8c4", "M4 16L41 12L44 39L7 43Z"],
    ["#87b1a8", "M9 35L11 29L19 23L24 28L29 26L34 35Z"],
    ["#dd9b94", "M32 16L38 15L39 21L33 22Z"],
    ["#b26773", "M26 19Q22 26 31 26Q23 30 22 24Q22 21 26 19Z"],
    ["", "M10 38L19 37M21 37L25 36"],
  ],
  books: [
    ["#f0dba5", "M3 20L17 13L31 18L45 10V37L31 45L17 39L3 46Z"],
    ["#8fb5b3", "M4 30L17 23L31 28L44 20V32L31 40L17 33L4 40Z"],
    ["#99ac81", "M5 33L17 29L31 35L44 28V32L31 40L17 34L5 41Z"],
    ["", "M17 13V39M31 18V45M7 25L12 22M35 30L37 28"],
  ],
  radio: [
    ["#897c9a", "M5 16Q5 13 8 13H40Q43 13 43 16V42H5Z"],
    ["#f5d496", "M8 18H40V33H8Z"],
    ["#705965", "M13 23H35V29H13Z"],
    ["#f0b3a0", "M13 37H35L38 42H10Z"],
    ["#f5e1ba", "M18 26A2 2 0 1 0 14 26A2 2 0 1 0 18 26ZM34 26A2 2 0 1 0 30 26A2 2 0 1 0 34 26Z"],
  ],
  hall: [
    ["#f5d491", "M6 19L41 13L43 22Q37 25 44 29L45 36L9 42L8 35Q13 31 7 27Z"],
    ["#b66d65", "M15 23L32 20L34 32L17 35Z"],
    ["#f9e5ad", "M19 28L24 24L29 26L30 31L20 33Z"],
    ["", "M36 18L37 20M38 24L38 26M39 30L40 33M25 28L25 31"],
  ],
};

const paths = new Map<TownInteriorKey, [string, Path2D][]>();

export function drawTownKeepsake(c: CanvasRenderingContext2D, key: TownInteriorKey, x = 0, y = 0, size = 48, outline = false) {
  let shapes = paths.get(key);
  if (!shapes) {
    shapes = drawings[key].map(([fill, path]) => [fill, new Path2D(path)]);
    paths.set(key, shapes);
  }
  c.save();
  c.translate(x, y);
  c.scale(size / 48, size / 48);
  c.strokeStyle = outline ? "#ddbf9c" : "#684f54";
  c.lineWidth = 1.25;
  c.lineCap = c.lineJoin = "round";
  for (const [fill, shape] of shapes) {
    if (fill && !outline) { c.fillStyle = fill; c.fill(shape); }
    c.stroke(shape);
  }
  c.restore();
}
