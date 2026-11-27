/** Actions whose completion cannot be reconstructed from the main game saves. */
export const achievementEvents = [
  "wreath-worn", "photo-opened", "cinema-opened", "fox-content", "fox-reconciled",
  "petCat", "petBunny", "dew", "sunset", "firefly",
  "qianxiao-duel-win",
  "garden-guest-decorator", "garden-guest-balloon-friend", "garden-guest-picnic-friend",
  "garden-guest-suyan", "xiaoye-plush", "elder-gardener", "elder-guardian",
] as const;

export type AchievementEvent = typeof achievementEvents[number];
