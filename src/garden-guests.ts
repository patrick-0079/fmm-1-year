export const gardenGuests = [
  {
    id: "decorator",
    name: "莓莓",
    role: "庆典布置员",
    x: 300,
    y: 410,
    sprite: 5,
    gift: "petBunny" as const,
    line: "彩旗、蛋糕和小花都准备好啦！棉棉也想陪你一起逛逛。祝芙芙直播一周年快乐，每一天都被温柔包围。",
  },
  {
    id: "balloon-friend",
    name: "星星",
    role: "气球客",
    x: 265,
    y: 310,
    sprite: 9,
    gift: "petCat" as const,
    line: "我带来一只软乎乎的奶油猫。点开背包让桃桃同行，慢慢走，也是一种很好的庆祝方式。",
  },
  {
    id: "picnic-friend",
    name: "晴糖",
    role: "野餐帮手",
    x: 620,
    y: 385,
    sprite: 3,
    gift: null,
    line: "想把这一年的喜欢，分成六块甜甜的蛋糕。回小屋可以沿虚线切开，再和芙芙一起尝一口。",
  },
];
export const gardenCritters = [
  { x: 335, y: 306, id: "petBunny" as const, phase: 0 },
  { x: 505, y: 350, id: "petCat" as const, phase: 2 },
  { x: 304, y: 455, id: "petBunny" as const, phase: 4 },
  { x: 684, y: 380, id: "petCat" as const, phase: 1 },
  { x: 480, y: 464, id: "petBunny" as const, phase: 3 },
];
