export type CreditStarShape = "cross" | "gold" | "pink-fish";

type Pixel = { x: number; y: number; color: string };
const width = 19;

const crossSpans = [1, 1, 3, 3, 3, 5, 5, 7, 13, 19, 13, 7, 5, 5, 3, 3, 3, 1, 1];
const crossColors = ["#b98a58", "#e6b96b", "#ffdc8a", "#fff0b8", "#fffbe5"];
const crossPixels: Pixel[] = [];
for (const [y, span] of crossSpans.entries()) {
  const left = (width - span) / 2;
  for (let x = left; x < left + span; x++) {
    const distance = Math.abs(x - 9) + Math.abs(y - 9);
    const rim = x === left || x === left + span - 1;
    const shade = distance <= 2 ? 4 : distance <= 4 ? 3 : rim ? (x <= 9 && y <= 9 ? 2 : 0) : 2;
    crossPixels.push({ x, y, color: crossColors[shade] });
  }
}

function pixelRows(rows: readonly string[], colors: readonly string[]): Pixel[] {
  const pixels: Pixel[] = [];
  for (const [y, row] of rows.entries()) {
    for (const [x, shade] of Array.from(row).entries()) {
      if (shade !== ".") pixels.push({ x, y, color: colors[Number(shade)] });
    }
  }
  return pixels;
}

const goldPixels = pixelRows([
  "...................",
  ".........1.........",
  ".........1.........",
  "....3...131...3....",
  "........131........",
  ".......13330.......",
  ".11111134443000000.",
  "..133334444433330..",
  "...1333444442220...",
  "....13344444220....",
  ".....133444220.....",
  ".....033322220.....",
  ".3...033322220.....",
  ".....033302220...3.",
  ".....0300.0020.....",
  "....000.....000....",
  "....0.........0....",
  "...................",
  "...................",
], ["#aa6c38", "#efb34f", "#f9c969", "#ffe59d", "#fff7d2"]);

const fishPixels = pixelRows([
  "...................",
  "...................",
  "...................",
  ".......00..........",
  "......0220.........",
  "....0003230........",
  "...013344330....00.",
  "..01365433330..0120",
  ".013555333222001220",
  ".013353333221112320",
  ".01333333222110220.",
  "..012333222100.010.",
  "...012222110....00.",
  "....0000000........",
  "........00.........",
  "...................",
  "...................",
  "...................",
  "...................",
], ["#743854", "#c85887", "#ed7ea7", "#ffaac7", "#ffd8e7", "#65314f", "#fff3f7"]);

const pixelsByShape = { cross: crossPixels, gold: goldPixels, "pink-fish": fishPixels };
const textures: Partial<Record<CreditStarShape, HTMLCanvasElement>> = {};

/** Paint each texture once for both the meadow and the bottle. */
export function creditStarTexture(shape: CreditStarShape) {
  const cached = textures[shape];
  if (cached) return cached;
  const texture = document.createElement("canvas");
  texture.width = texture.height = width;
  const c = texture.getContext("2d")!;
  for (const { x, y, color } of pixelsByShape[shape]) {
    c.fillStyle = color;
    c.fillRect(x, y, 1, 1);
  }
  textures[shape] = texture;
  return texture;
}
