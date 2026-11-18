import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = normalizePath(fileURLToPath(new URL("./src/", import.meta.url)));

function buildMode(value: string | undefined): "full" | "lite" {
  switch (value?.trim()) {
    case undefined:
    case "":
    case "true": return "full";
    case "false": return "lite";
    default: throw new Error("FULL_BUILD 必须为 true、false 或不设置。");
  }
}

function releaseEntry(mode: "full" | "lite"): Plugin {
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
        const version = hash.digest("hex").slice(0, 16);
        html.source = html.source.replace(`data-version="dev-${mode}"`, `data-version="${version}"`);
        this.emitFile({ type: "asset", fileName: "release.json",
          source: marker(version) });
      },
    },
  };
}

const textureCache: Plugin = {
  name: "fufu-texture-cache",
  apply: "build",
  generateBundle(_, bundle) {
    const textures = Object.keys(bundle).filter(path => /\.(webp|png|jpe?g|avif|gif|svg)$/i.test(path)).sort();
    const worker = readFileSync(new URL("./scripts/texture-worker.js", import.meta.url), "utf8");
    this.emitFile({ type: "asset", fileName: "texture-cache.js",
      source: `const textureFiles = ${JSON.stringify(textures)};\n${worker}` });
  },
};

export default defineConfig(({ mode }) => {
  const releaseMode = buildMode(loadEnv(mode, root, "FULL_BUILD").FULL_BUILD);
  return {
    server: { watch: { ignored: ["**/artifacts/**"] } },
    // The default dist/ is inside the Vite root and is emptied on every build.
    build: { copyPublicDir: releaseMode === "full" },
    plugins: [releaseEntry(releaseMode), releaseMode === "full" && textureCache],
  };
});
