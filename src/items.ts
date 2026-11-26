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
  | "rabbitSatchel"
  | "cloudPajamas" | "apricotNightgown" | "sailorSet" | "honeyOveralls"
  | "heartClip" | "fishClip" | "starClip"
  | "witchDress" | "witchHat" | "mikoOutfit"
  | "mintSneakers" | "honeyRainboots" | "pennyLoafers"
  | "letterPack" | "bearPack" | "compassPack"
  | "leafPin" | "tulipPin" | "shellPin"
  | "blueBeret" | "ginghamBand" | "strawHat";
export const EQUIP_SLOTS = [
  "wreath",
  "head",
  "hair",
  "clothes",
  "shoes",
  "backpack",
  "body",
  "pet",
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];
export type Equipped = Partial<Record<EquipSlot, ItemId | null>>;
export const slotNames: Record<EquipSlot, string> = {
  wreath: "花环",
  head: "头饰",
  hair: "发夹",
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
  }
> = {
  wreath: {
    name: "花园花环",
    slot: "wreath",
    description: "把花园里的小小喜欢，编在粉色发梢。",
    source: "在花园拾取或采花获得",
  },
  candyClip: {
    name: "一周年星糖发夹",
    slot: "hair",
    description: "一颗草莓星糖，纪念第一年的甜甜晚安。",
    source: "回声遗迹 · 苔纹贪吃蛇点亮 6 枚叶芽",
  },
  headphones: {
    name: "晚安星星耳机",
    slot: "head",
    description: "把一整年的温柔，留在耳边。",
    source: "晚安方块消除 4 行",
  },
  moonBag: {
    name: "月兔纪念背包",
    slot: "backpack",
    description: "装上月亮和勇气，下一段冒险也一起走。",
    source: "月兔跳一跳连续到达 8 个平台",
  },
  starWings: {
    name: "星翼发饰",
    slot: "hair",
    description: "愿芙芙飞过每一个小难关，落在亮着灯的地方。",
    source: "芙芙晚安飞行穿过 8 道星门",
  },
  anniversaryPin: {
    name: "一周年纪念胸针",
    slot: "body",
    description: "小镇居民送来的第一枚周年纪念章。",
    source: "与小镇迎宾员交谈领取",
  },
  roseDress: {
    name: "周年蔷薇裙",
    slot: "clothes",
    description: "把一周年的温柔，穿成小小的庆典裙。",
    source: "晚安心愿连连看连接 8 对",
  },
  echoBrooch: {
    name: "晚安回声胸针",
    slot: "body",
    description: "一弯铜月抱着粉色的小星。今晚的光，是你为芙芙点亮的。",
    source: "回声遗迹 · 点亮星盘，再把月光引到星纹砖",
  },
  mintCape: {
    name: "晨露薄荷披肩",
    slot: "clothes",
    description: "轻盈的晨露与奶油色领结。",
    source: "回声遗迹 · 星纹石阵扫雷翻开 26 块安全石砖",
  },
  ribbonShoes: {
    name: "草莓缎带鞋",
    slot: "shoes",
    description: "圆圆的鞋头、奶油软底，蝴蝶结上藏着一颗小草莓。",
    source: "在晚安小屋拆开礼盒并收下心意",
  },
  starShoes: {
    name: "星月旅行鞋",
    slot: "shoes",
    description: "踏着星光，继续下一段旅程。",
    source: "回声遗迹 · 琥珀深井黄金矿工收集 160 矿光",
  },
  berryBag: {
    name: "草莓野餐背包",
    slot: "backpack",
    description: "装上一块周年蛋糕，出发去野餐。",
    source: "切好蛋糕并和芙芙一起吃一块",
  },
  petBunny: {
    name: "棉棉 · 垂耳兔",
    slot: "pet",
    description: "会跟着你散步的小兔，休息时也会乖乖停下。",
    source: "再找周年花园布置员霉霉聊聊",
  },
  petCat: {
    name: "桃桃 · 奶油猫",
    slot: "pet",
    description: "带来呼噜声和一点小小的好运。",
    source: "在周年花园和星星一起摸摸奶油猫",
  },
  rabbitSatchel: {
    name: "花环兔斜挎包",
    slot: "backpack",
    description: "给继续挑战的小冒险家，一份额外的小惊喜。",
    source: "任意小游戏领奖后达到双倍目标",
  },
  witchDress: { name: "月灯女巫裙", slot: "clothes", description: "墨蓝钟形裙上搭着梅紫短斗篷，领口扣住一弯小月亮。", source: "初始衣橱" },
  witchHat: { name: "月灯尖帽", slot: "head", description: "帽尖轻轻折向一侧，丁香紫缎带上别着月牙。", source: "初始衣橱" },
  cloudPajamas: { name: "云朵翻领睡衣", slot: "clothes", description: "雾蓝翻领衫配长裤，口袋里缝着一朵白云。", source: "初始衣橱" },
  apricotNightgown: { name: "杏桃晚安裙", slot: "clothes", description: "圆圆的奶油领下系着一枚小蝴蝶结，裙摆刚好盖过膝头。", source: "初始衣橱" },
  sailorSet: { name: "海盐水手装", slot: "clothes", description: "海军蓝水手领，珊瑚红领巾，一条能迈开步子的短裤。", source: "初始衣橱" },
  honeyOveralls: { name: "麦芽背带裤", slot: "clothes", description: "麦芽色背带裤罩着鼠尾草绿短袖，胸前口袋留给路上捡的小物。", source: "初始衣橱" },
  heartClip: { name: "爱心发夹", slot: "hair", description: "芙芙常戴的小爱心，下面别着两根淡紫发卡。", source: "初始衣橱" },
  fishClip: { name: "小鱼发夹", slot: "hair", description: "一尾薄荷蓝的小鱼游进了发梢。", source: "初始衣橱" },
  starClip: { name: "星星发夹", slot: "hair", description: "一颗蜂蜜金的小星，轻轻别在刘海旁。", source: "初始衣橱" },
  mintSneakers: { name: "薄荷帆布鞋", slot: "shoes", description: "系紧奶白鞋带，沿着石板路散步去。", source: "初始衣橱" },
  honeyRainboots: { name: "蜂蜜小雨靴", slot: "shoes", description: "提起青绿色的小鞋耳，就能踩进雨后的小水洼。", source: "初始衣橱" },
  pennyLoafers: { name: "栗棕便士鞋", slot: "shoes", description: "焦糖色鞋面上，金色小便士刚好露出一角。", source: "初始衣橱" },
  letterPack: { name: "薄荷信笺书包", slot: "backpack", description: "象牙白的信封翻盖上，扣着一粒珊瑚色火漆。", source: "初始衣橱" },
  bearPack: { name: "小熊课本包", slot: "backpack", description: "两只圆耳朵探出包顶，奶油色的小熊鼻尖守着前袋。", source: "初始衣橱" },
  compassPack: { name: "航海星书包", slot: "backpack", description: "海蓝包盖缀着一枚金色罗盘星，陪芙芙去认路。", source: "初始衣橱" },
  leafPin: { name: "双叶胸针", slot: "body", description: "两片嫩绿的珐琅小叶，在金边里舒展开。", source: "初始衣橱" },
  tulipPin: { name: "郁金香胸针", slot: "body", description: "把一枝珊瑚色的郁金香别在衣襟上。", source: "初始衣橱" },
  shellPin: { name: "贝珠胸针", slot: "body", description: "水蓝色扇贝轻轻张开，露出一颗奶白珍珠。", source: "初始衣橱" },
  blueBeret: { name: "雾蓝画家帽", slot: "head", description: "把软软的蓝帽沿往旁边拨一点，出门画画去。", source: "初始衣橱" },
  ginghamBand: { name: "草莓格纹发带", slot: "head", description: "红白方格绕过发顶，两截布尾在结上翘起来。", source: "初始衣橱" },
  strawHat: { name: "麦田小草帽", slot: "head", description: "奶油色的帽檐挡住阳光，鼠尾草绿的缎带在脑后打结。", source: "初始衣橱" },
  mikoOutfit: {
    name: "绯袴巫女服",
    slot: "clothes",
    description: "白衣交领，宽袖垂在绯袴两旁。腰前打了个小结，是暖栗替芙芙系的。",
    source: "收齐七件小镇小物，白昼或黄昏在周年纪念馆找暖栗领取",
  },
};
export const townCollectionReward = "mikoOutfit" satisfies ItemId;
export const starterItems: readonly ItemId[] = [
  "heartClip", "fishClip", "starClip", "cloudPajamas", "apricotNightgown", "sailorSet", "honeyOveralls",
  "witchDress", "witchHat", "mintSneakers", "honeyRainboots", "pennyLoafers",
  "letterPack", "bearPack", "compassPack", "leafPin", "tulipPin", "shellPin", "blueBeret", "ginghamBand", "strawHat",
];
export interface InventoryState {
  owned: ItemId[];
  bouquet: boolean;
  equipped: Record<EquipSlot, ItemId | null>;
}
export const INVENTORY_KEY = "fufu-souvenirs-v1";
export const emptyInventory = (): InventoryState => ({
  owned: [...starterItems],
  bouquet: false,
  equipped: {
    wreath: null,
    head: null,
    hair: "heartClip",
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
      state.bouquet = p.bouquet === true;
      if (Array.isArray(p.owned)) {
        for (const id of p.owned)
          if (typeof id === "string" && Object.hasOwn(ITEMS, id)) grantItem(state, id as ItemId);
      }
      // The original sprite always wore a heart. An explicit empty slot means it was taken off.
      if (p.equipped && Object.hasOwn(p.equipped, "hair")) state.equipped.hair = null;
      else if (["candyClip", "starWings"].includes(p.equipped?.head) && state.owned.includes(p.equipped.head))
        state.equipped.hair = p.equipped.head;
      if (p.equipped?.head === "wreath" && !Object.hasOwn(p.equipped, "wreath") && state.owned.includes("wreath"))
        state.equipped.wreath = "wreath";
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
      if (p.wearing === true) state.equipped.wreath = "wreath";
    }
  } catch {}
  return state;
}
export function grantItem(state: InventoryState, id: ItemId): boolean {
  if (state.owned.includes(id)) return false;
  state.owned.push(id);
  return true;
}
export function mergeInventoryReceipts(into: InventoryState, from: InventoryState) {
  const count = into.owned.length, bouquet = into.bouquet;
  for (const id of from.owned) grantItem(into, id);
  into.bouquet ||= from.bouquet;
  return count !== into.owned.length || bouquet !== into.bouquet;
}
export function equipItem(state: InventoryState, id: ItemId): boolean {
  if (!state.owned.includes(id)) return false;
  const slot = ITEMS[id].slot;
  state.equipped[slot] = state.equipped[slot] === id ? null : id;
  return true;
}
