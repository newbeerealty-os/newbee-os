/* NewBee OS · 手机端影子公用核心（经纪人 App / 客户 App 共用）：状态 · 路由 · 外壳 · 弹层 · 提示 · 三端共用同一份示例数据（data.js）
   v1.5：截止的颜色、交易健康度只有一份（score.js NBScore）；阶段的叫法只有一份（roadmap.js）；
        顶栏搜索按端分开——每个 App 自己给 window.APP_SEARCH(q)：只搜这一端、这个身份看得到的东西，只指向这一端有的页面；
        大字（老花模式）是共享设置（shared.js NBSet），别的端改了这里跟着变。 */
(function () {
  const APP = window.APP_ID || "agent";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 三端一个数据库（shared.js 的 NBSync）：这一端自己的界面状态放在 DB.apps[APP]，通过 DB.m 访问（不重复存）
  function bindM(db) { db.apps = db.apps || {}; db.apps[APP] = db.apps[APP] || {}; Object.defineProperty(db, "m", { get() { return db.apps[APP]; }, set(v) { db.apps[APP] = v; }, enumerable: false, configurable: true }); return db; }
  let DB = bindM(NBSync.load(SEED));
  window.DB = DB;
  function save() { NBSync.save(); }
  function resetAll() { DB = bindM(NBSync.replaceAll(clone(SEED))); window.DB = DB; applyBig(); location.hash = "#/" + (window.HOME_TAB || "today"); render(); toast("演示数据已重置（三端同步）"); }
  // 大字按人存在共享设置里：经纪人 App = 当前用户；客户 App = 当前身份的那位联系人
  const applyBig = () => { if (window.NBSet) NBSet.applyBigFont(APP === "client" && window.clientWho ? (window.clientWho() || {}).id : undefined); };
  NBSync.onRemote((ev) => { if (ev.status) return; bindM(DB); applyBig(); render(); if (ev.msg && !location.hash.startsWith("#/messages")) toast("有新消息"); });

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null || n === "") ? "—" : "$" + Number(n).toLocaleString("en-US");
  const TODAY = () => DB.today;
  function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
  function rel(iso) { if (!iso) return "未定"; const n = daysBetween(TODAY(), iso.slice(0, 10)); if (n === 0) return "今天"; if (n === 1) return "明天"; if (n === -1) return "昨天"; return n > 0 ? `${n} 天后` : `${-n} 天前`; }
  const WD = ["日", "一", "二", "三", "四", "五", "六"];
  function fd(iso) { if (!iso) return "—"; const x = new Date(iso.slice(0, 10) + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}（周${WD[x.getDay()]}）`; }
  const urgency = (iso) => NBScore.urgency(iso); // 没日期 mute · 已过或 ≤ urgentDays 天红 · ≤ soonDays 天黄 · 其余 acc（阈值只在 SCORE_CONFIG.thresholds）
  const contact = (id) => DB.contacts.find((c) => c.id === id);
  const org = (id) => DB.orgs.find((o) => o.id === id);
  const prop = (id) => DB.properties.find((p) => p.id === id);
  const deal = (id) => DB.deals.find((x) => x.id === id);
  const initials = (name) => name ? name.slice(0, name.match(/^[A-Za-z]/) ? 2 : 1).toUpperCase() : "?";
  // 十三个阶段的叫法和颜色只在 roadmap.js（没有 new / pending_fields：「待确认」是徽章，不是阶段）；买 / 卖 / 租的叫法用 NBRoadmap.sideLabel(d)
  const STAGE = {}; NBRoadmap.STAGES.forEach((s) => { STAGE[s] = [NBRoadmap.STAGE_ZH[s], NBRoadmap.STAGE_CLS[s] || "mute"]; });
  const stageBadge = (s) => NBRoadmap.stageBadgeHtml(s);
  const ROLE = { decision: "决策人", family: "家人", advisor: "参谋" };
  function dateKicker() { const x = new Date(TODAY() + "T00:00:00"); const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]; const D = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]; return `${D[x.getDay()]} · ${M[x.getMonth()]} ${x.getDate()}`; }
  const dealHealth = (d) => NBScore.dealHealth(d); // 和网站同一个算法：100 − 逾期任务 × 8 − 待确认字段 × 3 −（下一个节点很近 ? 10 : 0）
  function audit(dealId, what, actor = "human", who = DB.me.name) { DB.audit.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), actor, who, what, deal: dealId }); }

  // ---------- routing ----------
  const SCREENS = {};
  function route() { const h = location.hash.replace(/^#\/?/, ""); const segs = h.split("/").filter(Boolean); return { name: segs[0] || (window.HOME_TAB || "today"), segs }; }
  function nav(path) { location.hash = "#/" + path; }

  // ---------- shell ----------
  const VERSIONS = () => window.APP_VERSIONS || [{ v: SEED.version, at: DB.today, path: "./", note: "当前版本" }]; // 用到时再读：app.js 在 mcore 之后才设置 APP_VERSIONS；没给就只有当前这一版（版本号只认 SEED.version）
  function header(r) {
    const cfg = window.APP_HEADER ? window.APP_HEADER(r) : { title: "", sub: "" };
    return `<header class="top"><div class="topline"><a class="hubback" href="https://claude.ai/artifact/EUPZoyFXqRsFDDdsf6jxX6" target="_top" title="回到主界面">⌂</a><span class="kick">${dateKicker()} · ${esc((window.APP_NAME || "").replace(" 影子", ""))}</span><span class="sp"></span><button class="ib" data-action="versions" title="版本">${esc(DB.version)}</button><span class="syncpill" title="三端同一份数据">${NBSync.status === "cloud" ? "云" : "本机"}</span><button class="ib" data-action="search" title="搜索">⌕</button>${window.APP_EXTRA_HEADER ? window.APP_EXTRA_HEADER() : ""}</div>${cfg.title ? `<h1>${cfg.title}</h1>` : ""}${cfg.sub ? `<div class="sub">${cfg.sub}</div>` : ""}</header>`;
  }
  function tabbar(cur) {
    return `<nav class="tabbar">` + (window.APP_TABS || []).map(([p, ico, l, badge]) => { const n = p === "messages" && window.NBMsg && window.NBMsgUI ? NBMsg.totalUnread(NBMsgUI.viewer(), window.clientWho ? { contact: window.clientWho().id } : {}) + NBMsg.totalPending(NBMsgUI.viewer(), window.clientWho ? { contact: window.clientWho().id } : {}) : 0; return `<a href="#/${p}" class="${cur === p ? "on" : ""}"><span class="ico">${ico}</span>${l}${n ? `<i class="bnum">${n}</i>` : badge ? `<i class="bdot"></i>` : ""}</a>`; }).join("") + `</nav>`;
  }
  function render() {
    const r = route();
    const root = document.getElementById("root");
    const fn = SCREENS[r.name] || SCREENS.notfound;
    let html;
    try { html = fn(r.segs.slice(1), r); } catch (e) { console.error(e); html = `<div class="note bad">这一页出错了：${esc(e.message)}</div>`; }
    root.innerHTML = `<div class="simbar">影子 · 示例数据 · 三端一库 · <a href="#" data-action="reset">重置</a></div>${header(r)}<main class="page">${html}</main>${window.APP_BAR ? window.APP_BAR(r) : ""}${tabbar(r.name)}<div id="sheet-root"></div><div id="toast-root"></div>`;
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  // ---------- actions ----------
  const ACTIONS = {
    reset() { if (confirm("把三端共用的示例数据重置成初始状态？")) resetAll(); },
    "sheet-close"() { closeSheet(); },
    nav(el, arg) { closeSheet(); nav(arg); },
    toast(el, arg) { toast(arg); },
    todo(el, arg) { toast((arg || "这个按钮") + "：影子里只演示到这里（真实版会执行）"); },
    versions() { openSheet(`<h2>影子版本</h2><p class="small muted">每次改版不覆盖旧版，历史版本原样存档。</p><div class="vlist">${VERSIONS().map((v) => `<button ${v.path ? "" : "disabled"} data-action="ver-go" data-arg="${v.path || ""}" class="${v.v === DB.version ? "on" : ""}"><span class="vv">${v.v}</span><span><b>${v.v === DB.version ? "当前 · " : ""}${v.at}</b><div class="vd">${esc(v.note)}</div></span></button>`).join("")}</div>`); },
    "ver-go"(el, path) { if (!path || path === "./") { closeSheet(); return; } location.href = path; },
    // 搜索：结果由这一端自己的 APP_SEARCH(q) 给 → [{ label, sub, path }]；path 一定是这一端有的页面。没给 APP_SEARCH 就什么也搜不到（不会把整个数据库列出来）
    search() {
      openSheet(`<h2>搜索</h2><input id="msq" placeholder="${esc(window.APP_SEARCH_HINT || "地址、名字、页面…")}" style="width:100%"><div class="list" id="msres" style="margin-top:8px"></div>`);
      const inp = document.getElementById("msq"); if (!inp) return;
      const run = () => { const q = inp.value.trim().toLowerCase(); const res = document.getElementById("msres"); if (!res) return; const seen = {}; const hits = (q && window.APP_SEARCH ? window.APP_SEARCH(q) : []).filter((h) => h && h.path && !seen[h.path + "|" + h.label] && (seen[h.path + "|" + h.label] = true)); res.innerHTML = hits.slice(0, 12).map((h) => `<button class="li" data-action="nav" data-arg="${esc(h.path)}"><div class="body"><div class="t">${esc(h.label)}</div>${h.sub ? `<div class="d">${esc(h.sub)}</div>` : ""}</div></button>`).join("") || `<div class="empty small">${q ? "没找到" : "输点什么"}</div>`; };
      inp.addEventListener("input", run); inp.focus(); run();
    },
  };
  window.ACTIONS = ACTIONS;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const fn = ACTIONS[el.getAttribute("data-action")];
    if (!fn) return;
    if (el.tagName === "A") e.preventDefault();
    fn(el, el.getAttribute("data-arg"), e);
  });
  document.addEventListener("change", (e) => { const el = e.target.closest("[data-change]"); if (!el) return; const fn = ACTIONS[el.getAttribute("data-change")]; if (fn) fn(el, el.getAttribute("data-arg"), e); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // ---------- sheet / toast ----------
  function openSheet(html) { const r = document.getElementById("sheet-root"); if (!r) return; r.innerHTML = `<div class="sheet-bg" data-action="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}<div class="row" style="margin-top:12px"><span class="sp"></span><button class="btn" data-action="sheet-close">关闭</button></div></div></div>`; }
  ACTIONS["sheet-bg"] = (el, arg, e) => { if (e.target === el) closeSheet(); };
  function closeSheet() { const r = document.getElementById("sheet-root"); if (r) r.innerHTML = ""; }
  let toastTimer;
  function toast(msg) { const r = document.getElementById("toast-root"); if (!r) return; r.innerHTML = `<div class="toast">${esc(msg)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { r.innerHTML = ""; }, 2600); }

  Object.assign(window, { DBsave: save, esc, money, rel, fd, urgency, contact, org, prop, deal, initials, stageBadge, STAGE, ROLE, SCREENS, nav, render, openSheet, closeSheet, toast, daysBetween, TODAY, resetAll, dealHealth, audit, dateKicker });
  function boot() { if (!location.hash) location.hash = "#/" + (window.HOME_TAB || "today"); applyBig(); render(); NBSync.connect(); }
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot); else boot();
})();
