import sharp from "sharp";
import { fileURLToPath } from "node:url";

const directory = new URL("../src/assets/", import.meta.url);
for (const name of ["room-colorful", "garden-colorful", "nemu-sprites"]) {
  const source = fileURLToPath(new URL(`${name}.png`, directory));
  const output = fileURLToPath(new URL(`${name}.webp`, directory));
  const options =
    name === "nemu-sprites"
      ? { lossless: true, effort: 6 }
      : { quality: 90, effort: 6 };
  const result = await sharp(source).webp(options).toFile(output);
  console.log(`${name}.webp: ${(result.size / 1024).toFixed(0)} KB`);
}
