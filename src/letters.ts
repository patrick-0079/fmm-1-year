import type { Memory } from "./content.ts";
import { deliveryIds, letterRecords } from "./letters.generated.ts";

interface LetterRecord {
  id: string;
  title: string;
  author: string;
  text: string;
  delivery?: string;
  revision?: number;
}

const records: readonly LetterRecord[] = letterRecords;
export const publicLetterIds = new Set(records
  .filter(letter => letter.delivery === undefined || letter.delivery === "public")
  .map(letter => letter.id));

export const allLetters: Memory[] = records.map(({ id, title, author, text }) => ({ id, title, author, text }));
export const letterById = new Map(allLetters.map(letter => [letter.id, letter]));
const { post, ...handedLetters } = deliveryIds;
export { handedLetters };
export const postLetter = letterById.get(post)!;
export const patrickLetter = letterById.get(handedLetters.patrick)!;
export const postRevision = records.find(letter => letter.id === post)!.revision!;
export const standardLetters = allLetters.filter(letter => letter !== postLetter && letter !== patrickLetter);
