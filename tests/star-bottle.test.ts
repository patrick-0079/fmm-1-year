import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { BOTTLE_REFERENCE,bottleEntries,bottleGeometry,bottleScrollTop,nearestBottleStar } from "../src/star-bottle-layout.ts";

test("bottle slots follow catalogue order regardless of pickup order, duplicates or unknown IDs", () => {
  const people = [
    { id: "moon", name: "Moon", message: "" },
    { id: "fish", name: "Fish", message: "One more star.", shape: "pink-fish" },
    { id: "cross", name: "Cross", message: "", shape: "cross" },
  ] as const;
  assert.deepEqual(bottleEntries(people, []), []);
  assert.deepEqual(bottleEntries(people, ["cross", "unknown", "fish", "cross"]), [
    { ...people[1], slot: 1 }, { ...people[2], slot: 2 },
  ]);
  const all = bottleEntries(people, ["cross", "fish", "moon"]);
  assert.deepEqual(all, people.map((person, slot) => ({ ...person, slot })));
  const reordered = [people[2], people[0], people[1]];
  assert.deepEqual(bottleEntries(reordered, ["fish", "cross"]), [
    { ...people[2], slot: 0 }, { ...people[1], slot: 2 },
  ]);
});

test("current and expanded bottles fit every visible star inside the glass and resolve each direct tap",async()=>{
  const {data,info}=await sharp(fileURLToPath(new URL("../src/assets/star-bottle-closeup.webp",import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,BOTTLE_REFERENCE.width);assert.equal(info.height,BOTTLE_REFERENCE.height);
  for(const [width,height,compact] of [[290,298/1.5-8,true],[352,360/1.5-8,true],[266.8,330,false],[440,590,false]] as const){
    const original=bottleGeometry(width,height,compact,12).slots;
    const sparse=bottleGeometry(width,height,compact,80,[79]).slots;
    assert.ok(sparse[79].size>bottleGeometry(width,height,compact,80).slots[79].size);
    for (const count of [0,1,12,13,36,80]) {
      const fit=bottleGeometry(width,height,compact,count);assert.ok(fit.width<=width&&fit.height<=height);
      assert.equal(fit.slots.length,count);
      const targets=fit.slots.map((point,slot)=>({slot,...point}));
      if(count>12) assert.ok(fit.slots[0].size<=original[0].size);
      for(const [i,p] of fit.slots.entries()){
        if (i<12) assert.deepEqual([p.x,p.y,p.angle], [original[i].x,original[i].y,original[i].angle]);
        assert.equal(nearestBottleStar(targets,p.x,p.y),i,"direct tap picked another star");
        for(const q of fit.slots.slice(0,i))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>(p.size+q.size)/2,"visible stars overlap");
        const half=p.size/2,angle=p.angle*Math.PI/180;
        for(const dx of [-half,0,half])for(const dy of [-half,0,half]){
          const x=Math.round((p.x+dx*Math.cos(angle)-dy*Math.sin(angle))*info.width/fit.width),y=Math.round((p.y+dx*Math.sin(angle)+dy*Math.cos(angle))*info.height/fit.height);
          assert.ok(data[(y*info.width+x)*4+3]>24,`target ${i}/${count} lies outside conical glass at ${width}×${height}`);
        }
      }
    }
  }
});

test("expanded pointer areas resolve by distance rather than overlapping DOM order",()=>{
  const points=[{slot:7,x:40,y:50},{slot:3,x:65,y:50}];
  assert.equal(nearestBottleStar(points,55,50),3);
  assert.equal(nearestBottleStar([...points].reverse(),55,50),3);
  assert.equal(nearestBottleStar(points,34,38),7);
  assert.equal(nearestBottleStar(points,300,300),null);
  assert.equal(nearestBottleStar([],40,50),null);
});

test("letter scrolling consumes navigation keys at both edges without claiming browser or focus keys",()=>{
  for(const key of ["End","PageDown"," ","ArrowDown"])assert.equal(bottleScrollTop(key,false,0,160,80),0);
  assert.equal(bottleScrollTop("PageDown",false,640,160,800),640);
  assert.equal(bottleScrollTop("Home",false,640,160,800),0);
  assert.equal(bottleScrollTop(" ",true,200,160,800),56);
  assert.equal(bottleScrollTop("Tab",false,0,160,800),null);
  assert.equal(bottleScrollTop("Enter",false,0,160,800),null);
  assert.equal(bottleScrollTop("Escape",false,0,160,800),null);
});
