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

test("daily scenes reopen on the next shift day; nights span midnight and locations have separate progress", () => {
  const memory = readChatMemory(), chats = new ResidentChats(() => memory);
  const read = (id: string, day: number, hour: number) => chats.daily(id, "night", day, hour, true, 2);
  assert.equal(read("radio-inside", 1, 22), -1);
  assert.equal(read("radio-inside", 2, 1), 0);
  assert.equal(read("radio", 2, 1), -1);
  assert.equal(read("radio-inside", 2, 3), 1);
  assert.equal(read("radio-inside", 2, 22), -1);
  assert.deepEqual([1,2,3].map(() => chats.daily("suyan", "dusk", 2, 18, false, 2)), [0,1,0]);
  assert.equal(chats.daily("suyan", "dusk", 3, 18, false, 2), 0);
  assert.equal(chats.daily("xiaoyou", "dawn", 2, 6, true, 2, true), -1);
  assert.equal(chats.daily("xiaoyou", "dawn", 2, 6, true, 2, true), -1);
  assert.equal(chats.daily("xiaoyou", "dawn", 2, 6, true, 2), 0);
  const reloaded = readProgress(JSON.stringify({residents: {chats: memory}})).residents.chats;
  assert.equal(new ResidentChats(() => reloaded).daily("radio-inside", "night", 3, 1, true, 2), 0);
});

test("merging parallel daily scenes favors the newer day, then its furthest visit", () => {
  const first = readChatMemory(), second = readChatMemory();
  const a = new ResidentChats(() => first), b = new ResidentChats(() => second);
  for (let i = 0; i < 4; i++) a.daily("guli", "day", 1, 10, true, 2);
  b.daily("guli", "day", 2, 10, true, 2);
  assert.equal(mergeChatMemory(first, second), true);
  assert.equal(a.daily("guli", "day", 2, 10, true, 2), 0);
  assert.equal(mergeChatMemory(second, first), true);
  assert.deepEqual(first, second);
  assert.equal(mergeChatMemory(first, second), false);
});
