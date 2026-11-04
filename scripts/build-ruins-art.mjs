import sharp from "sharp";
import { fileURLToPath } from "node:url";
const asset = name => fileURLToPath(new URL("../src/assets/"+name, import.meta.url));
const map = asset("echo-ruins.png");
await sharp(map).webp({quality:92}).toFile(asset("echo-ruins.webp"));
await sharp(asset("echo-arch.png")).trim({background:"#00000000", threshold:10}).resize({width:380}).webp({quality:93,alphaQuality:100}).toFile(asset("echo-arch.webp"));
await sharp(asset("echo-well.png")).trim({background:"#00000000", threshold:10}).resize({width:230}).webp({quality:93,alphaQuality:100}).toFile(asset("echo-well.webp"));
// Each board looks out into its own chamber in the map artwork.
for (const [name,left,top,width,height] of [
  ["snake",25,257,474,316], ["mines",488,5,552,368], ["miner",1052,245,480,320],
]) await sharp(map).extract({left,top,width,height}).resize(480,320).webp({quality:91}).toFile(asset("echo-"+name+".webp"));
