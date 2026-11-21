import { starIndex } from "./stars.generated.ts";
import type { CreditStarShape } from "./credit-star-art.ts";

export interface CreditStar {
  id: string;
  name: string;
  message: string;
  shape?: CreditStarShape;
  sprite?: string;
  x: number;
  y: number;
}

interface StarEntry {
  record: {id: string; name: string; message?: string; shape?: string};
  sprite?: string;
  x: number;
  y: number;
}

export const producers: CreditStar[] = starIndex.map(({ record, sprite, x, y }: StarEntry) => ({
  id: record.id,
  name: record.name,
  message: record.message ?? "",
  shape: record.shape === "plain" ? undefined : record.shape as CreditStarShape | undefined,
  sprite,
  x, y,
}));
