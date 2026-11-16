import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_NPCS } from "../src/town-data.ts";
import { townDialogues } from "../src/town-dialogue.ts";
import { scenes } from "../src/maps.ts";
import { yeshenhuaFrames, yeshenhuaPlacement } from "../src/yeshenhua-art.ts";

test("Yeshinhua retains the radio host's stable identity, authored choices and existing meeting record",()=>{
  const npc=TOWN_NPCS.find(n=>n.id==="radio-host")!;
  assert.equal(npc.name,"夜神华");
  assert.equal(npc.appearance,"yeshenhua");
  assert.deepEqual([npc.x,npc.y],[1305,842]);
  assert.equal(TOWN_NPCS.length,15);
  assert.equal(TOWN_NPCS.filter(n=>n.appearance==="yeshenhua").length,1);
  const oldMeetings=["radio-host","post","walker"];
  assert.ok(oldMeetings.every(id=>TOWN_NPCS.some(n=>n.id===id)));
  const host=townDialogues["radio-host"];
  assert.deepEqual(host.start.choices?.slice(0,2),[
    ["用很多的真心和爱去认真对待听众就好啦","notes"],
    ["其实我没有什么经验，我很幸运遇到了一群爱我的人。","author"],
  ]);
  assert.equal(host.notes.text,"我记下了，我会努力的！");
  assert.equal(host.author.speaker,"作者的话");
  assert.ok(host.author.text.endsWith("而是因为芙芙值得被爱。"));
  assert.deepEqual(host.start.choices?.slice(2),[
    ["你的小牛角好可爱","cow-horns"],
    ["电台开播前会做什么？","cow-stroll"],
  ]);
  assert.equal(host["cow-horns"].text,"嘿嘿，谢谢！我给它们系了紫色的小丝带。走路时会先看看树枝，免得把丝带挂住。");
  assert.equal(host["cow-stroll"].text,"去草地上散一小会儿步，听听风吹过叶子的声音。再把麦克风摆正，给大家送一声软软的晚安。");
  for(const id of ["cow-horns","cow-stroll"])assert.deepEqual(host[id].choices,[["再聊聊电台","start"]]);
  assert.ok(scenes.town.spots.find(s=>s.id==="npc-radio-host")?.title.startsWith("夜神华"));
  assert.ok(scenes.town.walls.some(w=>w.label==="镇民 · 夜神华"));
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
