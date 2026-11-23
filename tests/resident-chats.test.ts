import test from "node:test";
import assert from "node:assert/strict";
import { ResidentChats, readChatMemory, mergeChatMemory, type ChatBook } from "../src/resident-chats.ts";
import { readProgress } from "../src/core.ts";

const book: ChatBook = {
  phases: {dawn: "早上的花", day: "午后的花"},
  familiar: [{text: "一起扎花", replies: [["粉缎带", "细细的一圈。"], ["紫细绳", "绕个结。"]]}, "花剪的声音"],
};

test("visits rotate independently per phase and skip an immediate repeat when returning", () => {
  const memory = readChatMemory();
  let saves = 0;
  const chats = new ResidentChats(() => memory, () => saves++);
  const next = (phase: "dawn" | "day") => chats.next("florist", book, phase).text;
  assert.equal(next("dawn"), "早上的花");
  assert.equal(next("day"), "午后的花");
  assert.equal(next("day"), "一起扎花");
  assert.equal(next("dawn"), "花剪的声音");
  assert.equal(next("dawn"), "早上的花");
  assert.equal(next("dawn"), "一起扎花");
  chats.introduce("florist");
  chats.introduce("florist");
  assert.equal(saves, 7);
  const restored = readProgress(JSON.stringify({residents: {chats: memory}})).residents.chats;
  const reload = new ResidentChats(() => restored);
  assert.equal(reload.introduced("florist"), true);
  assert.equal(reload.next("florist", book, "dawn").text, "花剪的声音");
  assert.equal(reload.next("another-visitor", book, "dawn").text, "早上的花");
  assert.equal(new ResidentChats().introduced("florist"), false);
});

test("tabs merge progress independently of message order; corrupt or legacy progress starts safely", () => {
  const a = readChatMemory(), b = readChatMemory();
  const first = new ResidentChats(() => a), second = new ResidentChats(() => b);
  first.introduce("florist");
  first.next("florist", book, "dawn");
  first.next("florist", book, "dawn");
  second.next("florist", book, "dawn");
  second.next("florist", book, "day");
  assert.equal(mergeChatMemory(a, b), true);
  assert.equal(mergeChatMemory(b, a), true);
  assert.deepEqual(a, b);
  assert.equal(mergeChatMemory(a, b), false);
  const invalid = readChatMemory(JSON.parse('{"bad":{"phases":{"dawn":{"count":"2","turn":-1}}},"__proto__":{"introduced":true}}'));
  assert.deepEqual(Object.keys(invalid), []);
  assert.deepEqual(readProgress('{"residents":{"postDelivered":true}}').residents.chats, readChatMemory());
});
