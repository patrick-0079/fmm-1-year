import type { ChatBook, ChatTopic } from "./resident-chats.ts";

type Speech = (text: string, choices: { title: string; run: () => void }[]) => void;
type Choice = { title: string; run: () => void };
interface Introduction {
  text: string;
  branches: readonly (readonly [label: string, answer: string, followUp: string, lead?: string])[];
}

export const senderIntroductions = {
  "visitor-dianziyang": {
    text: "咩。芙芙，你也听见了吗？我沿街走了一圈，一路上都有什么在叮叮响。",
    branches: [
      ["你走两步，我听听", "它试着踮脚走，星坠还是叮了一声。芙芙指出声响就在它下巴底下。", "原来是你的小星星呀"],
      ["我们都站住试试", "四周一下安静。它刚得意地点头，星坠自己响了，两人一起找到答案。", "这下找到声音了"],
    ],
  },
} as const satisfies Record<string, Introduction>;

export function introduceSender(scene: Introduction, say: Speech, finish: () => void) {
  say(scene.text, scene.branches.map(([title, answer, followUp, lead]) => ({
    title, run: () => say(answer, [{title: followUp, run: lead
      ? () => say(lead, [{title: "继续", run: finish}]) : finish}]),
  })));
}

/** Actions such as inviting a companion remain available from either side of a conversation. */
export function showGardenChat(topic: ChatTopic, say: Speech, actions: Choice[] = []) {
  const replies = (topic.replies ?? []).map(([title, text]) => ({
    title, run: () => say(text, actions),
  }));
  say(topic.text, [...actions, ...replies]);
}

export const gardenChatTopics = {
  "visitor-dianziyang": {
    phases: {
      dawn: "露水都挂在耳朵这边的卷毛上。我轻轻一抖……咩，你往后退半步！",
      day: "右边的毛被太阳晒得特别蓬。我换个方向站一会儿，不然看起来要一边大、一边小啦。",
      dusk: "你看我这道影子，一口能吃掉半条街的草。真正的我嘛，再来一小口就饱了。",
      night: "我以为夜里的街上特别安静。刚这么想，领结就叮了一声。它大概有意见。",
    },
    familiar: [
      {text: "咩，我把铃声编成小调了。就是总差半拍，你愿意陪我试一遍吗？",
        replies: [
          ["你走，我来打拍子", "它跟着拍子走了三步，最后多响了一声。它承认：那声是我自己咩的。"],
          ["这次换你学我走", "芙芙停下，它多迈了半步，顺势低头啃草，仿佛本来就打算停在那儿。"],
        ]},
      "我已经听得出你的脚步啦。快到我这儿就会慢下来，接着，准会有人叫我一声。",
    ],
  },
  "garden-guest-balloon-friend": {
    phases: {
      dawn: "早呀。刚醒的时候我和气球都慢半拍，我抬头，它才慢悠悠地点一下我的鼻尖。",
      day: "太阳一出来，桃桃就追着气球的影子跑。云一遮住，它往自己肚皮底下找了半天。",
    },
    familiar: [
      {text: "想玩个小游戏吗？风还没吹到脸上，气球就先知道它从哪边来了。",
        replies: [
          ["我看绳子，你看气球", "芙芙先发现绳结绷紧，两人一起抬头，正好看见气球转身。"],
          ["闭上眼，用脸猜", "星星刚说还没风，气球已经轻轻碰了她一下。她笑着改口：它先猜中了。"],
        ]},
      "你来帮我拿一下线，我想打个喷嚏。上回没交给别人，吓得桃桃和气球一起跳起来了。",
    ],
  },
  "garden-guest-decorator": {
    phases: {
      dawn: "清早的缎带都沉甸甸的，得等太阳把露水晒干。我先去给棉棉擦擦耳朵。",
      night: "我刚发现，灯一亮，蝴蝶结的影子也挂在墙上了。一条缎带，晚上能当两条用呢。",
    },
    familiar: [
      {text: "你觉得这个蝴蝶结歪了没有？我越凑近看，越拿不准。",
        replies: [
          ["我退远一点帮你看", "她照芙芙的手势挪了半指宽，跑过来并排看，果然刚好。"],
          ["这边歪一点特别可爱", "霉霉看了又看，决定把另一边系得端正些，让这个歪结当今天的主角。"],
        ]},
      "我现在能一只手系缎带了。另一只手做什么？护着耳朵啊，小兔子最爱往胳膊底下钻。",
    ],
  },
  "garden-guest-picnic-friend": {
    phases: {
      day: "芙、芙芙，我把野餐篮挪进阴凉里啦。最上面那颗草莓刚刚好，到现在还凉丝丝的。",
      dusk: "你看，现在奶油终于肯好好站着了。刚才太暖，我一转头，它就悄悄往旁边倒。",
    },
    familiar: [
      {text: "我想把蛋糕切成两块一样大的。唔……好像一边尖，一边胖。你来出个主意？",
        replies: [
          ["我挑小块，你吃大的", "晴糖没有推来推去，把大块上的小草莓轻轻分给了芙芙。"],
          ["两块拼起来，我们一起吃", "她把碟子挪到中间，第一次抢在芙芙前面说：那，第一口一起？"],
        ]},
      "芙芙！今天我想先跟你说你好。……说出来了。原来不在心里练三遍也可以呀。",
    ],
  },
  "elder-gardener": {
    phases: {
      dawn: "早哇，孩子。清晨的苔石最会骗人，看起来像干的，摸上去可凉了。",
      day: "我铲出来的这颗小石头，拿在手心温温的。太阳连土底下都照顾到啰。",
      dusk: "我还没收工，小铲子的影子已经伸到门边了。你瞧，它比我还着急。",
      night: "萤火飞得低，我就把铲子也放低一点。各做各的事，谁都别惊着谁。",
    },
    familiar: [
      {text: "这块土是松是紧，铲子一落我就知道。要不要试着认一认？",
        replies: [
          ["我听听铲子的声音", "铲尖轻轻一嗒。爷爷让芙芙辨出，下面还藏着一颗小石子。"],
          ["我想用手捏一捏", "掌心的土轻轻一碰就散了。爷爷点头，把这一小块留给新芽。"],
        ]},
      "我总忘了哪块地已经松过。后来养成了个法子：一排铲完，转身看看自己的脚印。",
    ],
  },
  "elder-guardian": {
    phases: {
      dawn: "外头清早有鸟叫吗？我每天听见的头一个声音，都是泉水落回池子里。",
      day: "你从外面进来，眼睛要过一会儿才看得清。我在这儿久了，倒是一走出去就要眯眼。",
      dusk: "以前守到这个时候，伙伴就来跟我换班。人还没到，我先认出了他的脚步。",
      night: "外面该看得见月亮了吧。你若看见，回来形容给我听听，今晚它弯得像什么？",
    },
    familiar: [
      {text: "听，一滴水落下去了。泉眼不大，倒能听出好几层远近。",
        replies: [
          ["我们一起数回声", "芙芙数到第二声就停了。守护者也没作声，让她自己听见最轻的第三声。"],
          ["我想知道你平时听什么", "守护者用杖尖轻点脚边：从前只听水。现在偶尔也听见有人走回来。"],
        ]},
      "我年轻时嫌石头太安静，现在偶尔拿手杖敲一下，倒像是和一位老朋友打招呼。",
    ],
  },
} as const satisfies Record<string, ChatBook>;
