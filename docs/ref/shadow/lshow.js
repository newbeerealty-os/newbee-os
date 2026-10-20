/* NewBee OS · 三端共用：Listing 端的看房——别的经纪约看我的挂牌（卖方 + 出租）
   整条线：申请 → 谁批 → 约好 → 看完 → 反馈 → 给卖家看 → 定价信号（v1.7 · 答疑 10-19 · 决定 67 / 68 / 69）
   数据：DB.listingShowings[]（一场一行，形状见 data.js 的注释）· 交易上的 showingApprover（auto 自动确认 · me 我批 · seller 卖家 / 租客批；没有按 me）
   红线：只读邮件；不登录 BrokerBay / ShowingTime；不代批、不代回、不代取消——「批准」永远是 Jason 自己在 BrokerBay 的那一场里点（影子里按钮只弹提示）；
        不自动发短信 / 微信 / 邮件（去要反馈 = AI 起草一句，Jason 自己发）；给卖家看的反馈照旧走 NBTours.showToSeller（5 分钟延迟队列）；
        系统不对卖家说任何定价的话——定价信号和 T2 提议只在经纪人侧，forSeller() 里没有。
   升级 / 去要反馈的「现在」= 真实时钟，页面每次渲染前调一次 escalateCheck()（真实版是 P1 的定时 tick）。阈值只读 SCORE_CONFIG.thresholds。
   这个文件不碰 DOM；每个写动作都 audit。界面层（网站 web/screens-v1.js · 经纪人 App）各自画按钮。 */
(function () {
  const D = () => window.DB;
  const T0 = () => (window.TODAY ? TODAY() : D().today);
  const pad2 = (n) => String(n).padStart(2, "0");
  const nowHM = () => { const x = new Date(); return `${pad2(x.getHours())}:${pad2(x.getMinutes())}`; };
  const stamp = () => T0() + " " + nowHM();
  const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const addDays = (iso, n) => { const x = new Date(String(iso).slice(0, 10) + "T00:00:00"); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; };
  const dayOf = (at) => String(at || "").slice(0, 10);
  const timeOf = (at) => { const m = /\s(\d{1,2}:\d{2})/.exec(String(at || "")); return m ? m[1] : ""; };
  const msOf = (at) => { const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(String(at || "")); return m ? new Date(`${m[1]}T${pad2(m[2] || 0)}:${m[3] || "00"}:00`).getTime() : NaN; };
  const hoursSince = (at) => (Date.now() - msOf(at)) / 36e5; // 正 = 已经过去了这么久
  const hoursUntil = (at) => (msOf(at) - Date.now()) / 36e5; // 正 = 还有这么久
  const daysBetween = (a, b) => Math.round((new Date(dayOf(b) + "T00:00:00") - new Date(dayOf(a) + "T00:00:00")) / 864e5);
  const audit = (did, what, actor, who) => { if (window.audit) window.audit(did, what, actor || "human", who); };
  const meName = () => (D().me || {}).name || "Jason";
  const TH = () => (window.SCORE_CONFIG && SCORE_CONFIG.thresholds) || {}; // showingEscalateHours · showingSoonHours · feedbackAskHours · busyShowings 只在 data.js 定义
  const TERM = () => (window.NBRoadmap ? NBRoadmap.TERMINAL : ["closed", "terminated", "lost", "ended"]);
  const LISTED = ["listed", "offer", "applying"]; // 挂着牌的阶段
  const deals = () => D().deals || [];
  const dealOf = (id) => deals().find((x) => x.id === id);
  const propOf = (id) => (D().properties || []).find((x) => x.id === id);
  const rowsAll = () => (D().listingShowings = D().listingShowings || []);
  const byId = (id) => rowsAll().find((x) => x.id === id);
  const isLease = (d) => !!d && d.type === "lessor";
  const short = (d) => (d && d.title ? d.title.split(" · ")[0] : "");
  const addrOf = (d) => { const p = d ? propOf(d.property) : null; return p ? p.addr : short(d); };
  const ownerWord = (d) => (isLease(d) ? "房东" : "卖家");        // 给谁看：卖家 / 房东
  const approverWord = (d) => (isLease(d) ? "租客" : "卖家");     // 谁批：卖家 / 租客
  const WD = ["日", "一", "二", "三", "四", "五", "六"];
  const fdWd = (at) => { const x = new Date(dayOf(at) + "T00:00:00"); return isNaN(x) ? String(at || "") : `${x.getMonth() + 1}/${x.getDate()}（周${WD[x.getDay()]}）`; }; // 10/21（周二）
  const relDay = (at) => { const n = daysBetween(T0(), dayOf(at)); return n === 0 ? "今天" : n === 1 ? "明天" : n === 2 ? "后天" : n === -1 ? "昨天" : n === -2 ? "前天" : `${Number(dayOf(at).slice(5, 7))}/${Number(dayOf(at).slice(8, 10))}`; };
  const when = (s) => `${relDay(s.at)} ${s.window || timeOf(s.at)}`.trim();

  // ---- 表（三端共用，不各写一份）----
  const APPROVER = { auto: ["自动确认", "mute"], me: ["我批", "acc"], seller: ["卖家 / 租客批", "warn"] };
  const STATUS = { requested: ["等批", "warn"], confirmed: ["约好了", "ok"], done: ["看完了", "mute"], declined: ["被拒", "bad"], expired: ["过期", "mute"] };
  const REASON_ZH = { price: "价格", condition: "房况", layout: "户型", location: "位置" };
  const REASON_RE = { price: /价格|贵|降价|price|expensive/i, condition: /房况|旧|维修|地毯|漏|condition|carpet|repair/i, layout: /户型|格局|layout|floor ?plan/i, location: /位置|学区|路|location|school|street|highway/i };
  const OPEN_TOAST = "真实版打开邮件里的链接，批准由你自己在 BrokerBay 点"; // 「打开 BrokerBay 那一场」在影子里只弹这一句

  // ---- 谁批 ----
  const approverOf = (d) => (d && APPROVER[d.showingApprover] ? d.showingApprover : "me");
  // 卡上的字：自动确认 · 我批 · 卖家批（出租交易：租客批）
  const approverLabel = (d) => { const k = approverOf(d); return k === "seller" ? `${approverWord(d)}批` : APPROVER[k][0]; };
  function setApprover(dealId, v) {
    const d = dealOf(dealId); if (!d || !APPROVER[v]) return null; const old = approverLabel(d); d.showingApprover = v;
    audit(dealId, `约看谁批：${short(d)} · ${old} → ${approverLabel(d)}（挂牌时选一次；系统读不到 BrokerBay 那边的设置，也不代批）`, "human");
    return d;
  }
  // 挂着牌的交易：卖方 / 出租，阶段 listed / offer / applying，没到终态
  const listings = () => deals().filter((d) => ["seller", "lessor"].includes(d.type) && !TERM().includes(d.stage) && LISTED.includes(d.stage));

  // ---- 行 ----
  const expand = (s) => { const d = dealOf(s.deal) || null; return { s, d, p: d ? propOf(d.property) || null : null }; };
  const isLive = (s) => !["declined", "expired"].includes(s.status);
  // filter ∈ all | today | week | pending（等批）| feedback（看完没反馈）| unreleased（有反馈没放行）
  const FILTERS = {
    all: () => true,
    today: ({ s }) => dayOf(s.at) === T0(),
    week: ({ s }) => dayOf(s.at) >= T0() && dayOf(s.at) <= addDays(T0(), 6),
    pending: ({ s }) => s.status === "requested",
    feedback: ({ s }) => s.status === "done" && !s.feedback,
    unreleased: ({ s }) => !!s.feedback && !s.released && !s.shown,
  };
  // 所有挂牌的行：等批的最前（按 at），然后还没到的按 at 正序（最近的先），过去的按 at 倒序（新的在前）
  function rows(filter) {
    const ids = new Set(listings().map((d) => d.id)); const nowAt = stamp();
    const tier = (s) => (s.status === "requested" ? 0 : String(s.at) >= nowAt ? 1 : 2);
    return rowsAll().filter((s) => ids.has(s.deal)).map(expand).filter(FILTERS[filter] || FILTERS.all)
      .sort((a, b) => { const ta = tier(a.s), tb = tier(b.s); if (ta !== tb) return ta - tb; const c = String(a.s.at).localeCompare(String(b.s.at)); return ta === 2 ? -c : c; });
  }
  // 这笔挂牌的行，新的在前（= NBTours.listingShowings）
  const forDeal = (dealId) => rowsAll().filter((x) => x.deal === dealId).slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  // 小计：等批 · 今天 · 待反馈 · 没放行
  const counts = () => ({ pending: rows("pending").length, today: rows("today").length, feedback: rows("feedback").length, unreleased: rows("unreleased").length });

  // ---- 状态文字：等批时细分 ----
  function statusOf(s) {
    const st = STATUS[s.status] || [s.status, "mute"]; if (s.status !== "requested") return st;
    const d = dealOf(s.deal); const ap = s.approver || approverOf(d);
    if (ap === "me") return ["等我批", "warn"];
    if (ap === "auto") return ["等确认", "mute"];
    return s.escalated ? [`等${approverWord(d)}批 · 已升级给你`, "bad"] : [`等${approverWord(d)}批`, "warn"];
  }
  const statusLabel = (s) => statusOf(s)[0];
  const statusCls = (s) => statusOf(s)[1];

  // ---- 申请 / 手记 / 从邮件认的状态变化 ----
  const blank = (dealId, d, o) => ({ id: newId("ls"), deal: dealId, at: o.at || "", window: o.window || "", agent: o.agent || "对方经纪", agentPhone: o.agentPhone || "", agentEmail: o.agentEmail || "", status: "requested", approver: approverOf(d), requestedAt: o.requestedAt || stamp(), escalated: false, escalatedAt: null, source: o.source || "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null });
  // 约看申请到了（从邮件认的）：按这套挂牌「谁批」——自动确认的直接 confirmed（只记不推）；我批 → 今天页「需要你」；卖家 / 租客批 → 先不打扰
  function request(dealId, o) {
    const d = dealOf(dealId); if (!d) return null; o = o || {}; const s = blank(dealId, d, o);
    if (s.approver === "auto") { s.status = "confirmed"; s.confirmedAt = stamp(); }
    rowsAll().unshift(s);
    const w = `${s.agent} 约 ${when(s)} 看 ${addrOf(d)}`;
    audit(dealId, s.approver === "auto" ? `约看申请（自动确认）：${w} · 从邮件认的，只进列表不推` : s.approver === "me" ? `约看申请：${w} · 等我批——打开邮件里 BrokerBay 那一场、自己点批准（系统不代批）` : `约看申请：${w} · 等${approverWord(d)}批，先不打扰；${TH().showingEscalateHours} 小时没人批或离看房不到 ${TH().showingSoonHours} 小时才升级给我`, "ai", "Email Intake");
    return s;
  }
  // 手记一场（微信 / 电话约的）：直接 confirmed，来源「手记」
  function addManual(dealId, o) {
    const d = dealOf(dealId); if (!d) return null; o = o || {}; const s = blank(dealId, d, Object.assign({}, o, { source: "手记" }));
    s.status = "confirmed"; s.confirmedAt = stamp(); if (o.note) s.note = String(o.note);
    rowsAll().unshift(s);
    audit(dealId, `手记一场：${s.agent} ${when(s)} 看 ${addrOf(d)}${o.note ? "（" + o.note + "）" : ""}`, "human");
    return s;
  }
  // 确认邮件到了、但之前没见过申请（"The following showing has been confirmed"）：直接一行 confirmed，来源 = 邮件（comms.js applyShowingMail 用；不是手记）
  function addConfirmed(dealId, o) {
    const d = dealOf(dealId); if (!d) return null; o = o || {}; const s = blank(dealId, d, o);
    s.status = "confirmed"; s.confirmedAt = stamp(); rowsAll().unshift(s);
    audit(dealId, `看房确认邮件（别人看我的挂牌）→ 进看房反馈列表，不进我的日历：${s.agent} ${when(s)} 看 ${addrOf(d)}`, "ai", "Email Intake");
    return s;
  }
  const setStatus = (id, st, what, actor, who) => { const s = byId(id); if (!s) return null; const d = dealOf(s.deal); s.status = st; s[st + "At"] = stamp(); audit(s.deal, what(s, d), actor, who); return s; };
  const confirm = (id) => setStatus(id, "confirmed", (s, d) => `约好了（从邮件认的）：${s.agent} ${when(s)} 看 ${addrOf(d)}`, "ai", "Email Intake");
  const decline = (id) => setStatus(id, "declined", (s, d) => `约看被拒（从邮件认的）：${s.agent} ${when(s)} 看 ${addrOf(d)}`, "ai", "Email Intake");
  const expire = (id) => setStatus(id, "expired", (s, d) => `约看过期 / 取消（从邮件认的，影子里合一标过期）：${s.agent} ${when(s)} 看 ${addrOf(d)}`, "ai", "Email Intake");
  const markDone = (id) => setStatus(id, "done", (s, d) => `标看完：${s.agent} ${when(s)} 看 ${addrOf(d)}`, "human");

  // ---- 升级：等卖家 / 租客批的，超过 showingEscalateHours 没人批 或 离看房不到 showingSoonHours → 升级给经纪人（可替批）。返回这次新升级的数量 ----
  function escalateCheck() {
    let n = 0; const th = TH();
    rowsAll().forEach((s) => {
      if (s.status !== "requested" || s.escalated) return; const d = dealOf(s.deal); if (!d) return; const ap = s.approver || approverOf(d); if (ap !== "seller") return;
      const waited = s.requestedAt ? hoursSince(s.requestedAt) : 0; const left = s.at ? hoursUntil(s.at) : Infinity;
      const byWait = waited >= Number(th.showingEscalateHours), bySoon = left <= Number(th.showingSoonHours);
      if (!byWait && !bySoon) return;
      s.escalated = true; s.escalatedAt = stamp(); n++;
      audit(s.deal, `约看申请升级给你：${s.agent} 约 ${when(s)} 看 ${addrOf(d)} · ${byWait ? `等${approverWord(d)}批超过 ${th.showingEscalateHours} 小时` : `离看房不到 ${th.showingSoonHours} 小时`} → 你可以替${approverWord(d)}批（在 BrokerBay 那一场里点）`, "system");
    });
    return n;
  }
  // 今天页「需要你」（第 1 级推送）：要我批的 + 升级给我的
  const needsMe = () => rows("pending").filter(({ s, d }) => (s.approver || approverOf(d)) === "me" || s.escalated);
  // 今天页「在等对方」（不推）：等卖家 / 租客批、还没升级的
  const waitingSeller = () => rows("pending").filter(({ s, d }) => (s.approver || approverOf(d)) === "seller" && !s.escalated);
  // 看完 feedbackAskHours 小时还没反馈、还没要过 → 去要反馈
  const feedbackDue = () => rows("feedback").filter(({ s }) => !s.askedAt && hoursSince(s.at) >= Number(TH().feedbackAskHours));

  // ---- 去要反馈：AI 起草一句短信，Jason 自己发（不自动发）；要过一次就不再提醒 ----
  const agentName = (s) => String(s.agent || "").replace(/[（(].*$/, "").trim();
  function askFeedback(id) {
    const s = byId(id); if (!s) return null; const d = dealOf(s.deal);
    const text = `${agentName(s) || "您"}您好，${relDay(s.at)} ${s.window || timeOf(s.at)} 看过 ${addrOf(d)}，方便说一下客户的反馈吗？谢谢！`;
    s.askedAt = stamp();
    audit(s.deal, `去要反馈：${s.agent} · ${when(s)} 那一场 · AI 起草了一句短信，Jason 自己发（系统不自动发）`, "ai", "助手");
    return { text, s, sms: smsHref(s), mail: mailHref(s) };
  }
  // 记反馈（对方经纪回的那句）：约好的那场时间已过就顺手标看完
  function setFeedback(id, text) {
    const s = byId(id); if (!s) return null; const t = String(text || "").trim(); if (!t) return null; const d = dealOf(s.deal);
    s.feedback = t; s.feedbackAt = stamp(); if (s.status === "confirmed" && msOf(s.at) <= Date.now()) { s.status = "done"; s.doneAt = stamp(); }
    audit(s.deal, `看房反馈记下：${s.agent} ${when(s)} 看 ${addrOf(d)} ·「${t.slice(0, 40)}」· 给${ownerWord(d)}看要你再点一次放行`, "human");
    return s;
  }

  // ---- 定价信号（只给经纪人看；系统不对卖家说定价的话）----
  // cold 照 score.js 的定义：挂牌满 14 天 · 最近 7 天 0 场；busyNoOffer（决定 67）：满 14 天 · 看完 ≥ busyShowings 场 · 0 个在谈 Offer · 卖方交易
  function pricingSignals(dealId) {
    const d = dealOf(dealId); if (!d) return null; const t = T0(); const th = TH();
    const listedDays = Math.max(0, daysBetween(d.listed || d.created || t, t));
    const ls = forDeal(dealId); const doneRows = ls.filter((s) => s.status === "done");
    const openOffers = window.NBOffers ? NBOffers.list(dealId).filter((o) => NBOffers.isOpen(o)).length : 0;
    const recent = doneRows.some((s) => { const n = daysBetween(dayOf(s.at), t); return n >= 0 && n <= 7; });
    const cold = listedDays >= 14 && !recent;
    const busyNoOffer = d.type === "seller" && listedDays >= 14 && doneRows.length >= Number(th.busyShowings) && openOffers === 0;
    const reasons = { price: 0, condition: 0, layout: 0, location: 0 };
    doneRows.forEach((s) => { const f = String(s.feedback || ""); if (!f) return; Object.keys(REASON_RE).forEach((k) => { if (REASON_RE[k].test(f)) reasons[k]++; }); });
    const topKey = Object.keys(reasons).sort((a, b) => reasons[b] - reasons[a])[0];
    return { listedDays, done: doneRows.length, openOffers, cold, busyNoOffer, reasons, top: reasons[topKey] ? REASON_ZH[topKey] : null, topKey: reasons[topKey] ? topKey : null, any: cold || busyNoOffer, busyShowings: Number(th.busyShowings) };
  }
  const reasonText = (r) => `价格 ${r.price} · 房况 ${r.condition} · 户型 ${r.layout} · 位置 ${r.location}`;
  // 两条信号 + 反馈理由 → 一条 T2 提议（type note · key pricing|交易）：批准 = NBProp 现有的 payload.task 建任务「跟卖家谈调价（地址）」due 明天；拒绝 = 作废。同一笔还在等的不重复建。提议不进客户视图
  function pricingProposal(dealId) {
    const d = dealOf(dealId); const sig = pricingSignals(dealId); if (!d || !sig || !window.NBProp) return null; if (!sig.any) return null;
    const key = "pricing|" + dealId; const before = NBProp.all().find((p) => p.key === key && p.status === "pending");
    const who = ownerWord(d); const verb = isLease(d) ? "谈调租" : "谈调价";
    const title = sig.busyNoOffer ? `看房 ${sig.done} 场、没有 Offer：反馈里 ${sig.reasons[sig.topKey] || 0} 次提到${sig.top || "价格"} → 跟${who}${verb}？` : `看房冷清：挂牌 ${sig.listedDays} 天、最近 7 天 0 场 → 跟${who}${verb}？`;
    const p = NBProp.add({ key, type: "note", tier: 2, deal: dealId, title, evidence: `挂牌 ${sig.listedDays} 天 · 看完 ${sig.done} 场 · 在谈 Offer ${sig.openOffers} 个 · 反馈理由：${reasonText(sig.reasons)} · 只给你看，系统不对${who}说定价的话；批了才建任务`, cost: 0.01, payload: { task: `跟${who}${verb}（${addrOf(d)}）`, due: addDays(T0(), 1), assignee: meName() } });
    if (!before) audit(dealId, `定价信号汇总成 T2 提议：${title}（你批了才变成任务；不进客户视图）`, "ai", "助手");
    return p;
  }

  // ---- 卖家 / 房东看得到的（客户 App · 客户视图）：场次 + 约好的日期时段，不带对方经纪；approver seller 时等批的那几场出中文提示。没有任何定价信号 ----
  function forSeller(dealId) {
    const d = dealOf(dealId); const ls = forDeal(dealId); const live = ls.filter(isLive); const slot = (s) => ({ at: s.at, window: s.window || timeOf(s.at), day: relDay(s.at), date: fdWd(s.at) });
    const asc = (a, b) => String(a.at).localeCompare(String(b.at));
    return {
      total: live.length, done: live.filter((s) => s.status === "done").length,
      upcoming: ls.filter((s) => s.status === "confirmed").map(slot).sort(asc),
      pendingApproval: approverOf(d) === "seller" ? ls.filter((s) => s.status === "requested").map(slot).sort(asc) : [],
      approver: approverOf(d), who: ownerWord(d), approverWord: approverWord(d),
      held: ls.filter((s) => s.feedback && !s.released && !s.shown).length, pending: ls.filter((s) => s.feedback && s.released && !s.shown).length,
      rows: ls.filter((s) => s.feedback && s.shown).map((s) => ({ id: s.id, at: s.at, text: s.feedback })),
    };
  }
  // 客户 App / 客户视图那一行中文提示（approver seller 且有等批的才有；返回 "" 就不画）
  const sellerHint = (dealId) => { const sf = forSeller(dealId); return sf.pendingApproval.length ? `有人约 ${sf.pendingApproval.map((x) => `${x.date} ${x.window}`).join("、")} 看房，请点 BrokerBay 短信里的确认` : ""; };

  // ---- 手机上的链接（影子只弹提示，不调用设备）----
  const digits = (s) => String(s || "").replace(/[^\d+]/g, "");
  const smsHref = (s) => (s && s.agentPhone ? "sms:" + digits(s.agentPhone) : "");
  const telHref = (s) => (s && s.agentPhone ? "tel:" + digits(s.agentPhone) : "");
  const mailHref = (s) => (s && s.agentEmail ? "mailto:" + s.agentEmail : "");

  window.NBLShow = { APPROVER, STATUS, REASON_ZH, OPEN_TOAST, TH, approverOf, approverLabel, setApprover, listings, rows, forDeal, counts, byId, statusOf, statusLabel, statusCls, request, addManual, addConfirmed, confirm, decline, expire, markDone, escalateCheck, needsMe, waitingSeller, feedbackDue, askFeedback, setFeedback, pricingSignals, pricingProposal, reasonText, forSeller, sellerHint, smsHref, telHref, mailHref, relDay, fdWd, when, ownerWord, approverWord, isLease };
})();
