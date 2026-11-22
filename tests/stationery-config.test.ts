import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanLetters } from "../scripts/scan-letters.mjs";

test("the letter scanner validates stationery overrides without requiring a theme for every letter", async t => {
  const root = await mkdtemp(join(tmpdir(), "fufu-stationery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "来信"), stationeryDir = join(source, "信笺");
  await mkdir(source);
  await mkdir(join(stationeryDir, "共享"), { recursive: true });
  await writeFile(join(stationeryDir, "共享", "底图.webp"), "fixture");
  await writeFile(join(source, "letters.json"), JSON.stringify(["moon", "sun"].map(id => ({
    id, title: "祝你晚安", author: "客人/?", text: "晚安。",
  }))));
  const defaults = {
    title: "铃兰", flap: "共享/底图.webp", pocket: "共享/底图.webp", lining: "共享/底图.webp",
    paper: "共享/底图.webp", seal: "共享/底图.webp", paperTint: "#FFFFFF", pocketTint: "#FFFFFF",
    flapTint: "#FFFFFF", liningTint: "#FFFFFF", ink: "#463B31", accent: "#553344",
  };
  const configPath = join(stationeryDir, "config.json");
  const manifest = join(root, "src", "letters.generated.ts");
  const scan = () => scanLetters(source, manifest, { stationeryDir });
  const configure = (themes: unknown) => writeFile(configPath, JSON.stringify({ default: defaults, themes }));
  await configure({ moon: { title: "月光纸", ink: "#30404E", neutralStock: true, paperSlices: [15, 20, 32, 30] } });
  assert.deepEqual(await scan(), { files: ["letters.json"], count: 2 });
  const previousManifest = await readFile(manifest, "utf8");
  for (const [theme, message] of [
    [{ moon: { title: "月光纸", paper: "../其他/底图.webp" } }, /相对图片路径/],
    [{ moon: { title: "月光纸", seal: "隔壁/缺图.webp" } }, /找不到图片/],
    [{ moon: { title: "月光纸", accent: "#fff" } }, /#RRGGBB/],
    [{ moon: { title: "月光纸", neutralStock: "false" } }, /neutralStock/],
    [{ moon: { title: "月光纸", paperSlices: [15, 20, 32, 0] } }, /paperSlices/],
    [{ moon: { title: "月光纸", paperSlices: [15, 20] } }, /paperSlices/],
    [{ moon: { title: "月光纸", typo: "未知" } }, /未识别的字段 typo/],
    [{ guest: { title: "无人领取" } }, /没有对应的来信 ID/],
  ] as const) {
    await configure(theme);
    await assert.rejects(scan, message);
    assert.equal(await readFile(manifest, "utf8"), previousManifest);
  }
});
