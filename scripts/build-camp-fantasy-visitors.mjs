import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { starFawnCels, cloudWhaleCels, antlerStarsCels } from "./camp-fantasy-creatures.mjs";
import { moonBoatCels, whaleRingCels, boatWakeCels } from "./camp-moon-boat.mjs";

const width = 80, height = 64, columns = 16;
const rows = [starFawnCels, moonBoatCels, cloudWhaleCels, whaleRingCels, boatWakeCels, antlerStarsCels];
const frames = [];
for (const [row, cels] of rows.entries()) {
  if (cels.length !== columns) throw Error("Missing fantasy visitor cels in row " + row);
  for (const [column, drawing] of cels.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${drawing}</svg>`;
    const input = await sharp(Buffer.from(svg)).png().toBuffer();
    frames.push({input, left: column * width, top: row * height});
  }
}
const output = fileURLToPath(new URL("../src/assets/meadow-camp-fantasy.webp", import.meta.url));
await sharp({create: {width: columns * width, height: rows.length * height, channels: 4, background: "#0000"}})
  .composite(frames).webp({lossless: true, effort: 6}).toFile(output);
