import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { courageFlowerbeds, courageFlowerRoots } from "../src/courage-flowerbeds.ts";
import { canStand, findPath, obstacleContainsFoot, polygonContains } from "../src/core.ts";
import { creeks } from "../src/landscape.ts";
import { scenes } from "../src/maps.ts";
import { rainbowFlowers } from "../src/rainbow-flowers.ts";

const map = scenes.challenge;

test("flowerbeds grow on grass with clear approaches and no canopy covering a trap", async () => {
  const url = new URL("../src/assets/courage-garden.webp", import.meta.url);
  const {data,info} = await sharp(fileURLToPath(url)).resize(map.width,map.height).removeAlpha()
    .raw().toBuffer({resolveWithObject:true});
  const creek = creeks.challenge;
  for (const [i, bed] of courageFlowerbeds.entries()) {
    assert.ok(map.walls.includes(courageFlowerRoots[i]));
    assert.ok(obstacleContainsFoot(bed, courageFlowerRoots[i]));
    for (const dy of [-12, 11]) {
      const foot = {x:bed.x,y:bed.y+dy};
      assert.ok(canStand(foot,map.walls,map.bounds,map.floor));
    }
    for (let dy = -4; dy <= 2; dy += 2) for (let dx = -7; dx <= 7; dx += 2) {
      const foot = { x:bed.x+dx, y:bed.y+dy };
      const k = (foot.y*info.width + foot.x)*info.channels;
      assert.ok(data[k+1] >= .96*data[k] && data[k+1] > 1.2*data[k+2], `grass under ${bed.x},${bed.y}`);
      assert.ok(!polygonContains(foot,creek.upper) && !polygonContains(foot,creek.lower));
    }
    for (const hazard of map.hazards) {
      const dx = Math.max(Math.abs(hazard.x-bed.x)-bed.height*.5, 0);
      const dy = Math.max(bed.y-bed.height-hazard.y, hazard.y-bed.y, 0);
      assert.ok(Math.hypot(dx,dy)>hazard.radius+3, `foliage over ${hazard.id}`);
    }
  }
  const places = [...map.spots, ...rainbowFlowers.filter(f=>f.scene==="challenge")];
  for (const spot of places) {
    const route = findPath(map.spawn,spot.approach,map,map.hazards);
    assert.deepEqual(route?.at(-1),spot.approach,spot.id);
  }
});
