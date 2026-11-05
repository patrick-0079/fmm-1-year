import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { readInventory } from "../src/items.ts";
import { readResidentStory, mailboxLetters, postLetter, postUnread, POST_LETTER_REVISION } from "../src/resident-story.ts";

test("Kerry's letter stays public while the delivered letter shares one versioned read receipt", () => {
  const old = readProgress('{"visited":["letters"],"decoratorMet":true}').residents;
  assert.equal(mailboxLetters(old).some(letter => letter.id === postLetter.id), false);
  assert.ok(mailboxLetters(old).some(letter => letter.id === "kerry-anniversary-letter"));
  const delivered = readResidentStory({...old, postDelivered: true});
  assert.equal(mailboxLetters(delivered).filter(letter => letter.id === postLetter.id).length, 1);
  assert.equal(postUnread(delivered), true);
  delivered.postReadRevision = POST_LETTER_REVISION;
  const restored = readProgress(JSON.stringify({residents: delivered})).residents;
  assert.equal(postUnread(restored), false);
  assert.equal(postUnread(restored, POST_LETTER_REVISION + 1), true);
  assert.equal(mailboxLetters(old).length + 1, mailboxLetters(delivered).length);
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
