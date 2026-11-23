import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { townChatTopics } from "../src/town-chat-topics.ts";
import { gardenChatTopics, senderIntroductions, introduceSender } from "../src/garden-chat-topics.ts";
import { townDialogues } from "../src/town-dialogue.ts";
import { elderLines } from "../src/elders-data.ts";
import { allLetters } from "../src/letters.ts";
import { worksInTown } from "../src/town-routines.ts";
import { gardenWorking } from "../src/garden-residents.ts";
import { type Phase } from "../src/day.ts";
import { type ChatBook } from "../src/resident-chats.ts";

const phases: Phase[] = ["dawn","day","dusk","night"];
const transcript = readFileSync(new URL("../doc/conversation.md", import.meta.url), "utf8");
test("all 29 schedules and 134 topics match the cast and the complete dialogue transcript", () => {
  const books: Record<string, ChatBook> = {...townChatTopics, ...gardenChatTopics};
  assert.equal(Object.keys(books).length, 29);
  let count = 0, shifts = 0;
  for (const [id, book] of Object.entries(books)) {
    const duty = phases.filter(phase => {
      if (Object.hasOwn(townDialogues, id)) return worksInTown(id as keyof typeof townDialogues, phase);
      if (id.startsWith("garden-guest-")) return gardenWorking(id.slice(13) as Parameters<typeof gardenWorking>[0], phase);
      return true;
    });
    assert.deepEqual(Object.keys(book.phases).sort(), [...duty].sort(), id);
    shifts += duty.length;
    const forks = new Set<string>();
    const topics = new Set<string>();
    for (const item of [...Object.values(book.phases), ...book.familiar]) {
      const text = typeof item === "string" ? item : item.text;
      assert.ok(text.trim() && !topics.has(text) && transcript.includes(text), id + " · " + text);
      topics.add(text);
      if (typeof item !== "string" && item.replies) {
        forks.add(JSON.stringify(item.replies));
        assert.equal(item.replies.length, 2, id);
        for (const index of [0,1] as const) {
          const words = item.replies.map(reply => reply[index]);
          assert.equal(new Set(words).size, 2, id);
          for (const word of words) assert.ok(transcript.includes(word), id + " · " + word);
        }
      }
    }
    assert.equal(forks.size, 1, id);
    count += topics.size;
  }
  assert.equal(shifts, 76);
  assert.equal(count, 134);
});

test("each side of a sender introduction is playable and transcribed in full", () => {
  assert.equal(Object.keys(senderIntroductions).length, 4);
  for (const scene of Object.values(senderIntroductions)) {
    for (const [side, branch] of scene.branches.entries()) {
      let choices: {title: string; run: () => void}[] = [];
      const seen: string[] = [];
      let finished = false;
      introduceSender(scene, (text, options) => {
        seen.push(text);
        choices = options;
        for (const word of [text, ...options.map(option => option.title)])
          assert.ok(transcript.includes(word), word);
      }, () => { finished = true; });
      assert.deepEqual(choices.map(c => c.title), scene.branches.map(b => b[0]));
      choices[side].run();
      assert.equal(seen.at(-1), branch[1]);
      for (let next = 0; !finished && next < 3; next++) {
        assert.equal(choices.length, 1);
        choices[0].run();
      }
      assert.ok(finished);
    }
  }
});

test("all town dialogue pages, player choices, author credit and hints are in the transcript", () => {
  for (const pages of Object.values(townDialogues)) for (const page of Object.values(pages)) {
    const lines = [page.text, page.hint, page.speaker, ...(page.choices ?? []).map(([label]) => label)];
    for (const line of lines) if (line) assert.ok(transcript.includes(line), line);
  }
});

test("the transcript includes the elders' original lines and each signed letter in full", () => {
  for (const line of Object.values(elderLines)) {
    assert.ok(transcript.includes(line.text), line.text);
    if (line.reply) assert.ok(transcript.includes(line.reply.title), line.reply.title);
  }
  for (const letter of allLetters)
    assert.ok(transcript.includes(letter.text), letter.title);
});
