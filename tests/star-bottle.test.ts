import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { producers } from "../src/content.ts";
import { BOTTLE_REFERENCE,bottleEntries,bottleGeometry,bottleScrollTop } from "../src/star-bottle-layout.ts";

test("the bottle keeps real saved ids and paginates only discovered stars",()=>{
  const old=producers.slice(2).map(person=>person.id);
  assert.deepEqual(bottleEntries(producers,[],true),[]);
  const known=bottleEntries(producers,[old[5],...old,old[0],"missing-id"],true);
  assert.deepEqual(known.map(person=>person.id),old);
  assert.deepEqual(known.map(person=>[person.page,person.slot]),[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]]);
  assert.ok(known.every(person=>person.message===""));
  assert.deepEqual(bottleEntries(producers,[producers[1].id,producers[6].id],true).map(person=>person.name),["夜神华","正号"]);
  const all=bottleEntries(producers,producers.map(person=>person.id),false);
  assert.equal(all.length,8);assert.ok(all.every(person=>person.page===0));
});

test("44px bottle targets fit the raster and never overlap at minimum phone and desktop frames",async()=>{
  const {data,info}=await sharp(fileURLToPath(new URL("../src/assets/star-bottle-closeup.webp",import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,BOTTLE_REFERENCE.width);assert.equal(info.height,BOTTLE_REFERENCE.height);
  for(const [width,height,compact] of [[290,298/1.5-8,true],[352,360/1.5-8,true],[266.8,330,false],[440,590,false]] as const){
    const fit=bottleGeometry(width,height,compact);assert.ok(fit.width<=width&&fit.height<=height);
    for(const [i,p] of fit.slots.entries()){
      assert.ok(p.x>=22&&p.x+22<=fit.width&&p.y>=22&&p.y+22<=fit.height,"a target escaped the sprite rectangle");
      for(const q of fit.slots.slice(0,i))assert.ok(Math.abs(p.x-q.x)>=44-1e-6||Math.abs(p.y-q.y)>=44-1e-6,"star target boxes overlap");
      for(const dx of [-21,0,21])for(const dy of [-21,0,21]){
        const x=Math.round((p.x+dx)*info.width/fit.width),y=Math.round((p.y+dy)*info.height/fit.height);
        assert.ok(data[(y*info.width+x)*4+3]>24,`target ${i} lies outside conical glass at ${width}×${height}`);
      }
    }
  }
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
