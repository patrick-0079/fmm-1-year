import type { Memory } from "./content.ts";
import { allLetters, handedLetters, letterById, patrickLetter, postLetter, postRevision, publicLetterIds } from "./letters.ts";

export { handedLetters, postLetter, patrickLetter, postRevision as POST_LETTER_REVISION } from "./letters.ts";
export type HandedLetterId = typeof handedLetters[keyof typeof handedLetters];
type NpcLetterId = Exclude<HandedLetterId, typeof handedLetters.patrick>;
const handedLetterIds: readonly string[] = Object.values(handedLetters);
const legacyOpenedLetters = ["kerry-anniversary-letter", "rabe-anniversary-letter"];
function isNpcLetter(id: string): id is NpcLetterId {
  return id !== handedLetters.patrick && handedLetterIds.includes(id);
}

export interface ResidentStory {
  /** Read receipts for letters available from the start. */
  publicLettersRead: string[];
  npcLetters: Partial<Record<NpcLetterId, "unread" | "read">>;
  postDelivered: boolean;
  postReadRevision: number;
  patrickArrived: boolean;
  patrickDelivered: boolean;
  patrickRead: boolean;
  welcomeReceived: boolean;
  cake: "new" | "reserved" | "eaten";
  // The keeper gives her journal when she welcomes the player to the quest.
  // Players who heard this invitation before the portable journal already own it.
  guardianInvited: boolean;
}

export function readResidentStory(value?: Partial<ResidentStory> | null): ResidentStory {
  const revision = value?.postReadRevision;
  // Older saves displayed public letters as already opened and had no receipt.
  const receipts = value?.publicLettersRead;
  const publicLettersRead = Array.isArray(receipts)
    ? [...new Set(receipts.filter(id => publicLetterIds.has(id)))]
    : value ? legacyOpenedLetters.filter(id => publicLetterIds.has(id)) : [];
  const npcLetters: ResidentStory["npcLetters"] = {};
  for (const id of handedLetterIds) {
    if (!isNpcLetter(id)) continue;
    const status = value?.npcLetters?.[id];
    if (status === "unread" || status === "read") npcLetters[id] = status;
  }
  return {
    publicLettersRead,
    npcLetters,
    postDelivered: value?.postDelivered === true,
    postReadRevision: value?.postDelivered === true && typeof revision === "number" &&
      Number.isSafeInteger(revision) && revision > 0 ? revision : 0,
    // Older saves only recorded delivery. Debug delivery can now precede the visit.
    patrickArrived: value?.patrickArrived === true || (value?.patrickArrived === undefined && value?.patrickDelivered === true),
    patrickDelivered: value?.patrickDelivered === true,
    patrickRead: value?.patrickDelivered === true && value.patrickRead === true,
    welcomeReceived: value?.welcomeReceived === true,
    cake: value?.cake === "reserved" || value?.cake === "eaten" ? value.cake : "new",
    guardianInvited: value?.guardianInvited === true,
  };
}

export function mailboxLetters(story: ResidentStory) {
  return allLetters.filter(({ id }) => {
    if (id === postLetter.id) return story.postDelivered;
    if (id === patrickLetter.id) return story.patrickDelivered;
    return !isNpcLetter(id) || !!story.npcLetters[id];
  });
}

export function hasHandedLetter(story: ResidentStory, id: HandedLetterId) {
  return id === handedLetters.patrick ? story.patrickDelivered : !!story.npcLetters[id];
}

export function collectHandedLetter(story: ResidentStory, id: HandedLetterId): Memory | undefined {
  if (hasHandedLetter(story, id)) return;
  if (id === handedLetters.patrick) {
    if (!story.patrickArrived) return;
    story.patrickDelivered = true;
    return patrickLetter;
  }
  if (!isNpcLetter(id)) return;
  const letter = letterById.get(id);
  if (letter) story.npcLetters[id] = "unread";
  return letter;
}

/** Add only missing envelopes, keeping read receipts and the camp visit independent. */
export function grantDebugLetters(story: ResidentStory, selectedId?: string): number {
  const received = new Set(mailboxLetters(story).map(letter => letter.id));
  let added = 0;
  for (const { id } of allLetters) {
    if (received.has(id) || (selectedId !== undefined && selectedId !== id)) continue;
    if (id === postLetter.id) story.postDelivered = true;
    else if (id === patrickLetter.id) story.patrickDelivered = true;
    else if (!isNpcLetter(id) || !collectHandedLetter(story, id)) continue;
    added++;
  }
  return added;
}

export interface LetterHandoff {
  received: (id: HandedLetterId) => boolean;
  collect: (id: HandedLetterId) => boolean;
  read: (id: HandedLetterId) => void;
}

export function letterChoice(mail: LetterHandoff, id: HandedLetterId, refresh: () => void) {
  return mail.received(id)
    ? { title: "现在读信", run: () => mail.read(id) }
    : { title: "收下信", run: () => { if (mail.collect(id)) refresh(); } };
}

export function postUnread(story: ResidentStory, revision = postRevision) {
  return story.postDelivered && story.postReadRevision < revision;
}

export function unreadLetterIds(story: ResidentStory) {
  return mailboxLetters(story).map(letter => letter.id).filter(id => {
    if (id === postLetter.id) return postUnread(story);
    if (id === patrickLetter.id) return !story.patrickRead;
    if (isNpcLetter(id)) return story.npcLetters[id] === "unread";
    return !story.publicLettersRead.includes(id);
  });
}

export function markLetterRead(story: ResidentStory, id: string) {
  if (publicLetterIds.has(id) && !story.publicLettersRead.includes(id)) {
    story.publicLettersRead.push(id);
    return true;
  }
  if (isNpcLetter(id) && story.npcLetters[id] === "unread") {
    story.npcLetters[id] = "read";
    return true;
  }
  if (id === postLetter.id && postUnread(story)) {
    story.postReadRevision = postRevision;
    return true;
  }
  if (id === patrickLetter.id && story.patrickDelivered && !story.patrickRead) {
    story.patrickRead = true;
    return true;
  }
  return false;
}
