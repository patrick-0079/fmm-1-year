import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Keep the transparent generated master; crop only its empty outer margin.
await sharp(fileURLToPath(new URL("../src/assets/star-bottle-closeup.png", import.meta.url)))
  .trim({threshold: 8})
  .webp({lossless: true, effort: 6})
  .toFile(fileURLToPath(new URL("../src/assets/star-bottle-closeup.webp", import.meta.url)));
