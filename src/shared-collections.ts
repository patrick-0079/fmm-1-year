import { plateAligned, starLit } from "./astrolabe.ts";
import type { Progress } from "./core.ts";

function addMissing<T>(into: T[], from: readonly T[]) {
  for (const id of from) if (!into.includes(id)) into.push(id);
}

/** Keep completed activities and discoveries when another window saves its own adventure. */
export function mergeCollections(into: Progress, from: Progress) {
  addMissing(into.visited, from.visited);
  addMissing(into.completed, from.completed);
  addMissing(into.rainbowFlowers, from.rainbowFlowers);
  addMissing(into.creditStars, from.creditStars);
  addMissing(into.townKeepsakes.items, from.townKeepsakes.items);
  // Creeks break ties if two tabs made their first recordings at the same time.
  const track = from.townKeepsakes.radioTrack;
  if (track && (!into.townKeepsakes.radioTrack || track === "creek")) into.townKeepsakes.radioTrack = track;
  into.bedNoteUnlocked ||= from.bedNoteUnlocked;
  into.bassSongPlayed ||= from.bassSongPlayed;
  into.decoratorMet ||= from.decoratorMet;
  into.rabbitIntroduced ||= from.rabbitIntroduced;
  addMissing(into.echoes.found, from.echoes.found);
  into.echoes.played = Math.max(into.echoes.played, from.echoes.played);
  into.echoes.listened ||= from.echoes.listened;

  const plate = into.astrolabe, other = from.astrolabe;
  addMissing(plate.found, other.found);
  if ((!plate.installed && other.installed) || (!plateAligned(plate) && plateAligned(other)) ||
      (!starLit(plate) && starLit(other))) {
    plate.installed = other.installed;
    plate.turns = [...other.turns];
    plate.mirrors = [...other.mirrors];
  }
}
