/* NewBee OS · 三端共用：重点关注 / 排序的界面零件（星标 · 理由标签 · 「…」菜单 · 拖动 · 分组折叠）
   依赖 score.js（NBScore）+ 各端的 ACTIONS / render / DBsave / toast / openModal | openSheet */
(function () {
  const A = () => window.ACTIONS;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const open = (html) => (window.openModal || window.openSheet)(html);
  const close = () => (window.closeModal || window.closeSheet)();
  const KN = { deal: "交易", contact: "联系人", property: "房源" };
  const en = () => window.DB && DB.ui && DB.ui.lang === "en";
  const T = (zh, e) => (en() ? e : zh);
  const ui = () => { DB.ui = DB.ui || {}; DB.ui.grp = DB.ui.grp || {}; return DB.ui.grp; };

  // ---------- 零件 ----------
  const star = (kind, id, cls) => `<button class="star ${NBScore.isPinned(kind, id) ? "on" : ""} ${cls || ""}" data-action="pin-toggle" data-arg="${kind}|${id}" title="${NBScore.isPinned(kind, id) ? T("移出重点关注", "Unpin") : T("加入重点关注", "Pin")}">${NBScore.isPinned(kind, id) ? "★" : "☆"}</button>`;
  const handle = () => `<span class="handle" title="${T("拖动排序（手机：用 … 菜单）", "Drag to reorder")}">⋮⋮</span>`;
  const menuBtn = (kind, id) => `<button class="dots" data-action="pin-menu" data-arg="${kind}|${id}" title="${T("上移 / 下移 / 移到最前", "Move")}">…</button>`;
  const scorePill = (kind, r) => `<button class="scorepill" data-action="pin-explain" data-arg="${kind}|${r.id}" title="${T("分数怎么来的", "How this score was computed")}">${r.score}</button>`;
  const reasonChips = (r) => r.top.map((t) => `<span class="rsn">${esc(t.label)}</span>`).join("") || `<span class="rsn mute">${T("没有加分项", "No boosts")}</span>`;
  // 网站表格的两个格子：左（手柄 + 星标）· 右（理由 + 分数 + 菜单）
  const cellStar = (kind, r, pinned) => `<td class="pincell">${pinned ? handle() : ""}${star(kind, r.id)}</td>`;
  const cellWhy = (kind, r, pinned) => `<td class="whycell">${r.ended && pinned ? `<span class="endhint">${T("已结束，要取消重点吗？", "Ended — unpin?")} <button class="btn xs" data-action="pin-toggle" data-arg="${kind}|${r.id}">${T("取消重点", "Unpin")}</button></span>` : reasonChips(r)}${scorePill(kind, r)}${pinned ? menuBtn(kind, r.id) : ""}</td>`;
  const trAttrs = (kind, r, pinned) => `class="click ${pinned ? "pinrow" : ""} ${r.ended ? "ended" : ""}" data-pin="${kind}|${r.id}" ${pinned ? 'draggable="true"' : ""}`;

  function pinHeader(kind, lay) {
    return `<div class="pinhd"><b>⭐ ${T("重点关注", "Pinned")}</b><span class="small muted">${lay.pinned.length} ${T("条", "")} · ${lay.manual ? T("手动顺序（拖动或用 … 菜单）", "manual order") : T("按分数", "by score")}</span><span class="sp"></span>${lay.manual ? `<button class="btn xs" data-action="pin-reset" data-arg="${kind}">${T("恢复自动排序", "Reset to auto")}</button>` : `<span class="tiny muted">${T("拖动一次就改成手动顺序", "Drag once to switch to manual")}</span>`}</div>`;
  }
  function groupHeader(kind, g, shownAll) {
    const hidden = g.rows.length - visibleCount(g, shownAll);
    return `<div class="grphd"><b>${esc(g.label)}</b><span class="cnt">${g.rows.length}</span>${g.key === "sec_greet" ? `<span class="tiny muted">${T("最久没联系的在前", "longest silence first")}</span>` : ""}<span class="sp"></span>${hidden > 0 ? `<button class="btn xs ghost" data-action="grp-toggle" data-arg="${kind}|${g.key}">${T("展开其余", "Show")} ${hidden} ${T("条", "more")}</button>` : shownAll && g.rows.length > g.collapse ? `<button class="btn xs ghost" data-action="grp-toggle" data-arg="${kind}|${g.key}">${T("收起", "Collapse")}</button>` : ""}</div>`;
  }
  function visibleCount(g, shownAll) { return shownAll ? g.rows.length : Math.min(g.rows.length, g.collapse || g.rows.length); } // v1.6：平铺视图（搜索 / 筛选，collapse: 0）画全部，不再只画星标行
  function isOpen(kind, key) { return !!ui()[kind + ":" + key]; }
  // 网站：整块列表（重点区 + 分组表）；rowFn(r, pinned) 返回 <tr>…</tr>
  function tableBlocks(kind, lay, head, rowFn, opts) {
    opts = opts || {};
    const cg = opts.cols ? `<colgroup>${opts.cols.map((w) => `<col style="width:${w}">`).join("")}</colgroup>` : "";
    const tbl = (rows, pinned) => `<div class="tbl"><table class="${opts.cols ? "fixedcols" : ""}">${cg}${head}${rows.map((r) => rowFn(r, pinned)).join("")}</table></div>`;
    let out = "";
    if (lay.pinned.length) out += `<div class="card pad0 pinbox">${pinHeader(kind, lay)}${tbl(lay.pinned, true)}</div>`;
    lay.groups.forEach((g) => {
      const openAll = isOpen(kind, g.key); const n = visibleCount(g, openAll);
      out += `<div class="card pad0 grp ${g.key === "all" ? "flat" : ""}">${g.key === "all" ? "" : groupHeader(kind, g, openAll)}${n ? tbl(g.rows.slice(0, n), false) : ""}</div>`;
    });
    if (!lay.pinned.length && !lay.groups.length) out += `<div class="card"><div class="empty">${T("没有匹配的记录", "Nothing matches")}</div></div>`;
    return out;
  }
  // 手机：卡片版（cardFn(r, pinned) 返回一张卡）
  function cardBlocks(kind, lay, cardFn) {
    let out = "";
    if (lay.pinned.length) out += `<div class="sec"><h2>⭐ ${T("重点关注", "Pinned")}</h2><span class="lk">${lay.manual ? `<a href="#" data-action="pin-reset" data-arg="${kind}">${T("恢复自动排序", "Reset")}</a>` : T("按分数", "by score")}</span></div>` + lay.pinned.map((r) => cardFn(r, true)).join("");
    lay.groups.forEach((g) => {
      const openAll = isOpen(kind, g.key); const n = visibleCount(g, openAll); const hidden = g.rows.length - n;
      out += (g.key === "all" ? "" : `<div class="sec"><h2>${esc(g.label)} <span class="tiny muted">${g.rows.length}</span></h2>${hidden > 0 ? `<a href="#" class="lk" data-action="grp-toggle" data-arg="${kind}|${g.key}">${T("展开", "Show")} ${hidden}</a>` : openAll && g.rows.length > g.collapse ? `<a href="#" class="lk" data-action="grp-toggle" data-arg="${kind}|${g.key}">${T("收起", "Collapse")}</a>` : ""}</div>`) + g.rows.slice(0, n).map((r) => cardFn(r, false)).join("");
    });
    if (!lay.pinned.length && !lay.groups.length) out += `<div class="empty">${T("没有匹配的记录", "Nothing matches")}</div>`;
    return out;
  }
  // 卡片右上角的一组：星标 + 分数 + （重点区）菜单
  const cardTools = (kind, r, pinned) => `<span class="cardtools">${scorePill(kind, r)}${star(kind, r.id)}${pinned ? menuBtn(kind, r.id) : ""}</span>`;
  const cardWhy = (kind, r, pinned) => `<div class="whyline">${r.ended && pinned ? `<span class="endhint">${T("已结束，要取消重点吗？", "Ended — unpin?")} <button class="btn xs" data-action="pin-toggle" data-arg="${kind}|${r.id}">${T("取消重点", "Unpin")}</button></span>` : reasonChips(r)}</div>`;

  // ---------- 动作 ----------
  function reg() {
    const ACT = A(); if (!ACT || ACT["pin-toggle"]) return;
    const stop = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } };
    ACT["pin-toggle"] = (el, arg, e) => { stop(e); const [kind, id] = arg.split("|"); const on = NBScore.togglePin(kind, id); DBsave(); render(); toast(on ? (NBScore.isManual(kind) ? T("已加入重点关注（手动顺序下排最前）", "Pinned (first in your manual order)") : T("已加入重点关注（按分数排）", "Pinned (sorted by score)")) : T("已移出重点关注", "Unpinned")); };
    ACT["pin-reset"] = (el, kind, e) => { stop(e); NBScore.resetManual(kind); DBsave(); render(); toast(T("重点关注恢复按分数排", "Pinned list back to auto order")); };
    ACT["pin-menu"] = (el, arg, e) => {
      stop(e); const [kind, id] = arg.split("|");
      open(`<h2>${T("调整顺序", "Reorder")}</h2><p class="small muted">${T("只对重点关注区有效；调过一次以后这个列表就按你的顺序，直到你点「恢复自动排序」。", "Pinned area only; after one move this list keeps your order until you reset.")}</p><div class="list">${[["top", T("移到最前", "Move to top")], ["up", T("上移", "Move up")], ["down", T("下移", "Move down")]].map(([d, l]) => `<button class="btn wide" style="margin-top:6px" data-action="pin-move" data-arg="${kind}|${id}|${d}">${l}</button>`).join("")}<button class="btn wide ghost" style="margin-top:10px" data-action="pin-toggle" data-arg="${kind}|${id}">☆ ${T("移出重点关注", "Unpin")}</button></div>${window.openModal ? `<div class="acts"><button class="btn" data-action="modal-close">${T("关闭", "Close")}</button></div>` : ""}`);
    };
    ACT["pin-move"] = (el, arg, e) => { stop(e); const [kind, id, dir] = arg.split("|"); const ids = [...document.querySelectorAll(`.pinrow[data-pin^="${kind}|"], .pincard[data-pin^="${kind}|"]`)].map((n) => n.getAttribute("data-pin").split("|")[1]); NBScore.move(kind, id, dir, ids); close(); DBsave(); render(); toast(T("已调整（手动顺序已保存）", "Moved · manual order saved")); };
    ACT["pin-explain"] = (el, arg, e) => {
      stop(e); const [kind, id] = arg.split("|");
      const item = kind === "deal" ? DB.deals.find((x) => x.id === id) : kind === "contact" ? DB.contacts.find((x) => x.id === id) : DB.properties.find((x) => x.id === id);
      const x = NBScore.explain(kind, item); const name = item.title || item.name || item.addr;
      const rows = x.reasons.filter((r) => !r.base).map((r) => `<div class="li"><span class="badge ${r.w > 0 ? "ok" : "bad"} num">${r.w > 0 ? "+" : ""}${r.w}</span><div class="body"><div class="t small">${esc(r.label)}</div></div></div>`).join("");
      open(`<h2>${esc(name)} · ${T("分数怎么来的", "Score breakdown")}</h2><div class="list"><div class="li"><span class="badge acc num">${x.base}</span><div class="body"><div class="t small">${T("基础分", "Base")} · ${kind === "contact" ? T("热度", "heat") : (x.facts.offerOpen ? T("有未决 Offer", "open offer") : esc(x.facts.stage || x.facts.relationship || ""))}</div></div></div>${rows || `<div class="li"><div class="body"><div class="t small muted">${T("没有加减分", "No adjustments")}</div></div></div>`}<div class="li"><span class="badge mute num"><b>= ${x.score}</b></span><div class="body"><div class="t small">${T("分组", "Section")}：${esc(NBScore.sectionLabel(x.section))}${x.facts.freshItems && x.facts.freshItems.length ? `<div class="tiny muted" style="margin-top:4px">${T("新动态", "New since last open")}：${x.facts.freshItems.slice(0, 4).map((f) => esc(f.what)).join("；")}</div>` : ""}</div></div></div></div><p class="tiny muted" style="margin-top:8px">${T("权重在 data.js 顶部 SCORE_CONFIG 里集中配置；真实版在 packages/core 里，以后设置页可调。", "Weights live in SCORE_CONFIG; real version in packages/core.")}</p>${window.openModal ? `<div class="acts"><button class="btn" data-action="modal-close">${T("关闭", "Close")}</button></div>` : ""}`);
    };
    ACT["grp-toggle"] = (el, arg, e) => { stop(e); const g = ui(); g[arg.replace("|", ":")] = !g[arg.replace("|", ":")]; DBsave(); render(); };
    // 拖动（电脑）：只在重点区内
    let dragId = null, dragKind = null;
    document.addEventListener("dragstart", (e) => { const row = e.target.closest && e.target.closest("[data-pin][draggable=true]"); if (!row) return; [dragKind, dragId] = row.getAttribute("data-pin").split("|"); row.classList.add("dragging"); try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); } catch (x) { /* ignore */ } });
    document.addEventListener("dragover", (e) => { const row = e.target.closest && e.target.closest("[data-pin][draggable=true]"); if (!row || !dragId) return; if (row.getAttribute("data-pin").split("|")[0] !== dragKind) return; e.preventDefault(); const r = row.getBoundingClientRect(); row.classList.toggle("over-top", e.clientY < r.top + r.height / 2); row.classList.toggle("over-bot", e.clientY >= r.top + r.height / 2); });
    document.addEventListener("dragleave", (e) => { const row = e.target.closest && e.target.closest("[data-pin]"); if (row) row.classList.remove("over-top", "over-bot"); });
    document.addEventListener("drop", (e) => {
      const row = e.target.closest && e.target.closest("[data-pin][draggable=true]"); if (!row || !dragId) return; e.preventDefault();
      const [kind, targetId] = row.getAttribute("data-pin").split("|"); if (kind !== dragKind || targetId === dragId) { cleanup(); return; }
      const rows = [...document.querySelectorAll(`[data-pin^="${kind}|"][draggable=true]`)]; let ids = rows.map((n) => n.getAttribute("data-pin").split("|")[1]);
      const before = row.classList.contains("over-top");
      ids = ids.filter((x) => x !== dragId); const at = ids.indexOf(targetId) + (before ? 0 : 1); ids.splice(at, 0, dragId);
      NBScore.reorder(kind, ids); cleanup(); DBsave(); render(); toast(T("顺序已保存（手动）", "Order saved (manual)"));
    });
    document.addEventListener("dragend", cleanup);
    function cleanup() { dragId = null; dragKind = null; document.querySelectorAll(".dragging,.over-top,.over-bot").forEach((n) => n.classList.remove("dragging", "over-top", "over-bot")); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  setTimeout(reg, 0);

  window.NBPinUI = { star, handle, menuBtn, scorePill, reasonChips, cellStar, cellWhy, trAttrs, pinHeader, groupHeader, tableBlocks, cardBlocks, cardTools, cardWhy, KN, T };
})();
