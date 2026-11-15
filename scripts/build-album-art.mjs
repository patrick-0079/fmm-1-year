import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = new URL("../src/assets/album-v36/", import.meta.url);
for (const name of ["morning", "reading", "bass", "fox"]) {
  const original = fileURLToPath(new URL(`${name}.png`, root));
  await sharp(original).resize({ width: 1536, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 }).toFile(fileURLToPath(new URL(`${name}.webp`, root)));
  await sharp(original).resize({ width: 240 }).webp({ quality: 78, effort: 6 })
    .toFile(fileURLToPath(new URL(`${name}-thumb.webp`, root)));
}
