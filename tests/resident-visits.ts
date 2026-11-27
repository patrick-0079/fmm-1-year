import { scenes, type SceneId, type World } from "../src/world";

export async function waitForVisit(check: () => boolean, message: string) {
  const deadline = performance.now() + 10_000;
  while (!check()) {
    if (performance.now() > deadline) throw Error(message);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

/** Advance the real garden bench so a test can visit someone on their shift. */
export async function waitOnBench(world: World) {
  await world.prepareScene("challenge");
  const bench = scenes.challenge.spots.find(s => s.id === "rest")!;
  world.switchScene("challenge", bench.approach);
  world.interact();
  const next = [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")]
    .find(b => /^⌈坐在长椅上等到(?:白昼|黄昏|星夜|清晨)⌋$/.test(b.textContent ?? ""));
  if (!next) throw Error("勇气花园长椅未提供等到下一时段");
  next.click();
  await waitForVisit(() => !next.isConnected, "长椅休息后未切换时段");
  world.standUp();
  document.querySelector<HTMLButtonElement>(".activity-close")!.click();
}

export const scheduledResident = (id: string) => id.startsWith("npc-") || id.startsWith("garden-guest-");

export async function arriveOnShift(world: World, scene: SceneId, id: string) {
  await world.prepareScene(scene);
  for (let shift = 0; shift < 4; shift++) {
    world.switchScene(scene);
    await new Promise<void>(done => requestAnimationFrame(() => done()));
    const spot = world.config.spots.find(s => s.id === id && world.available(s));
    if (spot) {
      // Skip the commute but keep the actual moving hotspot and E interaction.
      world.player = { ...spot.approach };
      world.setCueInput("keyboard");
      return spot;
    }
    if (shift < 3) await waitOnBench(world);
  }
  throw Error("四个时段都未遇见 " + id);
}
