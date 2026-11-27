import { actionOption } from "./dialogue-options.ts";
import type { Phase } from "./day.ts";
import type { World } from "./world.ts";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story.ts";

export type VisitorGesture = "idle" | "tap" | "slap" | "slapOffer" | "tilt" | "tiltBack" | "push" | "stroke" | "nuzzle" | "rub" |
  "bow" | "catch" | "wave" | "heart" | "tug" | "handshake" | "case" | "give" | "checklist" | "beckon";
export type GardenSpeaker = "suyan" | "pigeon" | "zhenghao" | "rabe";
interface Page {
  text: string;
  title?: string;
  gesture?: VisitorGesture;
  choices?: readonly (readonly [label: string, next: string])[];
  offer?: boolean;
  completesIntro?: boolean;
}
interface Script {
  phases: Partial<Record<Phase, string>>;
  other: readonly string[];
  pages: Record<string, Page>;
}
const takeLetter = "收下信封";
const stroke = actionOption("摸摸正号猫");
const lightTap = actionOption("奖励一个小巴掌");

export const gardenVisitorScripts: Record<GardenSpeaker, Script> = {
  suyan: {
    phases: {dawn:"dawn",day:"day",night:"night"}, other:["miss","visit"],
    pages: {
      intro: {text:"芙芙，你看我的帽子是不是超可爱", choices:[["对哦超超可爱的","cute"]]},
      cute: {text:"我是可爱", choices:[["咦？","puzzled"],[lightTap,"tap"]]},
      puzzled: {text:"我是可爱", choices:[[lightTap,"tap"]]},
      tap: {text:"无反应", gesture:"tap", choices:[[actionOption("奖励一个大巴掌"),"offer"]]},
      offer: {text:"这下爽了，对了，这里有一封信请你收下！", gesture:"slapOffer", offer:true},
      received: {text:"（芙芙收好信封。）", gesture:"give", offer:true},
      dawn: {text:"早上好呀芙芙，要不要抽我一巴掌当起床的热身活动！", choices:[[actionOption("抽一巴掌"),"dawn-yes"],["不要","dawn-no"]]},
      "dawn-yes": {text:"舒服呀～", gesture:"tap"},
      "dawn-no": {text:"好吧TvT，那也希望你有美好的一天呀～"},
      day: {text:"中午好呀芙芙，要不要抽我一巴掌当开播前的激励活动！", choices:[[actionOption("抽一巴掌"),"day-yes"],["不要","day-no"]]},
      "day-yes": {text:"这一巴掌很有劲呢！看来今天工作音会很给力！", gesture:"slap"},
      "day-no": {text:"好吧TvT，那剩下来的力气就给工作音吧！"},
      night: {text:"晚上好呀芙芙，要早点休息哦，睡前抽我一巴掌，有助于睡眠OvO。", choices:[[actionOption("给一巴掌"),"night-yes"],["不要","night-no"]]},
      "night-yes": {text:"好舒服呀～今晚能睡个好觉了", gesture:"tap"},
      "night-no": {text:"好吧TvT，先欠着，明天再给我"},
      miss: {text:"怎么啦，你又想我了么？想我可以把我关起来OvO"},
      visit: {text:"又来看我，是想占有我了吧，嘿嘿"},
    },
  },
  pigeon: {
    phases:{}, other:["coo"],
    pages: {
      intro: {text:"咕咕，咕咕咕，咕咕咕咕咕！咕咕！", gesture:"tilt", choices:[["咕？","again"]]},
      again: {text:"咕咕咕！(来点涩涩!)", gesture:"tiltBack", choices:[["咕？你说什么？","offer"]]},
      offer: {text:"咕咕！", gesture:"push", offer:true},
      received: {text:"咕咕！", offer:true},
      coo: {title:"《今天你咕了吗？》", text:"咕咕咕！", gesture:"tilt"},
    },
  },
  zhenghao: {
    phases:{dawn:"dawn",day:"day",night:"night"}, other:["again"],
    pages: {
      intro: {text:"你来啦芙芙，我终于等到你了", choices:[[stroke,"pet"],["我也想你了哦小正号","miss"]]},
      pet: {text:"呜～舒服…（手松开后）（正号猫赶紧又继续贴上去）", gesture:"nuzzle", completesIntro:true},
      miss: {text:"（蹭蹭芙芙的脚边）想我了记得多来看看我，好么老大qwq。", gesture:"rub", completesIntro:true},
      dawn: {text:"老大这么早就来看我嘛？", choices:[[stroke,"dawn-pet"]]},
      "dawn-pet": {text:"以后…每天早上都来看我好呢qwq", gesture:"stroke"},
      day: {text:"老大准备开播了么？工作辛苦啦", choices:[[stroke,"day-pet"]]},
      "day-pet": {text:"希望这样能让你更有干劲", gesture:"stroke"},
      night: {text:"老大辛苦了，记得早点休息呀", choices:[[stroke,"night-pet"]]},
      "night-pet": {text:"喜欢你…希望这样能让你的压力都丢掉然后好好睡觉", gesture:"stroke"},
      again: {text:"老大还是想起我啦（哼一声）（头低下准备被摸）", gesture:"bow", choices:[[stroke,"again-pet"]]},
      "again-pet": {text:"（摸摸正号猫）", gesture:"stroke"},
    },
  },
  rabe: {
    phases:{dawn:"dawn",day:"day",night:"night"}, other:["exam","play"],
    pages: {
      intro: {text:"（触手拉住了路过的芙芙）（制止）抱歉哦，他们有点不懂事", gesture:"catch", choices:[["没事哦","offer"]]},
      offer: {text:"受伤了，记得来找我。对了，药箱里还有除了药品之外的东西（触手拿出一封信）", gesture:"case", offer:true},
      received: {text:"（芙芙收好信封。）", gesture:"give", offer:true},
      dawn: {text:"早呀，在花园里呼吸新鲜空气对身体很好哦～（触手开心地挥舞着与你打招呼）", gesture:"wave"},
      day: {text:"中午好，芙芙午播不要太累了（触手比了个爱心）", gesture:"heart"},
      night: {text:"工作辛苦啦，早点回去休息（触手把你往小屋拉了拉）", gesture:"tug", choices:[["好哦，我会注意休息的","close"]]},
      exam: {text:"（正在整理体检结果）记得照顾好自己，常去体检看看身体情况", gesture:"checklist"},
      play: {text:"（触手好像很想和你玩）", gesture:"beckon", choices:[[actionOption("和它们握握“手”"),"shake"]]},
      shake: {text:"（摸起来软乎乎的）", gesture:"handshake"},
    },
  },
};

type Say = (text:string, choices:{title:string;run:()=>void}[], gesture:VisitorGesture, title?:string)=>void;

export function greetGardenVisitor(key:GardenSpeaker, id:string, world:Pick<World,"chats"|"currentPhase"|"currentDay"|"currentHours">,
  mail:LetterHandoff, say:Say, close:()=>void) {
  const script=gardenVisitorScripts[key];
  const letter=key==="zhenghao" ? undefined : handedLetters[key];
  function show(pageId:string) {
    if(pageId==="close"){ close(); return; }
    const page=script.pages[pageId];
    const choices=page.offer && letter
      ? [letterChoice(mail,letter,()=>show("received"),takeLetter)]
      : (page.choices??[]).map(([title,next])=>({title,run:()=>show(next)}));
    say(page.text,choices,page.gesture??"idle",page.title);
    if(page.completesIntro)world.chats.introduce(id);
  }
  if(letter ? !mail.received(letter) : !world.chats.introduced(id)) {
    show("intro"); return;
  }
  const opening=script.phases[world.currentPhase];
  const index=world.chats.daily(id,world.currentPhase,world.currentDay,world.currentHours,!!opening,script.other.length);
  show(index===-1 && opening ? opening : script.other[Math.max(0,index)]);
}
