import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const target = new URL("./target/art/", import.meta.url);
await mkdir(target, { recursive: true });
const rig = JSON.parse(await readFile(new URL("../src/launch/fufu-pet/rig.json", import.meta.url), "utf8"));
await writeFile(new URL("rig.rs", target),
  `const NECK_Y: f32 = ${rig.neckY};\nconst EYE_Y: f32 = ${rig.eyeY};\nconst EYE_TRAVEL_X: f32 = ${rig.eyeTravelX};\nconst EYE_TRAVEL_Y: f32 = ${rig.eyeTravelY};\n` +
  `const VISIBLE_BOUNDS: [i32; 4] = [${rig.visibleBounds.left}, ${rig.visibleBounds.top}, ${rig.visibleBounds.width}, ${rig.visibleBounds.height}];\n`);
for (const layer of ["body", "head", "eyes"]) {
  const source = new URL(`../src/launch/fufu-pet/${layer}.webp`, import.meta.url);
  const pixels = await sharp(fileURLToPath(source))
    .resize(600, 750)
    .ensureAlpha()
    .raw()
    .toBuffer();
  await writeFile(new URL(`${layer}.rgba`, target), pixels);
}
