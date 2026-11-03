import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

// On Windows an exported recording can be briefly locked while it is copied.
// Local screenshots, recordings and deployment bundles are outside the app.
export default defineConfig({
  server: { watch: { ignored: ["**/artifacts/**"] } },
  plugins: [{
    name: "fufu-texture-cache",
    apply: "build",
    generateBundle(_, bundle) {
      const textures = Object.keys(bundle).filter(path => /\.(webp|png|jpe?g|avif|gif|svg)$/i.test(path)).sort();
      const worker = readFileSync(new URL("./scripts/texture-worker.js", import.meta.url), "utf8");
      this.emitFile({type: "asset", fileName: "texture-cache.js",
        source: `const textureFiles = ${JSON.stringify(textures)};\n${worker}`});
    },
  }],
});
