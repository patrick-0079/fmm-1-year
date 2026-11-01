import type { ItemId } from "./items";
import type { GameId } from "./arcade-engines";
export const ARCADES: Record<
  GameId,
  {
    title: string;
    short: string;
    x: number;
    y: number;
    reward: ItemId;
    instructions: string;
  }
> = {
  snake: {
    title: "星糖贪吃蛇",
    short: "星糖摊",
    x: 500,
    y: 320,
    reward: "candyClip",
    instructions: "方向键 / WASD 吃星糖，收集 6 颗。别碰墙，也别咬到自己。",
  },
  blocks: {
    title: "晚安方块",
    short: "方块屋",
    x: 1090,
    y: 490,
    reward: "headphones",
    instructions: "左右移动，上键旋转，下键加速，空格落下。累计消除 4 行。",
  },
  hop: {
    title: "月兔跳一跳",
    short: "月兔台",
    x: 465,
    y: 575,
    reward: "moonBag",
    instructions:
      "按住空格或蓄力键，松开跳跃；短按近跳，长按远跳。到达 8 个新平台。",
  },
  flight: {
    title: "芙芙晚安飞行",
    short: "晚安飞行站",
    x: 1050,
    y: 600,
    reward: "starWings",
    instructions: "点击画面或按空格轻拍翅膀，穿过 8 道星门。",
  },
  link: {
    title: "晚安心愿连连看",
    short: "心愿连连屋",
    x: 690,
    y: 350,
    reward: "roseDress",
    instructions:
      "连接相同心愿图案，连线最多拐两次。没有倒计时，可用提示与洗牌；8 对即可领奖。",
  },
  mines: {
    title: "晨露花田扫雷",
    short: "晨露花田",
    x: 1240,
    y: 470,
    reward: "mintCape",
    instructions:
      "6×5 小花田里只有 4 处小挫折，第一下和周围都安全。翻开安全格，F 标旗，有 3 次安全提示。",
  },
  miner: {
    title: "星光黄金矿工",
    short: "星光矿工",
    x: 550,
    y: 900,
    reward: "starShoes",
    instructions:
      "等钩子指向星矿或礼盒，按空格放钩。没有倒计时，落空不扣分，160 心愿金即可领奖。",
  },
};
export interface TownNpc {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  sprite: number;
  lines: string[];
  game?: GameId;
  gift?: ItemId;
}
export const TOWN_NPCS: TownNpc[] = [
  {
    id: "florist",
    name: "青芽",
    role: "花店店主",
    x: 466,
    y: 290,
    sprite: 0,
    lines: [
      "花店今天把最柔软的颜色都留给芙芙。一周年快乐，愿每一次开播都像花开。",
      "花环可以从背包里佩戴。往东走过石阶，就是甜甜的蛋糕店。",
    ],
  },
  {
    id: "baker",
    name: "栗栗",
    role: "蛋糕师",
    x: 777,
    y: 319,
    sprite: 1,
    lines: [
      "今天的招牌是「一整年的晚安」草莓蛋糕。第一块当然留给芙芙。",
      "往下走到小广场，还能去星糖摊玩贪吃蛇，带回一枚星糖发夹。",
    ],
  },
  {
    id: "post",
    name: "红笺",
    role: "周年邮差",
    x: 320,
    y: 674,
    sprite: 2,
    lines: [
      "有些话不必急着说完。把每一份晚安折好，都会成为这一年的回信。",
      "小屋里的信箱已经收到了真实来信。这里的镇民是庆典里的游戏角色。",
    ],
  },
  {
    id: "maker",
    name: "紫绫",
    role: "饰品工匠",
    x: 1191,
    y: 446,
    sprite: 3,
    lines: [
      "发夹、耳机、花环……这些小东西，会替你记住今天。",
      "每个小游戏都有专属纪念奖励。按 B 打开衣橱，头饰、衣服、鞋子、背包和胸针都能单独搭配，还可以邀请小伙伴同行。",
    ],
  },
  {
    id: "radio-host",
    name: "夜弦",
    role: "晚安电台主持",
    x: 1305,
    y: 842,
    sprite: 4,
    lines: [
      "这里是周年晚安电台。今晚也把声音调轻一点，把心事慢慢放下来。",
      "小镇入夜后，街角的灯会一盏盏暖起来。电台门口也有一盏为你留着。",
    ],
  },
  {
    id: "books",
    name: "墨桃",
    role: "相册书屋店主",
    x: 867,
    y: 782,
    sprite: 5,
    lines: [
      "这一页写初见，下一页写陪伴。第一年的故事，已经装订成很珍贵的一本。",
      "如果想回看留言与图片，随时可以回晚安小屋。收集的饰品都会跟着你。",
    ],
  },
  {
    id: "snake-keeper",
    name: "青团",
    role: "星糖摊主",
    x: 548,
    y: 345,
    sprite: 6,
    game: "snake",
    lines: ["想把星糖串成一条甜甜的晚安吗？来挑战星糖贪吃蛇吧。"],
  },
  {
    id: "blocks-keeper",
    name: "桃汽",
    role: "方块屋店员",
    x: 1132,
    y: 520,
    sprite: 7,
    game: "blocks",
    lines: ["把零零碎碎的小事拼在一起，也能成为完整的一年。来消几行晚安方块？"],
  },
  {
    id: "hop-keeper",
    name: "阿澈",
    role: "月兔台管理员",
    x: 514,
    y: 616,
    sprite: 8,
    game: "hop",
    lines: ["小小蓄力，再跳一步。成功抵达八个新平台，就把月兔背包带走。"],
  },
  {
    id: "flight-keeper",
    name: "柚星",
    role: "晚安飞行员",
    x: 1092,
    y: 630,
    sprite: 9,
    game: "flight",
    lines: ["每一次轻轻振翅，都离星星近一点。飞过八道星门，送你星翼发饰。"],
  },
  {
    id: "welcome",
    name: "银铃",
    role: "庆典迎宾员",
    x: 625,
    y: 565,
    sprite: 10,
    gift: "anniversaryPin",
    lines: [
      "欢迎来到芙芙的一周年小镇！这枚纪念胸针，是我们准备的见面礼。",
      "小镇有十五位居民和七个游乐摊位。领奖之后也能继续玩，达到双倍目标还有额外的兔兔斜挎包。沿着石板路慢慢逛吧。",
    ],
  },
  {
    id: "photo-visitor",
    name: "暖栗",
    role: "街角摄影爱好者",
    x: 982,
    y: 489,
    sprite: 11,
    lines: [
      "刚才的光正好落在花上。想把芙芙一周年的每个小瞬间，都好好留住。",
      "广场旁有小路通向溪边。夜里的桥和街灯，也很适合慢慢看。",
    ],
  },
  {
    id: "walker",
    name: "蓝莓",
    role: "散步的镇民",
    x: 492,
    y: 797,
    sprite: 12,
    lines: [
      "我最喜欢这条有转弯的小路，走着走着，总能遇见一点新的快乐。",
      "愿芙芙下一个周年，也能带着喜欢的事和喜欢的人一起到来。",
    ],
  },
  {
    id: "bunny",
    name: "绒月",
    role: "月兔吉祥物",
    x: 740,
    y: 535,
    sprite: 13,
    lines: [
      "啾。今天也把月亮装进小口袋里，送给努力了一整年的芙芙。",
      "累了就回小屋躺一会。醒来以后，小镇和大家还在这里。",
    ],
  },
  {
    id: "cat",
    name: "奶糖",
    role: "巡街小猫",
    x: 1092,
    y: 156,
    sprite: 14,
    lines: [
      "喵，路过的周年祝福已签收！请带上今天的小快乐继续出发。",
      "巷子里的花、书屋旁的池塘、桥那边的溪水……都是我巡街时喜欢的角落。",
    ],
  },
];
export const TOWN_FRAMES = [
  { x: 65, y: 39, w: 225, h: 318 },
  { x: 374, y: 20, w: 207, h: 337 },
  { x: 665, y: 36, w: 224, h: 320 },
  { x: 936, y: 26, w: 248, h: 332 },
  { x: 1250, y: 32, w: 221, h: 326 },
  { x: 80, y: 371, w: 206, h: 320 },
  { x: 364, y: 374, w: 200, h: 319 },
  { x: 647, y: 371, w: 243, h: 322 },
  { x: 951, y: 376, w: 199, h: 322 },
  { x: 1240, y: 385, w: 243, h: 314 },
  { x: 75, y: 710, w: 206, h: 297 },
  { x: 338, y: 711, w: 258, h: 296 },
  { x: 647, y: 707, w: 233, h: 300 },
  { x: 993, y: 735, w: 146, h: 272 },
  { x: 1263, y: 771, w: 187, h: 236 },
];
