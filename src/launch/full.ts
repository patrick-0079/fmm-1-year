import { startLaunch } from "./start";

void startLaunch({
  open: () => import("../main"),
  preload: async () => {
    const { registerResourceCache, prepareGameResources } = await import("../texture-cache");
    void registerResourceCache();
    await prepareGameResources();
  },
});
