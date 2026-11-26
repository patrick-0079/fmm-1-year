import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const packPrefix = "1-year/game-packs/";
export const packCdn = "https://cdn.xn--nemu-k77ja176r.space/" + packPrefix;
export const sha256 = data => createHash("sha256").update(data).digest("hex");

export function packBranch(branch) {
  if (/^[a-z0-9][a-z0-9-]{0,62}$/.test(branch)) return branch;
  return branch.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0,42).replace(/^-+|-+$/g, "") + "-" + sha256(branch).slice(0,16);
}

export function buildBranch() {
  if (process.env.WORKERS_CI_BRANCH) return packBranch(process.env.WORKERS_CI_BRANCH);
  if (process.env.WORKERS_CI) throw Error("Cloudflare 构建缺少 WORKERS_CI_BRANCH");
  try { return packBranch(execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() || "local"); }
  catch { return "local"; }
}

export function makeGamePacks(files, bytesFor, branch) {
  const groups = new Map();
  for (const [path, , scenes] of files) {
    if (!scenes.length || scenes.includes("page") || path.startsWith("assets/fufu-cursor-") ||
        !/\.(?:webp|png|svg|jpe?g|avif|wav)$/i.test(path)) continue;
    const sorted = [...scenes].sort();
    const group = sorted.includes("*") ? "common" : sorted.length === 1 ? sorted[0] : "shared-" + sorted.join("-");
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(path);
  }
  const bodies = new Map(), packs = [];
  for (const [group, paths] of [...groups].sort(([a],[b]) => a < b ? -1 : 1)) {
    let size = 0;
    const parts = [], entries = [];
    for (const path of paths) {
      const bytes = Buffer.from(bytesFor(path));
      entries.push([path, size, bytes.length]);
      size += bytes.length;
      parts.push(bytes);
    }
    const body = Buffer.concat(parts, size), hash = sha256(body);
    const file = branch + "-" + group + "-" + hash + ".pack";
    bodies.set(file, body);
    packs.push({ group, file, hash, size, entries });
  }
  const version = sha256(JSON.stringify(packs.map(({group, hash, entries}) => [group, hash, entries])));
  return { index: { format: 1, branch, base: packCdn + branch + "/", version, packs }, bodies };
}

export function packDirectory(outDir, branch) {
  return join(dirname(resolve(outDir)), "artifacts", "game-packs", branch);
}

export async function writeGamePacks(outDir, build) {
  const dir = packDirectory(outDir, build.index.branch);
  await mkdir(dir, { recursive: true });
  await Promise.all([...build.bodies].map(([file, body]) => writeFile(join(dir, file), body)));
}
