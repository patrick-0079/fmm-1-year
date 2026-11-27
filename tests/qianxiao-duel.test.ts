import test from "node:test";
import assert from "node:assert/strict";
import { cards, legalMoves, playDuelMove, qianxiaoMove, startDuel, type Duel, type DuelMove, type CardKind } from "../src/qianxiao-duel.ts";
import { readProgress } from "../src/core.ts";
import { reconcileAchievements, recordAchievementFact } from "../src/achievements.ts";

function seeded(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function bare() {
  const g = startDuel(seeded(3));
  for (const side of [g.player,g.qianxiao]) { side.board=[]; side.hand=[]; }
  return g;
}
function unit(id: number, kind: CardKind, ready=true) {
  return {id,kind,hp:cards[kind].health as number,ready};
}
const play = (g: Duel, move: DuelMove) => assert.ok(playDuelMove(g,move));

test("each independently shuffled 12-card deck has the announced composition and the first draw is skipped", () => {
  const g=startDuel(seeded(7));
  assert.equal(g.player.hp,8); assert.equal(g.qianxiao.hp,8);
  for(const field of [g.player,g.qianxiao]){
    const all=[...field.hand,...field.deck];
    assert.equal(field.hand.length,3); assert.equal(field.deck.length,9);
    for(const [kind, design] of Object.entries(cards))assert.equal(all.filter(c=>c.kind===kind).length,design.copies);
  }
  assert.notDeepEqual(g.player.hand.map(c=>c.kind),g.qianxiao.hand.map(c=>c.kind));
  play(g,{kind:"end"});assert.equal(g.turn,"qianxiao");assert.equal(g.qianxiao.hand.length,4);
  play(g,{kind:"end"});assert.equal(g.player.hand.length,4);assert.equal(g.turnNumber,3);
});

test("both monster slots, one summon per turn, attack readiness and simultaneous trades apply to both sides", () => {
  const g=bare();
  g.player.hand=[{id:0,kind:"comet"},{id:1,kind:"moon"},{id:2,kind:"star"}];
  play(g,{kind:"summon",card:0});assert.equal(playDuelMove(g,{kind:"summon",card:1}),false);
  assert.equal(playDuelMove(g,{kind:"attack",monster:0,target:"hero"}),false);
  play(g,{kind:"end"});play(g,{kind:"end"});play(g,{kind:"summon",card:1});
  g.qianxiao.board=[unit(12,"moon")];
  assert.equal(playDuelMove(g,{kind:"attack",monster:0,target:"hero"}),false);
  play(g,{kind:"attack",monster:0,target:12});assert.deepEqual(g.qianxiao.board,[]);
  assert.deepEqual(g.player.board.map(m=>m.id),[1]);
  play(g,{kind:"end"});play(g,{kind:"end"});play(g,{kind:"summon",card:2});
  play(g,{kind:"attack",monster:1,target:"hero"});assert.equal(g.qianxiao.hp,7);
  assert.equal(playDuelMove(g,{kind:"attack",monster:1,target:"hero"}),false);
  g.summoned=false;g.player.hand.push({id:6,kind:"moon"});
  assert.equal(playDuelMove(g,{kind:"summon",card:6}),false);
});

test("spells select only their own legal side, bypass guards for hero damage and never overheal",()=>{
  const g=bare();g.player.hp=7;g.player.board=[unit(4,"moon")];g.player.board[0].hp=2;
  g.qianxiao.board=[unit(17,"star")];
  g.player.hand=[{id:8,kind:"spark"},{id:10,kind:"wish"},{id:11,kind:"wish"}];
  assert.equal(playDuelMove(g,{kind:"spell",card:8,target:4}),false);
  assert.equal(playDuelMove(g,{kind:"spell",card:10,target:17}),false);
  play(g,{kind:"spell",card:8,target:"hero"});assert.equal(g.qianxiao.hp,7);
  assert.equal(playDuelMove(g,{kind:"spell",card:10,target:"hero"}),false);
  play(g,{kind:"end"});play(g,{kind:"end"});play(g,{kind:"spell",card:10,target:4});assert.equal(g.player.board[0].hp,3);
  play(g,{kind:"end"});play(g,{kind:"end"});play(g,{kind:"spell",card:11,target:"hero"});assert.equal(g.player.hp,8);
});

test("empty decks cost a life on the draw and no more actions resolve after the game ends",()=>{
  const g=bare();g.qianxiao.deck=[];g.qianxiao.hp=1;play(g,{kind:"end"});
  assert.equal(g.winner,"player");assert.equal(g.qianxiao.hp,0);assert.deepEqual(legalMoves(g),[]);
  const ended=structuredClone(g);assert.equal(playDuelMove(g,{kind:"end"}),false);assert.deepEqual(g,ended);
});

test("AI finds a lethal line past a guard, cannot see the opponent hand, and leaves the source state intact",()=>{
  const g=bare();g.turn="qianxiao";g.qianxiao.board=[unit(14,"comet")];g.qianxiao.hand=[{id:20,kind:"spark"}];
  g.player.board=[unit(0,"comet")];g.player.hp=3;
  const old=structuredClone(g);
  assert.deepEqual(qianxiaoMove(g),{kind:"spell",card:20,target:0});
  const unknown=structuredClone(g);unknown.player.hand=[{id:9,kind:"spark"}];unknown.player.deck.reverse();unknown.qianxiao.deck.reverse();
  assert.deepEqual(qianxiaoMove(unknown),qianxiaoMove(g));assert.deepEqual(g,old);
  play(g,qianxiaoMove(g)!);play(g,qianxiaoMove(g)!);assert.equal(g.winner,"qianxiao");
});

test("complete games can end in a real win or loss and only the first victory earns an independent stamp",()=>{
  const p=readProgress(null), empty={owned:[],wearingWreath:false,townTalked:[],pickedEggs:[],playSeconds:0};
  for(const [seed,result] of [[1,"qianxiao"],[74,"player"],[74,"player"]] as const){
    const g=startDuel(seeded(seed));let steps=0;
    while(!g.winner&&steps++<160){
      const publicView:Duel=g.turn==="qianxiao"?g:{...g,turn:"qianxiao",qianxiao:g.player,player:g.qianxiao};
      play(g,qianxiaoMove(publicView)!);
    }
    assert.equal(g.winner,result);
    const already=p.achievements.earned.includes("qianxiao-duel-win");
    if(result==="player")assert.equal(recordAchievementFact(p,"qianxiao-duel-win"),!already);
    const {fresh,entries}=reconcileAchievements(p,empty);
    assert.deepEqual(fresh,!already && result==="player"?["qianxiao-duel-win"]:[]);
    assert.equal(entries.find(e=>e.id==="all-games")!.goal,7);assert.deepEqual(p.arcadeBests,{});
  }
  assert.deepEqual(readProgress(JSON.stringify(p)).achievements.earned,["qianxiao-duel-win"]);
});
