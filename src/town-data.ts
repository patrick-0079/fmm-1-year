import type { ItemId } from "./items";
import type { GameId } from "./arcade-engines";
export const mineRules = [
  "6 × 5 块石砖里藏着 4 道裂隙。翻开全部 26 块安全砖就能过关，插旗多少不影响胜负。翻到裂隙则本局结束。",
  "第一次翻开的砖和周围最多八块都安全。数字表示周围八个方向（含斜角）共有几道裂隙。空白砖会连同相邻的安全区域一起展开。",
  "鼠标左键翻开，右键在指向的砖上插旗，再点右键拔旗。带旗的砖受保护，要先拔旗才能翻开。",
  "触屏直接点砖翻开。打开「触屏插旗」后，点砖即可插旗或拔旗，关闭后恢复翻开。",
  "键盘用方向键选砖，空格翻开。菜单键或 Shift + F10 可以切换旗子，也可以用 Tab 选中「标记所选格」并按 Enter。每盘有三次「安全提示」，每次可翻开一块未标记的安全砖。",
] as const;
export const ARCADES: Record<
  GameId,
  {
    title: string;
    short: string;
    scene: "town" | "ruins";
    x: number;
    y: number;
    reward: ItemId;
    instructions: string;
  }
> = {
  snake: {
    title: "苔纹贪吃蛇",
    short: "蛇纹苔庭",
    scene: "ruins",
    x: 126,
    y: 326,
    reward: "candyClip",
    instructions: "用方向键 / WASD 或画面上的方向按钮引导玉蛇，点亮 6 枚叶芽。留意石壁和自己的蛇尾。",
  },
  blocks: {
    scene: "town",
    title: "晚安方块",
    short: "方块屋",
    x: 1057,
    y: 492,
    reward: "headphones",
    instructions: "左右移动，上键旋转，下键加速，空格落下。累计消除 4 行。",
  },
  hop: {
    scene: "town",
    title: "月兔跳一跳",
    short: "月兔台",
    x: 448,
    y: 570,
    reward: "moonBag",
    instructions:
      "按住空格或蓄力键，松开跳跃；短按近跳，长按远跳。到达 8 个新平台。",
  },
  flight: {
    scene: "town",
    title: "芙芙晚安飞行",
    short: "晚安飞行站",
    x: 710,
    y: 454,
    reward: "starWings",
    instructions: "点击画面或按空格轻拍翅膀，穿过 8 道星门。",
  },
  link: {
    scene: "town",
    title: "晚安心愿连连看",
    short: "心愿连连屋",
    x: 570,
    y: 332,
    reward: "roseDress",
    instructions:
      "连接相同心愿图案，连线最多拐两次。没有倒计时，可用提示与洗牌；8 对即可领奖。",
  },
  mines: {
    title: "星纹石阵扫雷",
    short: "北廊星图室",
    scene: "ruins",
    x: 450,
    y: 143,
    reward: "mintCape",
    instructions:
      "左键翻砖，右键插旗或拔旗。触屏可切换插旗。避开 4 道裂隙，翻开 26 块安全砖。",
  },
  miner: {
    title: "琥珀深井黄金矿工",
    short: "琥珀矿井",
    scene: "ruins",
    x: 792,
    y: 326,
    reward: "starShoes",
    instructions:
      "古绞盘在琥珀井里摇摆。对准晶矿或铜铃按空格或点放钩，收集 160 矿光即可领奖。不限时，落空不扣分。",
  },
};
export function arcadesIn(scene: "town" | "ruins") {
  return (Object.entries(ARCADES) as [GameId, (typeof ARCADES)[GameId]][])
    .filter(([, game]) => game.scene === scene);
}
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
    x: 450,
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
      "沿东北石街走到旧矿场，顺着废轨就能进回声遗迹。西廊住着一条玉蛇，找到六枚叶芽就送你星糖发夹。",
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
    role: "遗迹引路人",
    x: 541,
    y: 369,
    sprite: 6,
    game: "snake",
    lines: ["东北旧矿场的山洞通往回声遗迹。要不要我带你去西廊看看那条玉蛇？"],
  },
  {
    id: "blocks-keeper",
    name: "桃汽",
    role: "方块屋店员",
    x: 1098,
    y: 526,
    sprite: 7,
    game: "blocks",
    lines: ["把零零碎碎的小事拼在一起，也能成为完整的一年。来消几行晚安方块？"],
  },
  {
    id: "hop-keeper",
    name: "阿澈",
    role: "月兔台管理员",
    x: 493,
    y: 612,
    sprite: 8,
    game: "hop",
    lines: ["小小蓄力，再跳一步。成功抵达八个新平台，就把月兔背包带走。"],
  },
  {
    id: "flight-keeper",
    name: "柚星",
    role: "晚安飞行员",
    x: 765,
    y: 500,
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
      "小镇有四个游乐摊。东北旧矿场的山洞通往回声遗迹，里面还有三间试炼石室。领奖后也可以继续玩。",
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
