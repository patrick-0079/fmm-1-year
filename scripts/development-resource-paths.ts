import { relative } from "node:path";
import { normalizePath, type ViteDevServer } from "vite";

const gameMedia = /\.(?:webp|png|svg|jpe?g|avif|wav)$/i;

/** Follow the same entry as the full build, including dynamic imports and Vite-expanded globs. */
export async function developmentResourcePaths(server: ViteDevServer) {
  const graph = server.environments.client.moduleGraph;
  const visited = new Set<string>();
  const paths = new Set<string>();

  function add(path: string, query: string) {
    const params = new URLSearchParams(query);
    if (!gameMedia.test(path) || params.has("inline") || params.has("raw")) return;
    // Vite strips module import flags but retains flags such as no-inline in the served URL.
    const search = query.replace(/^\?/, "").split("&").filter(flag => flag && flag !== "url" && flag !== "import").join("&");
    paths.add(path + (search ? "?" + search : ""));
  }

  async function visit(url: string) {
    if (visited.has(url)) return;
    visited.add(url);
    const transformed = await server.transformRequest(url);
    const module = await graph.getModuleByUrl(url);
    if (!module || !transformed) throw Error("无法读取开发资源依赖：" + url);

    // Literal new URL assets are rewritten to public URLs, not imported modules.
    for (const match of transformed.code.matchAll(/\bnew URL\(("(?:[^"\\]|\\.)*"),\s*import\.meta\.url\)/g)) {
      const publicUrl: string = JSON.parse(match[1]);
      if (!publicUrl.startsWith(server.config.base) || publicUrl.startsWith("//")) continue;
      const resource = new URL(publicUrl, "http://localhost");
      add(decodeURI(resource.pathname.slice(server.config.base.length)), resource.search);
    }

    await Promise.all([...module.importedModules].map(async dep => {
      if (!dep.file) return;
      // CSS url() dependencies can carry the query in both file and url.
      const source = normalizePath(relative(server.config.root, dep.file.split("?")[0]));
      if (!source.startsWith("src/") && !source.startsWith("ref/")) return;
      if (gameMedia.test(source)) add(source, dep.url.split("?")[1] ?? "");
      else if (/\.(?:[cm]?[jt]sx?|css)$/i.test(source)) await visit(dep.url);
    }));
  }

  await visit("/src/launch/full.ts");
  return [...paths];
}
