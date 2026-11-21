import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { readInventory } from "../src/items.ts";
import { readResidentStory, mailboxLetters, postLetter, postUnread, POST_LETTER_REVISION,
  collectHandedLetter, handedLetters, letterChoice, markLetterRead, patrickLetter, unreadLetterIds } from "../src/resident-story.ts";

const legacyPublic = ["kerry-anniversary-letter", "rabe-anniversary-letter"];

test("public letters arrive sealed; reading and migration only open the expected envelopes", () => {
  const fresh = readProgress(null).residents;
  const publicIds = mailboxLetters(fresh).map(letter => letter.id);
  for (const id of legacyPublic) assert.ok(publicIds.includes(id));
  for (const id of [...Object.values(handedLetters), postLetter.id]) assert.ok(!publicIds.includes(id));
  assert.deepEqual(unreadLetterIds(fresh), publicIds);
  assert.equal(markLetterRead(fresh, legacyPublic[0]), true);
  assert.equal(markLetterRead(fresh, legacyPublic[0]), false);
  const resumed = readProgress(JSON.stringify({ residents: fresh })).residents;
  const remaining = publicIds.filter(id => id !== legacyPublic[0]);
  assert.deepEqual(unreadLetterIds(resumed), remaining);
  for (const id of remaining) assert.equal(markLetterRead(resumed, id), true);
  assert.deepEqual(unreadLetterIds(readProgress(JSON.stringify({ residents: resumed })).residents), []);
  assert.deepEqual(unreadLetterIds(readProgress(null).residents), publicIds);
  const old = readProgress('{"visited":["letters"],"decoratorMet":true}').residents;
  assert.deepEqual(mailboxLetters(old).map(letter => letter.id), publicIds);
  assert.deepEqual(unreadLetterIds(old), publicIds.filter(id => !legacyPublic.includes(id)));
  const delivered = readResidentStory({...old, postDelivered: true});
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
  const originalIds = mailboxLetters(state).map(({id}) => id);
  for (const id of originalIds) markLetterRead(state, id);
  const npcIds = [handedLetters.xiaoye, handedLetters["radio-host"], handedLetters.suyan,
    handedLetters.xiaoyou, handedLetters.guli];
  for (const id of [...npcIds].reverse()) {
    assert.equal(markLetterRead(state, id), false);
    assert.equal(collectHandedLetter(state, id)?.id, id);
    assert.equal(collectHandedLetter(state, id), undefined);
  }
  assert.equal(mailboxLetters(state).length, originalIds.length + npcIds.length);
  assert.deepEqual(new Set(unreadLetterIds(state)), new Set(npcIds));
  assert.equal(markLetterRead(state, handedLetters.suyan), true);
  assert.equal(markLetterRead(state, handedLetters.suyan), false);
  const restored = readProgress(JSON.stringify({ residents: state })).residents;
  assert.deepEqual(mailboxLetters(restored), mailboxLetters(state));
  assert.deepEqual(new Set(unreadLetterIds(restored)), new Set(npcIds.filter(id => id !== handedLetters.suyan)));
  restored.postDelivered = true;
  restored.patrickArrived = true;
  assert.equal(collectHandedLetter(restored, handedLetters.patrick)?.id, patrickLetter.id);
  const allIds = mailboxLetters(restored).map(letter => letter.id);
  const expected = [...originalIds, ...npcIds, postLetter.id, patrickLetter.id];
  assert.deepEqual([...allIds].sort(), expected.sort());
  assert.deepEqual(mailboxLetters(readProgress(null).residents).map(({id}) => id), originalIds);
});

test("showing a choice does not collect or read its letter", () => {
  const story = readResidentStory();
  for (const { id } of mailboxLetters(story)) markLetterRead(story, id);
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
  assert.ok(POST_LETTER_REVISION > 1);
  assert.equal(postLetter.id, "post-anniversary-letter");
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
  const originalIds = mailboxLetters(old).map(({id}) => id);
  for (const id of originalIds) if (id !== postLetter.id) markLetterRead(old, id);
  assert.equal(old.patrickRead, false);
  assert.equal(collectHandedLetter(old, handedLetters.patrick), undefined);
  assert.equal(markLetterRead(old, patrickLetter.id), false);
  assert.deepEqual(unreadLetterIds(old), [postLetter.id]);
  const delivered = readProgress(JSON.stringify({residents: {...old, patrickArrived: true}})).residents;
  assert.deepEqual(mailboxLetters(delivered).map(({id}) => id), originalIds);
  assert.equal(collectHandedLetter(delivered, handedLetters.patrick), patrickLetter);
  assert.equal(collectHandedLetter(delivered, handedLetters.patrick), undefined);
  const specialIds = [postLetter.id, patrickLetter.id];
  assert.deepEqual(new Set(mailboxLetters(delivered).map(({id}) => id).filter(id => specialIds.includes(id))), new Set(specialIds));
  assert.equal(mailboxLetters(delivered).length, originalIds.length + 1);
  assert.deepEqual(new Set(unreadLetterIds(delivered)), new Set(specialIds));
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
