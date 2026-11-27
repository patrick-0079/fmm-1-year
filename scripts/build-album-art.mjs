import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const defaultDirectory = fileURLToPath(new URL("../ref/相册", import.meta.url));
const artifacts = fileURLToPath(new URL("../artifacts", import.meta.url));
const formats = /\.(png|jpe?g|webp)$/i;
const naturalOrder = new Intl.Collator("zh-CN", { numeric: true });
const fingerprint = bytes => createHash("sha256").update(bytes).digest("hex").slice(0, 12);
const previewNames = (id, version) => [`${id}.${version}.webp`, `${id}.${version}-thumb.webp`];

function defaultTitle(file) {
  const stem = basename(file, extname(file));
  const capture = /^CharaStudio-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-Render$/i.exec(stem);
  return capture ? `${capture[1]}.${capture[2]}.${capture[3]} · ${capture[4]}:${capture[5]}:${capture[6]}` : stem;
}

function httpUrl(value) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error(`原图应使用 HTTP(S) 地址：${value}`);
  return url;
}

async function previewsExist(dir, photo) {
  if (!/^[0-9a-f]{12}$/.test(photo.version) || !(photo.width > 0 && photo.height > 0)) return false;
  try {
    await Promise.all(previewNames(photo.id, photo.version).map(name => access(join(dir, name))));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

/** Refresh the editable catalog in place; a checkout can contain previews of
 * archived originals as well as the local originals currently being edited. */
export async function scanAlbum(directory = defaultDirectory, originalsDirectory) {
  const root = resolve(directory);
  const projectAlbum = relative(defaultDirectory, root) === "";
  // Custom, standalone albums can still keep originals beside their catalog.
  const originals = resolve(originalsDirectory ?? (projectAlbum ? join(artifacts, "r2", "相册") : root));
  const catalogPath = join(root, "album.json");
  const initial = await readFile(catalogPath, "utf8");
  const album = JSON.parse(initial);
  const base = httpUrl(album.originalBaseUrl);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  if (!Array.isArray(album.photos)) throw new Error("album.json 中的 photos 必须是数组。");

  const entries = await readdir(originals, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = entries
    .filter(entry => entry.isFile() && formats.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => naturalOrder.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
  const available = new Set(files);
  const known = new Set(album.photos.map(photo => photo.file));
  if (known.size !== album.photos.length) throw new Error("album.json 中有重复的原图文件名。");
  for (const file of files) {
    if (!known.has(file)) album.photos.push({ file });
  }

  const previews = join(root, "previews");
  await mkdir(previews, { recursive: true });
  if (projectAlbum) await mkdir(artifacts, { recursive: true });
  const staging = await mkdtemp(join(projectAlbum ? artifacts : root, ".album-scan-"));
  const staged = [], superseded = [];
  const ids = new Set();
  try {
    for (const photo of album.photos) {
      const { file } = photo;
      if (typeof file !== "string" || /[\\/]/.test(file) || !formats.test(file)) {
        throw new Error(`无效的相册文件名：${file}`);
      }
      photo.id ??= "photo-" + fingerprint(file);
      if (typeof photo.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(photo.id) || ids.has(photo.id)) {
        throw new Error(`无效或重复的照片 ID：${photo.id}`);
      }
      ids.add(photo.id);
      photo.title ??= defaultTitle(file);
      photo.originalUrl ??= new URL(encodeURIComponent(file), base).href;
      httpUrl(photo.originalUrl);

      const ready = await previewsExist(previews, photo);
      if (!available.has(file)) {
        if (!ready) throw new Error(`缺少原图和可用的预览，请将原图放回 ${join(originals, file)}。`);
        continue;
      }
      const source = await readFile(join(originals, file));
      const version = fingerprint(source);
      if (ready && photo.version === version) continue;

      const image = sharp(source);
      const { autoOrient } = await image.metadata();
      const names = previewNames(photo.id, version);
      for (const [index, edge] of [640, 240].entries()) {
        await image.clone().autoOrient()
          .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
          .webp({ quality: index === 0 ? 80 : 78, effort: 4 })
          .toFile(join(staging, names[index]));
      }
      if (ready && photo.version !== version) superseded.push(...previewNames(photo.id, photo.version));
      Object.assign(photo, { width: autoOrient.width, height: autoOrient.height, version });
      staged.push(...names);
    }

    const result = JSON.stringify(album, null, 2) + "\n";
    // Decode all inputs before publishing. Versioned names leave the old
    // catalog and its images valid until the new catalog is renamed into place.
    if (await readFile(catalogPath, "utf8") !== initial) throw new Error("扫描时相册配置有变化，请重新运行。");
    for (const name of staged) await rename(join(staging, name), join(previews, name));
    if (result !== initial) {
      await writeFile(join(staging, "album.json"), result);
      await rename(join(staging, "album.json"), catalogPath);
    }
    for (const name of superseded) {
      try {
        await rm(join(previews, name), { force: true });
      } catch (error) {
        // Windows thumbnail viewers can still hold the previous version open.
        if (!["EBUSY", "EPERM"].includes(error.code)) throw error;
        console.warn(`旧预览正在使用，可稍后删除：${join(previews, name)}`);
      }
    }
    return album;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const album = await scanAlbum(process.argv[2], process.argv[3]);
  console.log(`相册已更新，共 ${album.photos.length} 张。标题和原图地址保存在 album.json。`);
}
