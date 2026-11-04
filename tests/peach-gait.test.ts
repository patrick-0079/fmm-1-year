import test from "node:test";
import assert from "node:assert/strict";
import {PeachGait} from "../src/peach-gait.ts";

test("four planted-paw phases follow distance, stop at rest, and agree at different frame rates",()=>{
  const cat=new PeachGait(), small=new PeachGait(), frames=[];
  for(let i=1;i<=26;i++){
    cat.move({x:i-1,y:0},{x:i,y:0});
    for(let j=0;j<4;j++)small.move({x:i-1+j/4,y:0},{x:i-1+(j+1)/4,y:0});
    frames.push(cat.frame);
    assert.equal(cat.frame,small.frame);
  }
  assert.equal(new Set(frames).size,4);
  assert.equal(cat.facing,"right");
  cat.move({x:26,y:0},{x:26,y:0});
  assert.equal(cat.walking,false);assert.equal(cat.frame,1);
});
test("peach turns for all four directions and a relocation never advances the walk cycle",()=>{
  const cat=new PeachGait();
  for(const [dx,dy,face] of [[-3,1,"left"],[1,-3,"back"],[1,3,"front"],[3,-1,"right"]] as const) {
    cat.move({x:0,y:0},{x:dx,y:dy});assert.equal(cat.facing,face);assert.ok(cat.walking);
  }
  cat.move({x:30,y:52},{x:220,y:40});assert.equal(cat.walking,false);assert.equal(cat.frame,1);
});
