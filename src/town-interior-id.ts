export const townInteriorKeys = ["florist", "baker", "maker", "post", "books", "radio", "hall"] as const;
export type TownInteriorKey = typeof townInteriorKeys[number];
export type TownInteriorId = `town-${TownInteriorKey}`;

export function townInteriorId(key: TownInteriorKey): TownInteriorId {
  return `town-${key}`;
}

export function isTownInterior(scene: string): scene is TownInteriorId {
  return scene.startsWith("town-") && townInteriorKeys.some(key => scene === townInteriorId(key));
}
