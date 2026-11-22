import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/maps.ts";
import { canTravelBetween, canStand, findPath } from "../src/core.ts";
import { clickedInteraction } from "../src/interaction.ts";
import { TOWN_NPCS } from "../src/town-data.ts";
import { TownResidentMap } from "../src/town-resident-map.ts";
import { TownRoutines, townLives, worksInTown } from "../src/town-routines.ts";

const street=scenes.town, empty={x:-5000,y:-5000};
const view={x:0,y:0,w:1800,h:1200};
const fixed={...street,walls:street.walls.filter(w=>!w.label?.startsWith("镇民 · "))};
test("each stable phase has exactly ten residents and the three closest neighbours work opposite shifts",()=>{
  const seen=new Set<string>();
  for(const phase of ["day","dusk","night","dawn"] as const){
    const everyone=TOWN_NPCS.filter(n=>worksInTown(n.id,phase)).map(n=>n.id);
    everyone.forEach(id=>seen.add(id));
    assert.equal(everyone.length,10);
    for(const id of ["post","welcome"] as const)assert.ok(everyone.includes(id));
    for(const [a,b] of [["flight-keeper","bunny"],["baker","guli"],["maker","qianxiao"]] as const)
      assert.equal(Number(everyone.includes(a))+Number(everyone.includes(b)),1);
  }
  assert.equal(seen.size,18);
});
test("working residents and strangers use accessible streets and thresholds in both directions",()=>{
  let walking=0;
  for(const n of TOWN_NPCS){
    const routes=townLives[n.id];if(routes.stops.length)walking++;
    const map=new TownResidentMap(street);
    for(const route of [routes.stops,routes.doorway??[]]){
      let previous=n;
      for(const p of route){
        assert.ok(canTravelBetween(previous,p,fixed) && canTravelBetween(p,previous,fixed),n.name+" street");
        assert.ok(canStand(p,fixed.walls,fixed.bounds,fixed.floor,fixed.surfaces));
        map.update(undefined,n.id,p);
        const spot=map.anchor(n.id);
        if (route===routes.stops) {
          assert.equal(clickedInteraction({x:p.x,y:p.y-18},map.scene.spots)?.id,spot.id,n.name+" portrait hit");
          assert.deepEqual(findPath(map.scene.spawn,spot.approach,map.scene)?.at(-1),spot.approach,n.name+" approach");
        }
        previous={...n,...p};
      }
    }
  }
  assert.equal(walking,15);
});
test("talks retain a person across a shift, pointer routes reserve the real feet and a cancelled route releases them",()=>{
  const r=new TownRoutines("day"), map=new TownResidentMap(street);
  const a=r.people.get("walker")!;
  a.wait=0;
  for(let i=0;i<24;i++)r.tick(.04,"day",empty,view,null,undefined,false);
  assert.ok(a.odometer>2);
  const x=a.x,y=a.y;
  for(let i=0;i<30;i++)r.tick(.04,"day",empty,view,"npc-walker",undefined,false);
  assert.deepEqual([a.x,a.y],[x,y]);
  r.tick(.05,"night",empty,view,null,"walker",false);
  map.update(empty,undefined,undefined,r.people);
  assert.ok(map.scene.spots.includes(map.anchor("walker")));
  r.tick(.05,"night",empty,view,"npc-walker",undefined,false);
  map.update(empty,undefined,undefined,r.people);
  assert.equal(a.status,"leaving");
  assert.equal(map.scene.spots.includes(map.anchor("walker")),false);
  assert.equal(map.scene.walls.some(w=>w.label==="镇民 · 蓝莓"),false);
});
test("crowded camera allows at most two walking residents, spectators keep their original position on reduced motion",()=>{
  const r=new TownRoutines();const odometers=new Set<string>();
  for(let i=0;i<1200;i++){
    r.tick(.05,"day",empty,view,null,undefined,false);
    const walking=[...r.people.values()].filter(a=>a.walking);
    assert.ok(walking.length<=2);
    walking.forEach(a=>odometers.add(a.id));
  }
  assert.ok(odometers.size>=7);
  r.enter("dusk");
  for(let i=0;i<600;i++)r.tick(.05,"dusk",empty,view,null,undefined,true);
  for(const a of r.people.values())assert.equal(a.odometer,0);
});
