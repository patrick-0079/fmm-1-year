import { collections, type Memory } from "./content.ts";

export const handedLetters = {
  xiaoye: "xiaoye-anniversary-letter",
  suyan: "suyan-anniversary-letter",
  "radio-host": "yeshenhua-anniversary-letter",
  xiaoyou: "xiaoyou-anniversary-letter",
  guli: "guli-anniversary-letter",
  patrick: "patrick-anniversary-letter",
} as const;
export type HandedLetterId = typeof handedLetters[keyof typeof handedLetters];
type NpcLetterId = Exclude<HandedLetterId, typeof handedLetters.patrick>;
const handedLetterIds: readonly string[] = Object.values(handedLetters);
function isNpcLetter(id: string): id is NpcLetterId {
  return id !== handedLetters.patrick && handedLetterIds.includes(id);
}

export interface ResidentStory {
  npcLetters: Partial<Record<NpcLetterId, "unread" | "read">>;
  postDelivered: boolean;
  postReadRevision: number;
  patrickArrived: boolean;
  patrickDelivered: boolean;
  patrickRead: boolean;
  welcomeReceived: boolean;
  cake: "new" | "reserved" | "eaten";
  // The keeper gives her journal when she welcomes the player to the quest.
  // Players who heard this invitation before the portable journal already own it.
  guardianInvited: boolean;
}

// Increment for a new letter revision so readers of an earlier text see it unread.
export const POST_LETTER_REVISION = 2;
export const postLetter: Memory = {
  id: "post-anniversary-letter",
  title: "红笺送来的信",
  author: "红笺 · 周年小镇邮局",
  text: `芙芙，见字安。

乖乖，这一次，轮到你收一封晚安了。

我在邮局整理信件时，总会看到一些很小的事情：有人记着你随口说过的鼓励，有人把听你直播的夜晚写进日记，也有人不太会表达，写了又擦，最后只留下“一周年快乐”。纸张薄薄的，装着的心意却一点也不轻。

愿你读到这些信时，也能安心地给自己放一小会儿假。好好吃饭，睡一个踏实的觉。来不及说的晚安，可以留到明天。

你曾把晚安送到许多人身边。今天，这些晚安都沿着来时的路，轻轻回到你手里。

小镇的花还会开，邮局的灯也会亮着。往后的日子里，愿你有喜欢做的事，也有可以什么都不做的下午；有人陪你热热闹闹地笑，也有人懂得陪你安安静静地歇一会儿。

一周年快乐，乖乖。

下一次路过邮局，不用带信，也欢迎你来坐坐。`,
};

export const patrickLetter: Memory = {
  id: handedLetters.patrick,
  title: "派大星的周年来信",
  author: "派大星",
  text: `芙芙，晚上好！

展信佳！

谢谢你这一年来的陪伴。想留住那些一起度过的晚安，我做了这个小小的游戏，送给你当作一周年礼物。希望走到这片花海时，你也能在火边安心歇一会儿。

一周年快乐！愿接下来的日子里，开心的事多一点，累了也能好好休息。期待下一年继续和芙芙一起，度过更多温暖的夜晚。

派大星
2026年11月20日`,
};

export function readResidentStory(value?: Partial<ResidentStory> | null): ResidentStory {
  const revision = value?.postReadRevision;
  const npcLetters: ResidentStory["npcLetters"] = {};
  for (const id of handedLetterIds) {
    if (!isNpcLetter(id)) continue;
    const status = value?.npcLetters?.[id];
    if (status === "unread" || status === "read") npcLetters[id] = status;
  }
  return {
    npcLetters,
    postDelivered: value?.postDelivered === true,
    postReadRevision: value?.postDelivered === true && typeof revision === "number" &&
      Number.isSafeInteger(revision) && revision > 0 ? revision : 0,
    patrickArrived: value?.patrickArrived === true || value?.patrickDelivered === true,
    patrickDelivered: value?.patrickDelivered === true,
    patrickRead: value?.patrickDelivered === true && value.patrickRead === true,
    welcomeReceived: value?.welcomeReceived === true,
    cake: value?.cake === "reserved" || value?.cake === "eaten" ? value.cake : "new",
    guardianInvited: value?.guardianInvited === true,
  };
}

export function mailboxLetters(story: ResidentStory) {
  return [
    ...collections.letters.items.filter(({ id }) => !isNpcLetter(id) || story.npcLetters[id]),
    ...(story.postDelivered ? [postLetter] : []),
    ...(story.patrickDelivered ? [patrickLetter] : []),
  ];
}

export function hasHandedLetter(story: ResidentStory, id: HandedLetterId) {
  return id === handedLetters.patrick ? story.patrickDelivered : !!story.npcLetters[id];
}

export function collectHandedLetter(story: ResidentStory, id: HandedLetterId): Memory | undefined {
  if (hasHandedLetter(story, id)) return;
  if (id === handedLetters.patrick) {
    if (!story.patrickArrived) return;
    story.patrickDelivered = true;
    return patrickLetter;
  }
  if (!isNpcLetter(id)) return;
  const letter = collections.letters.items.find(item => item.id === id);
  if (letter) story.npcLetters[id] = "unread";
  return letter;
}

export interface LetterHandoff {
  received: (id: HandedLetterId) => boolean;
  collect: (id: HandedLetterId) => boolean;
  read: (id: HandedLetterId) => void;
}

export function letterChoice(mail: LetterHandoff, id: HandedLetterId, refresh: () => void) {
  return mail.received(id)
    ? { title: "现在读信", run: () => mail.read(id) }
    : { title: "收下信", run: () => { if (mail.collect(id)) refresh(); } };
}

export function postUnread(story: ResidentStory, revision = POST_LETTER_REVISION) {
  return story.postDelivered && story.postReadRevision < revision;
}

export function unreadLetterIds(story: ResidentStory) {
  const ids = collections.letters.items.map(letter => letter.id)
    .filter(id => isNpcLetter(id) && story.npcLetters[id] === "unread");
  if (postUnread(story)) ids.push(postLetter.id);
  if (story.patrickDelivered && !story.patrickRead) ids.push(patrickLetter.id);
  return ids;
}

export function markLetterRead(story: ResidentStory, id: string) {
  if (isNpcLetter(id) && story.npcLetters[id] === "unread") {
    story.npcLetters[id] = "read";
    return true;
  }
  if (id === postLetter.id && postUnread(story)) {
    story.postReadRevision = POST_LETTER_REVISION;
    return true;
  }
  if (id === patrickLetter.id && story.patrickDelivered && !story.patrickRead) {
    story.patrickRead = true;
    return true;
  }
  return false;
}
