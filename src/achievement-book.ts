import { achievementChapters, type AchievementEntry } from "./achievements";
import { hasDrawnStamp, paintAchievementArt } from "./achievement-art";
import { escapeHtml } from "./icons";
import "./achievement-book.css";

const chapterTabs = { daily: "日常", letters: "来信", games: "游园", explore: "探索", advanced: "进阶" } as const;

export const achievementBookMarkup = `<dialog id="anniversary-badges" class="achievement-book" data-page-ui aria-labelledby="achievement-title">
  <header class="achievement-cover">
    <div class="achievement-cover-title"><span>芙芙的</span><h2 id="achievement-title">周年徽章册</h2></div>
    <span class="achievement-cover-emblem" aria-hidden="true"><canvas data-stamp-art="fox" width="32" height="32"></canvas></span>
    <button type="button" class="book-close" aria-label="收起周年徽章册" autofocus>收起 <span aria-hidden="true">×</span></button>
  </header>
  <div class="achievement-page">
    <div class="achievement-live"></div>
  </div>
</dialog>`;

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
  const root = document.querySelector<HTMLDialogElement>(".achievement-book")!;
  const trigger = document.querySelector<HTMLButtonElement>("[data-book-toggle]")!;
  const live = root.querySelector<HTMLElement>(".achievement-live")!;
  paintAchievementArt(root);
  let rows: readonly AchievementEntry[] = [];
  let latest: string | null = null;
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
    const count = rows.length;
    const content = [
      `<div class="achievement-count"><span>已收集徽章</span><strong>${earned.length}<span> / ${count}</span></strong></div>
       <progress class="achievement-track" value="${earned.length}" max="${count || 1}" aria-label="徽章收集进度"></progress>`,
    ];
    if (last) content.push(
      `<section class="achievement-last" aria-label="最近获得"><div class="achievement-last-imprint">${achievementStampMarkup(last)}</div><span><small>最近获得</small><strong>${escapeHtml(last.name)}</strong></span></section>`,
    );
    if (count && earned.length === count) content.push(`<p class="achievement-complete">${count} 枚徽章，全部收集齐啦。</p>`);
    const page = achievementChapters.find((group) => group.id === chapter)!;
    const entries = rows.filter((row) => row.chapter === chapter);
    // Open the selected page directly beneath its row of stamps.
    const selectedIndex = entries.findIndex((row) => row.id === selected);
    const detailAfter = Math.min(entries.length - 1, Math.floor(selectedIndex / 3) * 3 + 2);
    content.push(`<div id="achievement-chapters" class="achievement-chapters"><nav aria-label="徽章章节">
      ${achievementChapters.map((group) => `<button type="button" data-book-chapter="${group.id}" data-focus="tab-${group.id}" aria-pressed="${group.id === chapter}" aria-label="${escapeHtml(group.title)}">${chapterTabs[group.id]}</button>`).join("")}
      </nav><div class="achievement-chapter-heading"><h3>${escapeHtml(page.title)}</h3><small>${entries.filter((row) => row.earned).length} / ${entries.length}</small></div>
      <div class="achievement-grid">${entries
        .map(
          (row, index) =>
            stampButton(row, row.id === selected) +
            (current && index === detailAfter ? details(current) : ""),
        )
        .join("")}</div>
      ${current ? "" : '<div id="achievement-detail" hidden></div>'}</div>`);
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

  function close() {
    if (!root.open) return;
    root.close();
    trigger.setAttribute("aria-expanded", "false");
    api.onChange(false);
    trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener("click", () => {
    if (root.open) return;
    api.onOpen();
    root.showModal();
    render();
    trigger.setAttribute("aria-expanded", "true");
    api.onChange(true);
  });
  root.querySelector(".book-close")!.addEventListener("click", close);
  root.addEventListener("cancel", event => { event.preventDefault(); close(); });
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      const box = root.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX >= box.right || event.clientY < box.top || event.clientY >= box.bottom) close();
      return;
    }
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !live.contains(button)) return;
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
      const detail = selected && live.querySelector<HTMLElement>("#achievement-detail");
      if (detail) {
        const page = root.querySelector<HTMLElement>(".achievement-page")!;
        const rect = detail.getBoundingClientRect(), view = page.getBoundingClientRect();
        if (rect.top < view.top || rect.bottom > view.bottom) page.scrollTop += rect.top - view.top;
      }
    }
  });
  const api = {
    get isOpen() { return root.open; },
    onOpen: () => {},
    onChange: (_open: boolean) => {},
    update(entries: readonly AchievementEntry[], latestId?: string | null) {
      const newlyStamped = rows.length > 0 && latestId && latest !== latestId
        && rows.some(entry => entry.id === latestId && !entry.earned);
      rows = entries;
      latest = latestId ?? null;
      if (!root.open) return;
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
      close();
      selected = null;
      latest = null;
      chapter = achievementChapters[0].id;
    },
  };
  return api;
}
