import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Preserve the generated alpha and every source pixel. Sprite bounds and foot
// anchors are measured against these unchanged dimensions in the renderers.
for (const name of ["xiaoye-plush", "yeshenhua", "xiaoye-embrace-v55", "suyan"]) {
  const source = fileURLToPath(new URL(`../src/assets/${name}.png`, import.meta.url));
  const output = fileURLToPath(new URL(`../src/assets/${name}.webp`, import.meta.url));
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) throw new Error(`${name} must have a transparent background`);
  const result = await sharp(source).webp({ lossless: true, effort: 6 }).toFile(output);
  console.log(`${name}: ${result.width} × ${result.height}, ${Math.round(result.size / 1024)} KB`);
}
