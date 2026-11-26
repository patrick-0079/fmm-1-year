import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { AwsClient } from "aws4fetch";
import { packBranch, packCdn, packDirectory, packPrefix, sha256 } from "./game-packs.mjs";

const exec = promisify(execFile);
const sites = { main: "https://fmm.patrick0079.top/", preview: "https://preview.fmm.patrick0079.top/" };
const leaseMs = 120_000;
const stateKey = "published-sets.json";
const emptyState = () => ({ format: 1, history: [], pending: {}, retired: [], lease: null });
const ok = (res, operation) => { if (!res.ok) throw Error(operation + " HTTP " + res.status); return res; };
const owned = (branch, file) => typeof file === "string" && file.startsWith(branch + "-") &&
  /^[a-z0-9-]+-[a-f0-9]{64}\.pack$/.test(file);

// Retire only objects previously referenced by a published set in this branch.
export function recordPublished(state, current, build, now = Date.now()) {
  const sets = [current, ...state.history.filter(set => set.version !== current.version)];
  state.history = sets.slice(0, 2);
  delete state.pending[build];
  for (const [id, candidate] of Object.entries(state.pending)) {
    if (now - candidate.started > 86400_000) delete state.pending[id];
  }
  state.retired = [...new Set([...state.retired, ...sets.slice(2).flatMap(set => set.files)])]
    .filter(file => !state.history.some(set => set.files.includes(file)));
  const protectedFiles = new Set(Object.values(state.pending).flatMap(set => set.files));
  return state.retired.filter(file => !protectedFiles.has(file));
}

function storage(env, branch) {
  const {R2_ACCOUNT_ID: account, R2_BUCKET: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey} = env;
  if (!/^[a-f\d]{32}$/.test(account || "") || bucket !== "fmm" || !accessKeyId || !secretAccessKey)
    throw Error("构建环境缺少 fmm 桶的上传凭据");
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto", retries: 1 });
  const root = "https://" + account + ".r2.cloudflarestorage.com/" + bucket + "/" + packPrefix + branch + "/";
  return (method, file, options = {}) => {
    if (file !== stateKey && !owned(branch, file)) throw Error("资源包超出当前分支");
    return client.fetch(root + file, { method, redirect: "error", signal: AbortSignal.timeout(30000), ...options });
  };
}

export async function withBranchState(request, action) {
  const owner = randomUUID();
  const deadline = Date.now() + 140_000;
  while (Date.now() < deadline) {
    // A compressed JSON representation can carry a weak ETag. R2's conditional PUT
    // must compare the strong ETag of the stored bytes.
    const response = await request("GET", stateKey, { headers: { "Accept-Encoding": "identity" } });
    const state = response.status === 404 ? emptyState() : await ok(response, "读取版本记录").json();
    if (state.format !== 1 || !Array.isArray(state.history) || !state.pending || !Array.isArray(state.retired))
      throw Error("无法识别已有的资源发布记录");
    let etag = response.headers.get("etag");
    if (response.status !== 404 && !etag) throw Error("版本记录缺少 ETag");
    if (etag?.startsWith("W/")) {
      const head = ok(await request("HEAD", stateKey, { headers: { "Accept-Encoding": "identity" } }), "检查版本记录");
      const strong = head.headers.get("etag");
      if (!strong || strong.startsWith("W/")) throw Error("版本记录缺少可用于条件写入的强 ETag");
      // Retry with a fresh body if a writer changed it between GET and HEAD.
      if (etag.slice(2) !== strong) { await delay(500); continue; }
      etag = strong;
    }
    const save = async lease => {
      state.lease = lease;
      const res = await request("PUT", stateKey, { body: JSON.stringify(state), headers: {
        "Content-Type": "application/json", "Cache-Control": "no-store, no-transform", [etag ? "If-Match" : "If-None-Match"]: etag || "*",
      } });
      if (res.status === 412 || res.status === 409) return false;
      ok(res, "保存版本记录");
      etag = res.headers.get("etag");
      if (!etag) throw Error("版本记录写入后缺少 ETag");
      return true;
    };
    const lease = () => ({ owner, until: Date.now() + leaseMs });
    if (state.lease?.until > Date.now() || !await save(lease())) { await delay(800 + Math.random() * 700); continue; }
    const checkpoint = async () => {
      if (!await save(lease())) throw Error("此分支已由另一构建接管");
    };
    try { return await action(state, checkpoint); }
    finally {
      if (!await save(null)) throw Error("当前发布锁已过期，版本记录由新持有者维护");
    }
  }
  throw Error("等待该分支的发布锁超时");
}

export async function syncPack(request, dir, pack) {
  const body = await readFile(join(dir, pack.file));
  if (body.length !== pack.size || sha256(body) !== pack.hash) throw Error("本机资源包校验失败");
  const md5 = createHash("md5").update(body).digest();
  const matches = head => head.ok && Number(head.headers.get("content-length")) === pack.size &&
    head.headers.get("x-amz-meta-sha256") === pack.hash && head.headers.get("etag") === '"' + md5.toString("hex") + '"';
  const head = await request("HEAD", pack.file);
  if (matches(head)) return "reused";
  if (head.status !== 404) ok(head, "检查 " + pack.file);
  const res = await request("PUT", pack.file, { body, headers: {
    "Content-Type": "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable, no-transform",
    "Content-MD5": md5.toString("base64"), "x-amz-meta-sha256": pack.hash,
  } });
  ok(res, "上传 " + pack.file);
  if (!matches(await request("HEAD", pack.file))) throw Error("远端资源包校验失败");
  return "uploaded";
}

async function syncSet(packs, perform) {
  const remaining = packs.values(), failed = [];
  let uploaded = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (const pack of remaining) {
      try { if (await perform(pack) === "uploaded") uploaded++; }
      catch (error) { failed.push(pack.file); console.warn("[pack]", pack.file, error.message); }
    }
  }));
  console.log("[pack] 新上传 %d，已校验 %d，缺项 %d", uploaded, packs.length - failed.length, failed.length);
  return !failed.length;
}

async function deployed(site, release) {
  if (!site) return false;
  const url = new URL("release.json", site);
  url.searchParams.set("verify", randomUUID());
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const live = await res.json();
    return live.mode === "full" && live.version === release.version && live.commit === release.commit;
  } catch { return false; }
}

async function verifyPublic(index, pack, site, dir) {
  const res = await fetch(index.base + pack.file, { headers: { Range: "bytes=0-0", Origin: new URL(site).origin, "Accept-Encoding": "identity" },
    signal: AbortSignal.timeout(15000) });
  const cors = res.headers.get("access-control-allow-origin");
  if (res.status !== 206 || res.headers.get("content-range") !== "bytes 0-0/" + pack.size ||
      (cors !== "*" && cors !== new URL(site).origin)) {
    await res.body?.cancel();
    throw Error("公开地址 Range/CORS 校验失败 HTTP " + res.status);
  }
  const first = new Uint8Array(await res.arrayBuffer()), local = await readFile(join(dir, pack.file));
  const etag = '"' + createHash("md5").update(local).digest("hex") + '"';
  if (first.length !== 1 || first[0] !== local[0] || res.headers.get("etag") !== etag)
    throw Error("公开地址返回了错误版本的资源包");
}

async function branchHead(branch) {
  try {
    const { stdout } = await exec("git", ["ls-remote", "--exit-code", "origin", "refs/heads/" + branch], { timeout: 8000 });
    return stdout.trim().split(/\s/)[0];
  } catch { return undefined; }
}

async function publish(phase) {
  if (!process.env.WORKERS_CI) return;
  const release = JSON.parse(await readFile("dist/release.json", "utf8"));
  if (release.mode !== "full") { console.log("[pack] 精简构建，跳过同步和清理"); return; }
  const env = process.env, branch = packBranch(env.WORKERS_CI_BRANCH), build = env.WORKERS_CI_BUILD_UUID;
  const index = JSON.parse(await readFile("dist/game-packs-" + release.version + ".json", "utf8"));
  if (!build || !env.WORKERS_CI_BRANCH || !release.commit || index.branch !== branch ||
      index.base !== packCdn + branch + "/" || index.release !== release.version || !index.packs.length)
    throw Error("构建身份与资源清单不符");
  const request = storage(env, branch), dir = packDirectory("dist", branch);
  const current = { version: index.version, files: index.packs.map(p => p.file) };
  if (current.files.some(file => !owned(branch, file))) throw Error("资源包目录不符");
  const site = env.PACK_SITE_URL || sites[env.WORKERS_CI_BRANCH];
  const register = () => withBranchState(request, async state => {
    state.pending[build] = { ...current, started: Date.now() };
  });
  const sync = () => syncSet(index.packs, p => syncPack(request, dir, p));
  if (phase === "prepare") {
    await register();
    if (!await sync()) console.warn("[pack] 网站继续发布，部署后补传");
    return;
  }
  if (phase !== "published") throw Error("无法识别的发布阶段");
  // A failed pre-deploy sync (including registration) must be recoverable without another commit.
  let complete = false;
  for (const wait of [0, 2000, 8000]) {
    if (wait) await delay(wait);
    try { await register(); if (await sync()) { complete = true; break; } }
    catch (error) { console.warn("[pack]", error.message); }
  }
  if (!complete) throw Error("补传仍有缺项，保留历史版本");
  if (!site) throw Error("该分支未指定公开站点，推迟清理");
  let online = false;
  for (const wait of [0, 1500, 3000, 6000, 10000, 15000]) {
    if (wait) await delay(wait);
    if (await deployed(site, release)) { online = true; break; }
  }
  if (!online) throw Error("线上版本与这次构建不符，推迟历史更新和清理");
  if (!await syncSet(index.packs, p => verifyPublic(index, p, site, dir))) throw Error("公开下载校验未完成，推迟清理");
  await withBranchState(request, async (state, checkpoint) => {
    if (!await deployed(site, release)) throw Error("线上版本已切换，推迟清理");
    const candidates = recordPublished(state, current, build);
    await checkpoint();
    let removed = 0;
    for (const file of candidates) {
      if (!owned(branch, file)) throw Error("历史清单含有非本分支资源");
      if (await branchHead(env.WORKERS_CI_BRANCH) !== release.commit || !await deployed(site, release)) {
        console.warn("[pack] 分支或站点已更新，推迟余下清理"); break;
      }
      await checkpoint();
      ok(await request("DELETE", file), "清理 " + file);
      state.retired = state.retired.filter(item => item !== file);
      removed++;
    }
    console.log("[pack] 网站与 CDN 已核验，保留 %d 套素材，清理 %d 个旧包", state.history.length, removed);
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  publish(process.argv[2]).catch(error => console.warn("[pack] 同步待重试，网站继续使用散文件回退：", error.message));
}
