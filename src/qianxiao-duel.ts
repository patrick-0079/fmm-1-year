export type DuelSide = "player" | "qianxiao";
export type CardKind = "star" | "moon" | "comet" | "spark" | "wish";
export type DuelTarget = number | "hero";
export type DuelMove =
  | { kind: "summon"; card: number }
  | { kind: "spell"; card: number; target: DuelTarget }
  | { kind: "attack"; monster: number; target: DuelTarget }
  | { kind: "end" };

export const cards = {
  star:  { name: "巡夜星猫", attack: 2, health: 2, copies: 3 },
  moon:  { name: "守月兔", attack: 1, health: 3, copies: 3 },
  comet: { name: "追光彗星", attack: 3, health: 1, copies: 2 },
  spark: { name: "星火", attack: 0, health: 0, copies: 2 },
  wish:  { name: "晚安祈愿", attack: 0, health: 0, copies: 2 },
} as const;

export interface DuelCard { id: number; kind: CardKind }
export interface DuelMonster extends DuelCard { hp: number; ready: boolean }
export interface DuelField { hp: number; deck: DuelCard[]; hand: DuelCard[]; board: DuelMonster[] }
export interface Duel {
  player: DuelField;
  qianxiao: DuelField;
  turn: DuelSide;
  turnNumber: number;
  summoned: boolean;
  cast: boolean;
  winner?: DuelSide;
  log: string[];
}
const other = (side: DuelSide): DuelSide => side === "player" ? "qianxiao" : "player";
export const duelistName = (side: DuelSide) => side === "player" ? "芙芙" : "浅笑";

function deal(offset: number, random: () => number): DuelField {
  const deck: DuelCard[] = [];
  for (const kind of Object.keys(cards) as CardKind[]) {
    for (let n = 0; n < cards[kind].copies; n++) deck.push({ id: offset + deck.length, kind });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { hp: 8, hand: deck.splice(0, 3), deck, board: [] };
}

export function startDuel(random: () => number = Math.random): Duel {
  return { player: deal(0, random), qianxiao: deal(12, random), turn: "player", turnNumber: 1,
    summoned: false, cast: false, log: ["双方各拿三张牌。芙芙先手。"] };
}

export function legalMoves(g: Duel): DuelMove[] {
  if (g.winner) return [];
  const side = g[g.turn], opposing = g[other(g.turn)], moves: DuelMove[] = [];
  for (const card of side.hand) {
    if (cards[card.kind].attack) {
      if (!g.summoned && side.board.length < 2) moves.push({ kind: "summon", card: card.id });
    } else if (!g.cast) {
      const targets = card.kind === "spark" ? opposing : side;
      // Healing a healthy target is legal and simply restores no health.
      for (const target of ["hero" as const, ...targets.board.map(m => m.id)])
        moves.push({ kind: "spell", card: card.id, target });
    }
  }
  const targets: DuelTarget[] = opposing.board.length ? opposing.board.map(m => m.id) : ["hero"];
  for (const monster of side.board.filter(m => m.ready)) {
    for (const target of targets) moves.push({ kind: "attack", monster: monster.id, target });
  }
  moves.push({ kind: "end" });
  return moves;
}

function sameMove(a: DuelMove, b: DuelMove) {
  switch (a.kind) {
    case "end": return b.kind === "end";
    case "summon": return b.kind === a.kind && a.card === b.card;
    case "spell": return b.kind === a.kind && a.card === b.card && a.target === b.target;
    case "attack": return b.kind === a.kind && a.monster === b.monster && a.target === b.target;
  }
}

/** Resolve exactly one choice. Rejected and repeated input has no side effects. */
export function playDuelMove(g: Duel, move: DuelMove): boolean {
  if (!legalMoves(g).some(legal => sameMove(legal, move))) return false;
  resolve(g, move);
  return true;
}

function resolve(g: Duel, move: DuelMove) {
  const actor = g.turn, enemy = other(actor), own = g[actor], foe = g[enemy];
  const name = duelistName(actor), enemyName = duelistName(enemy);
  if (move.kind === "end") {
    g.turn = enemy; g.turnNumber++;
    g.summoned = false; g.cast = false;
    for (const monster of foe.board) monster.ready = true;
    const card = foe.deck.shift();
    if (card) {
      foe.hand.push(card);
      g.log.push(enemyName + "摸了一张牌。");
    } else {
      foe.hp--;
      g.log.push(enemyName + "的牌组已空，摸牌时失去 1 点生命。");
    }
  } else if (move.kind === "attack") {
    const attacker = own.board.find(m => m.id === move.monster)!;
    const design = cards[attacker.kind];
    attacker.ready = false;
    if (move.target === "hero") {
      foe.hp -= design.attack;
      g.log.push(name + "的" + design.name + "攻击" + enemyName + "，造成 " + design.attack + " 点伤害。");
    } else {
      const defender = foe.board.find(m => m.id === move.target)!;
      const guard = cards[defender.kind];
      defender.hp -= design.attack;
      attacker.hp -= guard.attack;
      g.log.push(name + "的" + design.name + "攻击" + enemyName + "的" + guard.name +
        "，造成 " + design.attack + " 点伤害，同时受到 " + guard.attack + " 点反击伤害。");
    }
  } else {
    const at = own.hand.findIndex(card => card.id === move.card);
    const card = own.hand.splice(at, 1)[0], design = cards[card.kind];
    if (move.kind === "summon") {
      g.summoned = true;
      own.board.push({ ...card, hp: design.health, ready: false });
      g.log.push(name + "召唤了" + design.name + "。");
    } else {
      g.cast = true;
      const healing = card.kind === "wish", field = healing ? own : foe;
      const target = move.target === "hero" ? field : field.board.find(m => m.id === move.target)!;
      const label = "kind" in target ? cards[target.kind].name : duelistName(healing ? actor : enemy);
      if (healing) {
        const amount = Math.min(2, ("kind" in target ? cards[target.kind].health : 8) - target.hp);
        target.hp += amount;
        g.log.push(name + "打出晚安祈愿，" + label + "恢复 " + amount + " 点生命。");
      } else {
        target.hp--;
        g.log.push(name + "打出星火，" + label + "受到 1 点伤害。");
      }
    }
  }
  for (const field of [own, foe]) {
    for (const fallen of field.board.filter(m => m.hp <= 0)) g.log.push(cards[fallen.kind].name + "退场。");
    field.board = field.board.filter(m => m.hp > 0);
  }
  if (foe.hp <= 0 || own.hp <= 0) {
    g.winner = foe.hp <= 0 ? actor : enemy;
    foe.hp = Math.max(0, foe.hp); own.hp = Math.max(0, own.hp);
    g.log.push(duelistName(g.winner) + "赢下了这局。");
  }
}

function copyField(field: DuelField): DuelField {
  return { hp: field.hp, deck: [...field.deck], hand: [...field.hand], board: field.board.map(m => ({ ...m })) };
}

/** Search this turn only. The opponent's hidden hand and both deck orders do not enter the evaluation. */
export function qianxiaoMove(g: Duel): DuelMove | undefined {
  if (g.turn !== "qianxiao" || g.winner) return;
  const weight = (m: DuelMonster) => 4 + cards[m.kind].attack * 2 + m.hp;
  const value = (state: Duel) => {
    if (state.winner === "qianxiao") return 10000;
    const ai = state.qianxiao, foe = state.player;
    const danger = !ai.board.length && foe.board.reduce((n,m) => n + cards[m.kind].attack, 0) >= ai.hp ? 70 : 0;
    return ai.board.reduce((n,m) => n + weight(m), 0) - foe.board.reduce((n,m) => n + weight(m) * 1.25, 0)
      + ai.hp * 1.3 - foe.hp * 1.9 + ai.hand.length * 1.4 - danger;
  };
  function choose(state: Duel): { score: number; move: DuelMove } {
    let best = { score: value(state), move: { kind: "end" } as DuelMove };
    if (state.winner) return best;
    for (const move of legalMoves(state)) {
      if (move.kind === "end") continue;
      const next: Duel = { ...state, player: copyField(state.player), qianxiao: copyField(state.qianxiao), log: [] };
      resolve(next, move);
      // Each non-end choice consumes a summon, a spell or a ready attack. Depth is at most four.
      const score = choose(next).score - 0.01;
      if (score > best.score) best = {score, move};
    }
    return best;
  }
  return choose(g).move;
}
