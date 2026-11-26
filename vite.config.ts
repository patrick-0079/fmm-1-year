import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, normalizePath, type Plugin, type Rollup } from "vite";
import { validateStationery } from "./scripts/validate-stationery.mjs";
import { readLetterCatalogue } from "./scripts/scan-letters.mjs";
import { assetScenes } from "./scripts/scene-assets.mjs";
import { developmentResourcePaths } from "./scripts/development-resource-paths";
import { textureWorkerSource } from "./scripts/texture-worker-source.mjs";
import { buildBranch, makeGamePacks, writeGamePacks } from "./scripts/game-packs.mjs";
import { OPEN_AT } from "./src/launch/time";

const root = fileURLToPath(new URL(".", import.meta.url));
const referenceRoot = normalizePath(fileURLToPath(new URL("./ref/", import.meta.url)));
const sourceRoot = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

const stationeryConfig: Plugin = {
  name: "fufu-stationery-config",
  enforce: "pre",
  async transform(_, id) {
    if (!normalizePath(id).endsWith("/ref/来信/信笺/config.json")) return;
    const directory = dirname(id);
    const { ids } = await readLetterCatalogue(dirname(directory));
    await validateStationery(directory, ids);
  },
};

function buildMode(value: string | undefined): "full" | "lite" {
  switch (value?.trim()) {
    case undefined:
    case "":
    case "true": return "full";
    case "false": return "lite";
    default: throw new Error("FULL_BUILD 必须为 true、false 或不设置。");
  }
}

const firstFrame = new Set(["src/assets/room-interactive.webp", "src/assets/fufu-garments.webp"]);
const roomArt = new Set(["fufu-footwear", "wardrobe-icons", "window-skies-v12",
  "white-bass-v18", "fufu-room-fox"].map(name => `src/assets/${name}.webp`));
const mapPreviews = new Set([
  "src/assets/anniversary-garden-tree-free.webp", "src/assets/courage-garden.webp",
  "src/assets/anniversary-town-v13.webp", "src/assets/echo-ruins.webp", "src/assets/night-meadow-v16.webp",
]);

function preloadOrder(sources: string[]) {
  if (sources.some(path => firstFrame.has(path))) return 0;
  if (sources.some(path => roomArt.has(path) || path.startsWith("ref/来信/信笺/") ||
      path.startsWith("src/assets/stationery-"))) return 1;
  if (sources.some(path => mapPreviews.has(path) || path.startsWith("ref/相册/previews/"))) return 2;
  if (sources.some(path => path.startsWith("src/assets/town-interiors/"))) return 3;
  if (sources.includes("src/assets/anniversary-town-hd-v13.webp")) return 5;
  return 4;
}

function mediaScenes(source: string) {
  const scenes = assetScenes(source);
  if (!scenes) throw Error("游戏媒体缺少资源清单归属：" + source);
  return scenes;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Use the source path to break ties, including pictures with the same name in different folders.
function compareResources(a: { order: number; source: string }, b: { order: number; source: string }) {
  return a.order - b.order || compareText(basename(a.source), basename(b.source)) || compareText(a.source, b.source);
}

const journalPaper = "src/assets/journal-celestial-paper.webp";
const isCursor = (source: string) => source.startsWith("src/assets/fufu-cursor-");

function assetOwners(sources: string[]) {
  const owners = new Set<string>(sources.flatMap(mediaScenes));
  // Page images load from the document. A byte-identical map image must still enter its pack.
  if (owners.has("*")) return ["*"];
  if (owners.size > 1) owners.delete("page");
  return [...owners];
}

function resourceManifest(bundle: Rollup.OutputBundle) {
  const chunkScenes = (name: string) => ["view", "debug"].includes(name) ? [] : ["*"];
  const styles = new Map<string, Set<string>>();
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== "chunk") continue;
    for (const css of chunk.viteMetadata?.importedCss ?? []) {
      const owners = styles.get(css) ?? new Set<string>();
      for (const scene of chunkScenes(chunk.name)) owners.add(scene);
      styles.set(css, owners);
    }
  }
  const resources = [], looseCursors = new Set<string>();
  for (const file of Object.values(bundle)) {
    if (!file.fileName.startsWith("assets/") || /\.(?:mp4|m4v|webm|mov|ogv)$/i.test(file.fileName)) continue;
    const originals = file.type === "asset" ? file.originalFileNames.map(normalizePath) : [];
    const sources = originals.filter(source => source !== journalPaper).sort();
    if (originals.length && !sources.length) continue;
    const first = (sources.length ? sources : [file.fileName])
      .map(source => ({ order: preloadOrder([source]), source })).sort(compareResources)[0];
    const scenes = file.type === "chunk" ? chunkScenes(file.name)
      : file.fileName.endsWith(".css") ? [...(styles.get(file.fileName) ?? ["*"])]
      : assetOwners(sources.length ? sources : [file.fileName]);
    if (sources.some(isCursor) && sources.every(source => isCursor(source) || mediaScenes(source).every((scene: string) => scene === "page")))
      looseCursors.add(file.fileName);
    const digest = createHash("sha256").update(file.type === "chunk" ? file.code : file.source).digest("base64");
    resources.push({ ...first, entry: [file.fileName, digest, scenes] });
  }
  return { files: resources.sort(compareResources).map(item => item.entry), looseCursors };
}

function releaseEntry(mode: "full" | "lite", debug: boolean): Plugin {
  const marker = (version: string) => JSON.stringify({ mode, version, commit: process.env.WORKERS_CI_COMMIT_SHA });
  let packBuild: ReturnType<typeof makeGamePacks> | undefined;
  return {
    name: "fufu-release-entry",
    transformIndexHtml: {
      // Select the dependency graph before Vite discovers module and asset URLs.
      order: "pre",
      handler(html) {
        if (!html.includes("/src/launch/lite.ts")) return html;
        const entryHtml = mode === "full"
          ? html.replace("__JOURNAL_EARLY_OPEN_AT__", debug ? "Infinity" : String(OPEN_AT))
          : html.replace(/\s*<!-- journal-full:start -->[\s\S]*?<!-- journal-full:end -->/, "");
        return {
          html: entryHtml.replace("/src/launch/lite.ts", `/src/launch/${mode}.ts`),
          tags: [{tag: "meta", attrs: { name: "fufu-release", content: mode, "data-version": `dev-${mode}` }}],
        };
      },
    },
    configureServer(server) {
      if (mode === "full") server.middlewares.use("/game-assets-dev-full.json", async (_request, response, next) => {
        try {
          const paths = await developmentResourcePaths(server);
          const entries = paths.filter(path => path.split("?")[0] !== journalPaper).map(path => {
            const source = path.split("?")[0];
            return { order: preloadOrder([source]), source, entry: [path, "", mediaScenes(source)] };
          }).sort(compareResources).map(item => item.entry);
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify(entries));
        } catch (error) { next(error); }
      });
      server.middlewares.use("/release.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.end(marker(`dev-${mode}`));
      });
    },
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        if (mode === "lite") {
          // Fail the build if an invitation module starts importing the game.
          for (const id of this.getModuleIds()) {
            const path = normalizePath(id);
            if (path.startsWith(referenceRoot)) {
              this.error(`倒计时包引用了游戏素材目录：ref/${path.slice(referenceRoot.length)}`);
            }
            if (path.startsWith(sourceRoot) && !path.startsWith(sourceRoot + "launch/")) {
              this.error(`倒计时包引用了游戏模块：${path.slice(sourceRoot.length)}`);
            }
          }
          // Full builds copy public/ normally. A future public/media upload must
          // never silently become part of the smaller pre-release artifact.
          for (const fileName of ["_headers", "favicon.svg"]) {
            const source = readFileSync(new URL(`./public/${fileName}`, import.meta.url));
            this.emitFile({ type: "asset", fileName, source });
          }
        }
        const hash = createHash("sha256").update(mode);
        const html = bundle["index.html"];
        if (html?.type !== "asset" || typeof html.source !== "string") this.error("缺少发布首页 index.html");
        hash.update(html.source);
        for (const name of Object.keys(bundle).sort()) hash.update(name);
        const catalogue = mode === "full" ? resourceManifest(bundle) : undefined;
        const files = catalogue?.files;
        if (catalogue) packBuild = makeGamePacks(catalogue.files, (path: string) => (bundle[path] as Rollup.OutputAsset).source,
          buildBranch(), (path: string) => catalogue.looseCursors.has(path));
        const packIndex = packBuild && JSON.stringify(packBuild.index);
        if (packIndex) hash.update(packIndex);
        const manifest = files && JSON.stringify(files);
        const worker = manifest && textureWorkerSource(debug);
        if (manifest && worker) hash.update(manifest).update(worker);
        const version = hash.digest("hex").slice(0, 16);
        html.source = html.source.replace(`data-version="dev-${mode}"`, `data-version="${version}"`);
        this.emitFile({ type: "asset", fileName: "release.json",
          source: marker(version) });
        if (manifest && worker) {
          this.emitFile({ type: "asset", fileName: `game-packs-${version}.json`, source: JSON.stringify({ ...packBuild!.index, release: version }) });
          this.emitFile({ type: "asset", fileName: `game-assets-${version}.json`, source: manifest });
          this.emitFile({ type: "asset", fileName: "texture-cache.js",
            source: `const assetVersion = ${JSON.stringify(version)};\nconst assetFiles = ${manifest};\n${worker}` });
        }
      },
    },
    async writeBundle(options) {
      if (packBuild && options.dir) await writeGamePacks(options.dir, packBuild);
    },
  };
}

export default defineConfig(({ mode }) => {
  const releaseMode = buildMode(loadEnv(mode, root, "FULL_BUILD").FULL_BUILD);
  return {
    server: { watch: { ignored: ["**/artifacts/**"] } },
    // The static site serves same-origin assets. Share their HTTP cache with worker fetches in preview too.
    preview: { cors: false },
    // The default dist/ is inside the Vite root and is emptied on every build.
    build: { copyPublicDir: releaseMode === "full" },
    plugins: [releaseEntry(releaseMode, loadEnv(mode, root, "VITE_").VITE_WARDROBE_DEBUG === "true"), releaseMode === "full" && stationeryConfig],
  };
});
