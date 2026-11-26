import { achievementChapters, type AchievementEntry } from "./achievements";
import { hasDrawnStamp, paintAchievementArt } from "./achievement-art";
import { escapeHtml } from "./icons";
import "./achievement-book.css";

const chapterTabs = { daily: "日常", letters: "来信", games: "游园", explore: "探索", advanced: "进阶" } as const;

export const achievementBookMarkup = `<section id="anniversary-badges" role="tabpanel" class="achievement-book" data-page-ui aria-labelledby="badges-tab" hidden></section>`;

const concealed = (entry: AchievementEntry) => !!entry.hint && !entry.earned;
const visibleName = (entry: AchievementEntry) => (concealed(entry) ? "未揭晓的徽章" : entry.name);

export function achievementStampMarkup(entry: AchievementEntry) {
  const unknown = concealed(entry);
  const design = entry.keepsakeChoice ? ` data-stamp-choice="${escapeHtml(entry.keepsakeChoice)}"` : "";
  const image =
    entry.letterId && !unknown && !hasDrawnStamp(entry.id)
      ? `<i data-stamp-letter="${escapeHtml(entry.letterId)}"></i>`
      : `<canvas data-stamp-art="${unknown && entry.letterId ? "sealed-letter" : escapeHtml(entry.id)}"${design} ${unknown ? "data-stamp-veiled" : ""} width="32" height="32"></canvas>`;
  return `<span class="achievement-stamp stamp-${entry.chapter} ${entry.earned ? "stamp-earned" : "stamp-pending"}${unknown ? " stamp-secret" : ""}" aria-hidden="true">${image}</span>`;
}

function bookCover(collected: number, total: number, last?: AchievementEntry) {
  const label = total > 0 && collected === total ? "全部收集齐啦" : "已收集";
  return `<header class="achievement-cover">
    <div class="achievement-cover-title">
      <span class="achievement-cover-emblem" aria-hidden="true"><canvas data-stamp-art="fox" width="32" height="32"></canvas></span>
      <h2>周年徽章册</h2>
    </div>
    <div class="achievement-summary">
      <div class="achievement-count"><span>${label}</span><strong>${collected}<span> / ${total}</span></strong></div>
      <progress class="achievement-track" value="${collected}" max="${total || 1}" aria-label="徽章收集进度"></progress>
    </div>
    ${last ? `<section class="achievement-last" aria-label="最近获得">
      <span class="achievement-last-imprint">${achievementStampMarkup(last)}</span>
      <small>最近获得</small><strong>${escapeHtml(last.name)}</strong>
    </section>` : ""}
  </header>`;
}

function stampButton(entry: AchievementEntry, active: boolean) {
  const hidden = concealed(entry);
  const label = visibleName(entry);
  const state = hidden ? "线索" : entry.earned ? "已盖章" : entry.difficulty;
  return `<button type="button" class="achievement-pick stamp-cell" data-book-pick="${entry.id}"
    data-focus="pick-${entry.id}" aria-expanded="${active}" aria-controls="achievement-detail" aria-label="${escapeHtml(hidden ? label + "，" + entry.hint : label + "，" + state)}">
    ${achievementStampMarkup(entry)}<span class="achievement-pick-copy"><strong${hidden ? ' class="achievement-clue"' : ""}>${escapeHtml(hidden ? entry.hint! : label)}</strong></span></button>`;
}

function details(entry: AchievementEntry) {
  const hidden = concealed(entry);
  return `<section class="achievement-detail" id="achievement-detail" aria-label="徽章详情" tabindex="-1" data-focus="detail">
    <div class="achievement-detail-heading">${achievementStampMarkup(entry)}<div><small>${hidden ? "发现线索" : escapeHtml(entry.difficulty) + (entry.earned ? " · 已盖章" : "")}</small><h4>${escapeHtml(visibleName(entry))}</h4></div></div>
    <p>${escapeHtml(hidden ? entry.hint! : entry.description)}</p>
    ${
      hidden
        ? ""
        : `<span class="achievement-detail-progress">${escapeHtml(entry.progressLabel)}</span>
      ${entry.details.length ? `<ul>${entry.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}`
    }</section>`;
}

export function mountAchievementBook() {
  const root = document.querySelector<HTMLElement>(".achievement-book")!;
  let rows: readonly AchievementEntry[] = [];
  let latest: string | null = null;
  let chapter: AchievementEntry["chapter"] = achievementChapters[0].id;
  let selected: string | null = null;
  let previousHtml = "";

  function focusAt(key: string) {
    const target = [...root.querySelectorAll<HTMLElement>("[data-focus]")].find((el) => el.dataset.focus === key);
    target?.focus({ preventScroll: true });
  }

  function render(focus?: string) {
    const earned = rows.filter((row) => row.earned);
    const last = earned.find((row) => row.id === latest) ?? earned.at(-1);
    const page = achievementChapters.find((group) => group.id === chapter)!;
    const entries = rows.filter((row) => row.chapter === chapter);
    const current = entries.find((row) => row.id === selected);
    const html = `${bookCover(earned.length, rows.length, last)}
      <div id="achievement-chapters" class="achievement-page achievement-chapters">
        <div class="achievement-chapter-bar">
          <nav aria-label="徽章章节">
            ${achievementChapters.map((group) => `<button type="button" data-book-chapter="${group.id}" data-focus="tab-${group.id}"
              aria-pressed="${group.id === chapter}" aria-label="${escapeHtml(group.title)}">${chapterTabs[group.id]}</button>`).join("")}
          </nav>
          <div class="achievement-chapter-heading"><h3>${escapeHtml(page.title)}</h3><small>${entries.filter((row) => row.earned).length} / ${entries.length}</small></div>
        </div>
        <div class="achievement-grid">${entries.map(row =>
          stampButton(row, row === current) + (row === current ? details(row) : "")
        ).join("")}</div>
        ${current ? "" : '<div id="achievement-detail" hidden></div>'}
      </div>`;
    if (html !== previousHtml) {
      const active = document.activeElement;
      const oldKey = active instanceof HTMLElement && root.contains(active) ? active.dataset.focus : undefined;
      previousHtml = html;
      root.innerHTML = html;
      paintAchievementArt(root);
      if (focus || oldKey) focusAt(focus ?? oldKey!);
    } else if (focus) focusAt(focus);
  }

  root.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !root.contains(button)) return;
    if (button.dataset.bookChapter) {
      const next = achievementChapters.find((group) => group.id === button.dataset.bookChapter);
      if (!next) return;
      chapter = next.id;
      selected = null;
      render("tab-" + chapter);
    } else if (button.dataset.bookPick) {
      const row = rows.find((entry) => entry.id === button.dataset.bookPick);
      if (!row) return;
      selected = selected === row.id ? null : row.id;
      chapter = row.chapter;
      render(selected ? "detail" : "pick-" + row.id);
      const detail = selected && root.querySelector<HTMLElement>("#achievement-detail");
      if (detail) {
        const rect = detail.getBoundingClientRect(), view = root.getBoundingClientRect();
        if (rect.top < view.top || rect.bottom > view.bottom) root.scrollTop += rect.top - view.top;
      }
    }
  });
  return {
    show: render,
    update(entries: readonly AchievementEntry[], latestId?: string | null) {
      const newlyStamped = rows.length > 0 && latestId && latest !== latestId
        && rows.some(entry => entry.id === latestId && !entry.earned);
      rows = entries;
      latest = latestId ?? null;
      if (root.hidden) return;
      render();
      if (newlyStamped && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const imprint = root.querySelector<HTMLElement>(`[data-book-pick="${latestId}"] .achievement-stamp, .achievement-last-imprint`)
          ?? root.querySelector<HTMLElement>(".achievement-count strong");
        imprint?.animate([
          { transform: "scale(1.14) rotate(-6deg)", opacity: .6 },
          { transform: "scale(.95) rotate(1deg)", opacity: 1, offset: .55 },
          { transform: "none", opacity: 1 },
        ], { duration: 370, easing: "ease-out" });
      }
    },
    reset() {
      root.scrollTop = 0;
      selected = null;
      latest = null;
      chapter = achievementChapters[0].id;
    },
  };
}
