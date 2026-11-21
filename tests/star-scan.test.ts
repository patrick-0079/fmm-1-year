import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { build } from "vite";
import { scanStars } from "../scripts/scan-stars.mjs";
import { placeMeadowStars } from "../scripts/place-meadow-stars.mjs";
import { meadowGround, meadowStarSpot } from "../src/meadow-ground.ts";
import { findPath } from "../src/core.ts";
import { clickedInteraction, nearbyInteraction } from "../src/interaction.ts";

test("a standalone star or a star folder carries its own name, artwork and multiline message", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-stars-"));
  t.after(() => rm(root, {recursive: true, force: true}));
  const source = join(root, "stars"), manifest = join(root, "generated", "index.ts");
  await mkdir(join(source, "guest"), {recursive: true});
  assert.equal((await scanStars(source, manifest)).size, 0);
  const name = '星/<客>:「?」✨', message = "第一段。\n\n第二段。";
  const star = { id: "star-guest", name, message, shape: "pink-fish" };
  const file = join(source, "guest", "star.json");
  await writeFile(file, JSON.stringify(star));
  await writeFile(join(source, "friend.json"), JSON.stringify({ id: "star-friend", name: "朋友" }));
  const positions = await scanStars(source, manifest);
  assert.equal(positions.size, 2);
  assert.notDeepEqual(positions.get("star-guest"), positions.get("star-friend"));
  const {starIndex} = await import(pathToFileURL(manifest).href);
  assert.deepEqual(starIndex.map(({record}) => record.id), ["star-friend", "star-guest"]);
  assert.deepEqual(starIndex[1], { record: star, ...positions.get(star.id) });
  const first = await readFile(manifest, "utf8");
  await writeFile(file, JSON.stringify({...star, name: "改署名", message: "改寄语"}));
  assert.deepEqual(await scanStars(source, manifest), positions);
  assert.equal(await readFile(manifest, "utf8"), first);
  const moved = join(source, "moved.json");
  await rename(file, moved);
  assert.deepEqual(await scanStars(source, manifest), positions);
  const good = await readFile(manifest, "utf8");
  for (const [record, error] of [
    [{...star, id: "star-friend"}, /重复/],
    [{...star, message: []}, /message/],
    [{...star, shape: "triangle"}, /造型/],
    [{...star, position: {x: 200}}, /position/],
    [{...star, position: {x: 232, y: 156}}, /固定落点/],
  ] as const) {
    await writeFile(moved, JSON.stringify(record));
    await assert.rejects(scanStars(source, manifest), error);
    assert.equal(await readFile(manifest, "utf8"), good);
  }
});

test("80 fixed and generated stars are individually clickable and reachable from the real meadow entrance", () => {
  const fixed = {id: "star-fixed", position: {x: 485, y: 335}};
  const records = [fixed, ...Array.from({length: 79}, (_, n) => ({id: `star-extra-${n}`}))];
  const positions = placeMeadowStars(records);
  assert.deepEqual(positions.get(fixed.id), fixed.position);
  assert.deepEqual(placeMeadowStars(records), positions);
  const stars = Array.from(positions, ([id, point]) => meadowStarSpot({id, ...point}));
  const spots = [...meadowGround.spots, ...stars];
  for (const star of stars) {
    assert.equal(clickedInteraction({x: star.x, y: star.y - 11}, spots)?.id, star.id);
    assert.equal(nearbyInteraction(star.approach, spots)?.id, star.id);
    assert.deepEqual(findPath(meadowGround.spawn, star.approach, meadowGround)?.at(-1), star.approach);
  }
  assert.throws(() => placeMeadowStars([fixed, {...fixed, id: "star-crowd"}]), /固定落点/);
  assert.throws(() => placeMeadowStars(Array.from({length: 500}, (_, n) => ({id: `star-${n}` }))), /安全落点/);
});

test("a star folder can supply a transparent sprite to Node and the bundled game", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-star-art-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = join(root, "stars", "月亮船");
  await mkdir(folder, { recursive: true });
  const manifest = join(root, "src", "generated.ts");
  const file = join(folder, "star.json");
  const bitmap = await sharp({
    create: { width: 30, height: 10, channels: 4, background: "#00000000" },
  }).composite([{ input: { create: { width: 20, height: 6, channels: 4, background: "#ffd589" } } }]).webp().toBuffer();
  const record = { id: "star-boat", name: "小船", sprite: "星星 船.webp" };
  await writeFile(join(folder, record.sprite), bitmap);
  await writeFile(file, JSON.stringify(record));
  await scanStars(join(root, "stars"), manifest);
  const { starIndex } = await import(pathToFileURL(manifest).href);
  assert.deepEqual(await readFile(fileURLToPath(starIndex[0].sprite)), bitmap);
  const bundle = await build({
    configFile: false, root, logLevel: "silent",
    build: { write: false, rollupOptions: { input: manifest, preserveEntrySignatures: "strict" } },
  });
  const outputs = Array.isArray(bundle) ? bundle.flatMap(result => result.output) : bundle.output;
  assert.ok(outputs.some(output => output.type === "asset" && output.fileName.endsWith(".webp") && Buffer.from(output.source).equals(bitmap)));

  const valid = await readFile(manifest, "utf8");
  for (const sprite of ["../星星 船.webp", "丢了.webp", "坏图.png", "纯透明.png"]) {
    if (sprite === "坏图.png") await writeFile(join(folder, sprite), "broken");
    if (sprite === "纯透明.png") await sharp({ create: {width: 8, height: 8, channels: 4, background: "#00000000"} }).png().toFile(join(folder, sprite));
    await writeFile(file, JSON.stringify({ ...record, sprite }));
    await assert.rejects(scanStars(join(root, "stars"), manifest), /star\.json/);
    assert.equal(await readFile(manifest, "utf8"), valid);
  }
});
