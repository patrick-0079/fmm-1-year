import { defineConfig } from "vite";

// On Windows an exported recording can be briefly locked while it is copied.
// Local screenshots, recordings and deployment bundles are outside the app.
export default defineConfig({
  server: { watch: { ignored: ["**/artifacts/**"] } },
});
