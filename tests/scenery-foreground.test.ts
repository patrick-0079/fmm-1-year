import test from "node:test";
import assert from "node:assert/strict";
import { polygonContains } from "../src/core.ts";
import { tentRoof } from "../src/meadow-map.ts";
import { stairLintel } from "../src/ruins-map.ts";
import { roomBalloons } from "../src/room-foreground.ts";

test("camp canvas and ruin ivy silhouettes retain their edges without repainting grass or paving",()=>{
  const cases=[
    {name:"tent",outline:tentRoof,solid:[[269,144],[223,176],[190,268],[279,167]],clear:[[222,153],[236,150],[250,150],[240,287],[270,283],[249,251],[209,292]]},
    {name:"ruin lintel",outline:stairLintel,solid:[[763,720],[723,728],[708,818],[856,829]],clear:[[773,710],[741,717],[750,800],[790,800],[775,786]]},
  ];
  for(const {name,outline,solid,clear}of cases){
    for(const [x,y]of solid)assert.ok(polygonContains({x:(x+.5)*900/1536,y:(y+.5)*600/1024},outline),`${name} lost ${x},${y}`);
    for(const [x,y]of clear)assert.ok(!polygonContains({x:(x+.5)*900/1536,y:(y+.5)*600/1024},outline),`${name} background at ${x},${y}`);
  }
});

test("room balloon silhouettes exclude basket, floor and neighbouring balloon fragments",()=>{
  const landmarks=[
    {solid:[[85,770],[40,820],[80,872]],clear:[[35,820],[130,800]]},
    {solid:[[148,830],[105,875],[150,930]],clear:[[100,840],[190,900]]},
    {solid:[[215,878],[175,930],[210,973]],clear:[[200,870],[270,930],[220,980]]},
  ];
  for(const [index,{solid,clear}]of landmarks.entries()){
    const outline=roomBalloons[index];
    for(const [x,y]of solid)assert.ok(polygonContains({x:(x+.5)*600/1536,y:(y+.5)*400/1024},outline),`balloon ${index} lost ${x},${y}`);
    for(const [x,y]of clear)assert.ok(!polygonContains({x:(x+.5)*600/1536,y:(y+.5)*400/1024},outline),`balloon ${index} background at ${x},${y}`);
  }
});
