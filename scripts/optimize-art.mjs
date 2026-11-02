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
  "garden-bench",
  "mossy-stone",
  "flower-wreath",
  "fufu-rest-poses",
  "xiaoye-note",
  "anniversary-town-v2",
  "town-npcs",
  "reward-icons",
  "garden-traps",
  "party-props-v11",
  "wardrobe-v11",
  "cake-slice-v11",
  "anniversary-stalls-v12",
  "garden-keepsakes-v12",
  "window-skies-v12",
  "town-paving-v12",
]) {
  const source = fileURLToPath(new URL(`${name}.png`, directory));
  const output = fileURLToPath(new URL(`${name}.webp`, directory));
  const options = [
    "nemu-sprites",
    "apple-tree",
    "anniversary-cake",
    "garden-bench",
    "mossy-stone",
    "flower-wreath",
    "fufu-rest-poses",
    "town-npcs",
    "reward-icons",
    "garden-traps",
    "party-props-v11",
    "wardrobe-v11",
    "cake-slice-v11",
    "anniversary-stalls-v12",
    "garden-keepsakes-v12",
    "window-skies-v12",
    "town-paving-v12",
  ].includes(name)
    ? { lossless: true, effort: 6 }
    : { quality: 90, effort: 6 };
  const pipeline = sharp(source);
  if (
    [
      "apple-tree",
      "anniversary-cake",
      "garden-bench",
      "mossy-stone",
      "flower-wreath",
    ].includes(name)
  )
    pipeline.resize({
      width: 256,
      kernel: "nearest",
      withoutEnlargement: true,
    });
  if (name === "xiaoye-note")
    pipeline.resize({ width: 640, withoutEnlargement: true });
  const result = await pipeline.webp(options).toFile(output);
  console.log(`${name}.webp: ${(result.size / 1024).toFixed(0)} KB`);
}
// Preserve every original pixel of the town while keeping its geometry unchanged.
const town = await sharp(fileURLToPath(new URL("anniversary-town-v2.png", directory)))
  .webp({ lossless: true, effort: 6 })
  .toFile(fileURLToPath(new URL("anniversary-town-v12.webp", directory)));
console.log(`anniversary-town-v12.webp: ${(town.size / 1024).toFixed(0)} KB`);
