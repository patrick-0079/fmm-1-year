import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { scanLetters } from "../scripts/scan-letters.mjs";

test("letter discovery preserves file and record order, punctuation in names, and rejects duplicate IDs", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-letter-scan-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sources = join(root, "来信");
  const manifest = join(root, "letters.generated.ts");
  await mkdir(sources);
  const add = (file: string, records: unknown) => writeFile(join(sources, file), JSON.stringify(records));
  const first = { id: "starter-letter", author: "小邮差", title: "一封信", text: "见字安！" };
  const second = { id: "guest-letter", author: '客人<>:"/\\|?*', title: "🍊 的来信", text: "晚安～\n\n下次见！" };
  const third = { id: "script-letter", author: "客人", title: "灯下", text: "这是一封手递信。", delivery: "xiaoye" };
  const fourth = { id: "other-letter", author: "客人", title: "门外", text: "第二封。" };
  await add("letters.json", [first]);
  await add("03.json", [third, fourth]);
  await add("02.json", second);
  await scanLetters(sources, manifest);
  const {letterRecords, deliveryIds} = await import(pathToFileURL(manifest).href);
  assert.deepEqual(letterRecords, [first, second, third, fourth]);
  assert.equal(deliveryIds.xiaoye, third.id);

  const before = await readFile(manifest);
  await scanLetters(sources, manifest);
  assert.deepEqual(await readFile(manifest), before);
  await add("04.json", { ...second, title: "重复的 ID" });
  await assert.rejects(scanLetters(sources, manifest));
  assert.deepEqual(await readFile(manifest), before);
  assert.equal(JSON.parse(await readFile(join(sources, "02.json"), "utf8")).author, second.author);
});

test("scanning a new public letter makes it readable and independently sealed across fresh, saved and legacy games", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-new-letter-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sources = join(root, "来信");
  await cp(new URL("../ref/来信/", import.meta.url), sources, { recursive: true });
  for (const name of ["resident-story.ts", "letters.ts"]) {
    await copyFile(new URL("../src/" + name, import.meta.url), join(root, name));
  }
  const letter = { id: "new-public-test-letter", title: "花园来信", author: "第二位送信人", text: "花开了！\n\n晚安。" };
  await writeFile(join(sources, "another-envelope.json"), JSON.stringify(letter));
  await scanLetters(sources, join(root, "letters.generated.ts"), { requireStoryLetters: true });
  const api = await import(pathToFileURL(join(root, "resident-story.ts")).href) as typeof import("../src/resident-story.ts");
  for (const initial of [undefined, {}, { publicLettersRead: ["kerry-anniversary-letter", "rabe-anniversary-letter"] }]) {
    const state = api.readResidentStory(initial);
    assert.deepEqual(api.mailboxLetters(state).filter(({id}) => id === letter.id), [letter]);
    assert.ok(api.unreadLetterIds(state).includes(letter.id));
    assert.equal(api.markLetterRead(state, letter.id), true);
    const resumed = api.readResidentStory(JSON.parse(JSON.stringify(state)));
    assert.ok(!api.unreadLetterIds(resumed).includes(letter.id));
    assert.equal(api.markLetterRead(resumed, letter.id), false);
  }
});

test("large letter collections retain every envelope in catalogue order across files", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-many-letters-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sources = join(root, "来信");
  const manifest = join(root, "letters.generated.ts");
  await mkdir(sources);
  const letter = (id: number) => ({ id: String(id), title: "来信", author: "作者", text: "晚安" });
  const records = Array.from({ length: 64 }, (_, i) => letter(i));
  await writeFile(join(sources, "letters.json"), JSON.stringify(records.slice(0, 21)));
  assert.equal((await scanLetters(sources, manifest)).count, 21);
  await writeFile(join(sources, "more.json"), JSON.stringify(records.slice(21)));
  assert.equal((await scanLetters(sources, manifest)).count, records.length);
  const { letterRecords } = await import(pathToFileURL(manifest).href);
  assert.deepEqual(letterRecords, records);
});
