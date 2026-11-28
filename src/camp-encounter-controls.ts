import { type CampEncounter, type CampEncounterId, CampEncounters } from "./camp-encounters";
import type { Point } from "./core";
import { readingTarget, reservedShortcut } from "./input";
import type { RestState } from "./rest";
import { sfx } from "./sound";
import type { World } from "./world";

const invitations: Record<CampEncounterId, [string, string]> = {
  bird: ["小鸟落在身旁", "听它唱歌"],
  butterfly: ["火蝴蝶绕着芙芙飞", "让它停一会儿"],
  jelly: ["一只水母游近了", "等它靠近"],
  marshmallow: ["棉花糖烤好了", "尝一口"],
};
type HitTest = (point: Point, event: Readonly<CampEncounter>, frame: number, pointerType: string) => boolean;

export class CampEncounterControls {
  private button = document.querySelector<HTMLButtonElement>(".camp-respond")!;
  private verb = this.button.querySelector("span")!;
  private status = document.querySelector<HTMLElement>(".rest-tools > span")!;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private lastInvitation: CampEncounterId | null = null;
  private seat: RestState | null = null;

  constructor(private world: World, private encounters: CampEncounters, hitTest: HitTest) {
    this.button.addEventListener("click", () => this.respond());
    window.addEventListener("keydown", event => {
      if (event.key.toLowerCase() !== "f" || event.repeat || event.defaultPrevented ||
        reservedShortcut(event) || readingTarget(event.target)) return;
      if (this.respond()) event.preventDefault();
    });
    const pointer = world.onPointer;
    world.onPointer = (type, point, pointerType) => {
      const encounter = this.visibleEncounter;
      if (type === "down" && encounter?.phase === "waiting" && this.canInteract() &&
        hitTest(point, encounter, this.encounters.frame(this.reduced.matches), pointerType) && this.respond()) return true;
      return pointer(type, point, pointerType);
    };
  }

  get visibleEncounter(): Readonly<CampEncounter> | null {
    return this.seat && this.seat === this.world.restState && this.world.scene === "meadow"
      ? this.encounters.current : null;
  }

  private canInteract() {
    return !!this.seat && this.seat === this.world.restState && this.world.scene === "meadow" &&
      !document.hidden && !this.world.paused && !this.world.suspended &&
      !this.world.busy && this.world.canShowInteractionCues();
  }

  private respond() {
    if (!this.canInteract() || !this.encounters.respond()) return false;
    this.showInvitation(null);
    return true;
  }

  private showInvitation(id: CampEncounterId | null) {
    if (id === this.lastInvitation) return;
    this.lastInvitation = id;
    if (id) {
      const [status, verb] = invitations[id];
      this.status.textContent = status;
      this.verb.textContent = verb;
    } else if (this.world.restState?.scene === "meadow") this.status.textContent = "在营火边歇脚";
    const hadFocus = this.button === document.activeElement;
    this.button.hidden = id === null;
    if (hadFocus && this.button.hidden && this.canInteract()) this.world.canvas.focus({preventScroll: true});
  }

  setSeat(seat: RestState | null) {
    const next = seat?.scene === "meadow" && seat.kind === "sitting" ? seat : null;
    if (this.seat === next) return;
    this.reset();
    this.seat = next;
  }

  tick(dt: number, reservedForStory: boolean) {
    this.setSeat(this.world.restState);
    const available = this.canInteract();
    const previousPhase = this.encounters.current?.phase;
    this.encounters.tick(available ? dt : 0, this.seat, reservedForStory);
    const event = this.visibleEncounter;
    if (previousPhase === "arrival" && event?.id === "bird" && event.phase === "waiting") sfx("camp-bird");
    this.showInvitation(available && event?.phase === "waiting" ? event.id : null);
  }

  reset() {
    this.seat = null;
    this.encounters.reset();
    this.showInvitation(null);
  }
}
