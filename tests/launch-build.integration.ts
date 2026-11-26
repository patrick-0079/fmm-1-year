import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, createServer, type InlineConfig } from "vite";
import { scanLetters } from "../scripts/scan-letters.mjs";
import { PackResources } from "../src/pack-resources.ts";
import type { Resource } from "../src/resource-queue.ts";

async function devEntries(config: InlineConfig): Promise<[string, string, string[]][]> {
  const server = await createServer({ ...config, logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    await server.listen();
    const response = await fetch(new URL("game-assets-dev-full.json", server.resolvedUrls!.local[0]));
    assert.equal(response.status, 200);
    return await response.json();
  } finally { await server.close(); }
}

// Runs separately from npm test: a pre-release CI build should not have to
// produce the full game even temporarily. All outputs here live in one temp dir.
test("switching full → invitation → full cleans the deployed directory", async t => {
  const dir = await mkdtemp(join(tmpdir(), "fufu-release-matrix-"));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const outDir = join(dir, "dist"), publicDir = join(dir, "public");
  await mkdir(publicDir);
  for (const name of ["favicon.svg", "_headers"])
    await copyFile(new URL(`../public/${name}`, import.meta.url), join(publicDir, name));
  await writeFile(join(publicDir, "future-game-asset.txt"), "verify public media isolation");
  const originalMode = process.env.FULL_BUILD;
  t.after(() => {
    if (originalMode === undefined) delete process.env.FULL_BUILD;
    else process.env.FULL_BUILD = originalMode;
  });
  const run = async (value?: string) => {
    if (value === undefined) delete process.env.FULL_BUILD;
    else process.env.FULL_BUILD = value;
    await build({ publicDir, build: { outDir, emptyOutDir: true }, logLevel: "silent" });
    const files = (await readdir(outDir, { recursive: true })).map(name => name.replaceAll("\\", "/")).sort();
    const html = await readFile(join(outDir, "index.html"), "utf8");
    assert.doesNotMatch(html, /room-interactive|fufu-garments|application-|rel="modulepreload"/);
    const marker = JSON.parse(await readFile(join(outDir, "release.json"), "utf8"));
    assert.ok(html.includes(`name="fufu-release" content="${marker.mode}" data-version="${marker.version}"`),
      "the entry HTML and its separately revalidated release marker must identify the same build");
    return { files, marker, html };
  };

  const explicit = await run("true");
  assert.equal(explicit.marker.mode, "full");
  const paper = explicit.files.find(name => /^assets\/journal-celestial-paper-[\w-]+\.webp$/.test(name));
  assert.ok(paper, "full release emits a content-hashed journal background");
  const hint = explicit.html.match(/<link\b[^>]*id="journal-paper-preload"[^>]*>/)?.[0] ?? "";
  for (const attr of ['rel="preload"', 'as="image"', 'fetchpriority="high"', 'media="not all"', `href="/${paper}"`])
    assert.ok(hint.includes(attr), attr);
  assert.ok(explicit.files.includes("texture-cache.js"));
  assert.ok(!explicit.files.some(name => /steam-achievement|deck_ui_achievement_toast/i.test(name)),
    "the badge chime is synthesized and must not ship the Steam client sample");
  assert.ok(explicit.files.includes("future-game-asset.txt"));
  assert.ok(explicit.files.some(name => name.includes("room-interactive")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/town-guests-")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/anniversary-town-v13-")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/anniversary-town-hd-v13-")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/town-playground-animation-")));
  const gameArt = ["town-work-poses", "garden-guest-routines", "gardener-hat", "guardian-moonstone", "meadow-jelly-bells",
    "anniversary-garden-tree-free", "apple-basket", "courage-tall-flowers", "garden-creek-props", "anniversary-visitors"];
  const walkSheets = await readdir(new URL("../src/assets/resident-walk/", import.meta.url));
  for (const sheet of walkSheets) {
    const prefix = "assets/" + sheet.slice(0, -5) + "-";
    assert.ok(explicit.files.some(file => file.startsWith(prefix) && file.endsWith(".webp")), sheet);
  }
  for (const name of gameArt) {
    assert.ok(explicit.files.some(file => file.startsWith(`assets/${name}-`)), name);
  }
  assert.ok(!explicit.files.some(name => /assets\/town-(?:attractions|wish-lawn)-/.test(name)));
  assert.ok(explicit.files.some(name => name.startsWith("assets/patrick-camp-")));
  for (const artwork of ["desk", "fox-letter", "berry-wax", "ivory-flap", "lily-pocket", "rose-lining"]) {
    assert.ok(explicit.files.some(name => name.startsWith(`assets/stationery-${artwork}-`)), artwork);
  }
  const textureWorker = await readFile(join(outDir, "texture-cache.js"), "utf8");
  assert.ok(textureWorker.startsWith("const assetVersion = " + JSON.stringify(explicit.marker.version) + ";"));
  const manifest = /^const assetFiles = (.+);$/m.exec(textureWorker);
  assert.ok(manifest, "full build writes an ordered resource manifest");
  const entries: [string, string, string[]][] = JSON.parse(manifest[1]);
  assert.deepEqual(JSON.parse(await readFile(join(outDir, `game-assets-${explicit.marker.version}.json`), "utf8")), entries);
  assert.ok(!entries.some(([file]) => /\.(?:mp4|webm|mov|ogv)$/i.test(file)));
  for (const [prefix, scene] of [["stationery-desk", "*"], ["room-interactive", "room"], ["town-quarry", "town"],
    ["anniversary-town-hd", "town"], ["radio", "town-radio"], ["meadow-jelly-bells", "meadow"],
    ["echo-mines", "ruins"], ["garden-guest-routines", "garden"], ["gardener-tending", "challenge"],
    ["party-props-v11", "town"], ["party-props-v11", "garden"],
    ["festival-balloons-map", "town"], ["festival-balloons-map", "garden"], ["astrolabe-map", "ruins"],
    ["shelf-keepsakes", "town-hall"], ["achievement-letter-seals", "*"], ["worn-jewelry", "*"],
    ...["room", "garden", "challenge", "meadow", "town", "town-baker", "town-florist"].map(scene => ["small-map-props", scene]),
    ["town-work-poses", "town-radio"], ["town-gestures", "town-baker"]]) {
    assert.ok(entries.some(([path, , scenes]) => path.startsWith("assets/" + prefix + "-") && scenes.includes(scene)), prefix);
  }
  for (const prefix of ["wardrobe-icons", "fufu-garments", "fufu-footwear",
    "qingya-bouquet", "stationery-sealed", "stationery-album", "astrolabe-relics",
    "keepsakes", "peach-walk", "fufu-cursor-arrow", "fufu-cursor-play"]) {
    assert.ok(entries.some(([path, , scenes]) => path.startsWith("assets/" + prefix + "-") && scenes.includes("*")), prefix);
  }
  assert.deepEqual(entries.find(([file]) => file.startsWith("assets/arcade-postcard-"))?.[2], ["town"]);
  for (const prefix of ["apple-tree", "garden-bench"])
    assert.deepEqual(entries.find(([file]) => file.startsWith("assets/" + prefix + "-"))?.[2], ["challenge"]);
  const npcScenes = entries.find(([file]) => file.startsWith("assets/town-npcs-"))?.[2];
  assert.ok(npcScenes?.includes("town") && !npcScenes.includes("town-radio"));
  for (const [chunk, scenes] of [["main", ["*"]], ["cursors", ["*"]], ["view", []]] as const) {
    assert.deepEqual(entries.find(([file]) => file.startsWith("assets/" + chunk + "-") && file.endsWith(".css"))?.[2], scenes);
  }
  for (const prefix of ["journal-letter", "journal-album", "journal-cinema", "meadow-postcard"]) {
    assert.deepEqual(entries.find(([path]) => path.startsWith("assets/" + prefix + "-"))?.[2], ["page"], prefix);
  }
  assert.deepEqual(entries.map(([file]) => file).sort(), explicit.files.filter(name => name.startsWith("assets/") && name !== paper));
  assert.match(entries[0][0], /^assets\/fufu-garments-/);
  assert.match(entries[1][0], /^assets\/room-interactive-/);
  assert.match(entries.at(-1)![0], /^assets\/anniversary-town-hd-v13-/);
  for (const [asset, expected] of entries) {
    const digest = createHash("sha256").update(await readFile(join(outDir, asset))).digest("base64");
    assert.equal(digest, expected, "resource cache integrity for " + asset);
  }
  const development = await devEntries({ cacheDir: join(dir, "vite-cache") });
  const devNames = development.map(([path]) => path);
  assert.equal(new Set(devNames).size, devNames.length);
  for (const name of walkSheets)
    assert.ok(devNames.includes("src/assets/resident-walk/" + name + "?no-inline"), name);
  for (const name of ["achievement-letter-seals", "garden-guest-routines", "gardener-hat", "guardian-moonstone",
    "meadow-jelly-bells", "shelf-keepsakes", "town-pond-water", "town-work-poses"])
    assert.ok(devNames.includes("src/assets/" + name + ".webp?no-inline"), name);
  const developmentMedia = await Promise.all(development.map(async ([url, , scenes]) => {
    const bytes = await readFile(new URL("../" + url.split("?")[0], import.meta.url));
    return [createHash("sha256").update(bytes).digest("base64"), scenes] as const;
  }));
  const distinctMedia = new Map<string, Set<string>>();
  for (const [digest, scenes] of developmentMedia) {
    const owners = distinctMedia.get(digest) ?? new Set<string>();
    for (const scene of scenes) owners.add(scene);
    distinctMedia.set(digest, owners);
  }
  const expectedMedia = [...distinctMedia].map(([digest, owners]) => {
    if (owners.size > 1) owners.delete("page");
    return [digest, owners.has("*") ? ["*"] : [...owners].sort()];
  });
  const releaseMedia = entries.filter(([file]) => !/\.(css|js)$/.test(file)).map(([, digest, scenes]) => [digest, [...scenes].sort()]);
  assert.deepEqual(expectedMedia, releaseMedia, "development and release media have the same content, ownership and order");
  assert.ok(!explicit.files.some(name => name.includes("stationery-cherrywood-box")));
  assert.ok(!explicit.files.some(name => /CharaStudio.*\.png$/i.test(name)));

  const lite = await run("false");
  assert.equal(lite.marker.mode, "lite");
  assert.doesNotMatch(lite.html, /journal-celestial-paper|journal-paper-preload|journal-open/);
  assert.ok(!lite.files.some(name => name.startsWith("assets/stationery-")));
  assert.ok(lite.marker.version && lite.marker.version !== explicit.marker.version);
  for (const file of lite.files) {
    assert.match(file, /^(?:assets|index\.html|release\.json|favicon\.svg|_headers|assets\/(?:[\w.-]+\.(?:js|css)|launch-(?:cottage|fufu|fox-letter|player)-[\w-]+\.webp|fufu-cursor-(?:arrow|play)-[\w-]+\.(?:svg|png)))$/);
    if (/\.(?:js|css|html)$/.test(file)) {
      const body = await readFile(join(outDir, file), "utf8");
      for (const name of gameArt) assert.ok(!body.includes(name), name);
      assert.doesNotMatch(body, /一卷绷带骨碌碌地滚到芙芙鞋尖|我数左边，你数右边|我们一起数回声/);
      assert.doesNotMatch(body, /room-interactive|fufu-garments|town-guests|anniversary-town|town-playground|patrick-camp|texture-cache\.js|rabe-anniversary-letter|patrick-anniversary-letter|star-xiaoye|star-zhenghao|成为了芙妮宝星|CharaStudio|stationery-|1-year\/picture\/|\.mp4\b/);
    }
  }
  assert.ok(lite.files.includes("favicon.svg") && lite.files.includes("_headers"));
  for (const kind of ["arrow", "play"]) {
    for (const format of ["svg", "png"]) {
      assert.ok(lite.files.some(name => name.startsWith(`assets/fufu-cursor-${kind}-`) && name.endsWith(`.${format}`)));
    }
  }
  const implicit = await run();
  assert.deepEqual(implicit, explicit);
  await assert.rejects(run("flase"), /FULL_BUILD/);
});

test("a large scanned catalogue is available in the game and excluded from the invitation", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-mail-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oldMode = process.env.FULL_BUILD;
  t.after(() => {
    if (oldMode === undefined) delete process.env.FULL_BUILD;
    else process.env.FULL_BUILD = oldMode;
  });
  const launch = join(root, "src", "launch");
  const source = join(root, "ref", "来信");
  await mkdir(launch, { recursive: true });
  await mkdir(source, { recursive: true });
  await writeFile(join(root, "index.html"), '<script type="module" src="/src/launch/lite.ts"></script>');
  await writeFile(join(launch, "lite.ts"), 'document.body.textContent = "邀请函"');
  await writeFile(join(launch, "full.ts"), 'import { letterRecords } from "../letters.generated"; document.body.textContent = letterRecords.map(letter => letter.text).join(" ");');
  const letters = Array.from({ length: 64 }, (_, n) => ({
    id: `letter-${n}`, title: "来信", author: "作者", text: `来自第 ${n + 1} 封测试信的问候。`,
  }));
  await writeFile(join(source, "letters.json"), JSON.stringify(letters.slice(0, 32)));
  await writeFile(join(source, "more.json"), JSON.stringify(letters.slice(32)));
  await scanLetters(source, join(root, "src", "letters.generated.ts"));
  const run = async (full: boolean) => {
    process.env.FULL_BUILD = String(full);
    const outDir = join(root, full ? "full" : "lite");
    await build({ root, configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      logLevel: "silent", build: { outDir } });
    const assets = join(outDir, "assets");
    const modules = (await readdir(assets)).filter(name => name.endsWith(".js"));
    const scripts = await Promise.all(modules.map(name => readFile(join(assets, name), "utf8")));
    return scripts.join("\n");
  };
  const full = await run(true);
  for (const letter of letters) assert.ok(full.includes(letter.text), letter.id);
  assert.doesNotMatch(await run(false), /封测试信的问候|letter-\d+/);

  // A theme file under the catalogue is validated separately from letter records.
  const stationery = join(source, "信笺");
  await mkdir(stationery);
  await writeFile(join(stationery, "config.json"), JSON.stringify({ default: {}, themes: {} }));
  await scanLetters(source, join(root, "src", "letters.generated.ts"));
  await writeFile(join(launch, "full.ts"),
    'import theme from "../../ref/来信/信笺/config.json"; document.body.textContent = theme.default.title;');
  await assert.rejects(run(true), /default\.title 需要填写主题名/);
  assert.doesNotMatch(await run(false), /config\.json|信笺/);
});

test("dev discovers only used star sprites, and a build rejects an unmapped game texture", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-media-coverage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
  const launch = join(root, "src", "launch"), stars = join(root, "ref", "花海星星");
  await Promise.all([mkdir(launch, { recursive: true }), mkdir(stars, { recursive: true }), mkdir(join(root, "src", "assets"), { recursive: true })]);
  const fixture = new URL("../src/assets/fufu-cursor-arrow.png", import.meta.url);
  await Promise.all(["used.png", "unused.png"].map(name => copyFile(fixture, join(stars, name))));
  await writeFile(join(launch, "full.ts"), 'document.body.dataset.star = new URL("../../ref/花海星星/used.png?no-inline", import.meta.url).href;');
  const previous = process.env.FULL_BUILD;
  t.after(() => { if (previous === undefined) delete process.env.FULL_BUILD; else process.env.FULL_BUILD = previous; });
  process.env.FULL_BUILD = "true";
  const resources = await devEntries({ root, configFile, cacheDir: join(root, "cache") });
  assert.deepEqual(resources, [["ref/花海星星/used.png?no-inline", "", ["meadow"]]]);

  await copyFile(fixture, join(root, "src", "assets", "unregistered.png"));
  await writeFile(join(root, "index.html"), '<script type="module" src="/src/launch/lite.ts"></script>');
  await writeFile(join(launch, "full.ts"), 'import art from "../assets/unregistered.png?no-inline"; document.body.dataset.art = art;');
  await assert.rejects(build({ root, configFile, logLevel: "silent", build: { write: false } }), /资源清单归属：src\/assets\/unregistered.png/);
});

test("content aliases retain their map owners even when shared with the homepage or a cursor", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-media-alias-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outDir = join(root, "dist"), configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
  const pairs = [
    ["src/assets/room-interactive.webp", "src/assets/anniversary-garden-tree-free.webp", "shared-garden-room"],
    ["src/assets/journal-letter.webp", "src/assets/xiaoye-note.webp", "room"],
    ["src/assets/journal-celestial-paper.webp", "src/assets/garden-bench.webp", "challenge"],
    ["src/assets/fufu-footwear.webp", "src/assets/white-bass-v18.webp", "common"],
    ["src/assets/fufu-cursor-arrow.png", "ref/花海星星/this-is-a-custom-credited-star.png", "common"],
    ["src/assets/fufu-cursor-play.png", "src/launch/icon.png", "loose"],
  ];
  const imports = [], variables = [], expected = new Map<string, string>();
  for (const [original, alias, group] of pairs) {
    const bytes = await readFile(new URL("../" + original, import.meta.url));
    expected.set(createHash("sha256").update(bytes).digest("base64"), group);
    for (const path of [original, alias]) {
      const name = "art" + variables.length;
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), bytes);
      imports.push('import ' + name + ' from "/' + path + '?no-inline";');
      variables.push(name);
    }
  }
  await writeFile(join(root, "src/launch/full.ts"), imports.join("\n") + "\ndocument.body.textContent = [" + variables.join(",") + "].join();");
  await writeFile(join(root, "index.html"), '<script type="module" src="/src/launch/lite.ts"></script>');
  const old = process.env.FULL_BUILD;
  t.after(() => { if (old === undefined) delete process.env.FULL_BUILD; else process.env.FULL_BUILD = old; });
  process.env.FULL_BUILD = "true";
  await build({ root, configFile, logLevel: "silent", build: { outDir } });
  const json = async (name: string) => JSON.parse(await readFile(join(outDir, name), "utf8"));
  const { version } = await json("release.json");
  const files: Resource[] = await json("game-assets-" + version + ".json"), index = await json("game-packs-" + version + ".json");
  const groups = new Map<string, string>();
  for (const pack of index.packs) {
    for (const [name] of pack.entries) {
      assert.ok(!groups.has(name));
      groups.set(name, pack.group);
    }
  }
  const media = files.filter(([name]) => /\.(webp|png)$/.test(name));
  assert.equal(media.length, expected.size);
  for (const [name, digest, owners] of media) {
    const group = expected.get(digest);
    assert.ok(group, name);
    assert.equal(groups.get(name) ?? "loose", group);
    assert.deepEqual([...owners].sort(), group === "common" || group === "loose" ? ["*"]
      : group === "shared-garden-room" ? ["garden", "room"] : [group]);
  }
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    const name = url.pathname.split("/").at(-1)!;
    return new Response(await readFile(join(root, "artifacts", "game-packs", index.branch, name)));
  });
  const cache = { match: async () => undefined, put: async () => {} } as unknown as Cache;
  const packs = new PackResources(index, files, new URL("https://game.test/"), cache);
  for (const scene of ["room", "garden", "challenge"]) await packs.prepare(scene);
  for (const [name] of media)
    assert.equal(await packs.wait(name, new AbortController().signal), groups.has(name), name);
});
