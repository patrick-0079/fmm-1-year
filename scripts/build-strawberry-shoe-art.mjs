import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../src/assets/strawberry-flats-v38.png", import.meta.url));
const output = fileURLToPath(new URL("../src/assets/strawberry-flats-v38.webp", import.meta.url));
// Remove transparent padding, preserving the pair's aspect ratio and alpha.
const result = await sharp(source).trim().resize({ width: 640, withoutEnlargement: true })
  .webp({ lossless: true, effort: 6 }).toFile(output);
console.log(`Strawberry flats: ${result.width} x ${result.height}, ${result.size} bytes`);
