export type MediaKind = "text" | "image" | "audio" | "video";
export interface Memory {
  id: string;
  title: string;
  author?: string;
  text?: string;
  src?: string;
  alt?: string;
}
export interface Collection {
  title: string;
  subtitle: string;
  kind: MediaKind;
  items: Memory[];
}

export const anniversary = {
  name: "芙眠眠",
  start: "2025.12.01",
  end: "2026.12.01",
  bilibili: "https://space.bilibili.com/3546844953054084",
};

// 按展示顺序排列；后续增加制作人只需在数组末尾追加名字。
export const producers = [
  "派大星",
  "Kerry",
  "苏颜",
  "卿取之于蓝",
  "正号",
  "千羽",
];

export interface Encouragement {
  message: string;
  author?: string;
  title?: string;
}
// 后续把真实鼓励文案添加到这里。空数组显示只读占位，不提供输入入口。
export const encouragements: Encouragement[] = [];

// 将媒体放进 public/media/，src 填写 /media/文件名。空数组会显示正式占位界面。
export const collections: Record<string, Collection> = {
  letters: {
    title: "晚安信箱",
    subtitle: "把想说的话，折成一封小小的信。",
    kind: "text",
    items: [
      {
        id: "kerry-anniversary-letter",
        title: "Kerry 的周年来信",
        author: "Kerry",
        text: "芙芙一周年快乐！从初见到现在，转眼也是5个月过去了。印象最深一句话是，“放心你明天会成功的，我的祝福可是很灵的哦”。第二天迟迟没有进展的实验居然真的有了突破，这可没法把你写进实验操作指南里。他人的鼓励确实能安抚焦虑，给人勇气，感谢有你陪伴。（小小芙多来点谢谢）",
      },
    ],
  },
  album: {
    title: "回忆相册",
    subtitle: "那些值得珍藏的瞬间，都会在这里相遇。",
    kind: "image",
    items: [],
  },
  radio: {
    title: "枕边电台",
    subtitle: "按下播放，让熟悉的声音陪你一会儿。",
    kind: "audio",
    items: [],
  },
  tv: {
    title: "小小放映室",
    subtitle: "留一张软软的座位，等一段喜欢的回忆。",
    kind: "video",
    items: [],
  },
};
