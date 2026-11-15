import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { readInventory } from "../src/items.ts";
import { readResidentStory, mailboxLetters, postLetter, postUnread, POST_LETTER_REVISION } from "../src/resident-story.ts";

test("four public letters remain available and the postman adds exactly one delivered letter", () => {
  const old = readProgress('{"visited":["letters"],"decoratorMet":true}').residents;
  assert.equal(mailboxLetters(old).length, 4);
  assert.deepEqual(mailboxLetters(old).map(letter => letter.title), [
    "小叶子的周年来信", "夜神华的周年来信", "Kerry 的周年来信", "Rabe 的周年来信",
  ]);
  assert.equal(mailboxLetters(old).some(letter => letter.id === postLetter.id), false);
  assert.ok(mailboxLetters(old).some(letter => letter.id === "kerry-anniversary-letter"));
  const delivered = readResidentStory({...old, postDelivered: true});
  assert.equal(mailboxLetters(delivered).length, 5);
  assert.equal(mailboxLetters(delivered).filter(letter => letter.id === postLetter.id).length, 1);
  assert.equal(postUnread(delivered), true);
  delivered.postReadRevision = POST_LETTER_REVISION;
  const restored = readProgress(JSON.stringify({residents: delivered})).residents;
  assert.equal(postUnread(restored), false);
  assert.equal(postUnread(restored, POST_LETTER_REVISION + 1), true);
  assert.equal(mailboxLetters(old).length + 1, mailboxLetters(delivered).length);
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
