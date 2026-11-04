import test from "node:test";
import assert from "node:assert/strict";
import { arriveHome, leaveHome, petFox, readFoxMemory } from "../src/fox-memory.ts";
import { readProgress, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { foxNook, foxDoor } from "../src/room-props.ts";

test("only three completed untouched return visits trigger the fourth quiet welcome",()=>{
  const fox=readFoxMemory();
  leaveHome(fox,true);
  assert.equal(fox.missed,0);
  for(let visit=0;visit<3;visit++) {
    arriveHome(fox,visit===1);
    assert.equal(fox.missed,visit);
    assert.equal(fox.waitingForNote,visit===1);
    leaveHome(fox,true);leaveHome(fox,true);
    assert.equal(fox.missed,visit+1);
  }
  arriveHome(fox,false);
  assert.equal(petFox(fox),"cross");
  const resumed=readProgress(JSON.stringify({roomFox:fox})).roomFox;
  assert.equal(petFox(resumed),"content");
  leaveHome(resumed,true);
  assert.deepEqual(resumed,readFoxMemory());
});
test("petting between misses restarts the streak; walking out after a rebuff restarts soothing",()=>{
  const fox=readFoxMemory();
  arriveHome(fox,false);leaveHome(fox,true);arriveHome(fox,false);
  assert.equal(petFox(fox),"content");leaveHome(fox,true);
  assert.equal(fox.missed,0);
  fox.missed=3;arriveHome(fox,true);
  assert.equal(petFox(fox),"cross");leaveHome(fox,true);
  arriveHome(fox,false);assert.equal(petFox(fox),"cross");
  assert.equal(petFox(fox),"content");
  leaveHome(fox,false);assert.equal(fox.missed,0);
});
test("old saves, bad fox fields and debug trips preserve a playable room",()=>{
  const old=readProgress('{"bedNoteUnlocked":true}');
  assert.deepEqual(old.roomFox,readFoxMemory());assert.equal(old.decoratorMet,false);
  assert.deepEqual(readFoxMemory({missed:87,visit:"petted",rebuffed:true}),{...readFoxMemory(),visit:"petted"});
  const fox=readFoxMemory({missed:2});arriveHome(fox,false);leaveHome(fox,false);
  assert.equal(fox.missed,2);
  const room=scenes.room, door=room.spots.find(s=>s.id==="door")!;
  for(const [from,to] of [[room.spawn,foxNook.approach],[door.approach,foxNook.approach],[foxNook,foxDoor]]) {
    assert.deepEqual(findPath(from,to,room)?.at(-1),to);
  }
});
