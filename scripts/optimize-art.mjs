import sharp from "sharp";
import { fileURLToPath } from "node:url";

const directory = new URL("../src/assets/", import.meta.url);
for (const name of [
  "room-interactive",
  "garden-colorful",
  "courage-garden",
  "nemu-sprites",
  "apple-tree",
  "anniversary-cake",
]) {
  const source = fileURLToPath(new URL(`${name}.png`, directory));
  const output = fileURLToPath(new URL(`${name}.webp`, directory));
  const options = ["nemu-sprites", "apple-tree", "anniversary-cake"].includes(
    name,
  )
    ? { lossless: true, effort: 6 }
    : { quality: 90, effort: 6 };
  const pipeline = sharp(source);
  if (["apple-tree", "anniversary-cake"].includes(name))
    pipeline.resize({
      width: 256,
      kernel: "nearest",
      withoutEnlargement: true,
    });
  const result = await pipeline.webp(options).toFile(output);
  console.log(`${name}.webp: ${(result.size / 1024).toFixed(0)} KB`);
}
