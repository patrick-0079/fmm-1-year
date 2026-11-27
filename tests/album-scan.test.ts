import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { scanAlbum } from "../scripts/build-album-art.mjs";

const base = "https://cdn.example.test/相册/";

async function newAlbum(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "fufu-album-scan-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "album.json"), JSON.stringify({ originalBaseUrl: base, photos: [] }));
  return root;
}

async function catalog(root: string) {
  return JSON.parse(await readFile(join(root, "album.json"), "utf8"));
}

test("scanning new filenames builds proportional previews, escaping the CDN key and respecting edits on rescan", async t => {
  const root = await newAlbum(t);
  const originals = join(root, "artifacts", "r2", "相册");
  await mkdir(originals, { recursive: true });
  const filename = "芙芙 #1%.PNG";
  const original = await sharp({ create: { width: 960, height: 600, channels: 4, background: "#ba8399" } }).png().toBuffer();
  await writeFile(join(originals, filename), original);
  await scanAlbum(root, originals);

  const config = await catalog(root);
  assert.equal(config.photos.length, 1);
  const photo = config.photos[0];
  assert.equal(photo.file, filename);
  assert.ok(photo.title.trim() && photo.id);
  assert.equal(new URL(photo.originalUrl).href, new URL(encodeURIComponent(filename), base).href);
  assert.equal(photo.version, createHash("sha256").update(original).digest("hex").slice(0, 12));
  assert.deepEqual([photo.width, photo.height], [960, 600]);
  const previews = join(root, "previews");
  for (const [suffix, width, height] of [["", 640, 400], ["-thumb", 240, 150]] as const) {
    const meta = await sharp(await readFile(join(previews, `${photo.id}.${photo.version}${suffix}.webp`))).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ["webp", width, height]);
  }
  assert.deepEqual(await readFile(join(originals, filename)), original);

  Object.assign(photo, { title: "一起回家", alt: "小屋门口", text: "晚安", originalUrl: "https://photos.example.test/edition-2.png" });
  await writeFile(join(root, "album.json"), JSON.stringify(config));
  // A clean checkout has only the catalog and previews.
  await unlink(join(originals, filename));
  await rmdir(originals);
  await scanAlbum(root, originals);
  assert.deepEqual((await catalog(root)).photos, [photo]);
  await mkdir(originals);
  const portrait = "CharaStudio-2026-12-01-22-00-00-Render.jpg";
  await sharp({ create: { width: 720, height: 480, channels: 3, background: "#c49679" } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(join(originals, portrait));
  await scanAlbum(root, originals);

  const updated = await catalog(root);
  assert.deepEqual(updated.photos.map((p: {file: string}) => p.file), [filename, portrait]);
  assert.deepEqual(updated.photos[0], photo);
  assert.deepEqual([updated.photos[1].width, updated.photos[1].height], [480, 720]);
  assert.match(updated.photos[1].title, /2026.*12.*01/);
  const second = updated.photos[1];
  const newer = await sharp(await readFile(join(previews, `${second.id}.${second.version}.webp`))).metadata();
  assert.ok(newer.height! > newer.width!);
  const saved = await readFile(join(root, "album.json"));
  await scanAlbum(root, originals);
  assert.deepEqual(await readFile(join(root, "album.json")), saved);
  assert.equal((await readdir(previews)).length, 4);
});

test("a broken new image cannot publish a partial photo catalog; correcting it allows a retry", async t => {
  const root = await newAlbum(t);
  const existing = join(root, "earlier.png");
  await sharp({ create: { width: 110, height: 90, channels: 3, background: "#fceeef" } }).png().toFile(existing);
  await scanAlbum(root);
  const [original] = (await catalog(root)).photos;
  await sharp({ create: { width: 60, height: 80, channels: 3, background: "#dfedc7" } }).png().toFile(existing);
  const filename = join(root, "新图.webp");
  const before = await readFile(join(root, "album.json"));
  await writeFile(filename, "not a webp");
  await assert.rejects(scanAlbum(root));
  assert.ok(!(await readdir(root)).some(name => name.startsWith(".album-scan-")));
  assert.deepEqual(await readFile(join(root, "album.json")), before);
  assert.equal(await readFile(filename, "utf8"), "not a webp");
  const priorImage = await sharp(await readFile(join(root, "previews", `${original.id}.${original.version}.webp`))).metadata();
  assert.deepEqual([priorImage.width, priorImage.height], [110, 90]);

  await sharp({ create: { width: 32, height: 40, channels: 4, background: "#eeeddd" } }).webp().toFile(filename);
  await scanAlbum(root);
  const {photos} = await catalog(root);
  assert.deepEqual(photos.map((p: {file: string}) => p.file), ["earlier.png", "新图.webp"]);
  assert.equal(photos[0].id, original.id);
  assert.notEqual(photos[0].version, original.version);
  assert.deepEqual([photos[0].width, photos[0].height], [60, 80]);
});
