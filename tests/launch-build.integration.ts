import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";

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
    return { files, marker };
  };

  const explicit = await run("true");
  assert.equal(explicit.marker.mode, "full");
  assert.ok(explicit.files.includes("texture-cache.js"));
  assert.ok(explicit.files.includes("future-game-asset.txt"));
  assert.ok(explicit.files.some(name => name.includes("room-interactive")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/town-guests-")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/patrick-camp-")));
  assert.ok(explicit.files.some(name => name.startsWith("assets/stationery-desk-")));
  assert.ok(!explicit.files.some(name => /CharaStudio.*\.png$/i.test(name)));

  const lite = await run("false");
  assert.equal(lite.marker.mode, "lite");
  assert.ok(lite.marker.version && lite.marker.version !== explicit.marker.version);
  for (const file of lite.files) {
    assert.match(file, /^(?:assets|index\.html|release\.json|favicon\.svg|_headers|assets\/(?:[\w.-]+\.(?:js|css)|launch-(?:cottage|fufu|fox-letter|player)-[\w-]+\.webp|fufu-cursor-(?:arrow|play)-[\w-]+\.(?:svg|png)))$/);
    if (/\.(?:js|css|html)$/.test(file)) {
      const body = await readFile(join(outDir, file), "utf8");
      assert.doesNotMatch(body, /room-interactive|nemu-sprites|town-guests|patrick-camp|texture-cache\.js|rabe-anniversary-letter|patrick-anniversary-letter|star-xiaoye|star-zhenghao|成为了芙妮宝星|CharaStudio|stationery-desk|1-year\/picture\/|\.mp4\b/);
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
