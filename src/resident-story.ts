import { collections, type Memory } from "./content.ts";

export interface ResidentStory {
  postDelivered: boolean;
  postReadRevision: number;
  welcomeReceived: boolean;
  cake: "new" | "reserved" | "eaten";
  guardianInvited: boolean;
}

// Increase when replacing the placeholder with the author's finished letter.
export const POST_LETTER_REVISION = 1;
export const postLetter: Memory = {
  id: "post-anniversary-letter",
  title: "红笺送来的信",
  text: "这封信的正文还在路上。",
};

export function readResidentStory(value?: Partial<ResidentStory> | null): ResidentStory {
  const revision = value?.postReadRevision;
  return {
    postDelivered: value?.postDelivered === true,
    postReadRevision: value?.postDelivered === true && typeof revision === "number" &&
      Number.isSafeInteger(revision) && revision > 0 ? revision : 0,
    welcomeReceived: value?.welcomeReceived === true,
    cake: value?.cake === "reserved" || value?.cake === "eaten" ? value.cake : "new",
    guardianInvited: value?.guardianInvited === true,
  };
}

export function mailboxLetters(story: ResidentStory) {
  return story.postDelivered ? [...collections.letters.items, postLetter] : collections.letters.items;
}

export function postUnread(story: ResidentStory, revision = POST_LETTER_REVISION) {
  return story.postDelivered && story.postReadRevision < revision;
}
