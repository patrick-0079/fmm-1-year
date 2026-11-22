import test from "node:test";
import assert from "node:assert/strict";
import { GardenResidents } from "../src/garden-residents.ts";
import { scenes, bloomingGarden } from "../src/maps.ts";
import { canStand, canTravelBetween } from "../src/core.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";
import type { Phase } from "../src/day.ts";

const far={x:450,y:175}, guests=["balloon-friend","picnic-friend","decorator","suyan"] as const;
const office=(id:string)=>"garden-guest-"+id;
for(const base of [scenes.garden,bloomingGarden]){
  test((base===scenes.garden?"ordinary":"flower gate")+" garden moves feet, hit boxes and stands along traversable routes",()=>{
    const cast=new GardenResidents();
    for(const phase of ["day","night"] as Phase[]){
      cast.leave();
      let map=cast.mapFor(base,phase);
      const visit=guests.filter(n=>cast.interactable(n));
      assert.equal(visit.length,2);
      assert.equal(map.spots.filter(s=>guests.some(k=>s.id===office(k))).length,2);
      const terrain={...base,walls:base.walls.filter(w=>!w.label.startsWith("庭院来宾") && w.label!=="来宾 · 苏颜")};
      const originals=visit.map(k=>({...cast.get(k).foot}));
      const walked=new Set<string>();
      for(let i=0;i<470;i++){
        const previous=visit.map(k=>({...cast.get(k).foot}));
        cast.tick(.04,phase,far,null,false,()=>true);
        map=cast.mapFor(base,phase);
        for(const [j,k] of visit.entries()){
          const a=cast.get(k),at=cast.anchor(k);
          if(a.moving)walked.add(k);
          assert.ok(canTravelBetween(previous[j],a.foot,terrain));
          assert.ok(canStand(at.approach,map.walls,map.bounds,map.floor,map.surfaces));
          assert.equal(clickedInteraction({x:a.foot.x,y:a.foot.y-22},map.spots)?.id,office(k));
          assert.equal(nearbyInteraction(at.approach,map.spots)?.id,office(k));
          assert.deepEqual([at.x,at.y],[a.foot.x,a.foot.y]);
          assert.deepEqual(base.spots.find(s=>s.id===office(k))!.x,originals[j].x);
        }
      }
      assert.equal(walked.size,visit.filter(k=>k!=="balloon-friend").length);
    }
  });
}
test("a clicked walker waits; a talking picnic guest finishes before shift change",()=>{
  const cast=new GardenResidents(),base=scenes.garden;
  cast.mapFor(base,"day");
  for(let i=0;i<155;i++)cast.tick(.05,"day",far,null,false,()=>true);
  const at={...cast.get("picnic-friend").foot};
  for(let i=0;i<75;i++)cast.tick(.05,"day",far,office("picnic-friend"),false,()=>true);
  assert.deepEqual(cast.get("picnic-friend").foot,at);
  const visited=new Set<string>();
  cast.talking("picnic-friend",true);
  for(let i=0;i<30;i++) {
    cast.tick(.05,"dusk",far,null,false,()=>true);
    for(const k of guests)if(cast.get(k).mode==="leaving" || cast.get(k).mode==="arriving")visited.add(k);
  }
  assert.equal(cast.interactable("picnic-friend"),true);
  cast.talking("picnic-friend",false);
  for(let i=0;i<1400;i++){
    cast.tick(.05,"dusk",far,null,false,()=>true);
    for(const k of guests)if(cast.get(k).mode==="leaving" || cast.get(k).mode==="arriving")visited.add(k);
    assert.ok(guests.filter(k=>cast.get(k).moving).length<=2);
  }
  assert.equal(visited.size,4);
  assert.deepEqual(guests.filter(k=>cast.interactable(k)),["decorator","suyan"]);
  assert.ok(cast.mapFor(base,"dusk").walls.every(w=>w.label!=="庭院来宾 · 晴糖"));
});
test("reduced motion preserves static working poses, guest availability and a clear player foot",()=>{
  const cast=new GardenResidents(),base=bloomingGarden;
  cast.mapFor(base,"day");
  for(let i=0;i<5;i++)cast.tick(.05,"dusk",{x:650,y:181},null,true,()=>true);
  const map=cast.mapFor(base,"night");
  assert.deepEqual(guests.filter(k=>cast.interactable(k)),["decorator","suyan"]);
  assert.equal(map.walls.some(w=>w.label==="来宾 · 苏颜"),false);
  assert.ok(guests.every(k=>!cast.get(k).moving));
  cast.tick(.05,"night",far,null,true,()=>true);
  assert.ok(cast.mapFor(base,"night").walls.some(w=>w.label==="来宾 · 苏颜"));
});
