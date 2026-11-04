import test from "node:test";
import assert from "node:assert/strict";
import { readAstrolabe, collectRing, installRings, turnRing, plateAligned, tiltMirror, starLit,
  traceMoonlight, earnedSeals, rings, type RingId, type Mirror } from "../src/astrolabe.ts";
import { readProgress, canStand, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { moonPlate, mirrorSpots, ringSpots, lightBrick, southNotebook } from "../src/ruins-map.ts";
import { clickedInteraction } from "../src/interaction.ts";
import { equipmentParts } from "../src/equipment.ts";
import { grantItem, readInventory } from "../src/items.ts";

test("any of the six pickup orders works; entering an arcade gives no ring and repeats give no credit",()=>{
  for (const first of rings) for (const second of rings.filter(r=>r.id!==first.id)) {
    const third=rings.find(r=>r.id!==first.id && r.id!==second.id)!;
    let s=readAstrolabe();
    assert.equal(installRings(s),false); assert.equal(tiltMirror(s,0),false);
    assert.ok(collectRing(s,first.id)); assert.equal(collectRing(s,first.id),false);
    assert.deepEqual(earnedSeals(s,false),["first"]);
    assert.ok(collectRing(s,second.id));
    s=readProgress(JSON.stringify({astrolabe:s})).astrolabe;
    assert.ok(collectRing(s,third.id)); assert.ok(installRings(s)); assert.equal(installRings(s),false);
    assert.deepEqual(earnedSeals(s,false),["first","set"]);
    assert.deepEqual(s.turns,[1,2,3]);
  }
});
test("turns can be corrected and paused independently of the old melody; solving fixes the notches in place",()=>{
  const old=readProgress(JSON.stringify({echoes:{found:["leaf","bell","star"],played:3,listened:true},arcadeBests:{mines:26}}));
  assert.deepEqual(earnedSeals(old.astrolabe,old.echoes.listened),["radio"]);
  let s=old.astrolabe;
  for (const r of rings) collectRing(s,r.id);
  installRings(s);
  for(let i=0;i<4;i++) turnRing(s,"vine");
  assert.deepEqual(s.turns,[1,2,3]);
  turnRing(s,"star"); s=readAstrolabe(s);
  assert.deepEqual(s.turns,[1,3,3]);assert.equal(tiltMirror(s,1),false);
  for(const r of rings) while(s.turns[rings.indexOf(r)]!==0) assert.ok(turnRing(s,r.id));
  assert.ok(plateAligned(s));assert.equal(turnRing(s,"star"),false);
  assert.ok(tiltMirror(s,0));s=readAstrolabe(s);
  assert.deepEqual(earnedSeals(s,false),["first","set","plate"]);
  assert.ok(tiltMirror(s,1));assert.ok(starLit(s));assert.equal(tiltMirror(s,0),false);
  assert.deepEqual(earnedSeals(readAstrolabe(s),true),["first","set","plate","light","radio"]);
});
test("both copper mirrors obey the drawn ray, including a change to the downstream mirror in the dark",()=>{
  for(const lower of ["/","\\"] as Mirror[])
    assert.deepEqual(traceMoonlight(["/",lower]),{points:[{x:0,y:0},{x:2,y:0},{x:2,y:-.5}],reachesStar:false});
  assert.deepEqual(traceMoonlight(["\\","\\"]).points.at(-1),{x:3.5,y:2});
  assert.deepEqual(traceMoonlight(["\\","/"]),{points:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],reachesStar:true});
});
test("an older or malformed save cannot skip a mechanism or forge an achievement",()=>{
  assert.deepEqual(readAstrolabe({found:["bogus","vine","vine"] as RingId[],installed:true,turns:[0,0,0],mirrors:["\\","/"]}),
    {...readAstrolabe(),found:["vine"]});
  const state=readAstrolabe({found:["star","brass","vine"],installed:true,turns:[2.5,-1,0],mirrors:["\\","/"]});
  assert.deepEqual(state.turns,[1,2,0]); assert.deepEqual(state.mirrors,["/","\\"]); assert.equal(starLit(state),false);
});
test("each relic responds on its artwork and can be reached without stealing an existing ruin action",()=>{
  const map=scenes.ruins, additions=[...ringSpots,moonPlate,...mirrorSpots,lightBrick,southNotebook];
  const marker=(s:{y:number})=>s.y-10;
  for(const s of additions){
    assert.ok(canStand(s.approach,map.walls,map.bounds,map.floor,map.surfaces));
    assert.ok(findPath(map.spawn,s.approach,map));
    assert.equal(clickedInteraction({x:s.x,y:s.y-4},map.spots,marker)?.id,s.id);
  }
  for(const old of map.spots.filter(s=>!additions.includes(s))){
    assert.equal(clickedInteraction({x:old.x,y:old.y-4},map.spots,marker)?.id,old.id);
    const nearest=map.spots.filter(s=>Math.hypot(s.x-old.approach.x,s.y-old.approach.y)<(s.radius??48))
      .sort((a,b)=>Math.hypot(a.x-old.approach.x,a.y-old.approach.y)-Math.hypot(b.x-old.approach.x,b.y-old.approach.y));
    assert.equal(nearest[0]?.id,old.id);
  }
});
test("the earned brooch is unique, starts unequipped, and follows the existing chest pin for each pose",()=>{
  const bag=readInventory(null);
  assert.ok(grantItem(bag,"echoBrooch"));assert.equal(grantItem(bag,"echoBrooch"),false);
  assert.equal(bag.equipped.body,null);assert.deepEqual(readInventory(JSON.stringify(bag)).owned,["echoBrooch"]);
  for(const facing of [0,1,2,3] as const) for(const pose of ["standing","sitting","lying"] as const){
    const parts=equipmentParts({body:"echoBrooch"},pose,facing);
    assert.deepEqual(parts.map(p=>({...p,id:"anniversaryPin"})),equipmentParts({body:"anniversaryPin"},pose,facing));
    if(pose==="lying" || (pose==="standing" && facing===3)) assert.equal(parts.length,0);
  }
});
