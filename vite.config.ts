import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, normalizePath, type Plugin, type Rollup } from "vite";
import { validateStationery } from "./scripts/validate-stationery.mjs";
import { readLetterCatalogue } from "./scripts/scan-letters.mjs";
import { assetScenes } from "./scripts/scene-assets.mjs";
import { textureWorkerSource } from "./scripts/texture-worker-source.mjs";

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

const firstFrame = new Set(["src/assets/room-interactive.webp", "src/assets/nemu-sprites.webp"]);
const roomArt = new Set(["fufu-rest-poses", "flower-wreath", "reward-icons", "window-skies-v12",
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

function resourceManifest(bundle: Rollup.OutputBundle) {
  return Object.values(bundle).filter(file => file.fileName.startsWith("assets/") && !/\.(?:mp4|m4v|webm|mov|ogv)$/i.test(file.fileName))
    .map(file => ({ file, order: file.type === "asset" ? preloadOrder(file.originalFileNames.map(normalizePath)) : 4 }))
    .sort((a, b) => a.order - b.order || (a.file.fileName < b.file.fileName ? -1 : 1))
    .map(({ file }) => [file.fileName, createHash("sha256")
      .update(file.type === "chunk" ? file.code : file.source).digest("base64"),
      file.type === "chunk" ? (["view", "debug"].includes(file.name) ? [] : ["*"]) :
        [...new Set(file.originalFileNames.flatMap(source => assetScenes(normalizePath(source)) ?? ["*"]))]]);
}

function developmentResources() {
  const paths = ["src/assets", "src/launch", "ref/来信/信笺", "ref/相册/previews", "ref/花海星星"].flatMap(dir =>
    readdirSync(join(root, dir), { recursive: true, encoding: "utf8" }).map(name => dir + "/" + normalizePath(name))
      .filter(path => /\.(?:webp|wav)$/i.test(path) || /\/fufu-cursor-[^/]+\.(?:png|svg)$/.test(path) ||
        (dir === "ref/来信/信笺" && /\.(?:png|jpg|jpeg|avif)$/i.test(path))));
  return paths.filter(path => assetScenes(path)).sort((left, right) => preloadOrder([left]) - preloadOrder([right]))
    .map(path => [path + (/^ref\/(相册|花海星星)\/|fufu-cursor-/.test(path) ? "?no-inline" : ""), "", assetScenes(path)]);
}

function releaseEntry(mode: "full" | "lite", debug: boolean): Plugin {
  const marker = (version: string) => JSON.stringify({ mode, version });
  return {
    name: "fufu-release-entry",
    transformIndexHtml: {
      // Select the dependency graph before Vite discovers module and asset URLs.
      order: "pre",
      handler(html) {
        if (!html.includes("/src/launch/lite.ts")) return html;
        return {
          html: html.replace("/src/launch/lite.ts", `/src/launch/${mode}.ts`),
          tags: [{tag: "meta", attrs: { name: "fufu-release", content: mode, "data-version": `dev-${mode}` }}],
        };
      },
    },
    configureServer(server) {
      if (mode === "full") server.middlewares.use("/game-assets-dev-full.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify(developmentResources()));
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
        const manifest = mode === "full" ? JSON.stringify(resourceManifest(bundle)) : undefined;
        const worker = manifest && textureWorkerSource(debug);
        if (manifest && worker) hash.update(manifest).update(worker);
        const version = hash.digest("hex").slice(0, 16);
        html.source = html.source.replace(`data-version="dev-${mode}"`, `data-version="${version}"`);
        this.emitFile({ type: "asset", fileName: "release.json",
          source: marker(version) });
        if (manifest && worker) {
          this.emitFile({ type: "asset", fileName: `game-assets-${version}.json`, source: manifest });
          this.emitFile({ type: "asset", fileName: "texture-cache.js",
            source: `const assetVersion = ${JSON.stringify(version)};\nconst assetFiles = ${manifest};\n${worker}` });
        }
      },
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
