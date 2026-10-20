/* NewBee OS · 三端共用：看房 Tour（多客户 · 现场记录 · 看房历史）+ 目标房排队
   数据：DB.tours[]（一个 tour = 一个客户一次出行）· DB.targets[contactId][]（目标房，按 pos 排，可拖动）
        DB.homeFeedback[contactId][propId]（客户自己的收藏 / 打分 / 一句话）· DB.listingShowings[]（别的经纪带客户看我的挂牌）· DB.calendar[]（我的日历）
   状态（三端都用这里的表，不各写一份）：
     tour 五种 TOUR_ST：planning 预约中（请求还没发）· requested 已发起 · confirmed 已确认 · in_progress 进行中 · done 已完成（进看房历史）
     每一站三种 HOME_ST：booking 预约中 · confirmed 已确认 · reschedule 需改期
     目标房七种 TARGET_ST：watching 关注 · offer Offer 中 · negotiating 谈判中 · on_hold 挂起 · passed 放弃 · lost 落选 · won 已签约
   v1.5：
   · 约看房（决定 D19）：系统只把每一套的预约请求备好、打开预约链接，发送由经纪人自己点——不代登录 BrokerBay / ShowingTime，不代发，所以也没有「延迟发送队列」。
   · 预计到达用上约好的时段：已确认的那一站早到就等到约好的开始时间；对不对得上只看这套房允许看的时段（win）。选了替补时段之后会重算。
   · 改出发时间 / 重排 / 改期 / 新确认，都把四个同步标记清回「待预览」；写入之前先出预览（syncPreview）。客户 App 只显示已同步的 tour（forClientApp）。
   · 没有有效的 Buyer / Tenant Rep 协议 → 看房模式不能开始（D29）：repCheck / canStart，网站和经纪人 App 用同一个函数。
   · 客户在客户 App 里的收藏 / 打分 / 看房反馈写进 DB.homeFeedback，经纪人 App 和网站读同一份。
   真实版：showing_tours / showing_bookings 加 visit 字段；新表 target_homes（org_id · contact_id · property_id · kind · status · position · offer_id）。 */
(function () {
  const D = () => window.DB;
  const T = (zh, en) => (D() && D().ui && D().ui.lang === "en" ? en : zh);
  const TOUR_ST = { planning: ["预约中", "warn"], requested: ["已发起", "warn"], confirmed: ["已确认", "ok"], in_progress: ["进行中", "acc"], done: ["已完成", "mute"] };
  const HOME_ST = { confirmed: ["已确认", "ok"], booking: ["预约中", "warn"], reschedule: ["需改期", "bad"] };
  const TARGET_ST = { watching: ["关注", "warn"], offer: ["Offer 中", "acc"], negotiating: ["谈判中", "acc"], on_hold: ["挂起", "mute"], passed: ["放弃", "mute"], lost: ["落选 · 可再激活", "mute"], won: ["已签约", "ok"] };
  const all = () => D().tours || [];
  const byId = (id) => all().find((t) => t.id === id);
  const sortByDate = (arr) => arr.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const upcoming = () => sortByDate(all().filter((t) => t.status !== "done" && t.date >= TODAY()));
  const today = () => sortByDate(all().filter((t) => t.date === TODAY() && t.status !== "done"));
  const forClient = (cid) => sortByDate(all().filter((t) => t.client === cid));
  // 客户 App 只显示：看完的，和已经同步到客户 App 的（还在约的草稿不给客户看）
  const forClientApp = (cid) => forClient(cid).filter((t) => t.status === "done" || !!(t.sync && t.sync.clientApp));
  const history = (cid) => sortByDate(all().filter((t) => t.status === "done" && (!cid || t.client === cid))).reverse();
  const visitsOfProp = (pid) => { const out = []; all().forEach((t) => t.homes.forEach((h) => { if (h.prop === pid) out.push({ tour: t, home: h, client: t.client, date: t.date }); })); return out.sort((a, b) => b.date.localeCompare(a.date)); };
  const visited = (h) => !!(h.visit && h.visit.left);
  const here = (h) => !!(h.visit && h.visit.arrived && !h.visit.left);
  const curIndex = (t) => { const i = t.homes.findIndex((h) => !visited(h)); return i < 0 ? t.homes.length - 1 : i; };
  const dayLabel = (iso) => iso === TODAY() ? T("今天", "Today") : iso === window.__d(1) ? T("明天", "Tomorrow") : iso === window.__d(-1) ? T("昨天", "Yesterday") : (window.fd ? fd(iso) : iso);
  const now = () => new Date().toTimeString().slice(0, 5);
  const nameOf = (cid) => ((D().contacts || []).find((c) => c.id === cid) || {}).name || "";
  const log = (deal, what, actor, who) => { if (window.audit) audit(deal || null, what, actor || "human", who); };
  // 按天分组：[{ date, label, tours: [] }]
  function groupByDay(list) { const m = {}; list.forEach((t) => { (m[t.date] = m[t.date] || []).push(t); }); return Object.keys(m).sort().map((k) => ({ date: k, label: dayLabel(k), tours: sortByDate(m[k]) })); }

  // ---- 代理协议（D29）：没有有效的 Buyer / Tenant Rep → 看房模式不能开始 ----
  const REP = { buyerRep: "Buyer Rep", tenantRep: "Tenant Rep" };
  // 返回 { ok, rep: { type, label, signed, expires, doc } | null, expired, why }
  function repCheck(cid) {
    const c = (D().contacts || []).find((x) => x.id === cid) || {}; const day = TODAY();
    const have = Object.keys(REP).filter((k) => c[k]).map((k) => Object.assign({ type: k, label: REP[k] }, c[k]));
    const valid = have.find((r) => r.expires && r.expires >= day);
    if (valid) return { ok: true, rep: valid, expired: false, why: "" };
    return { ok: false, rep: have[0] || null, expired: !!have[0], why: have[0] ? `${have[0].label} 协议已在 ${have[0].expires} 到期：看房模式不能开始，先续签` : "没有有效的 Buyer / Tenant Rep 协议：看房模式不能开始，先补一份（德州要求看房前有书面协议）" };
  }
  const canStart = (tid) => { const t = byId(tid); return t ? repCheck(t.client) : { ok: false, rep: null, why: "没有这个 tour" }; };
  function repSet(cid, type, v) { const c = (D().contacts || []).find((x) => x.id === cid); if (!c || !REP[type] || !v || !v.signed || !v.expires) return null; c[type] = { signed: v.signed, expires: v.expires, doc: v.doc || REP[type] + " Agreement.pdf" }; log(null, `代理协议：${c.name} · ${REP[type]} · 签署 ${v.signed} · 到期 ${v.expires}`, "human"); return c[type]; }

  // ---- 现场 ----
  function arrive(tid, hid) { const t = byId(tid); const h = t.homes.find((x) => x.id === hid); t.homes.forEach((x) => { if (here(x)) { x.visit.left = now(); } }); h.visit = h.visit || {}; h.visit.arrived = now(); t.status = "in_progress"; return h; }
  // 最后一站走了以后 tour 还是「进行中」，点「完成本次看房」（finish）才进看房历史
  function leave(tid, hid) { const t = byId(tid); const h = t.homes.find((x) => x.id === hid); h.visit = h.visit || {}; h.visit.arrived = h.visit.arrived || now(); h.visit.left = now(); return h; }
  // 这次看房拿到反馈了没有：任一站有星 / 备注 / 说 30 秒整理出来的话，或者客户自己在客户 App 里打了分、写了一句
  const hasFeedback = (t) => !!t && t.homes.some((h) => { const v = h.visit || {}; const c = h.prop ? ((D().homeFeedback || {})[t.client] || {})[h.prop] : null; return !!(v.rating || v.note || v.voice || v.clientText || (c && (c.score || c.text))); });
  // feedbackAt = 真正拿到反馈的那一天。看完了还没有反馈的 tour 没有这个值 → 打分里「有待催的看房反馈」才会亮（score.js）；反馈后来才到（补星 / 补备注 / 客户打分）就在那时补上
  function markFeedback(t) { if (t && t.status === "done" && !t.feedbackAt && hasFeedback(t)) t.feedbackAt = TODAY(); return t; }
  function rate(tid, hid, n) { const t = byId(tid); const h = t.homes.find((x) => x.id === hid); h.visit = h.visit || {}; h.visit.rating = n; markFeedback(t); return h; }
  function note(tid, hid, text, voice) { const t = byId(tid); const h = t.homes.find((x) => x.id === hid); h.visit = h.visit || {}; if (text != null) h.visit.note = text; if (voice != null) h.visit.voice = voice; markFeedback(t); return h; }
  function finish(tid) { const t = byId(tid); t.status = "done"; if (hasFeedback(t)) t.feedbackAt = t.feedbackAt || TODAY(); else delete t.feedbackAt; t.summary = t.homes.length + " 套：" + t.homes.map((h) => h.addr.split(",")[0] + (h.visit && h.visit.rating ? " ★" + h.visit.rating : "")).join(" · "); return t; }

  // ---- 目标房 ----
  const targets = (cid) => ((D().targets = D().targets || {})[cid] = (D().targets || {})[cid] || []).slice().sort((a, b) => a.pos - b.pos);
  function addTarget(cid, pid, kind, extra) { const list = (D().targets[cid] = D().targets[cid] || []); const ex = list.find((x) => x.prop === pid); if (ex) return ex; const minPos = list.length ? Math.min.apply(null, list.map((x) => x.pos)) : 1; const t = Object.assign({ prop: pid, kind: kind || "buy", status: "watching", pos: minPos - 1, at: TODAY() }, extra || {}); list.push(t); return t; }
  function removeTarget(cid, pid) { D().targets[cid] = (D().targets[cid] || []).filter((x) => x.prop !== pid); }
  function reorderTargets(cid, ids) { const list = D().targets[cid] || []; ids.forEach((pid, i) => { const t = list.find((x) => x.prop === pid); if (t) t.pos = i + 1; }); }
  function moveTarget(cid, pid, dir) { const ids = targets(cid).map((x) => x.prop); const i = ids.indexOf(pid); if (i < 0) return; ids.splice(i, 1); const j = dir === "top" ? 0 : dir === "up" ? Math.max(0, i - 1) : Math.min(ids.length, i + 1); ids.splice(j, 0, pid); reorderTargets(cid, ids); }
  function setTargetStatus(cid, pid, st, extra) { const t = (D().targets[cid] || []).find((x) => x.prop === pid); if (t) { t.status = st; Object.assign(t, extra || {}); } return t; }
  const targetOf = (cid, pid) => ((D().targets || {})[cid] || []).find((x) => x.prop === pid);
  const whoTargets = (pid) => Object.entries(D().targets || {}).filter(([cid, arr]) => arr.some((x) => x.prop === pid)).map(([cid]) => cid);

  // ---- 客户自己的收藏 / 打分 / 一句话（客户 App 写，经纪人 App 和网站读）----
  const fbMap = (cid) => { D().homeFeedback = D().homeFeedback || {}; return (D().homeFeedback[cid] = D().homeFeedback[cid] || {}); };
  const clientFb = (cid, pid) => ((D().homeFeedback || {})[cid] || {})[pid] || null;
  // patch = { fav?, score?, text?, tour?, home? }
  function setClientFb(cid, pid, patch) { const m = fbMap(cid); m[pid] = Object.assign({ fav: false, score: 0, text: "" }, m[pid] || {}, patch || {}, { at: TODAY() + " " + now() }); all().forEach((t) => { if (t.client === cid && t.homes.some((h) => h.prop === pid)) markFeedback(t); }); return m[pid]; }
  // 这套房，哪些客户收藏 / 打过分：[{ contact, fav, score, text, at }]
  const clientFbFor = (pid) => Object.entries(D().homeFeedback || {}).filter(([, m]) => m[pid]).map(([cid, m]) => Object.assign({ contact: cid }, m[pid]));
  // 别的经纪带客户看我的挂牌（"The following showing has been confirmed"）：只进这套挂牌的看房反馈列表，不进我的日历。新的在前
  const listingShowings = (dealId) => (D().listingShowings || []).filter((x) => x.deal === dealId).slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  // 卖家看房反馈（R-3 · D14）：看了几场是自动给卖家看的；反馈的文字要经纪人在那一行点「给卖家看」才放行（released）——进 5 分钟延迟队列（队列那一行不带反馈的文字），
  // 之前可撤回（撤回 = 回到没放行，work.js NBAuto.revoke）；发出（NBAuto.deliver）那一刻才 shown，卖方客户视图 / 客户 App 才看得到文字
  function showToSeller(id) {
    const s = (D().listingShowings || []).find((x) => x.id === id); if (!s || !s.feedback) return { ok: false, why: "这一场还没有反馈" }; if (s.shown) return { ok: false, why: "这一条已经给卖家看了" }; if (s.released) return { ok: false, why: "这一条已经放行，在延迟队列里等发出" };
    const d = (D().deals || []).find((x) => x.id === s.deal); const addr = d && d.title ? d.title.split(" · ")[0] : ""; const who = d && d.type === "lessor" ? "房东" : "卖家"; // v1.7：出租挂牌叫「给房东看」
    const q = window.NBAuto ? NBAuto.enqueue({ title: `${who}看房反馈：${s.at} 那一场`, d: `${addr} · 你点了「给${who}看」· 已放行 · 5 分钟后出现在${who === "房东" ? "房东" : "卖方"}客户视图`, deal: s.deal, cat: "seller_feedback", ls: s.id }) : {};
    if (!q) return { ok: false, why: "「卖家反馈同步」开关关着：没有放行" };
    s.released = true; s.releasedAt = TODAY() + " " + now(); log(s.deal, `看房反馈放行给${who}：${s.at} 那一场（你点的放行 · 5 分钟后发出，之前可撤回）`, "human");
    return { ok: true, s, q, who };
  }
  // 卖方客户看得到的：{ total 一共几场, done 看完的, upcoming 约好还没看的（数）, held 有反馈还没放行的, pending 放行了还在队列里等发出的, rows: [{ id, at, text }] 已发出的反馈 }——不带对方经纪的名字
  // v1.7：被拒 / 过期的不算场次；约好的日期时段和「要卖家批」的提示在 lshow.js NBLShow.forSeller（这里的 upcoming 仍是个数，老的调用方不用改）
  function sellerFeedback(dealId) { const ls = listingShowings(dealId); const live = ls.filter((x) => !["declined", "expired"].includes(x.status)); return { total: live.length, done: live.filter((x) => x.status === "done").length, upcoming: live.filter((x) => x.status === "confirmed" || x.status === "requested").length, held: ls.filter((x) => x.feedback && !x.released && !x.shown).length, pending: ls.filter((x) => x.feedback && x.released && !x.shown).length, rows: ls.filter((x) => x.feedback && x.shown).map((x) => ({ id: x.id, at: x.at, text: x.feedback })) }; }

  // ---- 预计到达：按开车时间和停留算，对照每套房的可看时段（win）；对不上的标红；一键按时间窗重排（不自动改约）----
  const toMin = (hhmm) => { const m = /(\d{1,2}):(\d{2})/.exec(hhmm || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const driveMin = (h) => { const m = /(\d+)\s*分钟/.exec(h.drive || ""); return m ? Number(m[1]) : 15; };
  const winOf = (h) => { if (!h.win) return null; const [a, b] = h.win.split(/[–-]/); const s0 = toMin(a), e0 = toMin(b); return s0 != null && e0 != null ? { s: s0, e: e0 } : null; };
  // 约好的时段：这一站已确认、time 是 "HH:MM–HH:MM" 才算
  const slotOf = (h) => { if (h.status !== "confirmed") return null; const m = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.exec(h.time || ""); return m ? { s: toMin(m[1]), e: toMin(m[2]) } : null; };
  // 每一站：{ home, arrive, leave, win, ok, early, late, wait, slotLate }。wait = 早到、等到约好的开始时间的分钟数；slotLate = 比约好的开始时间晚到多少（超过 15 分钟才记，要改约，不算时间窗冲突）
  function eta(t) {
    let cur = toMin(t.start) || 600; const out = [];
    t.homes.forEach((h) => {
      const drive = cur + driveMin(h); const slot = slotOf(h);
      const arrive = slot && drive < slot.s ? slot.s : drive; const leave = arrive + (Number(h.stay) || 30); const w = winOf(h);
      const ok = !w || (arrive >= w.s && leave <= w.e + 15);
      out.push({ home: h, arrive: toHHMM(arrive), leave: toHHMM(leave), win: h.win || null, ok, early: w && arrive < w.s ? w.s - arrive : 0, late: w && leave > w.e + 15 ? leave - w.e : 0, wait: arrive - drive, slotLate: slot && arrive > slot.s + 15 ? arrive - slot.s : 0 });
      cur = leave;
    });
    return out;
  }
  const conflicts = (t) => eta(t).filter((x) => !x.ok);
  const resetSync = (t) => { t.sync = { deal: false, calendar: false, agentApp: false, clientApp: false }; return t; };
  // 重排：没看过的按可看时段的开始时间排（看过的留在前面）；返回新顺序的地址
  function reorderByWindow(t) { const done = t.homes.filter(visited), rest = t.homes.filter((h) => !visited(h)); rest.sort((a, b) => { const wa = winOf(a), wb = winOf(b); return (wa ? wa.s : 9e9) - (wb ? wb.s : 9e9); }); t.homes = done.concat(rest); t.homes.forEach((h, i) => { if (!visited(h)) h.drive = i === 0 ? "从起点 15 分钟" : "两房之间 12 分钟"; }); if (t.sync) resetSync(t); return t.homes.map((h) => h.addr.split(",")[0]); }
  // 改出发时间（经纪人改，或客户在「选时间」卡上选的）：同步标记清回待预览
  function setStart(tid, hhmm, who) { const t = byId(tid); if (!t || !hhmm || t.start === hhmm) return t || null; const old = t.start; t.start = hhmm; resetSync(t); log(t.deal, `看房路线出发时间 ${old} → ${hhmm}（${who || "经纪人"}）· 同步状态回到「待预览」`, "human", who); return t; }

  // ---- 约看房（D19）：备好预约请求 · 你点发送 ----
  const HOW = { ready: "预约请求已备好 · 等你点发送", sent: "预约请求已备好 · 你点了发送（ShowingTime）· 等确认邮件" };
  const reqState = (h) => h.status !== "booking" ? null : (h.req || (/点了发送|已发/.test(h.how || "") ? "sent" : "ready"));
  // 把新地址加成一站并备好请求（不发）。addrs = 地址数组；start = 新的出发时间（可空）。返回 { added, ready }
  function prepareRequests(tid, addrs, start) {
    const t = byId(tid); if (!t) return null; let added = 0;
    if (start && start !== t.start) t.start = start;
    (addrs || []).forEach((x, i) => { const key = x.toLowerCase().split(",")[0]; if (!key || t.homes.some((h) => h.addr.toLowerCase().startsWith(key))) return; const p = (D().properties || []).find((y) => x.toLowerCase().startsWith(y.addr.split(",")[0].toLowerCase())); t.homes.push({ id: t.id + "h" + Date.now().toString(36) + i, addr: p ? p.addr : x, prop: p ? p.id : null, status: "booking", req: "ready", time: "待约", meet: "—", lock: "—", how: HOW.ready, drive: "待排", stay: 45 }); added++; });
    t.homes.forEach((h) => { if (h.status === "booking" && !h.req) { h.req = reqState(h); if (h.req === "ready") h.how = HOW.ready; } });
    resetSync(t);
    const ready = t.homes.filter((h) => reqState(h) === "ready").length;
    log(t.deal, `看房预约：备好 ${ready} 套预约请求，等经纪人逐套点发送 · ${nameOf(t.client)}`, "ai", "预约助手");
    return { added, ready };
  }
  // 起草好的那条请求（给界面显示；发送是经纪人在预约网站上自己点）
  function requestDraft(tid, hid) { const t = byId(tid); const h = t && t.homes.find((x) => x.id === hid); if (!h) return null; const me = (D().me || {}).name || ""; return { via: "ShowingTime / BrokerBay（用你自己的账号，系统不代登录）", text: `Showing request · ${h.addr} · ${t.date}${/^\d/.test(h.time || "") ? " " + String(h.time).replace(/（.*$/, "") : ""} · ${Number(h.stay) || 30} min · Buyer's agent: ${me} · 1 party` }; }
  // 经纪人点了发送：只记一笔（请求状态 sent · tour 变「已发起」），不进任何自动队列
  function sendRequest(tid, hid) { const t = byId(tid); const h = t && t.homes.find((x) => x.id === hid); if (!h || h.status !== "booking") return null; h.req = "sent"; h.reqAt = TODAY() + " " + now(); if (/待约/.test(h.time || "")) h.time = "待回执"; h.how = HOW.sent; if (t.status === "planning") t.status = "requested"; log(t.deal, `看房预约：${h.addr} 的预约请求由经纪人点了发送（系统只备稿并打开预约链接，不代登录、不代发）`, "human"); return h; }
  // 写进我的日历（只有我自己约的看房；同一站只写一条）
  function calendarAdd(t, h, source) { const s = slotOf(h); if (!s) return null; D().calendar = D().calendar || []; let row = D().calendar.find((x) => x.tour === t.id && x.home === h.id); const at = `${t.date} ${toHHMM(s.s)}`; const title = `看房 · ${h.addr.split(",")[0]}（${nameOf(t.client)}）`; if (row) { row.at = at; row.title = title; } else { row = { id: "cal" + Date.now().toString(36) + h.id, deal: t.deal || null, at, title, source: source || "邮件侦测", tour: t.id, home: h.id }; D().calendar.push(row); } h.calendar = true; return row; }
  // 确认邮件到了（"Your showing has been confirmed"）：这一站标「已确认」+ 写入日历（T1 自动 + 通知）。info = { time, meet, lock, source }；没给 time 就用建议时段，再没有就排在上一站后一小时
  function confirmHome(tid, hid, info) {
    const t = byId(tid); const h = t && t.homes.find((x) => x.id === hid); if (!h) return null; info = info || {};
    const i = t.homes.indexOf(h); const prev = t.homes[i - 1]; const sug = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.exec(h.time || "");
    if (info.time) h.time = info.time; else if (sug) h.time = `${sug[1]}–${sug[2]}`; else { const base = (prev && toMin(prev.time) != null ? toMin(prev.time) : toMin(t.start) || 600) + 60; h.time = `${toHHMM(base)}–${toHHMM(base + (Number(h.stay) || 45))}`; }
    h.status = "confirmed"; delete h.req; h.meet = info.meet || "车库侧门"; h.lock = info.lock || "密码盒 · 到场推送"; h.how = "确认邮件已解析 · 已写入日历 · 置信 0.97（Email Intake · 本交易已授权）";
    calendarAdd(t, h, info.source || "邮件侦测");
    if (t.homes.every((x) => x.status === "confirmed") && !["in_progress", "done"].includes(t.status)) t.status = "confirmed"; // 进行中的 tour 不会被改回「已确认」
    resetSync(t); log(t.deal, `看房预约：${h.addr} 确认邮件解析 → 已确认 · 已写入日历`, "ai", "Email Intake");
    return h;
  }
  // 约不上，经纪人选了一个替补时段：只有人点了才改期；预计到达按新时段重算
  function chooseAlt(tid, hid, alt) {
    const t = byId(tid); const h = t && t.homes.find((x) => x.id === hid); if (!h || !alt) return null;
    h.status = "confirmed"; delete h.req; h.time = alt; h.meet = "前门"; h.lock = "Supra（到场推送）"; h.how = "你选了替补时段 · 预计到达已按新时段重算";
    calendarAdd(t, h, "改期（经纪人确认）");
    if (t.homes.every((x) => x.status === "confirmed") && !["in_progress", "done"].includes(t.status)) t.status = "confirmed";
    resetSync(t); log(t.deal, `看房预约：${h.addr} 采用替补 ${alt}（经纪人确认）· 同步状态回到「待预览」`, "human");
    return h;
  }
  // 同步预览：四个去处各会写什么（先看再写）。客户 App 只收顺序 / 时间 / 集合点；开锁方式、谈判备注只进经纪人 App
  function syncPreview(tid) {
    const t = byId(tid); if (!t) return null; const short = (h) => h.addr.split(",")[0]; const ok = t.homes.filter((h) => slotOf(h));
    return {
      deal: t.deal ? [`看房记录：${t.homes.length} 套 · ${t.date} ${t.start} 出发`, `参与人：${nameOf(t.client)}`] : [`${nameOf(t.client)} 还没有交易：只记在联系人的看房历史里`],
      calendar: ok.map((h) => `${t.date} ${String(h.time).slice(0, 11)} · ${short(h)}`).concat(t.homes.length > ok.length ? [`${t.homes.length - ok.length} 套还没确认：确认后再写`] : []),
      agentApp: t.homes.map((h) => `${short(h)} · ${h.time} · 集合 ${h.meet} · 开锁 ${h.lock}`),
      clientApp: t.homes.map((h) => `${short(h)} · ${slotOf(h) ? h.time : "时间待定"} · 集合 ${h.meet}`),
    };
  }
  // 写入：四个标记置已同步；已确认的站写进日历；全部确认了的「已发起」变「已确认」
  function sync(tid) {
    const t = byId(tid); if (!t) return null;
    t.sync = { deal: true, calendar: true, agentApp: true, clientApp: true };
    t.homes.forEach((h) => { if (h.status === "confirmed") calendarAdd(t, h, "同步"); });
    if (t.status === "requested" && t.homes.every((x) => x.status === "confirmed")) t.status = "confirmed";
    log(t.deal, `看房路线写入交易 + 日历，同步到经纪人 App 和客户 App（客户版只含路线 / 初步信息）· ${nameOf(t.client)}`, "system", "预约助手");
    return t;
  }
  window.NBTours = { TOUR_ST, HOME_ST, TARGET_ST, REP, all, byId, upcoming, today, forClient, forClientApp, history, visitsOfProp, visited, here, curIndex, dayLabel, groupByDay, repCheck, canStart, repSet, arrive, leave, rate, note, finish, targets, addTarget, removeTarget, reorderTargets, moveTarget, setTargetStatus, targetOf, whoTargets, clientFb, setClientFb, clientFbFor, listingShowings, showToSeller, sellerFeedback, hasFeedback, markFeedback, eta, conflicts, slotOf, resetSync, reorderByWindow, setStart, reqState, prepareRequests, requestDraft, sendRequest, confirmHome, chooseAlt, syncPreview, sync, toMin, toHHMM };
})();

/* ---- 三端通用动作：目标房排队（… 菜单 / 拖动）· 看房现场 · 代理协议 ---- */
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 链接只发当前这一端有的路由（shared.js NBLink）；它没加载时（单测）退回网站路由
  const link = (kind, id) => window.NBLink ? NBLink.to(kind, id) : (kind === "property" ? "#/properties/" + id : kind === "deal" ? "#/deals/" + id : null);
  const A = {}; // 这个文件管的动作名；reg() 把它们挂到 window.ACTIONS 上
  const after = (msg) => { if (window.DBsave) DBsave(); if (window.render) render(); if (msg && window.toast) toast(msg); };
  const stop = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } };
  const open = (html) => (window.openModal || window.openSheet)(html);
  const homeOf = (tid, hid) => { const t = NBTours.byId(tid); return t ? t.homes.find((x) => x.id === hid) || null : null; }; // 按钮过期了（tour / 这一站已经不在）→ 动作什么也不做
  const close = () => { if (window.closeModal) closeModal(); else if (window.closeSheet) closeSheet(); };
  const closeBtn = () => (window.openModal ? "modal-close" : "sheet-close");
  A["tgt-move"] = (el, arg, e) => { stop(e); const [cid, pid, dir] = arg.split("|"); NBTours.moveTarget(cid, pid, dir); close(); after("目标房顺序已保存"); };
  A["tgt-menu"] = (el, arg, e) => { stop(e); const [cid, pid] = arg.split("|"); const p = window.prop(pid); if (!p) return; open(`<h2>${esc((p || {}).addr || "")}</h2><p class="small muted">目标房排队：想买 / 想租的优先顺序，每个客户自己的。</p><div class="list">${[["top", "移到最前"], ["up", "上移"], ["down", "下移"]].map(([d, l]) => `<button class="btn wide" style="margin-top:6px" data-action="tgt-move" data-arg="${cid}|${pid}|${d}">${l}</button>`).join("")}<button class="btn wide ghost" style="margin-top:10px" data-action="tgt-status" data-arg="${cid}|${pid}|passed">放弃这套</button><button class="btn wide ghost" style="margin-top:6px" data-action="tgt-remove" data-arg="${cid}|${pid}">从排队里移除</button></div>${window.openModal ? `<div class="acts"><button class="btn" data-action="modal-close">关闭</button></div>` : ""}`); };
  A["tgt-status"] = (el, arg, e) => { stop(e); const [cid, pid, st] = arg.split("|"); NBTours.setTargetStatus(cid, pid, st); close(); after("已更新"); };
  A["tgt-remove"] = (el, arg, e) => { stop(e); const [cid, pid] = arg.split("|"); NBTours.removeTarget(cid, pid); close(); after("已移出目标房"); };
  A["tgt-add"] = (el, arg, e) => { stop(e); const [cid, pid, kind] = arg.split("|"); const t = NBTours.addTarget(cid, pid, kind || "buy"); const p = window.prop(pid); if (window.audit) audit(null, `目标房：${(window.contact(cid) || {}).name} + ${(p || {}).addr}（${kind === "rent" ? "想租" : "想买"}）`, "human"); after(`已标为目标房（排第 ${NBTours.targets(cid).findIndex((x) => x.prop === pid) + 1}）`); return t; };
  // 看房现场（网站看房模式 + 经纪人 App 共用）。没有有效的代理协议 → 不让签到（D29）
  A["show-arrive"] = (el, arg, e) => { stop(e); const [tid, hid] = arg.split("|"); if (!homeOf(tid, hid)) return; const chk = NBTours.canStart(tid); if (!chk.ok) { if (window.toast) toast(chk.why); return; } const h = NBTours.arrive(tid, hid); if (window.audit) audit(NBTours.byId(tid).deal, `看房：到场 ${h.addr.split(",")[0]} · 开锁信息已推送（短时展示）`, "system", "看房模式"); after("已签到 · 开锁信息只显示 20 秒"); };
  A["show-leave"] = (el, arg, e) => { stop(e); const [tid, hid] = arg.split("|"); if (!homeOf(tid, hid)) return; NBTours.leave(tid, hid); after("已记录离开；说 30 秒会自动写成反应 / 评分 / 跟进"); };
  A["show-rate"] = (el, arg, e) => { stop(e); const [tid, hid, n] = arg.split("|"); if (!homeOf(tid, hid)) return; NBTours.rate(tid, hid, Number(n)); after(); };
  A["show-voice"] = (el, arg, e) => { stop(e); open(`<h2>说 30 秒</h2><div class="listening"><i></i> 正在听…（影子：模拟转写）</div><p class="small muted">MediaRecorder 录音 → 服务端 ASR（中英混说）→ 助手写成反应 / 评分 / 未答问题 / 跟进任务。</p><div class="acts"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn ai" data-action="show-voice-ok" data-arg="${arg}">停止并生成</button></div>`); };
  A["show-voice-ok"] = (el, arg, e) => { stop(e); const [tid, hid] = arg.split("|"); if (!homeOf(tid, hid)) return; const t = NBTours.byId(tid); const h = NBTours.note(tid, hid, "采光好 · 后院大 · 主卧小 · 问屋顶 · 查 HOA RV", "客户喜欢这套的采光和后院，主卧太小；先生问屋顶是不是原装；要查 HOA 能不能停 RV。"); if (!h.visit.rating) h.visit.rating = 3; const did = t.deal || (DB.deals.find((d) => d.primary === t.client) || {}).id; if (did) { DB.tasks[did] = DB.tasks[did] || []; DB.tasks[did].push({ id: "t" + Date.now(), name: "查 " + h.addr.split(",")[0] + " 的 HOA 能否停 RV（" + (window.contact(t.client) || {}).name + "）", rule: "看房跟进", due: window.__d(1), assignee: "Jason", status: "pending", clientVisible: false, note: "来自看房语音" }); } DB.aiCalls.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), kind: "看房语音 → 反应 / 跟进", model: "haiku + ASR", cost: 0.01, deal: did || "—", reviewer: "—", flag: false }); close(); after("已写成反应 / 评分 / 跟进任务（进 Today）"); };
  A["tour-reorder"] = (el, tid, e) => { stop(e); const t = NBTours.byId(tid); if (!t) return; const order = NBTours.reorderByWindow(t); if (window.audit) audit(t.deal, `看房路线按可看时段重排：${order.join(" → ")}（经纪人点的，不自动改约）`, "human"); after("已按时间窗重排：" + order.join(" → ") + "；同步状态回到「待预览」"); };
  A["show-finish"] = (el, tid, e) => { stop(e); if (!NBTours.byId(tid)) return; const t = NBTours.finish(tid); const c = window.contact(t.client); if (window.audit) audit(t.deal, `看房完成：${c ? c.name : ""} · ${t.homes.length} 套 → 进看房历史`, "human"); if (window.NBMsg) { const th = NBMsg.ensureThread({ kind: "client", deal: t.deal, contact: t.client, members: [t.client], anchor: { type: "tour", id: t.id }, subject: "看房路线 · " + t.homes.length + " 站" }); NBMsg.send({ thread: th.id, from: { role: "agent", id: DB.me.id, name: DB.me.name }, kind: "text", text: "今天看房的要点：" + t.homes.map((h) => h.addr.split(",")[0] + (h.visit && h.visit.note ? "——" + h.visit.note : "")).join("；") + "\n想进一步谈的房子我已经放进目标房排队，您在 App 里也能看到顺序。", attach: t.homes.map((h) => ({ type: "property", id: h.id, label: h.addr.split(",")[0] })) }); } after("看房已完成：进了看房历史，汇总已发到客户对话"); };
  // 卖家看房反馈那一行的「给卖家看」（arg = listingShowings 那一行的 id）
  A["ls-show"] = (el, id, e) => { stop(e); const r = NBTours.showToSeller(id); after(r.ok ? `已放行：5 分钟后出现在${r.who === "房东" ? "房东" : "卖方"}客户视图（之前可以在 AI 自动化里撤回）` : r.why); };
  // 代理协议（联系人页那一行「编辑」；看房模式被挡住时的「补协议」）：arg = 联系人 id 或 联系人 id|buyerRep / tenantRep
  A["rep-edit"] = (el, arg, e) => {
    stop(e); const [cid, type0] = String(arg).split("|"); const c = window.contact(cid); if (!c) return;
    const type = NBTours.REP[type0] ? type0 : (c.tenantRep && !c.buyerRep ? "tenantRep" : "buyerRep"); const cur = c[type] || {};
    open(`<h2>代理协议 · ${esc(c.name)}</h2><p class="small muted">Buyer / Tenant Rep：签署日 · 到期日 · 文件。没有有效的协议，看房模式不能开始（德州要求看房前有书面协议）。</p><div class="row"><label class="small muted">类型</label><select id="rep-type">${Object.entries(NBTours.REP).map(([k, l]) => `<option value="${k}" ${k === type ? "selected" : ""}>${l}</option>`).join("")}</select></div><div class="row" style="margin-top:8px"><label class="small muted">签署日</label><input id="rep-signed" type="date" value="${esc(cur.signed || TODAY())}"><label class="small muted">到期日</label><input id="rep-expires" type="date" value="${esc(cur.expires || window.__d(180))}"></div><label class="small muted" style="display:block;margin-top:8px">文件</label><input id="rep-doc" style="width:100%" value="${esc(cur.doc || "")}" placeholder="${NBTours.REP[type]} Agreement.pdf"><div class="acts"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn pri" data-action="rep-save" data-arg="${cid}">保存</button></div>`);
  };
  A["rep-save"] = (el, cid, e) => { stop(e); const g = (id) => (document.getElementById(id) || {}).value || ""; const signed = g("rep-signed"), expires = g("rep-expires"); if (!signed || !expires || expires < signed) { if (window.toast) toast("签署日和到期日都要填，到期日不能早于签署日"); return; } NBTours.repSet(cid, g("rep-type"), { signed, expires, doc: g("rep-doc") }); close(); after(expires >= TODAY() ? "代理协议已保存 · 看房模式可以开始" : "代理协议已保存（已过期：看房模式仍然不能开始）"); };

  // 拖动目标房（电脑）：行上 data-tgt="cid|pid" draggable
  let drag = null, wired = false;
  function cleanup() { drag = null; document.querySelectorAll("[data-tgt].dragging,[data-tgt].over-top,[data-tgt].over-bot").forEach((n) => n.classList.remove("dragging", "over-top", "over-bot")); }
  function wire() {
    if (wired || !document.querySelectorAll) return; wired = true;
    document.addEventListener("dragstart", (e) => { const row = e.target.closest && e.target.closest("[data-tgt][draggable=true]"); if (!row) return; drag = row.getAttribute("data-tgt"); row.classList.add("dragging"); try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", drag); } catch (x) { /* ignore */ } });
    document.addEventListener("dragover", (e) => { const row = e.target.closest && e.target.closest("[data-tgt][draggable=true]"); if (!row || !drag) return; if (row.getAttribute("data-tgt").split("|")[0] !== drag.split("|")[0]) return; e.preventDefault(); const r = row.getBoundingClientRect(); row.classList.toggle("over-top", e.clientY < r.top + r.height / 2); row.classList.toggle("over-bot", e.clientY >= r.top + r.height / 2); });
    document.addEventListener("drop", (e) => { const row = e.target.closest && e.target.closest("[data-tgt][draggable=true]"); if (!row || !drag) return; e.preventDefault(); const [cid, target] = row.getAttribute("data-tgt").split("|"); const pid = drag.split("|")[1]; if (target === pid) { cleanup(); return; } let ids = [...document.querySelectorAll(`[data-tgt^="${cid}|"][draggable=true]`)].map((n) => n.getAttribute("data-tgt").split("|")[1]); const before = row.classList.contains("over-top"); ids = ids.filter((x) => x !== pid); ids.splice(ids.indexOf(target) + (before ? 0 : 1), 0, pid); NBTours.reorderTargets(cid, ids); cleanup(); after("目标房顺序已保存"); });
    document.addEventListener("dragend", cleanup);
  }
  function reg() { const X = window.ACTIONS; if (!X) return; Object.assign(X, A); wire(); } // 每次都挂（不是「有了就跳过」）：DOMContentLoaded 时各端自己的文件都加载完了，这里的实现最后落定，同名的旧实现不会因为加载先后盖回来
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  setTimeout(reg, 0);

  // 路线表（三端共用）：预计到达 · 可看时段 · 对不上的标红
  window.NBTours.etaList = function (t, opts) {
    opts = opts || {}; const rows = NBTours.eta(t); const bad = rows.filter((x) => !x.ok).length;
    return `<div class="etalist">${rows.map((x, i) => `<div class="stop ${NBTours.visited(x.home) ? "done" : ""} ${x.ok ? "" : "clash"}"><span class="no">${i + 1}</span><div><b>${esc(x.home.addr.split(",")[0])}</b>${x.home.status === "reschedule" ? ` <span class="badge bad">需改期</span>` : ""}<div class="small muted">预计 ${x.arrive}–${x.leave}${x.win ? ` · 可看 ${esc(x.win)}` : " · 没有可看时段"}${x.wait ? ` · 早到 ${x.wait} 分钟，等到约好的 ${x.arrive}` : ""}${x.slotLate ? ` · 比约好的时段晚 ${x.slotLate} 分钟，要改约` : ""}${x.ok ? "" : ` · <b class="bad">对不上${x.early ? "（早到 " + x.early + " 分钟）" : x.late ? "（晚了 " + x.late + " 分钟）" : ""}</b>`}</div></div><span class="num small">${esc(x.home.drive || "")}</span></div>`).join("")}</div>` + (bad && !opts.noBtn ? `<div class="row" style="margin-top:8px"><span class="badge bad">${bad} 套对不上</span><button class="btn sm" data-action="tour-reorder" data-arg="${t.id}">按时间窗重排顺序</button><span class="tiny muted">只改顺序和预计到达，不自动改约</span></div>` : bad ? "" : `<div class="row" style="margin-top:8px"><span class="badge ok">顺序和时间窗都对得上</span></div>`);
  };
  // 目标房列表（三端共用的 HTML）：opts.drag 电脑拖动；opts.menu 手机 … 菜单；opts.offer 显示「出 Offer」。链接只指向当前这一端有的页面
  window.NBTours.targetList = function (cid, opts) {
    opts = opts || {}; const list = NBTours.targets(cid); if (!list.length) return `<div class="empty small">${opts.empty || "还没有目标房 · 看过的房可以标为目标房"}</div>`;
    return `<div class="tgtlist">${list.map((x, i) => { const p = window.prop(x.prop); const st = NBTours.TARGET_ST[x.status] || NBTours.TARGET_ST.watching; const ph = link("property", x.prop), dh = x.deal ? link("deal", x.deal) : null; const name = esc((p || {}).addr || x.prop); return `<div class="tgt ${x.status}" data-tgt="${cid}|${x.prop}" ${opts.drag ? 'draggable="true"' : ""}><span class="rank">${opts.drag ? '<span class="handle" title="拖动排序">⋮⋮</span>' : ""}${i + 1}</span><div class="body"><div class="t">${ph ? `<a href="${ph}">${name}</a>` : `<b>${name}</b>`} <span class="badge ${st[1]}">${st[0]}</span> <span class="tiny muted">${x.kind === "rent" ? "想租" : "想买"}</span></div><div class="d">${p ? `${window.NBPropFile ? NBPropFile.specLine(p) : `${p.beds ?? "—"} 房 ${p.baths ?? "—"} 卫`} · ${esc(p.isd || "—")}` : ""}${x.note ? " · " + esc(x.note) : ""}${dh ? ` · <a href="${dh}">交易</a>` : ""}</div></div><div class="acts">${x.status === "watching" && opts.offer !== false ? `<button class="btn xs pri" data-action="tgt-offer" data-arg="${cid}|${x.prop}">${x.kind === "rent" ? "提交申请" : "出 Offer"}</button>` : ""}${["lost", "on_hold", "passed"].includes(x.status) && x.offer && x.deal ? `<button class="btn xs" data-action="offer-reactivate" data-arg="${x.deal}|${x.offer}">再激活</button>` : ""}<button class="btn xs ghost dots" data-action="tgt-menu" data-arg="${cid}|${x.prop}">…</button></div></div>`; }).join("")}</div>`;
  };
})();
