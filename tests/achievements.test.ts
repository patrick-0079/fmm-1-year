import test from "node:test";
import assert from "node:assert/strict";
import { readProgress } from "../src/core.ts";
import { achievementChapters, achievementDefinitions, mergeAchievementProgress, migrateAchievementFacts, readAchievementMemory,
  reconcileAchievements, recordAchievementFact, type AchievementContext } from "../src/achievements.ts";
import { achievementEvents } from "../src/achievement-events.ts";
import { townInteriorKeys } from "../src/town-interior-id.ts";
import { collectTownKeepsake, townKeepsakeBadge } from "../src/town-keepsakes.ts";
import { createEngine, type GameId } from "../src/arcade-engines.ts";
import { TOWN_NPCS, ARCADES } from "../src/town-data.ts";
import { allLetters, handedLetters, postLetter } from "../src/letters.ts";
import { collectHandedLetter, grantDebugLetters, markLetterRead } from "../src/resident-story.ts";
import { rainbowIds } from "../src/rainbow-flowers.ts";
import { producers } from "../src/star-catalog.ts";
import { rings } from "../src/astrolabe.ts";

const empty: AchievementContext = { townTalked: [], owned: [], wearingWreath: false, playSeconds: 0 };
const newGame = () => readProgress(null);

test("an existing badge book recovers a missing garden screening receipt but never guesses a single-photo view", () => {
  const old = newGame();
  old.visited.push("bili", "album");
  assert.equal(migrateAchievementFacts(old, empty), false);
  assert.deepEqual(old.achievements.facts, []);

  old.visited.push("danmaku");
  const restored = readProgress(JSON.stringify(old));
  assert.equal(restored.achievements.legacyPending, false);
  assert.equal(migrateAchievementFacts(restored, empty), true);
  assert.deepEqual(restored.achievements.facts, ["cinema-opened"]);
  assert.deepEqual(reconcileAchievements(restored, empty).fresh, []);
  recordAchievementFact(restored, "photo-opened");
  assert.deepEqual(reconcileAchievements(restored, empty).fresh, ["memories"]);
  const reloaded = readProgress(JSON.stringify(restored));
  assert.equal(migrateAchievementFacts(reloaded, empty), false);
  assert.deepEqual(reconcileAchievements(reloaded, empty).fresh, []);
});

test("merging a screening visit from another tab completes the badge alongside a real single-photo view", () => {
  const album = newGame(), screening = newGame();
  recordAchievementFact(album, "photo-opened");
  screening.visited.push("danmaku");
  mergeAchievementProgress(album, screening);
  assert.deepEqual(reconcileAchievements(album, empty).fresh, ["memories"]);
  mergeAchievementProgress(album, screening);
  assert.deepEqual(reconcileAchievements(album, empty).fresh, []);
});

test("two open books keep the highest single run and show the score that earned its stamp", () => {
  const first = newGame(), second = newGame();
  first.arcadeBests.flight = 16;
  second.arcadeBests.flight = 8;
  second.arcadeBests.miner = 340;
  reconcileAchievements(first, empty);
  mergeAchievementProgress(second, first);
  mergeAchievementProgress(first, second);
  for (const p of [first, second]) {
    assert.deepEqual(p.arcadeBests, { flight: 16, miner: 340 });
    const { entries } = reconcileAchievements(p, empty);
    const flight = entries.find(entry => entry.id === "flight-16")!;
    assert.ok(flight.earned);
    assert.equal(flight.current, 16);
    assert.equal(p.achievements.earned.filter(id => id === "flight-16").length, 1);
  }
});

test("the book starts with 56 unique stamps in five chapters and seals unopened public letters", () => {
  const p = newGame(), { entries, fresh } = reconcileAchievements(p, empty);
  assert.deepEqual(achievementChapters.map(c => entries.filter(e => e.chapter === c.id).length), [13, 12, 7, 18, 6]);
  assert.equal(new Set(entries.map(e => e.id)).size, 56);
  assert.deepEqual(fresh, []);
  assert.ok(entries.every(e => !e.earned && e.current === 0 && e.progressLabel));
  const mail = entries.filter(e => e.chapter === "letters");
  assert.deepEqual(new Set(mail.map(e => e.letterId)), new Set(allLetters.map(l => l.id)));
  assert.ok(entries.filter(e => e.hint).every(e => !/派大星|30 秒|两次|电波|星盘环/.test(e.hint!)));
  assert.equal(migrateAchievementFacts(p, empty), false);
});

test("the tent pickup earns the tape stamp once and legacy screenings keep their own receipts", () => {
  const old = readProgress(JSON.stringify({ visited: ["danmaku"], achievements: { earned: ["memories"] },
    residents: { publicLettersRead: [] } }));
  migrateAchievementFacts(old, empty);
  assert.equal(old.gardenTape, "missing");
  assert.equal(readProgress('{"gardenTape":"playing"}').gardenTape, "missing");
  assert.deepEqual(reconcileAchievements(old, empty).fresh, []);
  assert.ok(old.achievements.earned.includes("memories"));
  old.gardenTape = "carried";
  assert.deepEqual(reconcileAchievements(old, empty).fresh, ["garden-tape"]);
  const carried = readProgress(JSON.stringify(old));
  assert.equal(carried.gardenTape, "carried");
  carried.gardenTape = "inserted";
  const installed = readProgress(JSON.stringify(carried));
  assert.equal(installed.gardenTape, "inserted");
  assert.deepEqual(reconcileAchievements(installed, empty).fresh, []);
  assert.deepEqual(installed.achievements.earned, ["memories", "garden-tape"]);
});

test("all twelve letters award at their own handoff or first reading", () => {
  const p = newGame();
  const changes = () => reconcileAchievements(p, empty).fresh;
  for (const key of ["kerry", "xiaoaimen"]) {
    markLetterRead(p.residents, key + "-anniversary-letter");
    assert.deepEqual(changes(), ["letter-" + key]);
  }
  const handed = [["xiaoye", handedLetters.xiaoye], ["suyan", handedLetters.suyan],
    ["yeshenhua", handedLetters["radio-host"]], ["xiaoyou", handedLetters.xiaoyou], ["guli", handedLetters.guli],
    ["dianziyang", handedLetters.dianziyang], ["pigeon", handedLetters.pigeon]] as const;
  for (const [key, id] of handed) {
    assert.ok(collectHandedLetter(p.residents, id));
    assert.deepEqual(changes(), ["letter-" + key]);
    markLetterRead(p.residents, id);
    assert.deepEqual(changes(), []);
  }
  assert.equal(markLetterRead(p.residents, handedLetters.rabe), false);
  assert.ok(collectHandedLetter(p.residents, handedLetters.rabe));
  assert.deepEqual(changes(), []);
  assert.equal(markLetterRead(p.residents, handedLetters.rabe), true);
  assert.deepEqual(changes(), ["letter-rabe"]);
  p.residents.postDelivered = true;
  assert.deepEqual(changes(), ["letter-post"]);
  markLetterRead(p.residents, postLetter.id);
  assert.deepEqual(changes(), []);
  assert.equal(collectHandedLetter(p.residents, handedLetters.patrick), undefined);
  p.residents.patrickArrived = true;
  assert.deepEqual(changes(), ["camp"]);
  assert.deepEqual(changes(), []); // Dropping the prop is not delivery.
  assert.ok(collectHandedLetter(p.residents, handedLetters.patrick));
  assert.deepEqual(changes(), ["letter-patrick"]);
  const restored = readProgress(JSON.stringify(p));
  assert.deepEqual(reconcileAchievements(restored, empty).fresh, []);
  assert.equal(restored.achievements.earned.filter(id => id.startsWith("letter-")).length, 12);
});

test("all 25 meetings count unique characters from their own maps and ignore letters acquired via debug", () => {
  const p = newGame(), town = TOWN_NPCS.map(n => n.id);
  grantDebugLetters(p.residents); // Placing a letter in the box isn't a hug or a conversation.
  const get = (townTalked: string[]) => reconcileAchievements(p, { ...empty, townTalked }).entries.find(e => e.id === "friends")!;
  assert.equal(get([]).current, 0);
  assert.equal(get([...town, ...town, "room-fox"]).current, 18);
  for (const id of ["garden-guest-suyan", "garden-guest-decorator", "garden-guest-balloon-friend",
    "garden-guest-picnic-friend", "elder-guardian", "elder-gardener"] as const) {
    assert.ok(recordAchievementFact(p, id));
    assert.equal(recordAchievementFact(p, id), false);
  }
  assert.equal(get(town).current, 24);
  assert.ok(get(town).details.some(line => line.includes("待相遇：小叶子")));
  recordAchievementFact(p, "xiaoye-plush");
  const all = get(town);
  assert.equal(all.earned, true);
  assert.deepEqual(all.details.map(d => d.split(" · ")[0]), ["小镇 18/18", "周年花园 5/5", "勇气花园 1/1", "回声遗迹 1/1"]);
});

test("all seven game thresholds match their real engines and advanced scores require a personal best in one run", () => {
  const p = newGame();
  for (const id of Object.keys(ARCADES) as GameId[]) {
    const goal = createEngine(id).goal;
    p.arcadeBests[id] = goal - 1;
    assert.deepEqual(reconcileAchievements(p, empty).fresh, []);
    p.arcadeBests[id] = goal;
    assert.ok(reconcileAchievements(p, empty).fresh.includes("game-" + id));
    assert.deepEqual(reconcileAchievements(p, empty).fresh, []);
  }
  assert.ok(p.achievements.earned.includes("all-games"));
  p.arcadeBests.flight = 15; p.arcadeBests.miner = 319;
  assert.deepEqual(reconcileAchievements(p, empty).fresh, []);
  p.arcadeBests.flight = 16; p.arcadeBests.miner = 320;
  assert.deepEqual(reconcileAchievements(p, empty).fresh, ["flight-16", "miner-320"]);
});

test("split visits, flowers, stars, clues and foreground time require distinct receipts and exact thresholds", () => {
  const p = newGame(), pages = (playSeconds = 0) => reconcileAchievements(p, { ...empty, playSeconds });
  p.visited.push("album", "danmaku");
  recordAchievementFact(p, "cinema-opened");
  assert.deepEqual(pages().fresh, []);
  recordAchievementFact(p, "photo-opened"); recordAchievementFact(p, "dew"); recordAchievementFact(p, "sunset");
  assert.deepEqual(pages().fresh, ["memories"]);
  recordAchievementFact(p, "firefly");
  p.rainbowFlowers = [rainbowIds[0], rainbowIds[0], "unknown"];
  p.creditStars = [producers[0].id, producers[0].id, "unknown"];
  const scene = pages();
  assert.deepEqual(scene.fresh, ["day-secrets"]);
  for (const id of ["rainbow", "star-bottle"]) assert.equal(scene.entries.find(e => e.id === id)!.current, 1);
  p.rainbowFlowers = [...rainbowIds]; p.creditStars = producers.map(s => s.id);
  assert.deepEqual(pages(1439.999).fresh, ["rainbow", "star-bottle"]);
  assert.deepEqual(pages(1440).fresh, ["days-1"]);
  assert.deepEqual(pages(4319.999).fresh, []);
  assert.deepEqual(pages(4320).fresh, ["days-3"]);
  assert.deepEqual(pages(10079.999).fresh, []);
  assert.deepEqual(pages(10080).fresh, ["days-7"]);
});

test("previously earned day stamps survive the longer day and partial foreground minutes carry over", () => {
  const previous = newGame();
  previous.achievements.earned.push("days-1");
  const p = readProgress(JSON.stringify(previous));
  const { entries, fresh } = reconcileAchievements(p, { ...empty, playSeconds: 15 * 60 });
  assert.deepEqual(fresh, []);
  const first = entries.find(entry => entry.id === "days-1")!;
  assert.ok(first.earned);
  assert.equal(first.progressLabel, "已盖章 · 累计前台游玩 15 分钟");
  const third = entries.find(entry => entry.id === "days-3")!;
  assert.deepEqual([third.current, third.goal, third.earned], [15, 72, false]);
});

test("legacy migration uses real inventory and recent clues once; old camp records survive without replaying the visitor", () => {
  const p = readProgress(JSON.stringify({ residents: { patrickDelivered: true, guardianInvited: true, publicLettersRead: [] },
    roomFox: { visit: "petted" }, visited: ["album", "danmaku"], decoratorMet: true }));
  const ctx = { ...empty, owned: ["petCat", "wreath"], wearingWreath: true, pickedEggs: ["sunset", "dew"] };
  assert.ok(migrateAchievementFacts(p, ctx));
  assert.equal(migrateAchievementFacts(p, { ...ctx, owned: ["petBunny"] }), false);
  const { entries, fresh } = reconcileAchievements(p, ctx);
  for (const id of ["wreath", "fox", "letter-patrick", "camp"]) assert.ok(fresh.includes(id));
  assert.ok(!p.achievements.facts.includes("photo-opened"));
  assert.equal(entries.find(e => e.id === "memories")!.current, 1);
  assert.equal(entries.find(e => e.id === "companions")!.current, 1);
  assert.equal(entries.find(e => e.id === "friends")!.current, 3);
  assert.equal(entries.find(e => e.id === "day-secrets")!.current, 2);
  assert.deepEqual(reconcileAchievements(readProgress(JSON.stringify(p)), empty).fresh, []);
});

test("every documented stamp can be completed and replay never duplicates receipts", () => {
  const p = newGame();
  for (const fact of achievementEvents) recordAchievementFact(p, fact);
  p.completed = ["gifts","cake","fireworks","balloons","courage"];
  p.bassSongPlayed = p.bedNoteUnlocked = true;
  p.gardenTape = "carried";
  p.rainbowFlowers = [...rainbowIds];
  p.townKeepsakes.items = [...townInteriorKeys];
  p.creditStars = producers.map(s => s.id);
  p.astrolabe = { installed: true, turns: [0,0,0], found: rings.map(r => r.id), mirrors: ["\\","/"] };
  p.echoes.listened = p.residents.patrickArrived = true;
  grantDebugLetters(p.residents);
  for (const l of allLetters) markLetterRead(p.residents, l.id);
  for (const id of Object.keys(ARCADES) as GameId[]) p.arcadeBests[id] = 400;
  const ctx = { ...empty, owned:["mikoOutfit"], townTalked: TOWN_NPCS.map(n => n.id), playSeconds: 7 * 24 * 60 };
  assert.equal(reconcileAchievements(p, ctx).fresh.length, 56);
  assert.deepEqual(reconcileAchievements(p, ctx).fresh, []);
  assert.equal(reconcileAchievements(readProgress(JSON.stringify(p)), ctx).entries.filter(e => e.earned).length, 56);
  assert.deepEqual(readAchievementMemory({ earned: ["cake","bad","cake","gifts"] }).earned, ["cake","gifts"]);
  assert.equal(achievementDefinitions.filter(d => d.id.startsWith("ruin-")).length, 5);
});

test("the miko stamp requires seven distinct keepsakes and accepting the shrine maiden outfit", () => {
  const p=newGame();
  const check=(owned:string[])=>reconcileAchievements(p,{...empty,owned}).entries.find(e=>e.id==="town-miko")!;
  p.townKeepsakes.items=[...townInteriorKeys.slice(1),townInteriorKeys[1]];
  assert.equal(check(["mikoOutfit"]).earned,false);
  p.townKeepsakes.items=[...townInteriorKeys];
  assert.equal(check([]).earned,false); assert.match(check([]).progressLabel,/待向暖栗领取/);
  assert.equal(check(["witchDress","witchHat"]).earned,false);
  assert.equal(check(["mikoOutfit"]).earned,true);
  assert.deepEqual(reconcileAchievements(readProgress(JSON.stringify(p)),empty).fresh,[]);
});
test("each claimed town keepsake earns exactly its own stamp, including existing saves", () => {
  const progress = newGame();
  assert.deepEqual(reconcileAchievements(progress, empty).fresh, []);
  for (const key of townInteriorKeys) {
    assert.equal(collectTownKeepsake(progress.townKeepsakes, key, "bells", 100), true);
    assert.deepEqual(reconcileAchievements(progress, empty).fresh, [townKeepsakeBadge(key)]);
    assert.equal(collectTownKeepsake(progress.townKeepsakes, key, "creek", 200), false);
    assert.deepEqual(reconcileAchievements(progress, empty).fresh, []);
  }
  assert.equal(progress.townKeepsakes.radioTrack, "creek");
  assert.equal(reconcileAchievements(progress, empty).entries.find(entry => entry.id === townKeepsakeBadge("radio"))?.keepsakeChoice, "creek");
  const older = readProgress(JSON.stringify({ townKeepsakes: { items: ["post", "books", "post"] } }));
  const backfilled = reconcileAchievements(older, empty).fresh.filter(id => id.startsWith("town-keepsake-"));
  assert.deepEqual(backfilled, [townKeepsakeBadge("post"), townKeepsakeBadge("books")]);
  assert.deepEqual(reconcileAchievements(readProgress(JSON.stringify(older)), empty).fresh, []);
});
