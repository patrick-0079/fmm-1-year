import { standardLetters } from "./letters.ts";
import { albumItems } from "./album-catalog.ts";

export { anniversary } from "./launch/anniversary.ts";

export type MediaKind = "text" | "image" | "audio" | "video";
export interface Memory {
  id: string;
  title: string;
  author?: string;
  text?: string;
  src?: string;
  thumbnail?: string;
  originalSrc?: string;
  width?: number;
  height?: number;
  alt?: string;
}
export interface Collection {
  title: string;
  subtitle: string;
  kind: MediaKind;
  items: Memory[];
}

export { producers, type CreditStar } from "./star-catalog.ts";

export interface Encouragement {
  message: string;
  author?: string;
  title?: string;
}
// 再次回床时可在小叶子的固定便签后附一条鼓励。
export const encouragements: Encouragement[] = [];

export const collections: Record<string, Collection> = {
  letters: {
    title: "晚安信箱",
    subtitle: "把想说的话，折成一封小小的信。",
    kind: "text",
    items: standardLetters,
  },
  album: {
    title: "回忆相册",
    subtitle: "把平凡的一天，也轻轻放进回忆里。",
    kind: "image",
    items: albumItems,
  },
};
