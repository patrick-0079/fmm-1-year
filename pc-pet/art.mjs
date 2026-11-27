import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const target = new URL("./target/art/", import.meta.url);
await mkdir(target, { recursive: true });
const rig = JSON.parse(await readFile(new URL("../src/launch/fufu-pet/rig.json", import.meta.url), "utf8"));
await writeFile(new URL("rig.rs", target),
  `const HEAD_SCALE: f32 = ${rig.headScale.toFixed(6)};\nconst BODY_SCALE: f32 = ${rig.bodyScale.toFixed(6)};\nconst HEAD_TOP: f32 = ${rig.headTop.toFixed(6)};\n`);
for (const layer of ["body", "head", "eyes"]) {
  const source = new URL(`../src/launch/fufu-pet/${layer}.webp`, import.meta.url);
  const pixels = await sharp(fileURLToPath(source))
    .resize(360, 450)
    .ensureAlpha()
    .raw()
    .toBuffer();
  await writeFile(new URL(`${layer}.rgba`, target), pixels);
}
