/* NewBee OS 三端影子 · 公用层
   1) NBSync：三端一个数据库 —— 同一个 localStorage 键（同一浏览器里网站 / 经纪人 App / 客户 App 共享），
      跨标签页实时同步（storage 事件），并在 claude.ai 上通过 db 能力跨设备同步（手机 ↔ 电脑）。
      每个顶层集合一条记录（state_<版本>/<集合>，例如 state_v1_5/deals），带 rev（新者胜）；ui 只存本标签页（sessionStorage）。
   2) NBSet：要跨端共享的设置（通知级别 · 每笔交易的客户视图透明度 · 字段默认档 · 大字）—— 存在 DB.settings 里跟着同步；ui 里只留语言、主题、打开的 tab 这类纯界面状态。
   3) NBLink：分端链接 —— 共用模块只发当前这一端有的路由（没有就返回 null，界面不画成链接）。
   4) NBMsg：消息（有针对性的沟通）—— 每条对话挂在一个对象上（交易 / 看房 / 工单 / 公告），
      三端用同一套线程与消息模型；客户 ↔ 经纪人、经纪人 ↔ Broker、团队。 */
(function () {
  const VER = String(window.SEED.version); // 版本号只有一个来源：SEED.version（旧版页面用旧键，互不覆盖）
  const KEY = "newbee-os-" + VER;
  const COLL = "state_" + VER.replace(/\./g, "_"); // 云端集合也按版本分开
  const LOCAL_KEYS = ["ui"];                 // 本标签页私有，不同步
  const MERGE_KEYS = ["messages", "threads"]; // 按 id 合并，不整体覆盖
  const ns = () => window.APP_ID || "web";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const J = (o) => JSON.stringify(o === undefined ? null : o);
  let DB = null, revs = {}, last = {}, db = null, ready = false, chain = Promise.resolve();
  const listeners = [];

  function mergeById(a, b) {
    const map = new Map();
    (a || []).forEach((x) => map.set(x.id, x));
    (b || []).forEach((x) => { const o = map.get(x.id); if (!o || (x.upd || x.lastAt || x.at || "") >= (o.upd || o.lastAt || o.at || "")) map.set(x.id, x); });
    return [...map.values()];
  }

  function load(SEED) {
    let base = null;
    try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.version === SEED.version && o.today === SEED.today) base = o; } } catch (e) { /* ignore */ }
    const fresh = clone(SEED);
    DB = base || fresh;
    // 老版本存的可能少了新集合：用种子补齐
    Object.keys(fresh).forEach((k) => { if (!(k in DB)) DB[k] = fresh[k]; });
    try { const u = sessionStorage.getItem(KEY + ":ui:" + ns()); DB.ui = u ? Object.assign({}, fresh.ui, JSON.parse(u)) : fresh.ui; } catch (e) { DB.ui = fresh.ui; }
    DB.apps = DB.apps || {};
    revs = (base && base.__revs) || {};
    delete DB.__revs;
    Object.keys(DB).forEach((k) => { if (!LOCAL_KEYS.includes(k)) last[k] = J(DB[k]); });
    return DB;
  }

  function persistLocal() {
    try { sessionStorage.setItem(KEY + ":ui:" + ns(), JSON.stringify(DB.ui)); } catch (e) { /* ignore */ }
    try { const out = Object.assign({}, DB); delete out.ui; out.__revs = revs; localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* ignore */ }
  }

  function save() {
    const changed = [];
    Object.keys(DB).forEach((k) => {
      if (LOCAL_KEYS.includes(k)) return;
      const j = J(DB[k]);
      if (j !== last[k]) { last[k] = j; revs[k] = Math.max(Date.now(), (revs[k] || 0) + 1); changed.push(k); }
    });
    persistLocal();
    if (changed.length && db) push(changed);
    return changed;
  }

  function replaceAll(obj) { // 重置演示：整库换成种子，所有集合都算“新”；reset 标记让别的标签页整体替换而不是合并
    DB = obj; DB.apps = DB.apps || {}; DB.reset = Date.now();
    Object.keys(DB).forEach((k) => { if (LOCAL_KEYS.includes(k)) return; last[k] = J(DB[k]); revs[k] = Date.now(); });
    persistLocal();
    if (db) push(Object.keys(DB).filter((k) => !LOCAL_KEYS.includes(k)));
    return DB;
  }

  function applyIncoming(obj, inRevs) {
    let any = false, msg = false;
    const hard = (obj.reset || 0) > (DB.reset || 0); // 对方刚重置：整体替换
    Object.keys(obj).forEach((k) => {
      if (LOCAL_KEYS.includes(k) || k === "__revs") return;
      const r = inRevs[k] || 0;
      if (!hard && r <= (revs[k] || 0)) return;
      let val = obj[k];
      if (k === "apps") val = Object.assign({}, val, { [ns()]: DB.apps[ns()] }); // 自己这端的界面状态自己管
      if (MERGE_KEYS.includes(k) && !hard) val = mergeById(DB[k] || [], val || []);
      DB[k] = val; revs[k] = r; last[k] = J(val); any = true; if (MERGE_KEYS.includes(k)) msg = true;
    });
    if (any) { persistLocalQuiet(); listeners.forEach((fn) => { try { fn({ msg }); } catch (e) { console.error(e); } }); }
    return any;
  }
  let quiet = false;
  function persistLocalQuiet() { quiet = true; persistLocal(); quiet = false; }

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { const o = JSON.parse(e.newValue); applyIncoming(o, o.__revs || {}); } catch (x) { /* ignore */ }
  });

  function push(keys) {
    keys.forEach((k) => {
      const rev = revs[k];
      chain = chain.then(async () => {
        if (!db) return;
        try { await db.doc(COLL + "/" + k).set({ today: DB.today, version: DB.version, rev, data: DB[k] }); }
        catch (e) { console.warn("db set", k, e && e.code, e && e.message); }
      });
    });
  }

  async function connect() {
    // claude.ai 的运行时可能比页面脚本晚一点才挂上 window.claude：最多等 8 秒
    for (let i = 0; i < 40 && !(window.claude && typeof window.claude.use === "function"); i++) await new Promise((r) => setTimeout(r, 200));
    if (!window.claude || typeof window.claude.use !== "function") { setStatus("local"); return; }
    try { db = await window.claude.use("db"); } catch (e) { db = null; }
    if (!db) { setStatus("local"); return; }
    let first = true;
    db.collection(COLL).onSnapshot((qs) => {
      const incoming = {}, inRevs = {};
      qs.docs.forEach((ds) => { const b = ds.data(); if (!b || b.today !== DB.today || b.version !== DB.version) return; incoming[ds.id] = b.data; inRevs[ds.id] = b.rev || 0; });
      applyIncoming(incoming, inRevs);
      if (first) {
        first = false; ready = true;
        const missing = Object.keys(DB).filter((k) => !LOCAL_KEYS.includes(k) && (!(k in incoming) || (inRevs[k] || 0) < (revs[k] || 0)));
        if (missing.length) push(missing);
        setStatus("cloud");
      }
    }, (err) => { console.warn("db snapshot", err && err.code); setStatus("local"); });
  }
  let status = "init";
  function setStatus(s) { status = s; document.documentElement.setAttribute("data-sync", s); listeners.forEach((fn) => { try { fn({ status: s }); } catch (e) { /* ignore */ } }); }

  window.NBSync = { KEY, load, save, replaceAll, connect, onRemote: (fn) => listeners.push(fn), get db() { return DB; }, get status() { return status; }, get ready() { return ready; }, ns };
})();

/* ============================ 共享设置 · 分端链接 ============================ */
(function () {
  const D = () => window.DB;
  const surface = () => window.NB_SURFACE || (window.APP_ID === "agent" ? "agent" : window.APP_ID === "client" ? "client" : "web");
  // ---- NBSet：DB.settings = { notifyLevels: { 用户: { key: 级别 } }, transparency: { 交易: "tiered" | "full" }, fieldTierDefault: { 用户: 档 }, bigFont: { 用户或联系人: true } }
  //      真实版：每人的设置进 agents.settings（jsonb），每笔交易的透明度是交易上的一列
  const S = () => { const d = D(); d.settings = d.settings || {}; ["notifyLevels", "transparency", "fieldTierDefault", "bigFont"].forEach((k) => { d.settings[k] = d.settings[k] || {}; }); return d.settings; };
  const user = () => ((D().ui || {}).role === "broker" ? "u4" : (D().me || {}).id || "u1");
  const log = (deal, what) => { if (window.audit) window.audit(deal || null, what, "human"); };
  window.NBSet = {
    user,
    notifyLevel: (key) => { const v = (S().notifyLevels[user()] || {})[key]; return v ? Number(v) : null; },
    setNotifyLevel(key, lv) { const m = (S().notifyLevels[user()] = S().notifyLevels[user()] || {}); m[key] = Number(lv); },
    resetNotify() { S().notifyLevels[user()] = {}; },
    // 客户视图透明度（D26）：tiered 分级（默认）· full 完全透明（必须显式选，写审计）
    transparency: (dealId) => S().transparency[dealId] || "tiered",
    setTransparency(dealId, v) { if (!["tiered", "full"].includes(v)) return; S().transparency[dealId] = v; log(dealId, `客户视图透明度 → ${v === "full" ? "完全透明（显式开启）" : "分级（默认）"}`); },
    fieldTierDefault: () => S().fieldTierDefault[user()] || null,
    setFieldTierDefault(tier) { S().fieldTierDefault[user()] = tier || null; },
    // 字段 tab 默认露哪一档：这次手动切的 > 我在设置里定的 > 这笔交易的阶段包 > 极简
    fieldTier(deal) { return (D().ui || {}).fieldTier || this.fieldTierDefault() || (deal && window.NBPack ? window.NBPack.for(deal).tier : null) || "minimal"; },
    // 大字（老花模式）：按人存；who 缺省 = 当前用户（客户 App 传联系人 id）。界面：<html class="bigfont"> 时把基础字号从 15 提到 18（样式在各端自己的 css 里）
    bigFont: (who) => !!S().bigFont[who || user()],
    setBigFont(on, who) { if (on) S().bigFont[who || user()] = true; else delete S().bigFont[who || user()]; this.applyBigFont(who); },
    applyBigFont(who) { if (typeof document !== "undefined" && document.documentElement && document.documentElement.classList) document.documentElement.classList.toggle("bigfont", this.bigFont(who)); },
  };

  // ---- NBLink：to(kind, id, sub) → 当前这一端的 #/ 路由；这一端没有这页 → null。per(kind, id, sub) → { web, agent, client }
  const dealSub = (id, sub) => `#/deals/${id}${sub ? "/" + sub : ""}`;
  const woDeal = (id) => (((D().rentals || {}).orders || []).find((x) => x.id === id) || {}).deal;
  const ROUTES = {
    today: { web: () => "#/today", agent: () => "#/today", client: () => "#/home" },
    deal: { web: dealSub, agent: dealSub, client: () => "#/deal" },
    contact: { web: (id) => `#/contacts/${id}`, agent: (id) => `#/clients/${id}` },
    property: { web: (id) => `#/properties/${id}`, agent: (id) => `#/properties/${id}`, client: () => "#/homes" }, // v1.6：经纪人 App 有房源页了
    showings: { web: () => "#/showings", agent: () => "#/showings", client: () => "#/tour" },
    lshow: { web: () => "#/showings/listings", agent: () => "#/showings/listings" }, // v1.7：看房 → 别人看我的挂牌（卖家 / 房东那边看客户 App 首页的看房反馈卡，不单独给链接）
    tour: { web: (id) => `#/showings/${id}`, agent: (id) => `#/showings/${id}`, client: (id) => `#/tour/${id}` },
    showing: { web: (id) => `#/showing/${id}`, agent: (id) => `#/showings/${id}`, client: (id) => `#/tour/${id}` }, // 看房模式（现场）
    thread: { web: (id) => `#/messages/${id}`, agent: (id) => `#/messages/${id}`, client: (id) => `#/messages/${id}` },
    messages: { web: () => "#/messages", agent: () => "#/messages", client: () => "#/messages" },
    inbox: { web: () => "#/inbox", agent: (id) => (id ? dealSub(id, "comms") : null) },                 // 邮件侦测只有网站有；App 上退到那笔交易的沟通 tab
    automation: { web: () => "#/automation" },
    ai: { web: () => "#/broker/ai" },
    review: { web: () => "#/broker/review" },
    rentals: { web: () => "#/rentals", agent: (id) => (id ? dealSub(id) : null), client: () => "#/deal" },
    workorder: { web: () => "#/rentals", agent: (id) => (woDeal(id) ? dealSub(woDeal(id)) : null), client: () => "#/deal" },
    lease: { web: (id) => `#/lease/apply/${id}`, agent: (id) => dealSub(id) },
    intake: { web: () => "#/intake", agent: () => "#/deals/new" },
    notify: { web: () => "#/settings/notify", agent: () => "#/notify" },
    phrases: { web: () => "#/settings/phrases" },
    portal: { web: (id) => `#/portal/${id}`, agent: (id) => dealSub(id, "client"), client: () => "#/deal" },
  };
  const on = (surf, kind, id, sub) => { const f = (ROUTES[kind] || {})[surf]; return f ? f(id, sub) : null; };
  window.NBLink = { surface, ROUTES, to: (kind, id, sub) => on(surface(), kind, id, sub), per: (kind, id, sub) => ({ web: on("web", kind, id, sub), agent: on("agent", kind, id, sub), client: on("client", kind, id, sub) }) };
})();

/* ============================ 消息 ============================ */
(function () {
  const DBX = () => window.DB;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => { const x = new Date(); return `${DBX().today} ${pad(x.getHours())}:${pad(x.getMinutes())}`; };
  const stamp = () => { const x = new Date(); return `${DBX().today} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}.${String(x.getMilliseconds()).padStart(3, "0")}`; };
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const KIND_LABEL = { text: "留言", request: "请求", nudge: "催一下", feedback: "看房反馈", system: "系统", note: "内部备注" };
  const REQ_LABEL = { confirm: "请确认", upload: "请上传", pick_time: "选时间", answer: "请回答", approve: "请审批", sign: "请签字", decide: "请决定" };
  const ROLE_LABEL = { agent: "经纪人", client: "客户", family: "家人", broker: "Broker", tc: "TC", ai: "AI", system: "系统" };
  const STATUS_LABEL = { open: "进行中", waiting_client: "等客户", waiting_agent: "等经纪人", waiting_broker: "等 Broker", closed: "已结束" };
  const STATUS_CLIENT = { open: "进行中", waiting_client: "等你", waiting_agent: "等经纪人", waiting_broker: "经纪人在处理", closed: "已结束" }; // 客户端看到的说法（从客户这边说）
  const statusLabel = (st, viewer) => (viewer === "client" ? STATUS_CLIENT : STATUS_LABEL)[st] || st || "";
  // 请求卡选项（D28）：每个选项自己带结果 { label, outcome: done 同意 / 办了 · declined 不同意 · discuss 想先商量 }；纯文字选项（选时间）一律算 done。不靠文字里有没有「拒」「不」来猜
  const optLabel = (o) => (o && typeof o === "object" ? o.label : String(o));
  const optOutcome = (r, label) => { const o = ((r && r.options) || []).find((x) => optLabel(x) === label); return o && typeof o === "object" && o.outcome ? o.outcome : "done"; };
  const threads = () => DBX().threads || (DBX().threads = []);
  const messages = () => DBX().messages || (DBX().messages = []);
  const thread = (id) => threads().find((t) => t.id === id);
  const msgsOf = (tid) => messages().filter((m) => m.thread === tid).sort((a, b) => (a.at || "").localeCompare(b.at || "") || (a.seq || 0) - (b.seq || 0));
  const isDraft = (m) => !!(m.ai && m.ai.draft);
  const counterpart = (role) => (role === "client" || role === "family") ? "client" : role;
  // 客户看不到：内部备注、未放行的 AI 草稿、经纪人 ↔ Broker 的线程；m.only = 只给哪一边看的系统行（例如没到期的「催一下」只回给客户，不打扰经纪人）
  const visibleTo = (m, role) => { if (m.only && m.only !== counterpart(role)) return false; return (role === "client" || role === "family") ? !(m.internal || isDraft(m)) : true; };
  // 一条对话只有它的参与人能打开：客户 = 这条对话的联系人或成员；Broker = 经纪人 ↔ Broker 的对话；经纪人 = 都能（who = 客户端当前身份的联系人 id）
  const canOpen = (t, viewer, who) => { if (!t) return false; const v = counterpart(viewer); if (v === "client") return t.kind === "client" && !!who && (t.contact === who || (t.members || []).includes(who)); if (v === "broker") return t.kind === "broker"; return true; };
  function unread(tid, role) { const r = counterpart(role); return msgsOf(tid).filter((m) => visibleTo(m, role) && !isDraft(m) && m.from.role !== r && !(m.from.role === "family" && r === "client") && !(m.seen || {})[r]).length; }
  function markRead(tid, role, who) { const r = counterpart(role); let n = 0; msgsOf(tid).forEach((m) => { m.seen = m.seen || {}; if (!m.seen[r] && !isDraft(m)) { m.seen[r] = true; m.upd = stamp(); n++; } if (role === "client" && who && m.kind === "request" && m.request && m.request.action === "decide" && m.request.decision && (m.request.decision.deciders || []).includes(who) && !(m.request.decision.reads || {})[who]) { m.request.decision.reads = m.request.decision.reads || {}; m.request.decision.reads[who] = stamp(); m.upd = stamp(); n++; } }); return n; }
  // 决定卡：每个决策人各自答；都答了且一致 → 完成；不一致，或一致选的是「想先商量」那一项 → 「需要商量」转给经纪人（系统不投票）。只有还在 pending 的卡、只有名单里的决策人能答
  const cname = (id) => ((DBX().contacts || []).find((c) => c.id === id) || {}).name || id;
  function decide(mid, cid, choice, byName) {
    const m = messages().find((x) => x.id === mid); if (!m || !m.request || m.request.action !== "decide") return null;
    const r = m.request; if (r.status !== "pending") return null;
    const dc = r.decision = r.decision || { deciders: [cid], reads: {}, answers: {} }; dc.answers = dc.answers || {}; dc.reads = dc.reads || {};
    if (!(dc.deciders || []).includes(cid)) return { status: "blocked", why: "只有决策人能答这张卡" };
    dc.answers[cid] = choice; dc.reads[cid] = dc.reads[cid] || stamp(); m.upd = stamp();
    const t = thread(m.thread); const name = byName || cname(cid); const ds = dc.deciders || []; const one = ds.length === 1;
    const all = ds.every((x) => dc.answers[x]); const vals = [...new Set(ds.map((x) => dc.answers[x]))];
    if (!all) { system(m.thread, `${name}选了「${choice}」· 等${ds.filter((x) => !dc.answers[x]).map(cname).join("、")}`, null, "client"); return { status: "partial" }; }
    if (vals.length === 1 && optOutcome(r, choice) !== "discuss") {
      r.status = "done"; r.answer = choice; r.outcome = optOutcome(r, choice); r.doneAt = now(); r.by = ds.join("+");
      system(m.thread, `${one ? name : (ds.length === 2 ? "两位" : ds.length + " 位") + "决策人都"}选了「${choice}」· 已记录时间戳（E&O 证据）`, null, "client");
      if (t) t.status = "waiting_agent";
      if (window.audit) window.audit(t ? t.deal : null, `决定卡「${r.title}」：${one ? "决策人" : "决策人一致"} → ${choice}`, "human", "客户");
      return { status: "done", choice };
    }
    r.status = "discuss";
    system(m.thread, `需要商量：${ds.map((x) => cname(x) + "「" + dc.answers[x] + "」").join(" · ")} → 已转给经纪人，不由系统投票`, null, "client");
    if (t) t.status = "waiting_agent";
    if (window.audit) window.audit(t ? t.deal : null, `决定卡「${r.title}」：${vals.length === 1 ? "决策人想先商量" : "决策人意见不一致"} → 需要商量`, "system");
    return { status: "discuss" };
  }
  // 经纪人打完电话：把卡放回 pending 重新请对方点（普通请求卡答了「想先商量」也用这个）
  function decideReset(mid) { const m = messages().find((x) => x.id === mid); if (!m || !m.request) return; const r = m.request; r.status = "pending"; if (r.decision) r.decision.answers = {}; delete r.answer; delete r.outcome; delete r.doneAt; delete r.by; m.upd = stamp(); system(m.thread, r.decision && (r.decision.deciders || []).length > 1 ? `经纪人和二位通了电话，重新请二位各自点一下` : `经纪人和您通了电话，请重新点一下`, null, "agent"); }
  function pending(tid, forRole) { return msgsOf(tid).filter((m) => m.kind === "request" && m.request && m.request.status === "pending" && m.request.to === forRole); }
  function listFor(role, opts = {}) {
    const r = counterpart(role);
    let ts = threads().filter((t) => !t.archived);
    if (r === "client") ts = ts.filter((t) => t.kind === "client" && (!opts.contact || t.contact === opts.contact || (t.members || []).includes(opts.contact)));
    if (r === "broker") ts = ts.filter((t) => t.kind === "broker");
    if (r === "agent") ts = ts.filter((t) => t.kind !== "x");
    if (opts.deal) ts = ts.filter((t) => t.deal === opts.deal);
    if (opts.kind) ts = ts.filter((t) => t.kind === opts.kind);
    return ts.map((t) => ({ t, unread: unread(t.id, role), pend: pending(t.id, r).length, lastAt: t.lastAt || "" })).sort((a, b) => (b.t.pinned ? 1 : 0) - (a.t.pinned ? 1 : 0) || b.lastAt.localeCompare(a.lastAt));
  }
  const hrefs = (kind, id, sub) => (window.NBLink ? NBLink.per(kind, id, sub) : null);
  function anchorOf(t) {
    const D = DBX(); const a = t.anchor || {};
    if (a.type === "deal" || (!a.type && t.deal)) { const d = D.deals.find((x) => x.id === (a.id || t.deal)); const p = d && D.properties.find((x) => x.id === d.property); return { icon: "▤", label: d ? (p ? p.addr : d.title) : "交易", sub: d && window.NBRoadmap ? NBRoadmap.typeLabel(d) : "", href: d ? hrefs("deal", d.id) : null, deal: d }; }
    if (a.type === "tour") { const tr = (D.tours || []).find((x) => x.id === a.id); return { icon: "⌂", label: tr ? `看房路线 · ${tr.homes.length} 站 · ${tr.date || ""}` : "看房路线", sub: tr ? `${tr.start || ""} 出发` : "", href: tr ? hrefs("tour", tr.id) : hrefs("showings"), tour: tr }; }
    if (a.type === "workorder") { const wo = ((D.rentals || {}).orders || []).find((x) => x.id === a.id); const stg = wo && wo.stages ? wo.stages[wo.stage] : ""; return { icon: "🔧", label: wo ? `${wo.id} · ${wo.what || "维修"}` : "维修工单", sub: wo ? `${stg}${wo.cost ? " · $" + wo.cost : ""}` : "", href: wo ? hrefs("workorder", wo.id) : null, wo, stg }; }
    if (a.type === "org") return { icon: "📣", label: "全公司公告", sub: (D.org || {}).name || "", href: { web: "#/broker/messages", agent: "#/messages", client: null } };
    return { icon: "•", label: t.subject || "", sub: "", href: null };
  }
  // 这条线程对应的「下一步 + 截止」。viewer = "client" 时只拿客户能看的（里程碑、标了客户可见的任务）
  function nextStep(t, viewer) {
    const D = DBX(); const a = anchorOf(t); const cl = counterpart(viewer || "agent") === "client";
    if (a.deal) { const ms = (D.milestones[a.deal.id] || []).filter((m) => m.status === "pending" && m.date).sort((x, y) => x.date.localeCompare(y.date))[0]; if (ms) return { label: ms.label, due: ms.date, overdue: ms.date < D.today }; const tk = (D.tasks[a.deal.id] || []).filter((x) => x.status === "pending" && x.due && (!cl || x.clientVisible)).sort((x, y) => x.due.localeCompare(y.due))[0]; if (tk) return { label: tk.name, due: tk.due, overdue: tk.due < D.today }; }
    if (a.tour) return { label: "带看 " + a.tour.homes.length + " 站", due: a.tour.date, overdue: (a.tour.date || "") < D.today };
    if (a.wo) return { label: "维修：" + (a.stg || "处理中"), due: null, overdue: false };
    return null;
  }
  // 经纪人这边真的逾期的一步（客户自己的待办不算）：逾期最久的任务，没有再看过了期还没完成的里程碑。safe = 这一步的名字能不能给客户看
  function overdueStep(t) {
    const D = DBX(); const a = anchorOf(t); if (!a.deal) return null; const T = D.today;
    const tk = (D.tasks[a.deal.id] || []).filter((x) => x.status === "pending" && x.due && x.due < T && x.assignee !== "客户").sort((x, y) => x.due.localeCompare(y.due))[0];
    if (tk) return { label: tk.name, due: tk.due, overdue: true, safe: !!tk.clientVisible };
    const ms = (D.milestones[a.deal.id] || []).filter((m) => m.status === "pending" && m.date && m.date < T).sort((x, y) => x.date.localeCompare(y.date))[0];
    return ms ? { label: ms.label, due: ms.date, overdue: true, safe: true } : null;
  }
  function contextCard(t, viewer) { // 给三端渲染上下文卡用的数据
    const D = DBX(); const a = anchorOf(t); const lines = []; const cl = counterpart(viewer || "agent") === "client";
    if (a.deal) {
      const d = a.deal; const st = window.NBRoadmap ? NBRoadmap.stageLabel(d.stage) : d.stage;
      lines.push(["阶段", st]);
      const ns = nextStep(t, viewer); if (ns) lines.push(["下一步", `${ns.label}${ns.due ? " · " + ns.due.slice(5) + (ns.overdue ? "（已逾期）" : "") : ""}`]);
      const mo = (D.money[d.id] || []).filter((x) => x.status !== "paid").sort((x, y) => (x.due || "").localeCompare(y.due || ""))[0]; if (mo) lines.push(["钱", `${mo.label || mo.item || ""} · ${mo.amount == null ? "金额待定" : "$" + Number(mo.amount).toLocaleString("en-US")} · ${mo.due ? mo.due.slice(5) : ""}`]);
      const ct = (D.tasks[d.id] || []).filter((x) => x.status === "pending" && x.clientVisible).length; if (ct) lines.push([cl ? "你要做" : "等客户", `${ct} 件`]);
    }
    if (a.tour) { const HS = window.NBTours ? NBTours.HOME_ST : {}; lines.push(["日期", `${a.tour.date || ""} ${a.tour.start || ""}`]); a.tour.homes.forEach((h) => lines.push([h.addr.split(",")[0], (HS[h.status] || [h.status])[0]])); }
    if (a.wo) { const th = window.NBRent ? NBRent.threshold(a.wo) : (a.wo.threshold != null ? a.wo.threshold : (D.rentals || {}).threshold); lines.push(["阶段", a.stg || ""]); lines.push(["报价", a.wo.cost ? "$" + a.wo.cost : "还没有报价"]); if (th != null) lines.push(["门槛", `$${th} 以上先房东批`]); }
    return { icon: a.icon, title: a.label, sub: a.sub, lines, href: a.href };
  }
  function touch(t, m) {
    if (m.internal || m.only) { t.upd = stamp(); return; } // 内部备注 / 只回给一边的系统行：不改列表预览、时间和状态（客户那边看不出来）
    t.lastAt = m.at; t.lastText = m.kind === "request" ? `${REQ_LABEL[m.request.action] || "请求"}：${m.request.title}` : (m.text || KIND_LABEL[m.kind] || "");
    if (!isDraft(m)) {
      if (t.kind === "team") t.status = "open"; // 团队对话只有「进行中」
      else if (m.from.role === "agent") t.status = m.kind === "request" ? (m.request.to === "broker" ? "waiting_broker" : "waiting_client") : (t.kind === "broker" ? "waiting_broker" : "waiting_client");
      else if (m.from.role === "client" || m.from.role === "family") t.status = "waiting_agent";
      else if (m.from.role === "broker") t.status = t.broadcast ? "open" : "waiting_agent";
    }
    t.upd = stamp();
  }
  function send(o) {
    const m = { id: uid("m"), thread: o.thread, at: o.at || now(), seq: Date.now(), upd: stamp(), from: o.from, kind: o.kind || "text", text: o.text || "", seen: {} };
    if (o.request) m.request = Object.assign({ status: "pending", to: "client" }, o.request);
    if (o.attach) m.attach = o.attach;
    if (o.internal) m.internal = true;
    if (o.only) m.only = o.only;
    if (o.ai) m.ai = o.ai;
    m.seen[m.from.role === "family" ? "client" : m.from.role] = true;
    messages().push(m);
    const t = thread(o.thread); if (t && !isDraft(m)) touch(t, m);
    return m;
  }
  // 系统行。by = 做这个动作的那一边（client / agent / broker）：自己动作的回执对自己不算未读；only = 只给这一边看
  function system(tid, text, attach, by, only) { const m = send({ thread: tid, from: { role: "system", name: "系统" }, kind: "system", text, attach, only }); if (by) m.seen[counterpart(by)] = true; return m; }
  function ensureThread(o) {
    let t = threads().find((x) => x.kind === o.kind && (o.deal ? x.deal === o.deal : true) && (o.contact ? x.contact === o.contact : true) && (!o.anchor || !x.anchor || (x.anchor.type === o.anchor.type && x.anchor.id === o.anchor.id)) && !x.broadcast);
    if (t) return t;
    t = { id: uid("th"), kind: o.kind, deal: o.deal || null, contact: o.contact || null, members: o.members || (o.contact ? [o.contact] : []), anchor: o.anchor || (o.deal ? { type: "deal", id: o.deal } : { type: "none" }), subject: o.subject || "", status: "open", lastAt: now(), lastText: "", created: now() };
    threads().push(t);
    return t;
  }
  // 处理一条请求卡。o = { status: done | declined | discuss, answer, by（联系人 / 用户 id）, byName, role（client / agent / broker，缺省 = 这张卡发给谁）}
  // 规矩：只处理还在 pending 的（同一张卡不会生效两次）；副作用只在 done 时发生（退回 / 拒绝各有自己的一条）；返回消息，被挡住时返回 { blocked, why }
  function answer(mid, o) {
    const m = messages().find((x) => x.id === mid); if (!m || !m.request || m.request.status !== "pending") return null;
    const D = DBX(); const t = thread(m.thread); const r = m.request; const st = o.status || "done"; const eff = r.effect || {}; const role = o.role || r.to; let note = "";
    // 同意 Offer / counter：只有决策人能点（D9）
    if (eff.type === "offer" && st === "done" && window.NBOffers && !NBOffers.isDecider(eff.deal, o.by)) return { blocked: true, why: "只有决策人（签约人，含配偶）能点「同意」；家人 / 参谋只能看" };
    r.status = st; r.answer = o.answer || ""; r.doneAt = now(); r.by = o.by || ""; m.upd = stamp();
    if (eff.type === "tour-start" && st === "done" && o.answer && window.NBTours) { const tid = eff.tour || (t && t.anchor && t.anchor.type === "tour" ? t.anchor.id : null); if (tid && NBTours.setStart(tid, o.answer, o.byName)) note = `路线出发时间改为 ${o.answer}（同步状态回到「待预览」）`; }
    if (eff.type === "offer" && window.NBOffers) { if (st === "done") { const c = NBOffers.clientAgree(eff.deal, eff.offer, o.by); note = c.ok ? `Offer ${eff.offer} v${c.consent.v} 已记录「同意」时间 ${c.consent.at}（只记同意；对方签字后才变合同）` : c.why; } else note = `Offer 答复：${o.answer}`; }
    if (eff.type === "wo-approve" && window.NBRent) { const x = st === "done" ? NBRent.approve(eff.wo, o.byName) : st === "declined" ? NBRent.decline(eff.wo, o.answer, o.byName) : null; if (x) note = x.note; }
    if (eff.type === "upload" && st === "done") {
      const income = eff.docType === "income_docs"; const keep = window.NBRent ? NBRent.RETENTION : { application: 60, income: 30 };
      const doc = { id: uid("doc"), deal: eff.deal || (t && t.deal) || null, name: eff.name || r.title, pages: 1, type: eff.docType || "client_upload", uploaded: D.today, sha: "up" + Date.now().toString(36).slice(-4) + "…", locked: false, sourceKind: "photo", prep: ["转正", "纠斜", "提对比度", "≥ 200 DPI"], source: `客户上传（消息 · ${o.byName || "客户"}）` };
      if (income) doc.retention = window.__d(keep.income) + `（收入材料 ${keep.income} 天后自动删）`;
      D.documents.unshift(doc); note = `已收到文件「${doc.name}」，进入文件 tab${income ? " · " + keep.income + " 天后自动删，只留核实后的数字" : ""}`;
    }
    if (eff.type === "task" && D.tasks[eff.deal]) { const tk = D.tasks[eff.deal].find((x) => x.id === eff.task); if (tk) { tk.answer = o.answer || ""; if (st === "done") { tk.status = "done"; tk.doneAt = D.today; tk.doneBy = o.byName || "客户"; note = `任务「${tk.name}」已完成${o.answer ? "（" + o.answer + "）" : ""}`; } else note = `任务「${tk.name}」还开着 · 客户答：${o.answer || ""}`; } }
    if (eff.type === "proposal" && window.NBProp) { const who = { role: role === "broker" ? "broker" : "agent", name: o.byName || "Broker" }; const x = st === "done" ? NBProp.approve(eff.proposal, who) : st === "declined" ? NBProp.reject(eff.proposal, o.answer || "Broker 退回", who) : null; if (x) note = x.ok === false ? x.why : `提议 ${eff.proposal} ${st === "done" ? "已批准" : "已退回"}${o.answer ? "：" + o.answer : ""}`; }
    const who = o.byName || (o.by || ""); const verb = { confirm: "确认", upload: "上传", pick_time: "选时间", answer: "回答", approve: "批准", sign: "签字" }[r.action] || "处理";
    system(m.thread, `${who}${st === "done" ? "已" + verb : st === "discuss" ? "想先商量" : "未" + verb}「${r.title}」${o.answer ? "：" + o.answer : ""}${note ? " · " + note : ""}`, null, role);
    if (t) { t.status = r.to === "client" || r.to === "broker" ? "waiting_agent" : "open"; t.upd = stamp(); }
    if (window.audit && (t && t.deal)) { try { window.audit(t.deal, `消息请求「${r.title}」→ ${st}${o.answer ? "：" + o.answer : ""}`, "human", who || (role === "client" ? "客户" : undefined)); } catch (e) { /* ignore */ } }
    return m;
  }
  // 客户「催一下」（D27）：每人每笔交易每天一次。系统先核实经纪人这边是不是真有一步逾期了——
  // 真逾期：转给经纪人（一张「请回答」卡，进今天页「需要你」）；没逾期：只记一笔、只回给客户一句，经纪人这边不亮红点、对话状态不变
  function nudge(tid, from) {
    const D = DBX(); const t = thread(tid); if (!t) return { ok: false, text: "没有这条对话" };
    const member = (from && from.id) || t.contact || "client"; const key = t.deal || "thread:" + t.id; D.nudgeLog = D.nudgeLog || [];
    if (D.nudgeLog.some((x) => x.member === member && x.deal === key && x.day === D.today)) return { ok: false, text: "今天已经催过一次了；经纪人会在截止前更新。" };
    const od = overdueStep(t); const ns = od || nextStep(t, "client");
    D.nudgeLog.push({ member, deal: key, day: D.today, at: now(), thread: tid, overdue: !!od });
    if (od) {
      const label = od.safe ? `「${od.label}」` : "经纪人这边的一步";
      send({ thread: tid, from, kind: "nudge", text: "催一下：进展怎么样了？" });
      system(tid, `系统核实：${label}截止 ${od.due.slice(5)}，已逾期 → 已转给经纪人（每人每笔交易每天最多 1 次）。`, null, "client");
      if (!od.safe) send({ thread: tid, from: { role: "system", name: "系统" }, kind: "note", internal: true, text: `内部：客户催的是「${od.label}」（截止 ${od.due.slice(5)}）` });
      send({ thread: tid, from: { role: "ai", name: "AI 中转" }, kind: "request", text: "", request: { action: "answer", to: "agent", title: `客户催办：${label}已逾期，请回复进展`, due: D.today } });
      t.status = "waiting_agent";
      return { ok: true, forwarded: true, text: "系统核实确实逾期，已转给经纪人。" };
    }
    system(tid, `系统核实：经纪人下一步「${ns ? ns.label : "更新进度"}」${ns && ns.due ? "截止 " + ns.due.slice(5) : ""}，还没到期 —— 已记下你的关注，经纪人会在截止前更新。每人每笔交易每天最多催 1 次。`, null, "client", "client");
    return { ok: true, forwarded: false, text: "系统核实：还没到期，已记下你的关注。" };
  }
  // AI 帮我写（影子里用模板模拟；真实版走服务端 AI，客户可见文字 T2 先放行）
  function aiDraft(kind, t) {
    const D = DBX(); const a = anchorOf(t); const c = t.contact && D.contacts.find((x) => x.id === t.contact); const name = c ? c.name : "您";
    const ns = nextStep(t); const d = a.deal; const buyer = !!d && !!window.NBRoadmap && NBRoadmap.typeOf(d) === "buyer";
    const lastClient = msgsOf(t.id).filter((m) => m.from.role === "client" || m.from.role === "family").slice(-1)[0];
    const bag = {
      update: `${name}好，${a.label} 这边的进展：${d ? `目前在「${window.NBRoadmap ? NBRoadmap.stageLabel(d.stage) : d.stage}」阶段，` : ""}${ns ? `下一步是「${ns.label}」，${ns.due ? "截止 " + ns.due.slice(5) + "，" : ""}` : ""}我这边盯着，有变化第一时间告诉您。有问题随时在这里留言。`,
      reminder: `${name}好，提醒一下：${ns ? `「${ns.label}」${ns.due ? "截止 " + ns.due.slice(5) : ""}` : "这两天有一个截止"}。需要您这边${buyer ? "确认一下时间安排" : "看一眼并回复"}，我把要点整理在上面的请求卡里，点一下就行。`,
      reply: lastClient ? `${name}好，您问的「${lastClient.text.slice(0, 40)}${lastClient.text.length > 40 ? "…" : ""}」——我的理解是这样：${buyer ? "按合同条款，Option 期内取消定金可退（选择费不退）；" : "按目前的安排，"}具体数字以合同为准，我把对应页码贴在文件里，您可以对照看。` : `${name}好，收到，我整理一下今天就回您。`,
      feedback: `${name}好，今天的看房反馈汇总：${a.tour ? a.tour.homes.map((h) => h.addr.split(",")[0]).join("、") : "几套房"}——优点和顾虑我按「学区 / 通勤 / 户型 / 价格」列在下面，您和家人对一下，明天我们定短名单。`,
    };
    return bag[kind] || bag.update;
  }
  const QUICK = {
    agent: ["收到，今天回您。", "我这边确认一下再回复，最晚明天中午。", "已安排，时间定了告诉您。"],
    client: ["好的，收到。", "这个我要和家人商量一下。", "能再解释一下这一条吗？"],
    broker: ["已阅，按流程走。", "退回：补齐材料再提交。", "批准。"],
  };
  window.NBMsg = { KIND_LABEL, REQ_LABEL, ROLE_LABEL, STATUS_LABEL, STATUS_CLIENT, statusLabel, optLabel, optOutcome, threads, messages, thread, msgsOf, visibleTo, canOpen, unread, markRead, decide, decideReset, pending, listFor, anchorOf, nextStep, overdueStep, contextCard, send, system, ensureThread, answer, nudge, aiDraft, QUICK, now, stamp, uid, esc,
    totalUnread: (role, opts) => listFor(role, opts).reduce((s, x) => s + x.unread, 0),
    totalPending: (role, opts) => listFor(role, opts).reduce((s, x) => s + x.pend, 0) };
})();

/* 壳里的「切换端」动作（三端都能用 data-action="surface"）；nb-copy：把 data-arg 指的元素（id）里的文字复制到剪贴板 */
document.addEventListener("DOMContentLoaded", () => {
  const A = window.ACTIONS; if (!A) return;
  A["nb-copy"] = (el, id) => { const n = document.getElementById(id); const txt = n ? (n.value != null && n.value !== "" ? n.value : n.innerText || n.textContent || "") : ""; if (!txt) return; const ok = () => window.toast && window.toast("已复制"); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, () => window.toast && window.toast(txt)); else if (window.toast) window.toast(txt); };
  if (window.NBSet) window.NBSet.applyBigFont(window.APP_ID === "client" && window.clientWho ? (window.clientWho() || {}).id : undefined);
  if (!window.NBShell) return;
  // arg = "web" 或 "web|deals/d1"（新标签页直接开到那一端的那一页）
  A.surface = (el, arg) => { const [s, path] = String(arg || "").split("|"); window.NBShell.go(s, false, path || ""); };
  A["surface-new"] = (el, arg) => { const [s, path] = String(arg || "").split("|"); window.NBShell.go(s, true, path || ""); };
});
