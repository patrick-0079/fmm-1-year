const morning = new URL("./assets/album-v36/morning.webp", import.meta.url).href;
const morningThumb = new URL("./assets/album-v36/morning-thumb.webp", import.meta.url).href;
const reading = new URL("./assets/album-v36/reading.webp", import.meta.url).href;
const readingThumb = new URL("./assets/album-v36/reading-thumb.webp", import.meta.url).href;
const bass = new URL("./assets/album-v36/bass.webp", import.meta.url).href;
const bassThumb = new URL("./assets/album-v36/bass-thumb.webp", import.meta.url).href;
const fox = new URL("./assets/album-v36/fox.webp", import.meta.url).href;
const foxThumb = new URL("./assets/album-v36/fox-thumb.webp", import.meta.url).href;

export type MediaKind = "text" | "image" | "audio" | "video";
export interface Memory {
  id: string;
  title: string;
  author?: string;
  text?: string;
  src?: string;
  thumbnail?: string;
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

// id 也是落星的存档键。改署名或寄语时保留 id；新增成员选一处空草地。
export const producers = [
  { id: "star-patrick", name: "派大星", message: "xxx", x: 390, y: 450 },
  { id: "star-kerry", name: "Kerry", message: "xxx", x: 172, y: 308 },
  { id: "star-suyan", name: "苏颜", message: "xxx", x: 415, y: 160 },
  { id: "star-qing", name: "卿取之于蓝", message: "xxx", x: 724, y: 142 },
  { id: "star-zhenghao", name: "正号", message: "xxx", x: 754, y: 378 },
  { id: "star-qianyu", name: "千羽", message: "xxx", x: 578, y: 502 },
];

export interface Encouragement {
  message: string;
  author?: string;
  title?: string;
}
// 再次回床时可在小叶子的固定便签后附一条鼓励。
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
    subtitle: "把平凡的一天，也轻轻放进回忆里。",
    kind: "image",
    items: [
      { id: "fufu-morning", title: "草莓吐司的早晨", src: morning, thumbnail: morningThumb,
        alt: "芙芙在小屋窗边捧着草莓杯，桌上放着果酱吐司与雏菊。",
        text: "阳光刚好落到桌边，吐司还是热的。今天，也慢慢来吧。" },
      { id: "fufu-reading", title: "雨声翻过一页书", src: reading, thumbnail: readingThumb,
        alt: "芙芙窝在窗边的软椅上读书，窗外下着细雨，身旁亮着暖灯。",
        text: "窗外的雨还没有停，故事也不急着讲完。留一小会儿，给自己。" },
      { id: "fufu-bass", title: "把黄昏弹给你", src: bass, thumbnail: bassThumb,
        alt: "芙芙坐在小屋里练习白色贝斯，夕阳照亮木地板和身旁的小音箱。",
        text: "从一个音，到一小段旋律。等下次见面，再弹给你听。" },
      { id: "fufu-fox", title: "小狐狸也说晚安", src: fox, thumbnail: foxThumb,
        alt: "穿着月星睡衣的芙芙在床边抚摸粉色小狐狸，窗外升起月亮。",
        text: "小尾巴慢慢安静下来。今天辛苦啦，明天再一起出门。" },
    ],
  },
};
