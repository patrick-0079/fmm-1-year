import test from "node:test";
import assert from "node:assert/strict";
import type { Point } from "../src/core.ts";
import { jellyfish, MeadowJellies } from "../src/meadow-jellies.ts";
import { campfire, campLetterSpot, meadowExit, meadowFlock, starJar } from "../src/meadow-ground.ts";
import { starIndex } from "../src/stars.generated.ts";

const stars = starIndex.map(s => ({id:s.record.id, x:s.x, y:s.y}));
const host = { x: 182, y: 402 };
const step = 1 / 60;
const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y);
function run(school: MeadowJellies, player: Point, seconds: number, canMeet = true, still = false) {
  for (let i=0; i<Math.round(seconds/step); i++) school.tick(step, player, canMeet, still);
}

test("six jelly patrols leave every current star, grazing walk and camp clear at all collection levels", () => {
  for (const count of [0, 5, stars.length]) {
    const school = new MeadowJellies(stars);
    assert.equal(school.animals.length,6);
    school.setCollected(stars.slice(0,count).map(s=>s.id));
    const initial = school.animals.map(a=>a.at);
    for (let i=0; i<1900; i++) {
      school.tick(step, campfire, true, false);
      school.animals.forEach((j,k) => {
        assert.equal(j.phase,"drift");
        assert.ok(Math.abs(j.at.x-jellyfish[k].x)<=jellyfish[k].rx+.01);
        assert.ok(Math.abs(j.at.y-jellyfish[k].y)<=jellyfish[k].ry+.01);
        for (const star of stars.slice(count)) assert.ok(distance(j.at, {x:star.x,y:star.y+9})>34);
        for (const sheep of meadowFlock) assert.ok(distance(j.at,{x:sheep.x+9,y:sheep.y})>45);
        for (const landmark of [campfire, campLetterSpot, meadowExit, starJar]) assert.ok(distance(j.at,landmark)>64);
      });
      if (i===700) school.animals.forEach((a,k)=>assert.ok(distance(a.at,initial[k])>10));
    }
  }
});

test("all three outlying visitors can join the player, each alone, with twelve stars still on the ground", () => {
  for (const [i, home] of jellyfish.entries()) {
    if (i < 3) continue;
    const school = new MeadowJellies(stars);
    const player = {x:home.x, y:home.y+24};
    let stayed = false;
    for (let frame=0; frame<34/step; frame++) {
      school.tick(step,player,true,false);
      const visitors = school.animals.filter(a=>a.phase!=="drift");
      assert.ok(visitors.length<=1);
      if (school.animals[i].phase==="stay") stayed=true;
    }
    assert.ok(stayed,`jelly at ${home.x},${home.y} should visit`);
  }
});

test("a half-second arrival, a two-second arc, a two-second visit and a single calm departure", () => {
  const school=new MeadowJellies(stars), jelly=school.animals[0];
  run(school,host,.48);
  assert.equal(jelly.phase,"drift");
  run(school,host,.1);
  assert.equal(jelly.phase,"approach");
  let previous=jelly.at;
  for(let i=0;i<120;i++){
    school.tick(step,host,true,false);
    assert.ok(distance(jelly.at,previous)<1.1,"the guest jumped between positions");
    previous=jelly.at;
  }
  assert.equal(jelly.phase,"stay");
  assert.ok(distance(jelly.at,host)>=24 && distance(jelly.at,host)<=30);
  run(school,host,1.8);
  assert.equal(jelly.phase,"stay");
  run(school,host,.3);
  assert.equal(jelly.phase,"return");
  run(school,host,2.5);
  assert.equal(jelly.phase,"drift");
  assert.ok(jelly.cooling>11.5);
  run(school,host,36);
  assert.deepEqual(jelly.lastEncounter,host,"standing still must not re-arm a new meeting");
  assert.ok(school.animals.every(a=>a.phase==="drift"));
});

test("a runner is not followed; leaving during approach glides home and the cooldown survives a quick return", () => {
  const school=new MeadowJellies(stars), jelly=school.animals[0];
  for(let i=0;i<90;i++) school.tick(step,{x:155+1.5*i,y:394},true,false);
  assert.equal(jelly.phase,"drift");
  run(school,host,.8);
  assert.equal(jelly.phase,"approach");
  const before=jelly.at;
  school.tick(step,{x:host.x+100,y:host.y},true,false);
  assert.equal(jelly.phase,"return");
  assert.ok(distance(jelly.at,before)<1);
  run(school,host,3.5);
  assert.equal(jelly.phase,"drift");
  assert.ok(jelly.cooling>10);
});

test("readers, zero foreground delta and reduced motion do not accrue a new approach", () => {
  const school=new MeadowJellies(stars), jelly=school.animals[0];
  run(school,host,.36);
  const pausedAt={...jelly.at};
  for(let i=0;i<100;i++) school.tick(0,host,false,false);
  assert.deepEqual(jelly.at,pausedAt);
  run(school,host,.3);
  assert.equal(jelly.phase,"drift");
  run(school,host,.3);
  assert.equal(jelly.phase,"approach");
  school.tick(0,host,false,false);
  assert.equal(jelly.phase,"return");
  const reduced=new MeadowJellies(stars);
  const fixed=reduced.animals.map(a=>({...a.at}));
  run(reduced,host,20,true,true);
  assert.deepEqual(reduced.animals.map(j=>j.at),fixed);
  assert.equal(reduced.animals[0].heading,-1);
  assert.ok(reduced.animals.every(a=>a.phase==="drift"));
});

test("adding a star in a home loop reroutes the patrol before it enters the meadow", () => {
  const newStar={id:"future-south",x:222,y:374};
  const school=new MeadowJellies([...stars,newStar]);
  for(let i=0;i<1600;i++) {
    school.tick(step,newStar,true,false);
    assert.ok(distance(school.animals[0].at,{x:newStar.x,y:newStar.y+9})>34);
    assert.equal(school.animals[0].phase,"drift","readable star areas remain quiet");
  }
});

test("a patch fully occupied by future stars stays empty until a safe loop becomes available", () => {
  const crowd = [];
  for (let x=145; x<315; x+=18) for (let y=302; y<431; y+=18)
    crowd.push({id:`extra-${x}-${y}`,x,y});
  const school=new MeadowJellies([...stars,...crowd]);
  const resident=school.animals[0];
  assert.equal(resident.visible,false);
  run(school,{x:235,y:368},6);
  assert.equal(resident.phase,"drift");
  assert.equal(resident.lastEncounter,undefined);
  school.setCollected(crowd.map(s=>s.id));
  assert.equal(resident.visible,true);
  const at=resident.at;
  run(school,campfire,2);
  assert.ok(distance(at,resident.at)>2);
  assert.ok(school.animals.every(a=>a.visible));
  school.setCollected([]);
  assert.equal(resident.visible,false,"clearing progress makes the occupied patch quiet again");
});
