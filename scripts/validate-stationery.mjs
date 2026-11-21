import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const imageKeys = ["flap", "pocket", "lining", "paper", "seal", "motif"];
const colorKeys = ["flapTint", "pocketTint", "liningTint", "paperTint", "ink", "accent"];
const keys = new Set(["title", ...imageKeys, ...colorKeys]);
const imageExtension = /\.(?:png|webp|jpg|jpeg|avif)$/;
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Validate against the same case-sensitive, relative image keys that Vite imports. */
export async function validateStationery(directory, letterIds) {
  const configPath = join(directory, "config.json");
  const fail = message => { throw new Error(`${configPath} · ${message}`); };
  const json = await readFile(configPath, "utf8");
  let config;
  try {
    config = JSON.parse(json.replace(/^\uFEFF/, ""));
  } catch (error) {
    fail(error.message);
  }
  if (!isObject(config) || !isObject(config.themes) || !isObject(config.default)) fail("请提供 default 和 themes 对象。");
  for (const field of Object.keys(config)) {
    if (field !== "default" && field !== "themes") fail(`未识别的字段 ${field}。`);
  }

  const files = new Set((await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile() && imageExtension.test(entry.name))
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split(sep).join("/")));
  function validate(theme, label, defaults = false) {
    if (!isObject(theme)) fail(`${label} 需要一个配置对象。`);
    if (typeof theme.title !== "string" || !theme.title.trim()) fail(`${label}.title 需要填写主题名。`);
    for (const key of Object.keys(theme)) {
      if (!keys.has(key)) fail(`${label} 含有未识别的字段 ${key}。`);
    }
    for (const key of colorKeys) {
      if (!defaults && !Object.hasOwn(theme, key)) continue;
      if (typeof theme[key] !== "string" || !/^#[\da-fA-F]{6}$/.test(theme[key])) fail(`${label}.${key} 需要 #RRGGBB 颜色。`);
    }
    for (const key of imageKeys) {
      if (!Object.hasOwn(theme, key) && (!defaults || key === "motif")) continue;
      const file = theme[key];
      if (typeof file !== "string" || /[\\:%#?]/.test(file) || !imageExtension.test(file)
        || file.split("/").some(part => !part || part.startsWith("."))) {
        fail(`${label}.${key} 需要信笺目录内的相对图片路径。`);
      }
      if (!files.has(file)) fail(`${label}.${key} 找不到图片 ${file}，请核对文件名和大小写。`);
    }
  }
  validate(config.default, "default", true);
  for (const [id, theme] of Object.entries(config.themes)) {
    if (!letterIds.has(id)) fail(`themes 中的 ${id} 没有对应的来信 ID。`);
    validate(theme, "themes." + id);
  }
}
