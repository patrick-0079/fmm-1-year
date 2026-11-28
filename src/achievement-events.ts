import { campEncounterIds } from "./camp-encounters.ts";

/** Actions whose completion cannot be reconstructed from the main game saves. */
export const achievementEvents = [
  "wreath-worn", "photo-opened", "cinema-opened", "fox-content", "fox-reconciled",
  "petCat", "petBunny", "dew", "sunset", "firefly",
  "qianxiao-duel-win",
  "garden-guest-decorator", "garden-guest-balloon-friend", "garden-guest-picnic-friend",
  "garden-guest-suyan", "xiaoye-plush", "elder-gardener", "elder-guardian",
  ...campEncounterIds.map(id => `camp-response-${id}` as const),
] as const;

export type AchievementEvent = typeof achievementEvents[number];
