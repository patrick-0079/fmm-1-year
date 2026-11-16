import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { gardenForeground } from "../src/garden-foreground.ts";

const point = (x:number,y:number) => ({x:x*900/1536,y:y*900/1536});

test("garden arch masks cover painted crowns, leaving doorways and paving open", () => {
  // Independent landmarks on the original illustration, not generated from masks.
  const landmarks = [
    {id:"south-rose-arch",crown:[750,830],door:[750,900],ground:[750,984]},
    {id:"west-rose-crown",crown:[218,676],door:[211,725],ground:[211,782]},
    {id:"west-alcove-arch",crown:[198,510],door:[204,564],ground:[204,614]},
    {id:"northeast-bench-arbour",crown:[1100,114],door:[1100,138],ground:[1100,192]},
  ];
  for(const {id,crown,door,ground} of landmarks){
    const layer=gardenForeground.find(layer=>layer.id===id)!;
    assert.ok(polygonContains(point(crown[0],crown[1]),layer.points),id+" crown");
    for(const [x,y] of [door,ground]) assert.ok(!polygonContains(point(x,y),layer.points),id+" opening");
    assert.ok(layer.y>point(crown[0],crown[1]).y,id+" sorts by feet, not by crown");
  }
});

test("garden arch separation preserves both walking routes and solid post feet", () => {
  const garden=scenes.garden;
  const paths=[
    [{x:450,y:576},{x:450,y:540},{x:450,y:504}],
    [{x:125,y:454},{x:125,y:425},{x:125,y:408}],
  ];
  for(const path of paths)for(let i=1;i<path.length;i++){
    assert.ok(canTravelBetween(path[i-1],path[i],garden));
    assert.ok(canTravelBetween(path[i],path[i-1],garden));
  }
  for(const [x,y] of [[398,558],[483,558],[102,445],[153,434]])
    assert.ok(!canStand({x,y},garden.walls,garden.bounds,garden.floor,garden.surfaces));
});

test("garden lamp silhouettes do not cover adjacent paths", () => {
  const landmarks = [
    {id:"northwest-path-lamp",body:[670,345],path:[710,365]},
    {id:"northeast-path-lamp",body:[832,345],path:[795,365]},
    {id:"southwest-square-lamp",body:[659,695],path:[700,705]},
    {id:"southeast-square-lamp",body:[843,695],path:[800,705]},
  ];
  for(const {id,body,path} of landmarks){
    const layer=gardenForeground.find(layer=>layer.id===id)!;
    assert.ok(polygonContains(point(body[0],body[1]),layer.points),id+" body");
    assert.ok(!polygonContains(point(path[0],path[1]),layer.points),id+" path");
  }
  assert.equal(new Set(gardenForeground.map(layer=>layer.id)).size,gardenForeground.length);
});
