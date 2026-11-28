import type { RestState } from "./rest.ts";

export const campEncounterIds = ["bird", "butterfly", "jelly", "marshmallow", "starFawn", "moonBoat", "cloudWhale"] as const;
export type CampEncounterId = typeof campEncounterIds[number];
const phases = {
  arrival: { seconds: 1.6, first: 0, count: 4, still: 3 },
  waiting: { seconds: 6, first: 3, count: 1, still: 3 },
  passive: { seconds: 2, first: 4, count: 4, still: 5 },
  active: { seconds: 3.2, first: 8, count: 8, still: 12 },
} as const;
export type CampEncounterPhase = keyof typeof phases;
export interface CampEncounter {
  id: CampEncounterId;
  phase: CampEncounterPhase;
  elapsed: number;
}

const rollInterval = 7;
const encounterChance = .47;

export class CampEncounters {
  private seat: RestState | null = null;
  private event: CampEncounter | null = null;
  private delay = rollInterval;
  private reserved = false;
  private remaining: CampEncounterId[] = [];
  private last?: CampEncounterId;
  private random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  get current(): Readonly<CampEncounter> | null { return this.reserved ? null : this.event; }

  preview(id: CampEncounterId, seat: RestState, reservedForStory: boolean) {
    this.tick(0, seat, reservedForStory);
    this.event = { id, phase: "arrival", elapsed: 0 };
    this.delay = rollInterval;
  }

  reset() {
    this.seat = null;
    this.event = null;
    this.delay = rollInterval;
    this.reserved = false;
  }

  private drawVisitor(): CampEncounterId {
    if (!this.remaining.length) this.remaining = [...campEncounterIds];
    // Every visitor gets one turn per bag, and two bags cannot meet on a repeat.
    const choices = this.remaining.filter(id => id !== this.last);
    const id = choices[Math.floor(this.random() * choices.length)];
    this.remaining.splice(this.remaining.indexOf(id), 1);
    this.last = id;
    return id;
  }

  tick(seconds: number, seat: RestState | null, reservedForStory: boolean) {
    if (seat !== this.seat) {
      this.reset();
      this.seat = seat;
    }
    if (!seat) return;
    const wasReserved = this.reserved;
    this.reserved = reservedForStory;
    // The tick which finishes the letter belongs to Patrick's presentation.
    if (reservedForStory || wasReserved) return;
    while (seconds > 0) {
      if (!this.event) {
        if (seconds < this.delay) { this.delay -= seconds; return; }
        seconds -= this.delay;
        this.delay = rollInterval;
        if (this.random() < encounterChance)
          this.event = { id: this.drawVisitor(), phase: "arrival", elapsed: 0 };
      } else {
        const remaining = phases[this.event.phase].seconds - this.event.elapsed;
        if (seconds < remaining) { this.event.elapsed += seconds; return; }
        seconds -= remaining;
        if (this.event.phase === "arrival" || this.event.phase === "waiting") {
          this.event.phase = this.event.phase === "arrival" ? "waiting" : "passive";
          this.event.elapsed = 0;
        } else this.event = null;
      }
    }
  }

  respond() {
    if (this.reserved || this.event?.phase !== "waiting") return false;
    this.event.phase = "active";
    this.event.elapsed = 0;
    return true;
  }

  frame(reduced: boolean) {
    if (!this.event) return 0;
    const phase = phases[this.event.phase];
    if (reduced) return phase.still;
    return phase.first + Math.min(phase.count - 1, Math.floor(this.event.elapsed * phase.count / phase.seconds));
  }
}
