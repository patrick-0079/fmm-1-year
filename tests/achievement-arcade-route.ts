import { SnakeGame, BlocksGame, HopGame, FlightGame, type Engine, type GameId } from "../src/arcade-engines";
import { LinkGame, MinesGame, MinerGame } from "../src/arcade-bonus";
import { readProgress, SAVE_KEY } from "../src/core";
import { readInventory, INVENTORY_KEY } from "../src/items";
import { ARCADES } from "../src/town-data";
import { scenes, type World } from "../src/world";

/** Plays fresh boards with the normal keyboard, reward and save handlers.
 * Read the live board to plan moves. Only the generator and simulation clock
 * are deterministic; scores, milestones, owned items and stamps are never set. */
export async function verifyArcadeStamps(world: World, log: (line: string) => void) {
  const constructors = {snake: SnakeGame, blocks: BlocksGame, hop: HopGame, flight: FlightGame,
    link: LinkGame, mines: MinesGame, miner: MinerGame};
  const save = () => readProgress(localStorage.getItem(SAVE_KEY));
  const assert = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
  const control = (key: string, down: boolean) => world.canvas.dispatchEvent(new KeyboardEvent(
    down ? "keydown" : "keyup", {key, bubbles: true, cancelable: true}));
  const tap = (key: string) => { control(key, true); control(key, false); };
  let clock = performance.now()/1000;
  const tick = (dt: number) => world.onTick(dt, clock += dt);
  const button = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!;
  const continuePlay = () => button(".arcade-result-actions button").click();

  for (const id of Object.keys(constructors) as GameId[]) {
    const game = ARCADES[id];
    await world.prepareScene(game.scene);
    const hotspot = scenes[game.scene].spots.find(spot => spot.id === "arcade-"+id)!;
    world.switchScene(game.scene, hotspot.approach);
    const prototype: Engine = constructors[id].prototype;
    let current: Engine | undefined;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "start");
    const start = prototype.start, random = Math.random;
    try {
      prototype.start = function() { current = this; start.call(this); };
      Math.random = () => id === "blocks" ? .2 : .5;
      world.onInteract(hotspot.id);
      button(".arcade-result-actions button").click();
    } finally {
      Math.random = random;
      if (descriptor) Object.defineProperty(prototype, "start", descriptor);
      else Reflect.deleteProperty(prototype, "start");
    }
    const e = current;
    if (!e) throw Error(id+" 没有开始");
    assert(e.status === "playing",id+" 应从准备画面进入挑战");
    if (e instanceof SnakeGame) {
      // One cycle visits all 280 squares without reversing into the tail.
      for (let i = 0; i < 1800 && e.status === "playing"; i++) {
        const {x, y} = e.body[0];
        const dir = x === 0 ? (y === 13 ? "Right" : "Down") : y % 2
          ? (x === 19 ? "Up" : "Right") : x > 1 || y === 0 ? "Left" : "Up";
        tap("Arrow"+dir);
        tick(.16);
      }
    } else if (e instanceof BlocksGame) {
      for (let n = 0; n < 10; n++) {
        const distance = (n % 5) * 2 - e.x;
        for (let i = 0; i < Math.abs(distance); i++) tap(distance < 0 ? "ArrowLeft" : "ArrowRight");
        tap("f");
      }
    } else if (e instanceof HopGame) {
      for (let n = 0; n < 8 && e.status === "playing"; n++) {
        const next = e.platforms[e.platformId + 1];
        const time = (175 + Math.sqrt(175 ** 2 + 880 * (next.y - 5 - e.y))) / 440;
        control(" ", true);
        tick(Math.min(1.2, Math.max(0, ((next.x-e.x)/time-82)/70)));
        control(" ", false);
        for (let i = 0; i < 200 && !e.grounded; i++) tick(1/120);
      }
    } else if (e instanceof FlightGame) {
      for (let i = 0; i < 7000 && e.score < 16 && e.status !== "lost"; i++) {
        if (e.status === "won") {
          assert(save().achievements.earned.includes("game-flight") && !save().achievements.earned.includes("flight-16"), "八门与十六门没有分开盖章");
          continuePlay();
        }
        const gate = e.gates.find(g => !g.passed);
        if (e.vy > 0 && e.y > (gate?.center ?? 80)) tap(" ");
        tick(1/120);
      }
      assert(save().achievements.earned.includes("flight-16"), "飞过十六门没有盖进阶章");
    } else if (e instanceof LinkGame) {
      for (let n=0; n<8; n++) {
        button(".arcade-extra-actions button").click();
        const pair = [...e.suggested];
        assert(pair.length === 2, "没有可连的提示");
        for (const index of pair) {
          const distance = (index-e.cursor+16)%16;
          for (let i=0;i<distance;i++) tap("ArrowRight");
          tap(" ");
        }
      }
    } else if (e instanceof MinesGame) {
      tap(" ");
      for (let index=1; index<30 && e.status==="playing"; index++) {
        tap("ArrowRight");
        if (!e.mines.has(index) && !e.revealed.has(index)) tap(" ");
      }
    } else if (e instanceof MinerGame) {
      for (let i=0; i<7500 && e.score<320; i++) {
        if (e.status==="won") {
          assert(save().achievements.earned.includes("game-miner") && !save().achievements.earned.includes("miner-320"), "矿工首次结算没有与进阶章分开");
          continuePlay();
        }
        if (e.phase==="swing" && e.treasures.some(t => Math.abs(Math.atan2(t.x-120,t.y-22)-e.angle)<.025)) tap(" ");
        tick(.025);
      }
      assert(save().achievements.earned.includes("miner-320"),"收集超过 320 矿光没有盖进阶章");
    }
    const progress=save();
    assert(e.achieved && progress.achievements.earned.includes("game-"+id), game.title+" 没有盖通关章，实得 "+e.score);
    assert(progress.arcadeBests[id]===e.score && readInventory(localStorage.getItem(INVENTORY_KEY)).owned.includes(game.reward), game.title+" 最高纪录或通关奖品未保存");
    log(game.title+" · "+e.score+"，通关章、奖品和最高纪录均已保存");
    button(".arcade-close").click();
  }
  assert(save().achievements.earned.includes("all-games"), "七枚通关章没有点亮游园券");
  log("七款全部通关后，「游园券上盖满啦」已盖章");
}
