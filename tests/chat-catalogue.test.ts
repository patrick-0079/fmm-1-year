import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { townChatTopics } from "../src/town-chat-topics.ts";
import { gardenChatTopics, senderIntroductions, introduceSender } from "../src/garden-chat-topics.ts";
import { townDialogues } from "../src/town-dialogue.ts";
import { gardenVisitorScripts } from "../src/garden-visitor-dialogue.ts";
import { guestDialogues } from "../src/town-guest-dialogues.ts";
import { elderLines } from "../src/elders-data.ts";
import { allLetters } from "../src/letters.ts";
import { worksInTown } from "../src/town-routines.ts";
import { gardenWorking } from "../src/garden-residents.ts";
import { type Phase } from "../src/day.ts";
import { type ChatBook } from "../src/resident-chats.ts";

const phases: Phase[] = ["dawn","day","dusk","night"];
const transcript = readFileSync(new URL("../doc/conversation.md", import.meta.url), "utf8");
test("all 29 residents are represented and the 21 rotating chat books match their schedules and transcript", () => {
  const books: Record<string, ChatBook> = {...townChatTopics, ...gardenChatTopics};
  assert.equal(Object.keys(books).length + Object.keys(gardenVisitorScripts).length + Object.keys(guestDialogues).length, 29);
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
  assert.equal(shifts, 54);
  assert.equal(count, 96);
});

test("each side of a sender introduction is playable and transcribed in full", () => {
  assert.deepEqual(Object.keys(senderIntroductions), ["visitor-dianziyang"]);
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

test("the garden visitor routes preserve each choice, reply, and outcome in the transcript", () => {
  for (const script of Object.values(gardenVisitorScripts)) {
    for (const page of Object.values(script.pages)) {
      for (const words of [page.text, page.title, ...(page.choices ?? []).map(([label]) => label)]) {
        if (words) assert.ok(transcript.includes(words), words);
      }
      for (const [, next] of page.choices ?? [])
        assert.ok(next === "close" || script.pages[next], "missing destination " + next);
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

test("the revised manuscript's 46 player choices appear on their intended pages", () => {
  const stroke = "（摸摸正号猫）", play = "（与浅笑开一局牌局）", take = "（收下信封）";
  const expected = {
    suyan: {intro:["对哦超超可爱的"], cute:["？？","（奖励一个小巴掌）"], tap:["（奖励一个大巴掌）"], offer:[take],
      dawn:["（抽一巴掌）","（不要）"], day:["（抽一巴掌）","（不要）"], night:["（给一巴掌）","（不要）"]},
    qianxiao: {start:["很不错呢。（又看见了底下的一张卡），这张是什么呀？"], dawn:[play], day:[play], night:[play,"（工作累了，想休息）"]},
    xiaoyou: {dawn:["谢谢宝宝～"], "offer-letter":["收下信封"], day:["（收下橘子）"], night:["（抱抱小佑）"]},
    guli: {start:["因为故里喜欢吃甜品？","不知道哦"], "offer-letter":["收下信封"], dawn:["好哦，让我尝尝"],
      day:["辛苦啦宝宝，注意休息"], night:["来直播间休息休息吧宝宝"]},
    pigeon: {intro:["咕？"], again:["？？"], offer:[take]},
    "radio-host": {start:["因为你梦想成为主持？","因为你喜欢？"], "offer-letter":[take], dawn:["好哦，宝宝也是"],
      day:["是的哦","今天应该是要咕咕咕了"], night:["宝宝你也是"]},
    zhenghao: {intro:[stroke,"我也想你了哦小正号"], dawn:[stroke], day:[stroke], night:[stroke], again:[stroke]},
    rabe: {intro:["没事哦"], offer:[take], night:["好哦，我会注意休息的"], play:["（和它们握握“手”）"]},
  };
  interface Page {choices?: readonly (readonly [string,string])[]; letter?: string; offer?: boolean; collectLabel?: string}
  const scripts: Record<string,Record<string,Page>> = {...guestDialogues,
    ...Object.fromEntries(Object.entries(gardenVisitorScripts).map(([id, script]) => [id, script.pages]))};
  let total = 0;
  for (const [id, pages] of Object.entries(expected)) for (const [key, labels] of Object.entries(pages)) {
    const page = scripts[id][key];
    const actual = page.offer || page.letter ? [page.collectLabel ?? take] : page.choices?.map(([label]) => label);
    assert.deepEqual(actual, labels, id + "/" + key);
    total += labels.length;
  }
  assert.equal(total, 46);
});
