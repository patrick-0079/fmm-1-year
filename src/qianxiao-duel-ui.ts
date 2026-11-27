import { cards, duelistName, legalMoves, playDuelMove, qianxiaoMove, startDuel,
  type Duel, type DuelCard, type DuelMove, type DuelSide, type DuelTarget, type CardKind } from "./qianxiao-duel";
import { sfx } from "./sound";
import "./qianxiao-duel.css";

const rules = [
  "双方各有 8 点生命，使用相同的 12 张牌，分别洗牌后各拿 3 张。芙芙先手，第一回合跳过摸牌，之后每回合开始摸 1 张。牌组为空时，摸牌会让自己失去 1 点生命。",
  "每回合最多召唤 1 只怪兽、打出 1 张法术。场上最多放 2 只怪兽。新召唤的怪兽从自己的下个回合起可以攻击，每只每回合攻击 1 次。",
  "对面有怪兽时，自己的怪兽必须先攻击怪兽。交战双方同时按攻击力造成伤害。对面没有怪兽时，可以直接攻击浅笑。生命降到 0 就输。",
  "每副牌都有 3 张巡夜星猫（2 攻 / 2 血）、3 张守月兔（1 攻 / 3 血）、2 张追光彗星（3 攻 / 1 血）。另有 2 张星火，对任一敌方目标造成 1 点伤害，和 2 张晚安祈愿，为任一己方目标恢复最多 2 点生命，最多回到初始生命。",
];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") {
  const el = document.createElement(tag);
  el.className = cls; el.textContent = text;
  return el;
}
function button(cls: string, text: string, action: () => void) {
  const el = element("button", cls, text);
  el.type = "button"; el.addEventListener("click", action); return el;
}
function drawCard(c: CanvasRenderingContext2D, kind: CardKind) {
  const colors = {star:"#5d617e", moon:"#737d94", comet:"#926581", spark:"#a15e63", wish:"#678678"};
  c.fillStyle = colors[kind]; c.fillRect(0,0,96,56);
  c.strokeStyle = "#f4deb1"; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(0,12); c.lineTo(12,1); c.lineTo(84,1); c.lineTo(95,12);
  c.moveTo(0,46); c.lineTo(12,55); c.lineTo(84,55); c.lineTo(95,46); c.stroke();
  c.fillStyle = "#e3c994";
  for (const [x,y] of [[12,18],[20,39],[77,10],[84,31],[69,44],[12,44],[65,10]]) {
    c.fillRect(x-2,y,5,1); c.fillRect(x,y-2,1,5);
  }
  c.lineWidth = 2; c.strokeStyle = "#fff0c8"; c.fillStyle = "#f3d4ae";
  c.beginPath();
  if (kind === "star") {
    c.moveTo(32,21); c.lineTo(33,9); c.lineTo(42,17); c.quadraticCurveTo(48,14,55,17);
    c.lineTo(64,8); c.lineTo(65,25); c.bezierCurveTo(70,47,28,49,32,21); c.closePath(); c.fill();
    c.strokeStyle="#675366"; c.beginPath(); c.moveTo(37,29); c.lineTo(41,30); c.lineTo(44,27);
    c.moveTo(52,27); c.lineTo(55,30); c.lineTo(60,28); c.stroke();
  } else if (kind === "moon") {
    c.ellipse(41,19,4,12,-.24,0,2*Math.PI); c.ellipse(52,17,4,13,.17,0,2*Math.PI); c.fill();
    c.beginPath(); c.ellipse(47,32,13,10,0,0,2*Math.PI); c.fill();
    c.fillStyle="#624f64"; c.fillRect(41,30,2,3); c.fillRect(51,30,2,3);
    c.beginPath(); c.moveTo(57,43); c.quadraticCurveTo(67,42,70,31); c.quadraticCurveTo(72,48,57,46); c.fillStyle="#e8ca90"; c.fill();
  } else if (kind === "comet" || kind === "spark") {
    const x=kind==="comet"?37:48, y=30, spikes=kind==="comet"?5:8;
    for (let i=0;i<spikes*2;i++) {
      const angle=i*Math.PI/spikes - Math.PI/2, r=i%2?6:16;
      const a=x+r*Math.cos(angle), b=y+r*Math.sin(angle);
      if(i)c.lineTo(a,b); else c.moveTo(a,b);
    }
    c.closePath(); c.fill();
    if(kind==="comet"){c.beginPath(); c.moveTo(48,21); c.lineTo(74,10); c.moveTo(50,29); c.lineTo(80,17); c.moveTo(51,34); c.lineTo(68,28); c.stroke();}
  } else {
    c.moveTo(48,42); c.bezierCurveTo(17,24,42,11,48,23); c.bezierCurveTo(58,7,81,24,48,42); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(30,24); c.quadraticCurveTo(22,22,21,16); c.moveTo(66,24); c.quadraticCurveTo(74,22,76,16); c.stroke();
  }
}
function art(kind: CardKind) {
  const el = element("canvas", "duel-illustration");
  el.width=96; el.height=56; el.setAttribute("aria-hidden","true");
  const ctx = el.getContext("2d"); if (ctx) drawCard(ctx, kind);
  return el;
}
const detail = (card: DuelCard, hp?: number) => {
  const design = cards[card.kind];
  if (design.attack) return design.attack + " 攻 · " + (hp ?? design.health) + " 血";
  return card.kind === "spark" ? "敌方 −1 血" : "己方 +2 血";
};
type Selection = { kind: "attack" | "spell"; id: number };

export function mountQianxiaoDuel(root: HTMLElement, status: HTMLElement, options: {
  guide: boolean; started: () => void; win: () => void; close: () => void; suspended: () => boolean;
}) {
  let game: Duel, guide = options.guide, selection: Selection | undefined;
  let timer: number | undefined, disposed = false, checkpoint = false;
  const panel = element("section","duel-panel"); panel.dataset.pageUi="";
  const area = element("div","duel-table");
  const guideBox = element("details","duel-rules");
  guideBox.append(element("summary","","玩法与牌组"));
  for(const paragraph of rules) guideBox.append(element("p","",paragraph));
  const history = element("details","duel-history"), log = element("ol","");
  history.append(element("summary","","出牌记录"),log);
  panel.append(area,guideBox,history); root.append(panel);
  panel.addEventListener("keydown",ev=>{
    if(ev.key==="Escape"){ev.preventDefault();ev.stopPropagation();options.close();}
  });
  function focusFirst() {
    const pick = selection ? area.querySelector<HTMLButtonElement>(".duel-target:enabled") :
      area.querySelector<HTMLButtonElement>("button[data-target]:enabled,button[data-card]:enabled,button.duel-primary:enabled");
    (pick ?? guideBox.querySelector("summary"))?.focus({preventScroll:true});
  }
  function choose(s: Selection) {
    selection = selection?.id===s.id && selection.kind===s.kind ? undefined : s;
    render(); focusFirst();
  }
  function submit(move: DuelMove) {
    if (disposed || options.suspended() || !playDuelMove(game, move)) return;
    selection=undefined;
    if (game.winner==="player" && !checkpoint) { checkpoint=true; options.win(); }
    if(game.winner)sfx(game.winner==="player"?"complete":"stumble");
    else sfx(move.kind==="attack"?"interact":"flip");
    const readingRules = guideBox.contains(document.activeElement) || history.contains(document.activeElement);
    render();
    if(!game.winner && game.turn==="qianxiao")schedule();
    else if(!readingRules)focusFirst();
  }
  function schedule() {
    window.clearTimeout(timer);
    timer=window.setTimeout(()=>{
      if(disposed || game.winner || game.turn!=="qianxiao")return;
      if(document.hidden || options.suspended()){schedule();return;}
      const move=qianxiaoMove(game); if(move)submit(move);
    },420);
  }
  function selectedTarget(side: DuelSide, target: DuelTarget): DuelMove | undefined {
    if(!selection || game.turn !== "player")return;
    const picked=selection;
    if(picked.kind==="attack" && side!=="qianxiao")return;
    if(picked.kind==="spell"){
      const card=game.player.hand.find(c=>c.id===picked.id);
      if(!card || (card.kind==="wish") !== (side==="player"))return;
    }
    return legalMoves(game).find(m=> m.kind==="attack" && picked.kind==="attack" && m.monster===picked.id && m.target===target ||
      m.kind==="spell" && picked.kind==="spell" && m.card===picked.id && m.target===target);
  }
  function targetButton(side: DuelSide, target: DuelTarget, token: HTMLButtonElement, move?: DuelMove) {
    token.dataset.side = side; token.dataset.target=String(target);
    if(move)token.classList.add("duel-target");
  }
  function cardTile(card: DuelCard, caption: string, statusText: string, action: ()=>void) {
    const el=button("duel-card","",action);
    el.dataset.kind=card.kind;
    el.append(art(card.kind),element("strong","",cards[card.kind].name),element("span","duel-stats",caption));
    if(statusText)el.append(element("small","",statusText));
    return el;
  }
  function row(side: DuelSide) {
    const field=game[side], row=element("section","duel-row");row.dataset.side=side;
    const heroTarget=selectedTarget(side,"hero");
    const hero=button("duel-hero","",()=>{if(heroTarget)submit(heroTarget);});
    hero.append(element("b","",duelistName(side)),element("strong","","♥ "+field.hp+" / 8"),element("small","","牌组 "+field.deck.length+" · 手牌 "+field.hand.length));
    hero.setAttribute("aria-label",duelistName(side)+"，生命 "+field.hp+"，牌组 "+field.deck.length+" 张，手牌 "+field.hand.length+" 张");
    hero.disabled=!heroTarget; targetButton(side,"hero",hero,heroTarget);row.append(hero);
    for(const m of field.board) {
      const move=selectedTarget(side,m.id), mine=side==="player" && game.turn==="player" && !game.winner;
      const sel=selection?.kind==="attack" && selection.id===m.id;
      const el=cardTile(m,detail(m,m.hp),mine ? m.ready ? "可攻击" : "休息中" : "", ()=>{
        if(move)submit(move);else if(mine && m.ready)choose({kind:"attack",id:m.id});
      });
      el.dataset.monster=String(m.id);
      el.disabled=!move && !(mine && m.ready); el.classList.toggle("duel-selected",sel);
      targetButton(side,m.id,el,move); row.append(el);
    }
    for(let i=field.board.length;i<2;i++)row.append(element("span","duel-slot","空位"));
    return row;
  }
  function newMatch() {
    game=startDuel(); selection=undefined; checkpoint=false; guide=false;
    render();focusFirst();
  }
  function render() {
    area.replaceChildren();
    history.hidden=guide;
    if(guide){
      status.textContent="浅笑的星牌";
      area.append(element("h3","","来打一局吧，芙芙！"),element("p","duel-guide-text",
        "我们各有 8 点生命。点手牌可以召唤怪兽，下一回合点怪兽，再点你要攻击的目标。我的场上有怪兽，就先打怪兽。把我的生命打到 0，你就赢啦！"));
      const sample=element("div","duel-deal"); for(const kind of ["star","moon","comet"] as const)sample.append(art(kind));
      area.append(sample,button("duel-primary","发牌，开始对局",()=>{options.started();newMatch();}));
      return;
    }
    log.replaceChildren(...game.log.map(line=>element("li","",line)));
    if(game.winner){
      const won=game.winner==="player";status.textContent="对局结束";
      area.append(element("h3","",won?"芙芙赢了！":"浅笑赢了"),element("p","duel-guide-text",won?
        "浅笑把你的最后一张牌翻正：「这手漂亮！下回我要带一套新卡组，再和你比一场。」":
        "浅笑把牌拢回手里：「这局我先收下啦。你的那张牌差一点就抓住我了，再来吗？」"),
        element("p","duel-final","芙芙 "+game.player.hp+" 血　·　浅笑 "+game.qianxiao.hp+" 血"),
        button("duel-primary","再来一局",newMatch),button("duel-secondary","回到地图",options.close));
      return;
    }
    const mine=game.turn==="player";
    status.textContent="浅笑的星牌 · 第 "+Math.ceil(game.turnNumber/2)+" 轮 · "+(mine?"芙芙的回合":"浅笑的回合");
    area.append(row("qianxiao"),row("player"));
    const message=selection?.kind==="attack"?"点亮起的敌方怪兽或浅笑，完成这次攻击。":
      selection?.kind==="spell"?"点击亮起的人物或怪兽，对它使用这张法术。":game.log.at(-1)??"";
    area.append(element("p","duel-message",message));
    const header=element("div","duel-hand-heading");
    header.append(element("strong","","你的手牌"),element("span","",mine?
      (game.summoned?"已召唤":"可召唤")+" · "+(game.cast?"已施法":"可施法"):"浅笑正在出牌"));
    const hand=element("div","duel-hand");const available=mine?legalMoves(game):[];
    for(const card of game.player.hand){
      const move=available.find(m=>(m.kind==="summon" || m.kind==="spell") && m.card===card.id);
      const el=cardTile(card,detail(card),"",()=>{
        if(move?.kind==="summon")submit(move);
        if(move?.kind==="spell")choose({kind:"spell",id:card.id});
      });
      el.dataset.card=String(card.id);el.disabled=!move;el.classList.toggle("duel-selected",selection?.id===card.id);hand.append(el);
    }
    if(!hand.children.length)hand.append(element("p","","手牌已用完"));
    const actions=element("div","duel-actions");
    const end=button("duel-primary","结束回合",()=>submit({kind:"end"}));end.dataset.endTurn="";end.disabled=!mine;actions.append(end);
    if(selection)actions.append(button("duel-secondary","取消选取",()=>{selection=undefined;render();focusFirst();}));
    area.append(header,hand,actions);
  }
  if(guide){render();focusFirst();}else newMatch();
  return {dispose(){disposed=true;window.clearTimeout(timer);panel.remove();}};
}
