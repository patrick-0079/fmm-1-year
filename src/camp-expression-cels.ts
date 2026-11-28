import type { CampEncounter, CampEncounterId } from "./camp-encounters";

// Pixel coordinates in each 144 × 184 original seated costume drawing.
export const campExpressionRect = {x: 45, y: 89, width: 56, height: 28} as const;
export const campExpressionDrawings = [
  "glanceLeft", "lookLeft", "glanceUp", "lookUp", "glanceRight", "lookRight",
  "glanceDown", "lookDown", "closing", "bite", "taste",
  "blinkHalf", "blinkShut", "softSmile",
] as const;

// -1 displays the original eyes and mouth. The shorter blink exposure is
// timed separately from the visitor's longer animation cels.
const cels = {
  bird:        [-1, 0, 0,-1,   0, 1, 0,-1,  -1, 0, 1, 1, 1, 1, 0,-1],
  butterfly:   [-1, 2, 2,-1,   2, 3, 2,-1,  -1, 2, 3, 3, 2, 2, 2,-1],
  jelly:       [-1, 4, 4,-1,   4, 5, 4,-1,  -1, 4, 5, 5, 5, 5, 4,-1],
  marshmallow: [-1, 6, 6,-1,   6, 7, 6,-1,  -1, 6, 7, 8, 9,10, 6,-1],
} satisfies Record<CampEncounterId, number[]>;

export function campExpressionCel(id: CampEncounterId, frame: number) {
  return cels[id][frame] ?? -1;
}

export const campHeadOffsets = {
  neutral: [0,0], listenLead: [-1,1], listen: [-2,2], liftLead: [-1,-1], lift: [-1,-2],
  followLead: [1,0], follow: [2,0], nodLead: [0,1], nod: [0,3],
} as const;
export type CampHeadPose = keyof typeof campHeadOffsets;
// The seated master supplies neutral. Each other column is a finished costume
// cel with its own neckline and a rigidly registered face and fringe.
export const campHeadDrawings = Object.keys(campHeadOffsets).filter((pose): pose is Exclude<CampHeadPose,"neutral"> => pose !== "neutral");
const heads = {
  bird: ["neutral","listenLead","listen","listenLead", "listenLead","listen","liftLead","neutral",
    "listenLead","listen","listen","nodLead","nod","nodLead","followLead","neutral"],
  butterfly: ["neutral","liftLead","lift","liftLead", "liftLead","lift","lift","neutral",
    "liftLead","lift","liftLead","listenLead","listen","listenLead","liftLead","neutral"],
  jelly: ["neutral","followLead","follow","followLead", "followLead","follow","followLead","neutral",
    "followLead","follow","follow","nodLead","nod","followLead","follow","neutral"],
  marshmallow: ["neutral","listenLead","listen","listenLead", "listenLead","listen","listenLead","neutral",
    "listenLead","liftLead","neutral","nodLead","nod","nodLead","followLead","neutral"],
} as const satisfies Record<CampEncounterId, readonly CampHeadPose[]>;

export function campEncounterHead(id: CampEncounterId, frame: number, waiting?: number): CampHeadPose {
  if (waiting !== undefined && waiting > .5) {
    if (waiting < 1.4 || waiting > 4.75) return "neutral";
    return heads[id][waiting > 2 && waiting < 3.4 ? 2 : 3];
  }
  return heads[id][frame] ?? "neutral";
}

const half = campExpressionDrawings.indexOf("blinkHalf");
const shut = campExpressionDrawings.indexOf("blinkShut");
const smile = campExpressionDrawings.indexOf("softSmile");
const firstBlink = {bird:1.08, butterfly:1.42, jelly:1.72, marshmallow:1.28};

function blink(seconds: number) {
  if (seconds < 0 || seconds >= .33) return -1;
  return seconds < .10 || seconds >= .23 ? half : shut;
}

export function campRestExpression(elapsed: number, reduced: boolean) {
  if (reduced) return -1;
  const time = elapsed % 14.2;
  const start = time >= 10.85 ? 10.85 : time >= 7.05 ? 7.05 : 2.15;
  return blink(time - start);
}

export function campEncounterExpression(event: Readonly<CampEncounter>, frame: number, reduced: boolean) {
  if (event.phase === "waiting" && !reduced) {
    const at = event.elapsed - firstBlink[event.id];
    const lid = blink(at >= 3.45 ? at - 3.45 : at);
    if (lid >= 0) return lid;
    return event.elapsed > .55 && event.elapsed < 4.75 ? cels[event.id][2] : -1;
  }
  if (event.phase === "active" && event.id !== "marshmallow" &&
    ((event.id === "bird" && frame === 11) || frame === 12 || (event.id === "jelly" && frame === 13))) return smile;
  return campExpressionCel(event.id, frame);
}
