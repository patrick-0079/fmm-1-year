import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { readInventory } from "../src/items.ts";
import { readResidentStory, mailboxLetters, postLetter, postUnread, POST_LETTER_REVISION,
  collectHandedLetter, handedLetters, letterChoice, markLetterRead, patrickLetter, unreadLetterIds } from "../src/resident-story.ts";

test("a new adventurer can read Kerry and Rabe, and the postman adds one delivered letter", () => {
  const old = readProgress('{"visited":["letters"],"decoratorMet":true}').residents;
  assert.deepEqual(mailboxLetters(old).map(letter => letter.title), [
    "Kerry 的周年来信", "Rabe 的周年来信",
  ]);
  assert.deepEqual(unreadLetterIds(old), []);
  const delivered = readResidentStory({...old, postDelivered: true});
  assert.equal(mailboxLetters(delivered).length, 3);
  assert.equal(mailboxLetters(delivered).filter(letter => letter.id === postLetter.id).length, 1);
  assert.equal(postUnread(delivered), true);
  delivered.postReadRevision = POST_LETTER_REVISION;
  const restored = readProgress(JSON.stringify({residents: delivered})).residents;
  assert.equal(postUnread(restored), false);
  assert.equal(postUnread(restored, POST_LETTER_REVISION + 1), true);
  assert.equal(mailboxLetters(old).length + 1, mailboxLetters(delivered).length);
});

test("each NPC letter is added once, remains unread until opened, and survives a save round trip", () => {
  const state = readResidentStory();
  const npcIds = [handedLetters.xiaoye, handedLetters["radio-host"], handedLetters.suyan,
    handedLetters.xiaoyou, handedLetters.guli];
  for (const id of [...npcIds].reverse()) {
    assert.equal(markLetterRead(state, id), false);
    assert.equal(collectHandedLetter(state, id)?.id, id);
    assert.equal(collectHandedLetter(state, id), undefined);
  }
  assert.equal(mailboxLetters(state).length, 7);
  assert.deepEqual(unreadLetterIds(state), npcIds);
  assert.equal(markLetterRead(state, handedLetters.suyan), true);
  assert.equal(markLetterRead(state, handedLetters.suyan), false);
  const restored = readProgress(JSON.stringify({ residents: state })).residents;
  assert.deepEqual(mailboxLetters(restored), mailboxLetters(state));
  assert.deepEqual(unreadLetterIds(restored), npcIds.filter(id => id !== handedLetters.suyan));
  restored.postDelivered = true;
  restored.patrickArrived = true;
  assert.equal(collectHandedLetter(restored, handedLetters.patrick)?.id, patrickLetter.id);
  assert.equal(new Set(mailboxLetters(restored).map(letter => letter.id)).size, 9);
  assert.equal(mailboxLetters(readProgress(null).residents).length, 2);
});

test("showing a choice does not collect or read its letter", () => {
  const story = readResidentStory();
  let refreshes = 0, reads = 0;
  const id = handedLetters.suyan;
  const showChoice = () => letterChoice({
    received: () => story.npcLetters[id] !== undefined,
    collect: letter => !!collectHandedLetter(story, letter),
    read: letter => { reads++; markLetterRead(story, letter); },
  }, id, () => { refreshes++; });
  const take = showChoice();
  assert.equal(take.title, "收下信");
  assert.deepEqual(unreadLetterIds(story), []);
  take.run(); take.run();
  assert.deepEqual(unreadLetterIds(story), [id]);
  assert.equal(refreshes, 1);
  const read = showChoice();
  assert.equal(read.title, "现在读信");
  assert.equal(reads, 0);
  read.run();
  assert.equal(reads, 1);
  assert.deepEqual(unreadLetterIds(story), []);
});

test("the finished post letter upgrades the old placeholder receipt once without changing its save ID", () => {
  assert.equal(POST_LETTER_REVISION, 2);
  assert.equal(postLetter.id, "post-anniversary-letter");
  assert.ok(postLetter.text && !postLetter.text.includes("正文还在路上"));
  const old = readProgress(JSON.stringify({ residents: { postDelivered: true, postReadRevision: 1 } }));
  assert.equal(old.residents.postReadRevision, 1);
  assert.equal(postUnread(old.residents), true);
  const upgraded = readProgress(JSON.stringify({ ...old,
    residents: { ...old.residents, postReadRevision: POST_LETTER_REVISION },
  }));
  assert.equal(postUnread(upgraded.residents), false);
  assert.deepEqual(mailboxLetters(old.residents).map(letter => letter.id), mailboxLetters(upgraded.residents).map(letter => letter.id));
  assert.equal(postUnread(readResidentStory({ postDelivered: false, postReadRevision: 2 })), false);
});

test("the camp letter is gated, saved once and read independently of the postman's letter", () => {
  const old = readResidentStory({postDelivered: true, patrickRead: true});
  assert.equal(old.patrickRead, false);
  assert.equal(collectHandedLetter(old, handedLetters.patrick), undefined);
  assert.equal(markLetterRead(old, patrickLetter.id), false);
  assert.deepEqual(unreadLetterIds(old), [postLetter.id]);
  const delivered = readProgress(JSON.stringify({residents: {...old, patrickArrived: true}})).residents;
  assert.equal(mailboxLetters(delivered).length, 3);
  assert.equal(collectHandedLetter(delivered, handedLetters.patrick), patrickLetter);
  assert.equal(collectHandedLetter(delivered, handedLetters.patrick), undefined);
  assert.deepEqual(mailboxLetters(delivered).slice(-2).map(letter=>letter.id), [postLetter.id,patrickLetter.id]);
  assert.equal(mailboxLetters(delivered).length, 4);
  assert.deepEqual(unreadLetterIds(delivered), [postLetter.id,patrickLetter.id]);
  assert.equal(patrickLetter.author, "派大星");
  assert.ok(patrickLetter.text?.endsWith("派大星\n2026年11月20日"));
  assert.equal(markLetterRead(delivered, patrickLetter.id), true);
  assert.equal(markLetterRead(delivered, patrickLetter.id), false);
  const restored = readProgress(JSON.stringify({residents: delivered})).residents;
  assert.equal(restored.patrickDelivered, true);
  assert.deepEqual(unreadLetterIds(restored), [postLetter.id]);
  assert.equal(markLetterRead(restored, postLetter.id), true);
  assert.deepEqual(unreadLetterIds(restored), []);
});

test("visiting residents, earning a keepsake and equipping items have separate records", () => {
  const bag = readInventory('{"owned":["wreath"],"equipped":{"head":"wreath"},"bouquet":true}');
  assert.ok(bag.bouquet);
  assert.equal(bag.equipped.head, "wreath");
  assert.deepEqual(bag.owned, ["wreath"]);
  assert.deepEqual(readInventory(JSON.stringify(bag)), bag);
  assert.equal(readInventory('{"bouquet":"yes"}').bouquet, false);
  const old = readProgress('{"completed":["cake"],"residents":{"postReadRevision":99}}');
  assert.equal(old.residents.cake, "new");
  assert.equal(old.residents.postReadRevision, 0);
  assert.equal(old.residents.welcomeReceived, false);
});
