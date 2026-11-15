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
  {
    id: "star-xiaoye", name: "小叶子", x: 485, y: 335,
    message: `这是一颗星星，是众多芙妮宝里的没那么亮的一颗。原本这颗星星就很黯淡无光，漫无目的地漂泊在宇宙里，就差一点点就要被黑洞吸走了。

后来，这颗星星看到了一束耀眼却又不失温暖的光，是什么呢？！是…是芙芙。自那以后这颗星星成为了芙芙的行星，借着芙芙这颗恒星的光，从黑暗的泥潭里慢慢爬出来。黑夜终将过去，迎来破晓，在宇宙中居无定所的星星总算找到了家的方向。

小叶子问过这颗星星它现在是什么感受，它说：“再也不用自己在黑暗中流泪了，也不用哭着往黑洞飘去。终于拥有了属于自己的太阳，再也不会放手了。”`,
  },
  {
    id: "star-yeshenhua", name: "夜神华", x: 685, y: 270,
    message: "星星原本身处宇宙里的尘埃，有一天星星随着宇宙引力飘呀飘呀，飘到了属于芙芙的星球，成为了芙妮宝星，成为了芙芙的卫星，永远绕着芙芙转，永不分离",
  },
  { id: "star-patrick", name: "派大星", message: "", x: 390, y: 450 },
  { id: "star-kerry", name: "Kerry", message: "", x: 172, y: 308 },
  { id: "star-suyan", name: "苏颜", message: "", x: 415, y: 160 },
  { id: "star-qing", name: "卿取之于蓝", message: "", x: 724, y: 142 },
  { id: "star-zhenghao", name: "正号", message: "", x: 754, y: 378 },
  { id: "star-qianyu", name: "千羽", message: "", x: 578, y: 502 },
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
        id: "xiaoye-anniversary-letter",
        title: "小叶子的周年来信",
        author: "小叶子",
        text: `今天是我陪伴芙芙的第九十四天，还差六天就百天了！那就趁着周年把百天想说的话也写下。其实现在才11.3号，还差一个月才周年呢。这一个月我们还会经历很多很多事情，我是一个会根据发生的点滴来写东西的人，但是这次我并没有这样做。假设一个人的爱总共有100分，那我对芙芙的爱已经是100分啦甚至是101分，哪怕再过十个月、100个月，它都会始终如一。当爱已满溢，想说的话随时随地都可以脱口而出。

周年！证明我的芙已经努力地陪伴了芙妮宝整整一年！我想问芙芙，你过的开心嘛？会不会觉得很累？如果再让你选择一次，你会不会依旧成为我们的芙芙？当然我相信以我对芙芙的了解，我猜的到答案，嘿嘿。无论如何我都想你知道，你比自己想象的要好的太多太多，我很笨，但是一个人有没有真心实意地去对我好，我是可以感受到的。芙芙对芙妮宝的宠溺、真诚和用心，是我从未在别人那里看到过感受到过的。

我记得很深，芙芙说不喜欢情绪价值这个词，就像我们的关系是什么交易一样。我当时知道芙芙的想法之后，我就觉得这个人，她值得世间所有所有最好的爱。芙芙用自己的热忱把我最后一点距离感给彻底碎掉了。我感觉自己看事情变得更加开，更加淡。如果是以前的我，连跪六把游戏之后，我很长一段时间还会难过，还会不解。现在的我对情绪的调节力更强了。就像自己被外界一拳一拳地打趴之后，我可以回到狐狸窝抱抱芙芙获取力量，也许这就是心里有了牵挂的感觉。我的情绪不会再过夜了，很快就可以被消化掉。

一周年了，我只陪芙芙走过了四分之一的时间呢，其实可能会有一点点不甘心？要是自己可以再早一点认识芙芙的话，自己是不是会变得更好呢。但人生没有如果，我能做的只有认认真真过好未来，过好以后的每一天。

根据我的观察的话，好像我的芙总是会有一些病痛，好心疼呀。所以未来这些时间呢，我好像没有什么愿望，也没有太多希望芙芙做的事情。只有一个，我真的好希望你可以好好照顾自己。听到你不舒服我真的好心碎好心碎。我的芙已经很努力了，你没有让任何芙妮宝失望，不要因为休息而感到不好意思，每次只要休息一个晚上，第二天哪怕再不舒服你也会坚持播播。其实我很不希望看到这样呜呜（原谅我有点多嘴）哪怕我再想芙芙，我也希望你能好好的。我可以两三天不看直播，但是我不能看着你难受两三天。所以未来，要对自己更好一点好吗？希望芙芙对自己的爱，要比我对你的爱多更多。

好啦，最最最后，作为放映机的视频产出者，我希望这个视频芙芙会喜欢。我知道大家对芙芙的爱不止一点，只是很多人都不轻易言说，所以我想用自己笨拙的努力，把大家团结在一起，让芙芙能感受到更多更多的爱。然后不用担心我会辛苦或者有压力哦，因为我很享受为爱的人多做点什么的感觉，像是自己在认真地爱着对方的证明。周年快乐！以后的周年，小叶子都会在你的身边。`,
      },
      {
        id: "yeshenhua-anniversary-letter",
        title: "夜神华的周年来信",
        author: "夜神华",
        text: "今天是芙芙的周年，周年快乐！！！！！上芙芙的船也有三个月了哦，呜呜呜，好像芙芙生日的时候要说的都说完了，虽然不知道说什么，但是夜神华会一直陪着芙芙，期待芙芙越来越好，越来越鬼脑（），喜欢芙芙，因为芙芙每晚有芙芙睡的非常安心，嘿嘿嘿",
      },
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
