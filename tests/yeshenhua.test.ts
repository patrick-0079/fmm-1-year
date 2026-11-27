import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_NPCS } from "../src/town-data.ts";
import { townDialogues } from "../src/town-dialogue.ts";
import { scenes } from "../src/maps.ts";
import { radioFader, radioFaderPosition, radioWaveFrame, yeshenhuaFrames, yeshenhuaPlacement, yeshenhuaPose } from "../src/yeshenhua-art.ts";
import { canTravelBetween } from "../src/core.ts";
import { townInteriors } from "../src/town-interiors.ts";

test("Yeshinhua retains the radio host's stable identity, authored choices and existing meeting record",()=>{
  const npc=TOWN_NPCS.find(n=>n.id==="radio-host")!;
  assert.equal(npc.name,"夜神华");
  assert.equal(npc.appearance,"yeshenhua");
  assert.deepEqual([npc.x,npc.y],[1305,842]);
  assert.equal(TOWN_NPCS.filter(n=>n.appearance==="yeshenhua").length,1);
  const oldMeetings=["radio-host","post","walker"];
  assert.ok(oldMeetings.every(id=>TOWN_NPCS.some(n=>n.id===id)));
  const host=townDialogues["radio-host"];
  assert.deepEqual(host.start.choices, [
    ["因为你梦想成为主持？", "offer-letter"], ["因为你喜欢？", "offer-letter"],
  ]);
  assert.match(host["offer-letter"].text, /第一时间转播/);
  assert.match(host.studio.text, /调试设备/);
  assert.match(host.night.text, /早点回去休息/);
  assert.ok(scenes.town.spots.find(s=>s.id==="npc-radio-host")?.title.startsWith("夜神华"));
  assert.ok(scenes.town.walls.some(w=>w.label==="镇民 · 夜神华"));
});

test("the night farewell waves the painted palm twice, and reduced motion holds it raised",()=>{
  assert.equal(yeshenhuaPose("night"), 1);
  assert.deepEqual([0,.4,.8,1.2,1.6,2].map(t => radioWaveFrame(t,false)), [0,4,0,4,0,4]);
  assert.deepEqual([0,.4,2].map(t => radioWaveFrame(t,true)), [4,4,4]);
});

test("the studio host reaches the real rightmost mixer fader before pushing it",()=>{
  const room=townInteriors["town-radio"];
  assert.ok(canTravelBetween(room.shifts.night!.foot,radioFader.foot,room.scene));
  assert.ok(Math.hypot(radioFader.foot.x-radioFader.x, radioFader.foot.y-16-radioFader.bottom)<16);
  assert.deepEqual(radioFaderPosition(0,false),{approach:0,cap:radioFader.bottom});
  assert.deepEqual(radioFaderPosition(.55,false),{approach:1,cap:radioFader.bottom});
  assert.equal(radioFaderPosition(1.2,false).cap,radioFader.top);
  assert.deepEqual(radioFaderPosition(2,false),radioFaderPosition(0,true));
});

test("the cow girl's two poses keep both shoes at the same foot anchor without stretching or crossing atlas cells",()=>{
  for(const [i,f]of yeshenhuaFrames.entries()){
    assert.ok(f.x>=i*887 && f.x+f.w<=(i+1)*887);
    assert.ok(f.y>=0 && f.y+f.h<=887);
    assert.ok(f.footX>f.x && f.footX<f.x+f.w && f.footY<f.y+f.h);
    const p=yeshenhuaPlacement(i,1305,842,43),scale=p.w/f.w;
    assert.ok(Math.abs(scale-p.h/f.h)<1e-9);
    assert.ok(Math.abs(p.x+(f.footX-f.x)*scale-1305)<1e-9);
    assert.ok(Math.abs(p.y+(f.footY-f.y)*scale-842)<1e-9);
    assert.ok(Math.abs(p.y+(f.headY-f.y)*scale-799)<1e-9);
  }
});
