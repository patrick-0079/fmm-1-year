import test from "node:test";
import assert from "node:assert/strict";
import { collections, producers } from "../src/content.ts";
import { starIndex } from "../src/stars.generated.ts";
import { letterRecords } from "../src/letters.generated.ts";
import { postLetter, patrickLetter } from "../src/resident-story.ts";

test("the meadow follows the configured star order, artwork and complete messages", () => {
  assert.deepEqual(producers.map(star => star.id), starIndex.map(({record}) => record.id));
  const byId = new Map(producers.map(star => [star.id, star]));
  for (const {record, x, y} of starIndex) {
    const star = byId.get(record.id)!;
    assert.equal(star.name, record.name);
    assert.equal(star.message, record.message ?? "");
    assert.equal(star.shape, record.shape === "plain" ? undefined : record.shape);
    assert.deepEqual({x: star.x, y: star.y}, record.position ?? {x, y});
  }
});

test("both regular and story letters preserve the configured titles, signatures and full text", () => {
  const actual = [...collections.letters.items, postLetter, patrickLetter];
  const byId = new Map(actual.map(letter => [letter.id, letter]));
  assert.equal(byId.size, letterRecords.length);
  assert.equal(actual.length, byId.size);
  for (const {id, title, author, text} of letterRecords) {
    assert.deepEqual(byId.get(id), {id, title, author, text}, id);
  }
  const regular = letterRecords.filter(({delivery}) => delivery !== "post" && delivery !== "patrick");
  assert.deepEqual(collections.letters.items.map(letter => letter.id), regular.map(record => record.id));
});
