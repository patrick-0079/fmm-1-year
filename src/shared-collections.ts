import { plateAligned, starLit, type AstrolabeState } from "./astrolabe.ts";
import type { Progress } from "./core.ts";
import { mergeTownKeepsakes } from "./town-keepsakes.ts";

function puzzleStage(plate: AstrolabeState) {
  if (starLit(plate)) return 3;
  if (plateAligned(plate)) return 2;
  return plate.installed ? 1 : 0;
}

function addMissing<T>(into: T[], from: readonly T[]) {
  for (const id of from) if (!into.includes(id)) into.push(id);
}

/** Keep completed activities and discoveries when another window saves its own adventure. */
export function mergeCollections(into: Progress, from: Progress, sourceIsLatestSave = false) {
  addMissing(into.visited, from.visited);
  addMissing(into.completed, from.completed);
  addMissing(into.rainbowFlowers, from.rainbowFlowers);
  addMissing(into.creditStars, from.creditStars);
  mergeTownKeepsakes(into.townKeepsakes, from.townKeepsakes);
  into.bedNoteUnlocked ||= from.bedNoteUnlocked;
  into.bassSongPlayed ||= from.bassSongPlayed;
  if (from.gardenTape === "inserted" || into.gardenTape === "missing") into.gardenTape = from.gardenTape;
  into.decoratorMet ||= from.decoratorMet;
  into.rabbitIntroduced ||= from.rabbitIntroduced;
  addMissing(into.echoes.found, from.echoes.found);
  into.echoes.played = Math.max(into.echoes.played, from.echoes.played);
  into.echoes.listened ||= from.echoes.listened;

  const plate = into.astrolabe, other = from.astrolabe;
  addMissing(plate.found, other.found);
  const localStage = puzzleStage(plate), otherStage = puzzleStage(other);
  if (otherStage > localStage || (sourceIsLatestSave && otherStage === localStage && other.installed)) {
    plate.installed = other.installed;
    plate.turns = [...other.turns];
    plate.mirrors = [...other.mirrors];
  }
}
