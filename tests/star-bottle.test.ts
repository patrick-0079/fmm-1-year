import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { producers } from "../src/content.ts";
import { BOTTLE_REFERENCE,bottleEntries,bottleGeometry,bottleScrollTop,nearestBottleStar } from "../src/star-bottle-layout.ts";

test("one bottle holds every discovered star while new discoveries never shuffle old positions",()=>{
  const old=producers.slice(0,8).map(person=>person.id);
  assert.deepEqual(bottleEntries(producers,[]),[]);
  const known=bottleEntries(producers,[old[5],...old,old[0],"missing-id"]);
  assert.deepEqual(known.map(person=>person.id),old);
  const partial=bottleEntries(producers,[producers[1].id,producers[6].id]);
  assert.deepEqual(partial.map(person=>person.name),["夜神华","正号"]);
  assert.deepEqual(partial.map(person=>person.slot),[known[1].slot,known[6].slot]);
  const all=bottleEntries(producers,producers.map(person=>person.id));
  assert.equal(all.length,9);assert.equal(all.at(-1)?.id,"star-rabe");
  assert.deepEqual(all.slice(0,8),known);
});

test("all nine scattered star images fit the glass at phone and desktop sizes, with unambiguous direct taps",async()=>{
  const {data,info}=await sharp(fileURLToPath(new URL("../src/assets/star-bottle-closeup.webp",import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,BOTTLE_REFERENCE.width);assert.equal(info.height,BOTTLE_REFERENCE.height);
  for(const [width,height,compact] of [[290,298/1.5-8,true],[352,360/1.5-8,true],[266.8,330,false],[440,590,false]] as const){
    const fit=bottleGeometry(width,height,compact);assert.ok(fit.width<=width&&fit.height<=height);
    assert.equal(fit.slots.length,9);
    const targets=fit.slots.map((point,slot)=>({slot,...point}));
    for(const [i,p] of fit.slots.entries()){
      assert.equal(nearestBottleStar(targets,p.x,p.y),i,"direct tap picked another star");
      for(const q of fit.slots.slice(0,i))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>(p.size+q.size)/2,"visible stars overlap");
      const half=p.size/2,angle=p.angle*Math.PI/180;
      for(const dx of [-half,0,half])for(const dy of [-half,0,half]){
        const x=Math.round((p.x+dx*Math.cos(angle)-dy*Math.sin(angle))*info.width/fit.width),y=Math.round((p.y+dx*Math.sin(angle)+dy*Math.cos(angle))*info.height/fit.height);
        assert.ok(data[(y*info.width+x)*4+3]>24,`target ${i} lies outside conical glass at ${width}×${height}`);
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
