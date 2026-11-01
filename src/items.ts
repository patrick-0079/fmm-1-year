export type ItemId =
  | "wreath"
  | "candyClip"
  | "headphones"
  | "moonBag"
  | "starWings"
  | "anniversaryPin";
export type EquipSlot = "head" | "body";
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
    source: "星糖贪吃蛇收集 6 颗糖",
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
    slot: "body",
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
};
export interface InventoryState {
  owned: ItemId[];
  equipped: Record<EquipSlot, ItemId | null>;
}
export const INVENTORY_KEY = "fufu-souvenirs-v1";
export const emptyInventory = (): InventoryState => ({
  owned: [],
  equipped: { head: null, body: null },
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
      for (const slot of ["head", "body"] as const) {
        const id = p.equipped?.[slot];
        if (state.owned.includes(id) && ITEMS[id as ItemId].slot === slot)
          state.equipped[slot] = id;
      }
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
