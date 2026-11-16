import test from "node:test";
import assert from "node:assert/strict";
import { canStand, canTravelBetween, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { gardenForeground } from "../src/garden-foreground.ts";
import { gardenGateLamp } from "../src/garden-gate-lamp.ts";

const point = (x:number,y:number) => ({x:x*900/1536,y:y*900/1536});

test("entrance lantern excludes its grass halo and keeps bronze, stone and open handles", () => {
  const covered=(x:number,y:number)=>gardenGateLamp.some(outline=>polygonContains(point(x+.5,y+.5),outline));
  for(const [x,y] of [[625,844],[610,852],[639,857],[625,874],[625,901],[626,908],[625,934],[635,976]])
    assert.ok(covered(x,y),`lost lantern/post ${x},${y}`);
  for(const [x,y] of [[607,875],[610,886],[619,899],[631,903],[621,905],[636,914],[640,924],[640,939],[616,966],[616,854],[635,855]])
    assert.ok(!covered(x,y),`grass/paving or aperture repainted at ${x},${y}`);
});

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

test("garden flower edges preserve petals but exclude paving triangles and grass between leaves", () => {
  // Landmarks come from the original illustration, independently of the
  // production vertices. Sample source pixel centres, not polygon corners.
  const cases=[
    {id:"south-rose-arch",
      solid:[[753,820],[751,829],[735,833],[747,849],[769,851],[764,845]],
      clear:[[736,816],[738,815],[741,816],[745,816],[725,822],[735,820],[728,820],[799,871],[807,884],[805,893],[802,935],[798,866]]},
    {id:"west-rose-crown",solid:[[204,680],[216,677],[222,667],[215,664],[201,694],[224,696]],clear:[[204,660],[205,663],[202,665],[217,660],[215,661],[217,661],[213,693],[233,700]]},
  ];
  for(const {id,solid,clear}of cases){
    const layer=gardenForeground.find(layer=>layer.id===id)!;
    for(const [x,y]of solid)assert.ok(polygonContains(point(x+.5,y+.5),layer.points),`${id} lost petal/leaf ${x},${y}`);
    for(const [x,y]of clear)assert.ok(!polygonContains(point(x+.5,y+.5),layer.points),`${id} retained paving/grass ${x},${y}`);
  }
});
