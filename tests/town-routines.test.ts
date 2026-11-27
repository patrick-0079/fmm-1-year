import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/maps.ts";
import { canTravelBetween, canStand, findPath } from "../src/core.ts";
import { clickedInteraction } from "../src/interaction.ts";
import { TOWN_NPCS } from "../src/town-data.ts";
import { TownResidentMap } from "../src/town-resident-map.ts";
import { residentTownScene, TownRoutines, townLives, townShift } from "../src/town-routines.ts";

const street=scenes.town, empty={x:-5000,y:-5000};
const view={x:0,y:0,w:1800,h:1200};
const fixed={...street,walls:street.walls.filter(w=>!w.label?.startsWith("镇民 · "))};
test("the public shifts and the post-midnight radio return assign all 18 residents between street, interiors and rest",()=>{
  const seen=new Set<string>();
  for(const [phase, outdoors, indoors] of [["dawn",12,2],["day",11,3],["dusk",10,5],["night",8,3],["after-midnight",9,2]] as const){
    const roster=TOWN_NPCS.map(n=>({ id:n.id, scene:residentTownScene(n.id,phase) }));
    roster.filter(n=>n.scene).forEach(n=>seen.add(n.id));
    const onStreet=roster.filter(n=>n.scene==="town").map(n=>n.id);
    assert.equal(onStreet.length,outdoors);
    assert.equal(new Set(roster.filter(n=>n.scene && n.scene!=="town").map(n=>n.scene)).size,indoors);
    assert.ok(onStreet.includes("welcome"));
    for (const id of ["xiaoyou","guli","qianxiao"] as const) assert.ok(onStreet.includes(id));
    assert.equal(onStreet.includes("radio-host"), phase !== "night");
  }
  assert.equal(seen.size,18);
  assert.equal(residentTownScene("radio-host", townShift("night",23.99)), "town-radio");
  assert.equal(residentTownScene("radio-host", townShift("night",0)), "town");
  const host = new TownRoutines("after-midnight").people.get("radio-host")!;
  const approach = host.approach!;
  assert.ok(Math.abs(approach.x-host.x) >= 25, "the player leaves the waving hand visible");
  assert.ok(canTravelBetween(approach,{x:1337,y:829},fixed), "the greeting position is reachable from the radio door");
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
test("manual changes settle all commutes while keeping an off-duty letter author at their current foot",()=>{
  const cast=new TownRoutines("day"), map=new TownResidentMap(street);
  cast.tick(.05,"dusk",empty,view,null,"walker",false);
  const author=cast.people.get("walker")!;
  const foot={x:author.x,y:author.y};
  for (const phase of ["night","dawn","night"] as const) {
    cast.syncShift(phase,"walker");
    cast.tick(0,phase,empty,view,null,"walker",false);
    map.update(empty,undefined,undefined,cast.people);
    assert.equal(map.scene.spots.filter(s=>s.id.startsWith("npc-")).length,phase === "night" ? 9 : 13);
    assert.ok(map.scene.spots.includes(map.anchor("walker")));
    assert.deepEqual({x:author.x,y:author.y},foot);
    assert.ok([...cast.people.values()].every(a=>a.status==="present" || a.status==="absent"));
  }
  cast.tick(0,"night",empty,view,null,undefined,false);
  map.update(empty,undefined,undefined,cast.people);
  assert.equal(map.scene.spots.filter(s=>s.id.startsWith("npc-")).length,8);
  assert.equal(map.scene.spots.includes(map.anchor("walker")),false);
});
