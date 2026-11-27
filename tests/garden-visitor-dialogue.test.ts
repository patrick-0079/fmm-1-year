import test from "node:test";
import assert from "node:assert/strict";
import { greetGardenVisitor, type GardenSpeaker, type VisitorGesture } from "../src/garden-visitor-dialogue.ts";
import { ResidentChats } from "../src/resident-chats.ts";
import { collectHandedLetter, handedLetters, hasHandedLetter, markLetterRead, readResidentStory } from "../src/resident-story.ts";
import type { Phase } from "../src/day.ts";

function fixture(key:GardenSpeaker){
  const story=readResidentStory();
  const chats=new ResidentChats(()=>story.chats);
  const world={chats,currentPhase:"dawn" as Phase,currentDay:5,currentHours:6};
  const id=key==="suyan"?"garden-guest-suyan":"visitor-"+key;
  const page={text:"",title:"",gesture:"idle" as VisitorGesture,options:[] as {title:string;run:()=>void}[]};
  const greet=()=>greetGardenVisitor(key,id,world,{
    received:letter=>hasHandedLetter(story,letter),
    collect:letter=>!!collectHandedLetter(story,letter),
    read:letter=>{markLetterRead(story,letter);},
  },(text,options,gesture,title)=>Object.assign(page,{text,options,gesture,title:title??""}),
    ()=>Object.assign(page,{text:"",options:[]}));
  const choose=(label:string)=>{
    const button=page.options.find(o=>o.title===label);assert.ok(button,label);button.run();
  };
  return {world,story,page,greet,choose};
}

test("Suyan's question leads back to a player click; only the chosen slap moves Fufu and only collecting delivers",()=>{
  for(const ask of [false,true]){
    const f=fixture("suyan");f.greet();f.choose("对哦超超可爱的");
    if(ask){f.choose("咦？");assert.equal(f.page.gesture,"idle");assert.equal(f.page.options.length,1);}
    f.choose("⌈奖励一个小巴掌⌋");assert.equal(f.page.gesture,"tap");
    f.choose("⌈奖励一个大巴掌⌋");assert.equal(f.page.gesture,"slapOffer");
    assert.deepEqual(f.story.npcLetters,{});f.choose("⌈收下信封⌋");
    assert.equal(f.story.npcLetters[handedLetters.suyan],"unread");f.choose("⌈现在读信⌋");
    assert.equal(f.story.npcLetters[handedLetters.suyan],"read");
    f.greet();f.choose("不要");assert.equal(f.page.gesture,"idle");
    f.greet();assert.match(f.page.text,/关起来/);f.greet();assert.match(f.page.text,/占有/);
    f.world.currentPhase="dusk";f.greet();assert.match(f.page.text,/关起来/);
  }
});

test("Zhenghao offers his letter on either reply at any hour and starts daily chats only after collection",()=>{
  const letter = handedLetters.zhenghao;
  for(const phase of ["dawn","day","dusk","night"] as const) {
    for(const [button, gesture] of [["⌈摸摸正号猫⌋","nuzzle"],["我也想你了哦小正号","rub"]] as const) {
      const f = fixture("zhenghao");
      f.world.currentPhase = phase;
      f.greet();
      f.choose(button);
      assert.equal(f.page.gesture, gesture);
      assert.match(f.page.text, /\n对了老大，我还给你写了一封信。平时说不出口的话，都放在里面啦。$/);
      assert.deepEqual(f.page.options.map(option => option.title), ["⌈收下信封⌋"]);
      assert.deepEqual(f.story.npcLetters, {});
      f.greet();
      assert.equal(f.page.text, "你来啦芙芙，我终于等到你了");
      f.choose(button);
      f.choose("⌈收下信封⌋");
      assert.equal(f.page.text, "（芙芙收好信封，正号又贴过来蹭了蹭。）");
      assert.equal(f.story.npcLetters[letter], "unread");
      assert.deepEqual(f.page.options.map(option => option.title), ["⌈现在读信⌋"]);
      f.greet();
      f.choose("⌈摸摸正号猫⌋");
      assert.equal(f.page.gesture, "stroke");
      assert.equal(f.story.npcLetters[letter], "unread");
    }
  }
});

test("the pigeon's two head tilts and envelope push are distinct; repeats have only coos under their own title",()=>{
  const f=fixture("pigeon");f.greet();assert.equal(f.page.gesture,"tilt");f.choose("咕？");
  assert.equal(f.page.gesture,"tiltBack");f.choose("咕？你说什么？");assert.equal(f.page.gesture,"push");
  assert.deepEqual(f.story.npcLetters,{});f.choose("⌈收下信封⌋");f.greet();
  assert.match(f.page.text,/^咕+[！。]?$/);assert.equal(f.page.title,"《今天你咕了吗？》");assert.equal(f.page.options.length,0);
  assert.equal(f.page.gesture,"tilt");
});

test("Rabe changes gestures with her lines and can greet, tug, sign a heart and shake hands",()=>{
  const f=fixture("rabe");f.greet();assert.equal(f.page.gesture,"catch");f.choose("没事哦");
  assert.equal(f.page.gesture,"case");f.choose("⌈收下信封⌋");assert.equal(f.story.npcLetters[handedLetters.rabe],"unread");
  for(const [phase,gesture] of [["dawn","wave"],["day","heart"],["night","tug"]] as const) {
    f.world.currentPhase=phase;f.greet();assert.equal(f.page.gesture,gesture);
  }
  f.choose("好哦，我会注意休息的");assert.equal(f.page.text,"");
  f.world.currentPhase="dusk";f.greet();assert.match(f.page.text,/体检/);assert.equal(f.page.gesture,"checklist");
  f.greet();assert.equal(f.page.gesture,"beckon");
  f.choose("⌈和它们握握“手”⌋");assert.equal(f.page.gesture,"handshake");
});
