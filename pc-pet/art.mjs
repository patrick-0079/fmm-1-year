import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const target = new URL("./target/art/", import.meta.url);
await mkdir(target, { recursive: true });
for (const layer of ["body", "head", "eyes"]) {
  const source = new URL(`../src/launch/fufu-pet/${layer}.svg`, import.meta.url);
  const pixels = await sharp(fileURLToPath(source))
    .resize(120, 150)
    .ensureAlpha()
    .raw()
    .toBuffer();
  await writeFile(new URL(`${layer}.rgba`, target), pixels);
}
