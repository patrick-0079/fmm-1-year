import { achievementChapters, type AchievementEntry } from "./achievements";
import { paintAchievementArt } from "./achievement-art";
import { escapeHtml } from "./icons";
import "./achievement-book.css";

const chapterTabs = { daily: "日常", letters: "来信", games: "游园", explore: "探索", advanced: "进阶" } as const;

export const achievementBookMarkup = `<aside class="achievement-book" data-page-ui aria-labelledby="achievement-title">
  <header class="achievement-cover">
    <div class="achievement-cover-title"><span>芙芙的</span><h2 id="achievement-title">周年成就册</h2></div>
    <span class="achievement-cover-emblem" aria-hidden="true"><canvas data-stamp-art="fox" width="32" height="32"></canvas></span>
  </header>
  <div class="achievement-page">
    <div class="achievement-live"></div>
    <div class="local-save"><small class="save-status">开始冒险后自动保存</small><button type="button" class="save-now map-action" disabled>保存进度</button></div>
  </div>
</aside>`;

const concealed = (entry: AchievementEntry) => !!entry.hint && !entry.earned;
const visibleName = (entry: AchievementEntry) => (concealed(entry) ? "未揭晓的图章" : entry.name);

export function achievementStampMarkup(entry: AchievementEntry) {
  const unknown = concealed(entry);
  const image =
    entry.letterId && !unknown
      ? `<i data-stamp-letter="${escapeHtml(entry.letterId)}"></i>`
      : `<canvas data-stamp-art="${unknown && entry.letterId ? "sealed-letter" : escapeHtml(entry.id)}" ${unknown ? "data-stamp-veiled" : ""} width="32" height="32"></canvas>`;
  return `<span class="achievement-stamp stamp-${entry.chapter} ${entry.earned ? "stamp-earned" : "stamp-pending"}${unknown ? " stamp-secret" : ""}" aria-hidden="true">${image}</span>`;
}

function stampButton(entry: AchievementEntry, active: boolean, compact: boolean) {
  const hidden = concealed(entry);
  const label = visibleName(entry);
  const state = hidden ? "线索" : entry.earned ? "已盖章" : entry.difficulty;
  return `<button type="button" class="achievement-pick ${compact ? "stamp-row" : "stamp-cell"}" data-book-pick="${entry.id}"
    data-focus="pick-${entry.id}" aria-expanded="${active}" aria-controls="achievement-detail" aria-label="${escapeHtml(hidden ? label + "，" + entry.hint : label + "，" + state)}">
    ${achievementStampMarkup(entry)}<span class="achievement-pick-copy"><strong${hidden ? ' class="achievement-clue"' : ""}>${escapeHtml(hidden ? entry.hint! : label)}</strong>${compact ? `<small>${escapeHtml(state)}${!hidden && entry.goal > 1 ? " · " + escapeHtml(entry.progressLabel) : ""}</small>` : ""}</span>
    ${compact ? '<span class="achievement-arrow" aria-hidden="true">›</span>' : ""}</button>`;
}

function details(entry: AchievementEntry) {
  const hidden = concealed(entry);
  return `<section class="achievement-detail" id="achievement-detail" aria-label="图章详情" tabindex="-1" data-focus="detail">
    <div class="achievement-detail-heading">${achievementStampMarkup(entry)}<div><small>${hidden ? "发现线索" : escapeHtml(entry.difficulty) + (entry.earned ? " · 已盖章" : "")}</small><h4>${escapeHtml(visibleName(entry))}</h4></div></div>
    <p>${escapeHtml(hidden ? entry.hint! : entry.description)}</p>
    ${
      hidden
        ? ""
        : `<span class="achievement-detail-progress">${escapeHtml(entry.progressLabel)}</span>
      ${entry.details.length ? `<ul>${entry.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}
      ${entry.target ? `<button class="achievement-go" type="button" data-book-go="${entry.id}" data-focus="go">前往 <span aria-hidden="true">↗</span></button>` : ""}`
    }</section>`;
}

type Travel = NonNullable<AchievementEntry["target"]>;

export function mountAchievementBook(onTravel: (destination: Travel) => void) {
  const root = document.querySelector<HTMLElement>(".achievement-book")!;
  const live = root.querySelector<HTMLElement>(".achievement-live")!;
  paintAchievementArt(root);
  let rows: readonly AchievementEntry[] = [];
  let latest: string | null = null;
  let open = false;
  let chapter: AchievementEntry["chapter"] = achievementChapters[0].id;
  let selected: string | null = null;
  let previousHtml = "";

  function focusAt(key: string) {
    const target = [...live.querySelectorAll<HTMLElement>("[data-focus]")].find((el) => el.dataset.focus === key);
    target?.focus({ preventScroll: true });
  }

  function render(focus?: string) {
    const earned = rows.filter((row) => row.earned);
    const current = rows.find((row) => row.id === selected);
    const last = earned.find((row) => row.id === latest) ?? earned.at(-1);
    const recommendations = rows.filter((row) => !row.earned && !concealed(row) && row.chapter !== "advanced");
    const suggested = [
      ...recommendations,
      ...rows.filter((row) => !row.earned && !recommendations.includes(row)),
    ].slice(0, 3);
    const count = rows.length;
    const content = [
      `<div class="achievement-count"><span>已收集图章</span><strong>${earned.length}<span> / ${count}</span></strong></div>
       <progress class="achievement-track" value="${earned.length}" max="${count || 1}" aria-label="图章收集进度"></progress>`,
    ];
    if (!open) {
      if (last)
        content.push(
          `<section class="achievement-last" aria-label="最近获得"><div class="achievement-last-imprint">${achievementStampMarkup(last)}</div><span><small>最近获得</small><strong>${escapeHtml(last.name)}</strong></span></section>`,
        );
      if (suggested.length)
        content.push(
          `<section aria-label="成就建议"><h3>接下来可以做</h3><div class="achievement-suggestions">${suggested.map((row) => stampButton(row, false, true)).join("")}</div></section>`,
        );
      else if (count) content.push('<p class="achievement-complete">四十四枚图章，周年册盖满啦。</p>');
    }
    content.push(
      `<button class="achievement-browse" type="button" data-book-toggle data-focus="toggle" aria-expanded="${open}" aria-controls="achievement-chapters"><span aria-hidden="true">${open ? "‹" : "✧"}</span>${open ? "合上成就册" : "翻开成就册"}<span aria-hidden="true">${open ? "" : "›"}</span></button>`,
    );
    if (open) {
      const page = achievementChapters.find((group) => group.id === chapter)!;
      const entries = rows.filter((row) => row.chapter === chapter);
      // Open the selected page directly beneath its row of stamps.
      const selectedIndex = entries.findIndex((row) => row.id === selected);
      const detailAfter = Math.min(entries.length - 1, Math.floor(selectedIndex / 3) * 3 + 2);
      content.push(`<div id="achievement-chapters" class="achievement-chapters"><nav aria-label="成就章节">
        ${achievementChapters.map((group) => `<button type="button" data-book-chapter="${group.id}" data-focus="tab-${group.id}" aria-pressed="${group.id === chapter}" aria-label="${escapeHtml(group.title)}">${chapterTabs[group.id]}</button>`).join("")}
        </nav><div class="achievement-chapter-heading"><h3>${escapeHtml(page.title)}</h3><small>${entries.filter((row) => row.earned).length} / ${entries.length}</small></div>
        <div class="achievement-grid">${entries
          .map(
            (row, index) =>
              stampButton(row, row.id === selected, false) +
              (current && index === detailAfter ? details(current) : ""),
          )
          .join("")}</div>
        ${current ? "" : '<div id="achievement-detail" hidden></div>'}</div>`);
    } else {
      content.push('<div id="achievement-chapters" hidden><div id="achievement-detail" hidden></div></div>');
    }
    const html = content.join("");
    if (html !== previousHtml) {
      const active = document.activeElement;
      const oldKey = active instanceof HTMLElement && live.contains(active) ? active.dataset.focus : undefined;
      previousHtml = html;
      live.innerHTML = html;
      paintAchievementArt(live);
      if (focus || oldKey) focusAt(focus ?? oldKey!);
    } else if (focus) focusAt(focus);
  }

  root.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !live.contains(button)) return;
    if (button.hasAttribute("data-book-toggle")) {
      open = !open;
      selected = null;
      render("toggle");
    } else if (button.dataset.bookChapter) {
      const next = achievementChapters.find((group) => group.id === button.dataset.bookChapter);
      if (!next) return;
      chapter = next.id;
      selected = null;
      render("tab-" + chapter);
    } else if (button.dataset.bookPick) {
      const row = rows.find((entry) => entry.id === button.dataset.bookPick);
      if (!row) return;
      selected = open && selected === row.id ? null : row.id;
      chapter = row.chapter;
      open = true;
      render(selected ? "detail" : "pick-" + row.id);
      const detail = selected && live.querySelector<HTMLElement>("#achievement-detail");
      if (detail) {
        const rect = detail.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > document.documentElement.clientHeight)
          detail.scrollIntoView({ block: "nearest" });
      }
    } else if (button.dataset.bookGo) {
      const row = rows.find((entry) => entry.id === button.dataset.bookGo);
      if (row?.target && !concealed(row)) onTravel(row.target);
    }
  });
  return {
    update(entries: readonly AchievementEntry[], latestId?: string | null) {
      const newlyStamped = rows.length > 0 && latestId && latest !== latestId
        && rows.some(entry => entry.id === latestId && !entry.earned);
      rows = entries;
      latest = latestId ?? null;
      render();
      if (newlyStamped && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const imprint = live.querySelector<HTMLElement>(`[data-book-pick="${latestId}"] .achievement-stamp, .achievement-last-imprint`)
          ?? live.querySelector<HTMLElement>(".achievement-count strong");
        imprint?.animate([
          { transform: "scale(1.14) rotate(-6deg)", opacity: .6 },
          { transform: "scale(.95) rotate(1deg)", opacity: 1, offset: .55 },
          { transform: "none", opacity: 1 },
        ], { duration: 370, easing: "ease-out" });
      }
    },
    reset() {
      open = false;
      selected = null;
      latest = null;
      chapter = achievementChapters[0].id;
    },
  };
}
