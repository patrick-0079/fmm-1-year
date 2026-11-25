import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { scanLetters } from "../scripts/scan-letters.mjs";

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
    assert.doesNotMatch(html, /room-interactive|nemu-sprites|application-|rel="modulepreload"/);
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
    ["town-work-poses", "town-radio"], ["town-gestures", "town-baker"], ["cake-slice", "town-baker"]]) {
    assert.ok(entries.some(([path, , scenes]) => path.startsWith("assets/" + prefix + "-") && scenes.includes(scene)), prefix);
  }
  for (const prefix of ["wardrobe-v11", "reward-icons", "flower-wreath", "fufu-garments", "fufu-footwear",
    "strawberry-flats", "qingya-bouquet", "stationery-sealed", "stationery-album", "astrolabe-relics",
    "keepsakes", "arcade-postcard", "fufu-cursor-arrow", "fufu-cursor-play"]) {
    assert.ok(entries.some(([path, , scenes]) => path.startsWith("assets/" + prefix + "-") && scenes.includes("*")), prefix);
  }
  for (const prefix of ["journal-letter", "journal-album", "journal-cinema", "meadow-postcard"]) {
    assert.deepEqual(entries.find(([path]) => path.startsWith("assets/" + prefix + "-"))?.[2], ["page"], prefix);
  }
  assert.deepEqual(entries.map(([file]) => file).sort(), explicit.files.filter(name => name.startsWith("assets/") && name !== paper));
  assert.match(entries[0][0], /^assets\/nemu-sprites-/);
  assert.match(entries[1][0], /^assets\/room-interactive-/);
  assert.match(entries.at(-1)![0], /^assets\/anniversary-town-hd-v13-/);
  for (const [asset, expected] of entries) {
    const digest = createHash("sha256").update(await readFile(join(outDir, asset))).digest("base64");
    assert.equal(digest, expected, "resource cache integrity for " + asset);
  }
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
      assert.doesNotMatch(body, /room-interactive|nemu-sprites|town-guests|anniversary-town|town-playground|patrick-camp|texture-cache\.js|rabe-anniversary-letter|patrick-anniversary-letter|star-xiaoye|star-zhenghao|成为了芙妮宝星|CharaStudio|stationery-|1-year\/picture\/|\.mp4\b/);
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
