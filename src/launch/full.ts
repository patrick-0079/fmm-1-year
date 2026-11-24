import { registerResourceCache } from "../texture-cache";
import { startLaunch } from "./start";

void startLaunch(() => {
  void registerResourceCache();
  return import("../main");
});
