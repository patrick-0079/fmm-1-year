import type { Phase } from "./day.ts";

export interface ChatTopic {
  text: string;
  replies?: readonly (readonly [label: string, reply: string])[];
}
export interface ChatBook {
  phases: Partial<Record<Phase, ChatTopic | string>>;
  familiar: readonly [ChatTopic | string, ChatTopic | string];
}

const phases: readonly Phase[] = ["dawn", "day", "dusk", "night"];
interface Cursor { count: number; turn: number }
interface ShiftVisits { day: number; count: number }
interface ChatRecord {
  introduced: boolean;
  phases: Partial<Record<Phase, Cursor>>;
  shifts?: Partial<Record<Phase, ShiftVisits>>;
}
export type ChatMemory = Record<string, ChatRecord>;
const fresh = (): ChatRecord => ({introduced: false, phases: {}});
const positive = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n > 0 && n < Number.MAX_SAFE_INTEGER;

export function readChatMemory(raw?: ChatMemory | null): ChatMemory {
  const memory: ChatMemory = Object.create(null);
  if (!raw || typeof raw !== "object") return memory;
  for (const [id, saved] of Object.entries(raw)) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || !saved || typeof saved !== "object") continue;
    const record = fresh();
    record.introduced = saved.introduced === true;
    for (const phase of phases) {
      const cursor = saved.phases?.[phase];
      if (cursor && positive(cursor.count) && positive(cursor.turn))
        record.phases[phase] = {count: cursor.count, turn: cursor.turn};
      const shift = saved.shifts?.[phase];
      if (shift && Number.isSafeInteger(shift.day) && shift.day >= 0 && positive(shift.count))
        (record.shifts ??= {})[phase] = {day: shift.day, count: shift.count};
    }
    if (record.introduced || record.shifts || Object.keys(record.phases).length) memory[id] = record;
  }
  return memory;
}

/** Simultaneous visits to the same page count once. Visits on different shifts both survive. */
export function mergeChatMemory(into: ChatMemory, from: ChatMemory) {
  let changed = false;
  for (const [id, saved] of Object.entries(from)) {
    const current = into[id] ??= fresh();
    if (saved.introduced && !current.introduced) {
      current.introduced = true;
      changed = true;
    }
    for (const phase of phases) {
      const other = saved.phases[phase], local = current.phases[phase];
      if (other && (!local || other.count > local.count ||
          (other.count === local.count && other.turn > local.turn))) {
        current.phases[phase] = {...other};
        changed = true;
      }
      const shift = saved.shifts?.[phase], seen = current.shifts?.[phase];
      if (shift && (!seen || shift.day > seen.day || (shift.day === seen.day && shift.count > seen.count))) {
        (current.shifts ??= {})[phase] = {...shift};
        changed = true;
      }
    }
  }
  return changed;
}

export class ResidentChats {
  private memory: () => ChatMemory;
  private save: () => void;

  constructor(memory?: () => ChatMemory, save: () => void = () => {}) {
    const session = readChatMemory();
    this.memory = memory ?? (() => session);
    this.save = save;
  }
  introduced(id: string) { return this.memory()[id]?.introduced === true; }
  introduce(id: string) {
    const record = this.memory()[id] ??= fresh();
    if (record.introduced) return;
    record.introduced = true;
    this.save();
  }
  /** Zero-based visit in this game day's shift. An outstanding delivery can replay visit zero. */
  visitShift(id: string, phase: Phase, day: number, hours: number, repeatFirst = false) {
    const record = this.memory()[id] ??= fresh();
    const shifts = record.shifts ??= {};
    // The night from 20:00 to 05:00 belongs to the day on which it started.
    const shiftDay = phase === "night" && hours < 5 ? day - 1 : day;
    const previous = shifts[phase];
    const visits = previous?.day === shiftDay ? previous.count : 0;
    if (visits && repeatFirst) return 0;
    shifts[phase] = {day: shiftDay, count: visits + 1};
    this.save();
    return visits;
  }
  /** -1 opens this shift's scene; other indices select the author's additional lines. */
  daily(id: string, phase: Phase, day: number, hours: number, hasOpening: boolean, familiarCount: number,
    pendingOpening = false) {
    const visits = this.visitShift(id, phase, day, hours, hasOpening && pendingOpening);
    if (!familiarCount || (hasOpening && visits === 0)) return -1;
    return (visits - (hasOpening ? 1 : 0)) % familiarCount;
  }
  next(id: string, book: ChatBook, phase: Phase): ChatTopic {
    const current = this.memory()[id] ??= fresh();
    const opening = book.phases[phase];
    if (!opening) throw new Error("缺少出场时段的话题：" + id + " / " + phase);
    const choices = [opening, ...book.familiar];
    const cursor = current.phases[phase];
    let index = cursor?.count ?? 0;
    let previous: Cursor | undefined;
    let previousPhase: Phase | undefined;
    for (const p of phases) {
      const other = current.phases[p];
      if (other && (!previous || other.turn > previous.turn)) {
        previous = other;
        previousPhase = p;
      }
    }
    // The two familiar stories are shared between shifts. Don't immediately replay
    // one after a shift change. Slot zero is a different story on each shift.
    if (previous && previousPhase !== phase && index % 3 !== 0 && index % 3 === (previous.count - 1) % 3) index++;
    const topic = choices[index % choices.length];
    current.phases[phase] = {count: index + 1, turn: (previous?.turn ?? 0) + 1};
    this.save();
    return typeof topic === "string" ? {text: topic} : topic;
  }
}
