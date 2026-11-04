export type ItemId =
  | "wreath"
  | "candyClip"
  | "headphones"
  | "moonBag"
  | "starWings"
  | "anniversaryPin"
  | "echoBrooch"
  | "roseDress"
  | "mintCape"
  | "ribbonShoes"
  | "starShoes"
  | "berryBag"
  | "petBunny"
  | "petCat"
  | "rabbitSatchel";
export const EQUIP_SLOTS = [
  "head",
  "clothes",
  "shoes",
  "backpack",
  "body",
  "pet",
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];
export type Equipped = Partial<Record<EquipSlot, ItemId | null>>;
export const slotNames: Record<EquipSlot, string> = {
  head: "头饰",
  clothes: "衣服",
  shoes: "鞋子",
  backpack: "背包",
  body: "胸针",
  pet: "同行伙伴",
};
export const ITEMS: Record<
  ItemId,
  {
    name: string;
    slot: EquipSlot;
    description: string;
    source: string;
    icon: number;
  }
> = {
  wreath: {
    name: "花园花环",
    slot: "head",
    description: "把花园里的小小喜欢，编在粉色发梢。",
    source: "在花园拾取或采花获得",
    icon: -1,
  },
  candyClip: {
    name: "一周年星糖发夹",
    slot: "head",
    description: "一颗草莓星糖，纪念第一年的甜甜晚安。",
    source: "回声遗迹 · 苔纹贪吃蛇点亮 6 枚叶芽",
    icon: 0,
  },
  headphones: {
    name: "晚安星星耳机",
    slot: "head",
    description: "把一整年的温柔，留在耳边。",
    source: "晚安方块消除 4 行",
    icon: 1,
  },
  moonBag: {
    name: "月兔纪念背包",
    slot: "backpack",
    description: "装上月亮和勇气，下一段冒险也一起走。",
    source: "月兔跳一跳连续到达 8 个平台",
    icon: 2,
  },
  starWings: {
    name: "星翼发饰",
    slot: "head",
    description: "愿芙芙飞过每一个小难关，落在亮着灯的地方。",
    source: "芙芙晚安飞行穿过 8 道星门",
    icon: 3,
  },
  anniversaryPin: {
    name: "一周年纪念胸针",
    slot: "body",
    description: "小镇居民送来的第一枚周年纪念章。",
    source: "与小镇迎宾员交谈领取",
    icon: -2,
  },
  roseDress: {
    name: "周年蔷薇裙",
    slot: "clothes",
    description: "把一周年的温柔，穿成小小的庆典裙。",
    source: "晚安心愿连连看连接 8 对",
    icon: 4,
  },
  echoBrooch: {
    name: "晚安回声胸针",
    slot: "body",
    description: "一弯铜月抱着粉色的小星。今晚的光，是你为芙芙点亮的。",
    source: "回声遗迹 · 点亮星盘，再把月光引到星纹砖",
    icon: -3,
  },
  mintCape: {
    name: "晨露薄荷披肩",
    slot: "clothes",
    description: "轻盈的晨露与奶油色领结。",
    source: "回声遗迹 · 星纹石阵扫雷翻开 26 块安全石砖",
    icon: 5,
  },
  ribbonShoes: {
    name: "草莓缎带鞋",
    slot: "shoes",
    description: "每一步都带一点甜甜的勇气。",
    source: "完成周年礼物配对",
    icon: 6,
  },
  starShoes: {
    name: "星月旅行鞋",
    slot: "shoes",
    description: "踏着星光，继续下一段旅程。",
    source: "回声遗迹 · 琥珀深井黄金矿工收集 160 矿光",
    icon: 7,
  },
  berryBag: {
    name: "草莓野餐背包",
    slot: "backpack",
    description: "装上一块周年蛋糕，出发去野餐。",
    source: "切好蛋糕并和芙芙一起吃一块",
    icon: 8,
  },
  petBunny: {
    name: "棉棉 · 垂耳兔",
    slot: "pet",
    description: "会跟着你散步的小兔，休息时也会乖乖停下。",
    source: "再找周年花园布置员霉霉聊聊",
    icon: 9,
  },
  petCat: {
    name: "桃桃 · 奶油猫",
    slot: "pet",
    description: "带来呼噜声和一点小小的好运。",
    source: "在周年花园和星星一起摸摸奶油猫",
    icon: 10,
  },
  rabbitSatchel: {
    name: "花环兔斜挎包",
    slot: "backpack",
    description: "给继续挑战的小冒险家，一份额外的小惊喜。",
    source: "任意小游戏领奖后达到双倍目标",
    icon: 11,
  },
};
export interface InventoryState {
  owned: ItemId[];
  equipped: Record<EquipSlot, ItemId | null>;
}
export const INVENTORY_KEY = "fufu-souvenirs-v1";
export const emptyInventory = (): InventoryState => ({
  owned: [],
  equipped: {
    head: null,
    clothes: null,
    shoes: null,
    backpack: null,
    body: null,
    pet: null,
  },
});
export function readInventory(
  raw: string | null,
  legacy: string | null = null,
): InventoryState {
  const state = emptyInventory();
  try {
    const p = JSON.parse(raw || "null");
    if (p && typeof p === "object") {
      if (Array.isArray(p.owned))
        state.owned = [
          ...new Set<ItemId>(
            (p.owned as unknown[]).filter(
              (id: unknown): id is ItemId =>
                typeof id === "string" && Object.hasOwn(ITEMS, id),
            ),
          ),
        ];
      for (const slot of EQUIP_SLOTS) {
        const id = p.equipped?.[slot];
        if (state.owned.includes(id) && ITEMS[id as ItemId].slot === slot)
          state.equipped[slot] = id;
      }
      // Older versions stored the moon backpack together with chest pins.
      const oldBag = p.equipped?.body;
      if (
        !state.equipped.backpack &&
        state.owned.includes(oldBag) &&
        ITEMS[oldBag as ItemId]?.slot === "backpack"
      )
        state.equipped.backpack = oldBag;
      return state;
    }
  } catch {}
  try {
    const p = JSON.parse(legacy || "null");
    if (p && (p.wreath === true || p.wearing === true || p.flower > 0)) {
      state.owned.push("wreath");
      if (p.wearing === true) state.equipped.head = "wreath";
    }
  } catch {}
  return state;
}
export function grantItem(state: InventoryState, id: ItemId): boolean {
  if (state.owned.includes(id)) return false;
  state.owned.push(id);
  return true;
}
export function equipItem(state: InventoryState, id: ItemId): boolean {
  if (!state.owned.includes(id)) return false;
  const slot = ITEMS[id].slot;
  state.equipped[slot] = state.equipped[slot] === id ? null : id;
  return true;
}
