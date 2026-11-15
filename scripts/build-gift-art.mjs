import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Keep the atlas size and every anchor unchanged. Transparent RGB does not
// become a background; the original alpha channel is preserved in WebP.
const source = fileURLToPath(new URL("../src/assets/gift-v37.png", import.meta.url));
const output = fileURLToPath(new URL("../src/assets/gift-v37.webp", import.meta.url));
const result = await sharp(source).webp({ lossless: true, effort: 6 }).toFile(output);
console.log(`Gift atlas: ${result.width} x ${result.height}, ${result.size} bytes`);
