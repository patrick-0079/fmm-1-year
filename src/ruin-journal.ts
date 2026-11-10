import { astrolabeHint, earnedSeals, rings, seals, type AstrolabeState } from "./astrolabe";

const chapters = ["拓印", "印章", "解谜"] as const;
export const journalPageCount = chapters.length;
export const journalCoverMarkup = '<span class="ruin-book-cover" aria-hidden="true"><i>☾</i></span>';

function rubbings(state: AstrolabeState) {
  const entries = rings.map(ring => {
    const found = state.found.includes(ring.id);
    return `<li data-ring="${ring.id}" data-found="${found}">
      <i class="ruin-relic relic-${ring.id}" aria-hidden="true"></i>
      <div><b>${ring.name}</b>${found ? '<em>已拓印</em>' : ""}<p>${ring.clue}</p></div>
    </li>`;
  });
  return `<p class="ruin-objective">${astrolabeHint(state)}</p><ul class="ruin-rubbings">${entries.join("")}</ul>`;
}

function sealCollection(earned: ReturnType<typeof earnedSeals>) {
  return `<ul class="ruin-seals">${seals.map(seal => {
    const stamped = earned.includes(seal.id);
    return `<li data-seal="${seal.id}" data-earned="${stamped}"><i aria-hidden="true">${seal.mark}</i>
      <div><b>${seal.name}</b><em>${stamped ? "已盖章" : "待发现"}</em><p>${seal.hint}</p></div></li>`;
  }).join("")}</ul>`;
}

const clues = `
  <section class="ruin-puzzle">
    <h5>中央祭坛与旧电波</h5>
    <p>三座试炼石座分别刻着叶子、铃和星。留意哪一种声音最先响起，哪一种最后才出现。</p>
    <details><summary>揭开祭坛的谜底</summary>
      <p>去西、北、东三间石室触碰试炼石座，按任意顺序抄齐三句碑文。西廊写着叶子先落，东廊的铃回应落叶，北廊的星等到铃声消散才亮。</p>
      <p>回到中央祭坛，依次敲「叶 → 铃 → 星」，再到南阶旁的听月泉收听旧电波，可盖上「晚安收听员」印章。</p>
    </details>
  </section>
  <section class="ruin-puzzle">
    <h5>星盘与铜镜</h5>
    <p>让月光从盘心流向北面的月牙。等东边的月灯亮起，再去看看两面铜镜把光送去了哪里。</p>
    <details><summary>揭开星盘与铜镜的谜底</summary>
      <p>去西廊蛇纹壁画的藤根下、北廊星图右下方和东廊绞盘西侧找齐三环。在中央祭坛西侧装环，将内、中、外环的缺口都转向北。</p>
      <p>沿光纹往东，转动上镜使右端朝下，再转动下镜使右端朝上。月光先向右、再向下、再向左抵达星纹砖，晚安回声胸针随即收入背包。</p>
    </details>
  </section>`;

export function renderRuinJournal(state: AstrolabeState, listened: boolean, page: number) {
  const earned = earnedSeals(state, listened);
  const title = ["星盘环拓印", "旅途上的印章", "守护者的笔记"][page];
  const bookmarks = chapters.map((chapter, i) => `<button type="button" data-journal-page="${i}" data-focus="journal-page-${i}"
    aria-label="第 ${i+1} 页，${chapter}" ${i === page ? 'aria-current="page"' : ""}>${chapter}</button>`).join("");
  return `<article class="ruin-journal" aria-label="遗迹手记">
    <header class="ruin-journal-heading"><span aria-hidden="true">☾</span><h4>遗迹手记</h4>
      <small class="ruin-book-count">${state.found.length} / ${rings.length} 拓印 · ${earned.length} / ${seals.length} 印章</small>
    </header>
    <section class="ruin-journal-paper" tabindex="0" data-focus="journal-paper" aria-label="${title}，第 ${page+1} 页">
      <h4><span>${title}</span><small>${page+1} / ${journalPageCount}</small></h4>
      ${page === 0 ? rubbings(state) : page === 1 ? sealCollection(earned) : clues}
    </section>
    <nav class="ruin-book-nav" aria-label="遗迹手记书签">
      <button type="button" data-keepsakes data-focus="journal-back" aria-label="返回纪念物">‹ 纪念物</button>${bookmarks}
    </nav>
  </article>`;
}
