import { collections, type Memory } from "./content.ts";

export interface ResidentStory {
  postDelivered: boolean;
  postReadRevision: number;
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

export function readResidentStory(value?: Partial<ResidentStory> | null): ResidentStory {
  const revision = value?.postReadRevision;
  return {
    postDelivered: value?.postDelivered === true,
    postReadRevision: value?.postDelivered === true && typeof revision === "number" &&
      Number.isSafeInteger(revision) && revision > 0 ? revision : 0,
    welcomeReceived: value?.welcomeReceived === true,
    cake: value?.cake === "reserved" || value?.cake === "eaten" ? value.cake : "new",
    guardianInvited: value?.guardianInvited === true,
  };
}

export function mailboxLetters(story: ResidentStory) {
  return story.postDelivered ? [...collections.letters.items, postLetter] : collections.letters.items;
}

export function postUnread(story: ResidentStory, revision = POST_LETTER_REVISION) {
  return story.postDelivered && story.postReadRevision < revision;
}
