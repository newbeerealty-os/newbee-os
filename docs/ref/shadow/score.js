/* NewBee OS · 三端共用：默认排序（自动打分）+ 重点关注（星标 · 手动顺序）+ 新动态（上次打开之后）
   真实版对应 packages/core 的 scoreDeal / scoreContact / scoreProperty（纯函数：facts + 权重 → { score, reasons, section }）。
   权重集中在 window.SCORE_CONFIG（data.js 顶部）；这里只有规则，不碰界面。
   v1.5：所有「几天算快到了」只读 SCORE_CONFIG.thresholds（TH()）；交易健康度 / 颜色 / Broker 看板 / 导航角标也在这里算一次，三端都调它。 */
(function () {
  const CFG = () => window.SCORE_CONFIG;
  // 阈值（决定 D3）：riskDays 今天页有风险 · soonDays 列表 +30 / Broker 看板 / 黄 · urgentDays 红 / 角标 · weekDays 列表 +10 · lowConfidence · replyHours
  const TH = () => (CFG() && CFG().thresholds) || { riskDays: 2, soonDays: 3, urgentDays: 1, weekDays: 7, lowConfidence: 0.9, replyHours: 24 };
  const L = {
    zh: { offer_open: "有未决 Offer", fresh: "有新动态", overdue: "有逾期", due3: "截止 ≤3 天", due7: "截止 4–7 天", pending: "有待你确认", prioHigh: "标了重点", prioLow: "标了低优先", lease60: "租约 60 天内到期", lease90: "租约 61–90 天到期", tour48: "48 小时内看房", waiting: "在等对方回复", feedback: "有待催的看房反馈", touch1: "1 天内有动静", touch3: "3 天内有动静", stale30: "30 天没动静",
      heat: "热度", deal_fresh: "交易有新动态", deal_due3: "交易截止 ≤3 天", deal_due7: "交易截止 4–7 天", deal_high: "交易标了重点", deal_low: "交易都是低优先", touchdue: "到联系日", birthday: "15 天内过生日", suggest: "有沟通建议没处理", waitme: "在等我回复", former: "不再是客户",
      next_touch: "到了该跟进的日子", cold: "看房冷清",
      sec_action: "需要动作", sec_active: "进行中", sec_lease: "租赁中", sec_ended: "已结束", sec_today: "今天要跟进", sec_greet: "该问候了", sec_other: "其他", sec_missing: "资料待补", sec_former: "不再是", sec_managed: "在管出租", sec_watch: "关注中", sec_nonclient: "其他联系人 · 按最近往来" },
    en: { offer_open: "Open offer", fresh: "New activity", overdue: "Overdue", due3: "Due ≤3d", due7: "Due 4–7d", pending: "Needs your confirm", prioHigh: "High priority", prioLow: "Low priority", lease60: "Lease ends ≤60d", lease90: "Lease ends 61–90d", tour48: "Showing in 48h", waiting: "Waiting on them", feedback: "Feedback to chase", touch1: "Active ≤1d", touch3: "Active ≤3d", stale30: "Quiet 30d+",
      heat: "Heat", deal_fresh: "Deal has news", deal_due3: "Deal due ≤3d", deal_due7: "Deal due 4–7d", deal_high: "Deal high priority", deal_low: "Deals all low", touchdue: "Touch due", birthday: "Birthday in 15d", suggest: "Unhandled suggestion", waitme: "Waiting on me", former: "No longer a client",
      next_touch: "Follow-up due", cold: "Few showings",
      sec_action: "Needs action", sec_active: "In progress", sec_lease: "Leasing", sec_ended: "Ended", sec_today: "Follow up today", sec_greet: "Say hello", sec_other: "Other", sec_missing: "Missing info", sec_former: "Former", sec_managed: "Managed rentals", sec_watch: "Watching", sec_nonclient: "Other contacts · by last touch" },
  };
  const lang = () => (window.DB && DB.ui && DB.ui.lang === "en") ? "en" : "zh";
  // 带天数的标签跟着阈值走（改了 soonDays / weekDays，标签不会说错）
  const DYN = {
    due3: (t, en) => en ? `Due ≤${t.soonDays}d` : `截止 ≤${t.soonDays} 天`, due7: (t, en) => en ? `Due ${t.soonDays + 1}–${t.weekDays}d` : `截止 ${t.soonDays + 1}–${t.weekDays} 天`,
    deal_due3: (t, en) => en ? `Deal due ≤${t.soonDays}d` : `交易截止 ≤${t.soonDays} 天`, deal_due7: (t, en) => en ? `Deal due ${t.soonDays + 1}–${t.weekDays}d` : `交易截止 ${t.soonDays + 1}–${t.weekDays} 天`,
  };
  const label = (k) => DYN[k] ? DYN[k](TH(), lang() === "en") : ((L[lang()] || L.zh)[k] || k);

  // ---------- 日期小工具（不依赖界面）----------
  const day = (iso) => iso ? String(iso).slice(0, 10) : null;
  const diffDays = (a, b) => Math.round((new Date(day(b) + "T00:00:00") - new Date(day(a) + "T00:00:00")) / 86400000); // b - a
  const todayIso = () => (window.DB && DB.today) || new Date().toISOString().slice(0, 10);
  const nowStamp = () => { const x = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${todayIso()} ${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`; };
  const maxStamp = (arr) => { const now = nowStamp(); return arr.filter((x) => x && x <= now).sort().slice(-1)[0] || null; };
  const shiftDay = (iso, n) => { const x = new Date(day(iso) + "T00:00:00"); x.setDate(x.getDate() + n); const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };

  // ---------- 纯打分：facts + 权重 → 分数 ----------
  function apply(rules, facts, cfg) {
    const reasons = [];
    rules.forEach(([key, cond, w, detail]) => { const on = cond(facts); if (!on) return; const weight = typeof w === "function" ? w(facts) : w; if (!weight) return; const dt = detail ? detail(facts) : ""; reasons.push({ key, w: weight, label: label(key) + (dt ? " · " + dt : ""), detail: dt }); });
    return reasons;
  }
  const dueText = (x) => x.dueLabel ? `${x.dueLabel} ${x.daysToDue === 0 ? (lang() === "en" ? "today" : "今天") : x.daysToDue + (lang() === "en" ? "d" : " 天后")}` : "";
  const nDays = (n) => n + (lang() === "en" ? "d" : " 天");
  const short = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  const W = (cfg, key) => { const r = cfg.add[key]; return r ? (r.reserved && !cfg.reservedOn ? 0 : r.w) : 0; };

  function scoreDeal(f, cfg) {
    cfg = cfg || CFG().deal;
    const base = f.offerOpen ? cfg.base.offer_open : (cfg.base[f.stage] != null ? cfg.base[f.stage] : cfg.base.default);
    const reasons = apply([
      ["fresh", (x) => x.fresh, W(cfg, "fresh"), (x) => x.freshItems ? x.freshItems.length + (lang() === "en" ? " items" : " 条") : ""],
      ["overdue", (x) => x.overdue, W(cfg, "overdue"), (x) => x.overdueLabel ? `${x.overdueLabel} · ${lang() === "en" ? "late " : "逾期 "}${nDays(x.overdueDays)}` : ""],
      ["due3", (x) => x.daysToDue != null && x.daysToDue <= TH().soonDays, W(cfg, "due3"), dueText],
      ["due7", (x) => x.daysToDue != null && x.daysToDue > TH().soonDays && x.daysToDue <= TH().weekDays, W(cfg, "due7"), dueText],
      ["pending", (x) => x.pending > 0, W(cfg, "pending"), (x) => x.pending + (lang() === "en" ? "" : " 项")],
      ["prioHigh", (x) => x.priority === "high", W(cfg, "prioHigh")],
      ["prioLow", (x) => x.priority === "low", W(cfg, "prioLow")],
      ["lease60", (x) => x.leaseDays != null && x.leaseDays <= 60, W(cfg, "lease60"), (x) => nDays(x.leaseDays)],
      ["lease90", (x) => x.leaseDays != null && x.leaseDays >= 61 && x.leaseDays <= 90, W(cfg, "lease90"), (x) => nDays(x.leaseDays)],
      ["tour48", (x) => x.tour48, W(cfg, "tour48")],
      ["waiting", (x) => x.waiting, W(cfg, "waiting")],
      ["feedback", (x) => x.feedback, W(cfg, "feedback")],
      ["touch1", (x) => x.daysSinceTouch != null && x.daysSinceTouch <= 1, W(cfg, "touch1")],
      ["touch3", (x) => x.daysSinceTouch != null && x.daysSinceTouch > 1 && x.daysSinceTouch <= 3, W(cfg, "touch3")],
      ["stale30", (x) => x.daysSinceTouch == null || x.daysSinceTouch > 30, W(cfg, "stale30"), (x) => x.daysSinceTouch == null ? "" : nDays(x.daysSinceTouch)],
    ], f, cfg);
    if (f.offerOpen) reasons.unshift({ key: "offer_open", w: 0, label: label("offer_open"), base: true });
    const score = base + reasons.reduce((s, r) => s + r.w, 0);
    const ended = ["closed", "terminated", "lost", "ended"].includes(f.stage);
    const section = ended ? "sec_ended" : reasons.some((r) => r.w >= cfg.actionThreshold) ? "sec_action" : f.stage === "active" ? "sec_lease" : "sec_active";
    return { score, base, reasons, section };
  }

  function scoreContact(f, cfg) {
    cfg = cfg || CFG().contact;
    if (f.kindClass !== "client") return { score: 0, base: 0, reasons: [], section: "sec_nonclient", nonClient: true };
    // 热度：从上往下命中第一条
    const H = cfg.heat;
    let heat = H.other;
    if (f.stage === "former") heat = 0;
    else if (f.hot) heat = H.hot;
    else if (f.warm) heat = H.warm;
    else if (f.stage === "prospect" && f.daysSinceTouch != null && f.daysSinceTouch <= 14) heat = H.prospectRecent;
    else if (f.stage === "prospect") heat = H.prospect;
    else if (f.onlyClosed) heat = H.onlyClosed;
    else if (f.stage === "future") heat = H.future;
    else if (f.allLost) heat = H.allLost;
    const reasons = apply([
      ["deal_fresh", (x) => x.dealFresh, W(cfg, "deal_fresh")],
      ["deal_due3", (x) => x.dealDue != null && x.dealDue <= TH().soonDays, W(cfg, "deal_due3"), (x) => x.dealDueLabel || ""],
      ["deal_due7", (x) => x.dealDue != null && x.dealDue > TH().soonDays && x.dealDue <= TH().weekDays, W(cfg, "deal_due7"), (x) => x.dealDueLabel || ""],
      ["deal_high", (x) => x.anyHigh, W(cfg, "deal_high")],
      ["deal_low", (x) => x.allLow, W(cfg, "deal_low")],
      ["touchdue", (x) => x.touchOverdue != null && x.stage !== "former", (x) => Math.min(cfg.add.touchdue.max, Math.max(cfg.add.touchdue.min, x.touchOverdue * cfg.add.touchdue.perDay)), (x) => x.daysSinceTouch == null ? (lang() === "en" ? "never contacted" : "还没联系过") : (lang() === "en" ? `${x.daysSinceTouch}d since` : `${x.daysSinceTouch} 天没联系`)],
      ["birthday", (x) => x.birthdaySoon, W(cfg, "birthday"), (x) => x.birthdayWho || ""],
      ["tour48", (x) => x.tour48, W(cfg, "tour48")],
      ["suggest", (x) => x.suggest, W(cfg, "suggest")],
      ["waitme", (x) => x.waitMe, W(cfg, "waitme")],
      ["touch1", (x) => x.daysSinceTouch != null && x.daysSinceTouch <= 1, W(cfg, "touch1")],
      ["touch3", (x) => x.daysSinceTouch != null && x.daysSinceTouch > 1 && x.daysSinceTouch <= 3, W(cfg, "touch3")],
      ["stale30", (x) => x.daysSinceTouch == null || x.daysSinceTouch > 30, W(cfg, "stale30"), (x) => x.daysSinceTouch == null ? "" : nDays(x.daysSinceTouch)],
      ["former", (x) => x.stage === "former", cfg.former],
    ], f, cfg);
    const score = heat + reasons.reduce((s, r) => s + r.w, 0);
    const due = f.touchOverdue != null && f.stage !== "former";
    let section;
    if (f.stage === "former") section = "sec_former";
    else if (f.missing) section = "sec_missing";
    else if (reasons.some((r) => r.w >= cfg.actionThreshold) || (heat >= 60 && due)) section = "sec_today";
    else if (heat >= 60) section = "sec_active";
    else if (due) section = "sec_greet";
    else section = "sec_other";
    return { score, base: heat, heat, reasons, section };
  }

  function scoreProperty(f, cfg) {
    cfg = cfg || CFG().property;
    const B = cfg.base;
    const base = f.hot ? B.hot : f.warm ? B.warm : f.relationship === "prospect" ? B.prospect : f.managed ? B.managed : f.relationship === "watching" ? B.watching : f.onlyClosed ? B.onlyClosed : B.other;
    const reasons = cfg.enabled ? apply([
      ["fresh", (x) => x.fresh, W(cfg, "fresh"), (x) => x.freshItems ? x.freshItems.length + (lang() === "en" ? " items" : " 条") : ""],
      ["overdue", (x) => x.overdue, W(cfg, "overdue"), (x) => x.overdueLabel ? `${x.overdueLabel} · ${lang() === "en" ? "late " : "逾期 "}${nDays(x.overdueDays)}` : ""],
      ["due3", (x) => x.daysToDue != null && x.daysToDue <= TH().soonDays, W(cfg, "due3"), dueText],
      ["due7", (x) => x.daysToDue != null && x.daysToDue > TH().soonDays && x.daysToDue <= TH().weekDays, W(cfg, "due7"), dueText],
      ["next_touch", (x) => x.nextTouchDue, W(cfg, "next_touch")],
      ["lease60", (x) => x.leaseDays != null && x.leaseDays <= 60, W(cfg, "lease60"), (x) => nDays(x.leaseDays)],
      ["lease90", (x) => x.leaseDays != null && x.leaseDays >= 61 && x.leaseDays <= 90, W(cfg, "lease90"), (x) => nDays(x.leaseDays)],
      ["tour48", (x) => x.tour48, W(cfg, "tour48")],
      ["cold", (x) => x.cold, W(cfg, "cold")],
      ["feedback", (x) => x.feedback, W(cfg, "feedback")],
      ["touch1", (x) => x.daysSinceTouch != null && x.daysSinceTouch <= 1, W(cfg, "touch1")],
      ["touch3", (x) => x.daysSinceTouch != null && x.daysSinceTouch > 1 && x.daysSinceTouch <= 3, W(cfg, "touch3")],
      ["stale30", (x) => x.daysSinceTouch == null || x.daysSinceTouch > 30, W(cfg, "stale30")],
    ], f, cfg) : [];
    const score = base + reasons.reduce((s, r) => s + r.w, 0);
    const section = f.ended ? "sec_ended" : reasons.some((r) => r.w >= cfg.actionThreshold) ? "sec_action" : (f.hot || f.warm) ? "sec_active" : f.managed ? "sec_managed" : ["prospect", "watching"].includes(f.relationship) ? "sec_watch" : "sec_other";
    return { score, base, reasons, section };
  }

  // ---------- 从示例数据里算 facts（真实版：SQL / core 查询）----------
  const me = () => (window.DB && DB.me) || { id: "u1", name: "Jason" };
  function user() { return (window.DB && DB.ui && DB.ui.role === "broker") ? "u4" : me().id; }
  function openedAt(kind, id) { const o = ((DB.opened || {})[user()] || {})[kind + ":" + id]; return o || null; }
  const isMine = (a) => a.actor === "human" && (a.who === me().name || a.who === "Jason");
  // 在谈的 Offer 只有一个定义（决定 D8）：offers.js 的 NBOffers.isOpen；这个文件单独加载（测试）时退回同一条规则
  const offerIsOpen = (o) => window.NBOffers ? NBOffers.isOpen(o) : o.status === "negotiating";

  function dealActivity(d) {
    // 这笔交易的所有动静（时间戳 + 是否我自己做的）
    const ev = [];
    (DB.audit || []).forEach((a) => { if (a.deal === d.id) ev.push({ at: a.at, mine: isMine(a), what: a.what }); });
    (DB.documents || []).forEach((x) => { if (x.deal === d.id && x.uploaded) ev.push({ at: x.uploaded + " 00:00", mine: false, what: "文件 " + x.name }); });
    (DB.proposals || []).forEach((p) => { if (p.deal === d.id && p.at) ev.push({ at: p.at, mine: false, what: "AI 提议 " + p.title }); });
    (DB.emails || []).forEach((e) => { if (e.deal === d.id && e.at) ev.push({ at: e.at, mine: false, what: "邮件 " + (e.subject || "") }); });
    (DB.commLog || []).forEach((c) => { if (c.deal === d.id && c.at) ev.push({ at: c.at, mine: c.dir === "out", what: "沟通 " + (c.text || "") }); }); // v1.5：手记的电话 / 微信 / 短信也算动静
    (DB.threads || []).forEach((t) => { if (t.deal === d.id) (DB.messages || []).forEach((m) => { if (m.thread === t.id && !(m.ai && m.ai.draft)) ev.push({ at: m.at, mine: m.from && m.from.role === "agent", what: "消息 " + (m.text || m.kind) }); }); });
    if (d.lastAction) ev.push({ at: d.lastAction + " 00:00", mine: true, what: "最近动作" });
    return ev;
  }
  function freshOf(events, kind, id) {
    const since = openedAt(kind, id);
    const cut = since || (shiftDay(todayIso(), -7) + " 00:00"); // 从没打开过：按最近 7 天有没有动静算
    return events.filter((e) => !e.mine && e.at && e.at > cut);
  }
  function dealFacts(d) {
    const T = todayIso();
    const ms = DB.milestones[d.id] || [], ts = DB.tasks[d.id] || [], fs = DB.fields[d.id] || [];
    const offers = DB.offers[d.id] || [];
    const offerOpen = offers.some(offerIsOpen);
    const overdue = ms.some((m) => m.status === "pending" && m.date && m.date < T) || ts.some((x) => x.status === "pending" && x.due && x.due < T);
    const dues = [...ms.filter((m) => m.status === "pending" && m.date && m.date >= T).map((m) => ({ date: m.date, label: m.label })), ...ts.filter((x) => x.status === "pending" && x.due && x.due >= T).map((x) => ({ date: x.due, label: x.name })), ...offers.filter((o) => o.expires && offerIsOpen(o)).map((o) => ({ date: day(o.expires), label: lang() === "en" ? "Counter expires" : "Counter 到期" }))].filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
    const daysToDue = dues.length ? diffDays(T, dues[0].date) : null;
    const dueLabel = dues.length ? short(dues[0].label, 18) : "";
    const od = [...ms.filter((m) => m.status === "pending" && m.date && m.date < T).map((m) => ({ date: m.date, label: m.label })), ...ts.filter((x) => x.status === "pending" && x.due && x.due < T).map((x) => ({ date: x.due, label: x.name }))].sort((a, b) => a.date.localeCompare(b.date));
    const broker = !!(DB.ui && DB.ui.role === "broker");
    const pending = fs.filter((x) => x.status === "pending").length + (DB.proposals || []).filter((p) => p.deal === d.id && p.status === "pending" && (broker || Number(p.tier) !== 3)).length; // T3 等的是 Broker，不算经纪人的「待你确认」
    let leaseDays = null;
    if (d.stage === "active") { const a = DB.rentals && DB.rentals.asset && DB.rentals.asset.deal === d.id ? DB.rentals.asset.expires : d.leaseEnd; if (a) leaseDays = diffDays(T, a); }
    const tour48 = (DB.tours || []).some((t) => t.deal === d.id && t.status !== "done" && t.date && diffDays(T, t.date) >= 0 && diffDays(T, t.date) <= TH().riskDays);
    const waiting = (DB.threads || []).some((t) => t.deal === d.id && ["waiting_client", "waiting_broker"].includes(t.status));
    const feedback = (DB.tours || []).some((t) => t.deal === d.id && t.status === "done" && !(t.feedbackAt));
    const ev = dealActivity(d);
    const last = maxStamp(ev.map((e) => e.at));
    const daysSinceTouch = last ? diffDays(day(last), T) : null;
    const fresh = freshOf(ev, "deal", d.id);
    return { id: d.id, stage: d.stage, offerOpen, overdue, daysToDue, dueLabel, overdueLabel: od.length ? short(od[0].label, 18) : "", overdueDays: od.length ? diffDays(od[0].date, T) : 0, pending, priority: d.priority || "medium", leaseDays, tour48, waiting, feedback, daysSinceTouch, lastAt: last, fresh: fresh.length > 0, freshItems: fresh };
  }

  function contactDeals(c) { return DB.deals.filter((d) => d.primary === c.id || DB.parties.some((p) => p.deal === d.id && p.party === c.id && p.side === "ours")); }
  function familyIds(cid) { const out = []; (DB.links || []).forEach((l) => { if (["spouse", "partner", "child", "parent"].includes(l.kind)) { if (l.from === cid) out.push(l.to); if (l.to === cid) out.push(l.from); } }); return out; }
  function birthdayWithin(mmdd, days) { if (!mmdd) return false; const T = todayIso(); const y = Number(T.slice(0, 4)); let iso = `${y}-${mmdd}`; if (iso < T) iso = `${y + 1}-${mmdd}`; const n = diffDays(T, iso); return n >= 0 && n <= days; }
  function contactTouches(c) {
    const ev = [];
    (DB.meetings || []).forEach((m) => { if (m.contact === c.id && m.at) ev.push(m.at); });
    (DB.threads || []).forEach((t) => { if (t.contact === c.id) (DB.messages || []).forEach((m) => { if (m.thread === t.id && !(m.ai && m.ai.draft) && ["agent", "client", "family"].includes(m.from && m.from.role)) ev.push(m.at); }); });
    (DB.tours || []).forEach((t) => { if (t.client === c.id && t.date && (t.status === "done" || t.status === "in_progress")) ev.push(t.date + " 12:00"); });
    if (c.lastTouch) ev.push(c.lastTouch + " 00:00");
    (DB.vjobs || []).forEach((j) => { if (j.contact === c.id && j.date && !j.deleted) ev.push(j.date + " 12:00"); });
    (DB.emails || []).forEach((e) => { if (e.from && c.name && e.from.indexOf(c.name) >= 0 && e.at) ev.push(e.at); });
    return ev;
  }
  function contactFacts(c) {
    const T = todayIso();
    const kindClass = ["client", "lead", "applicant"].includes(c.kind) ? "client" : "other";
    const stage = c.stage || (c.kind === "lead" ? "prospect" : "client");
    const deals = contactDeals(c);
    const dealFacts_ = deals.map(dealFacts);
    const hot = dealFacts_.some((f) => f.offerOpen || ["under_contract", "clear_to_close", "lease_pending"].includes(f.stage));
    const warm = dealFacts_.some((f) => ["listed", "applying"].includes(f.stage));
    const onlyClosed = deals.length > 0 && deals.every((d) => d.stage === "closed");
    const allLost = deals.length > 0 && deals.every((d) => ["terminated", "lost", "ended"].includes(d.stage));
    const touches = contactTouches(c);
    const last = maxStamp(touches);
    const daysSinceTouch = last ? diffDays(day(last), T) : null;
    const cad = c.cadence || (hot ? CFG().contact.cadence.hot : (stage === "prospect" || warm) ? CFG().contact.cadence.warm : CFG().contact.cadence.other);
    const touchOverdue = stage === "former" ? null : daysSinceTouch == null ? 0 : (daysSinceTouch - cad >= 0 ? daysSinceTouch - cad : null);
    const fam = familyIds(c.id).map((id) => DB.contacts.find((x) => x.id === id)).filter(Boolean);
    const bWho = birthdayWithin(c.birthday, 15) ? c : fam.find((x) => birthdayWithin(x.birthday, 15));
    const birthdaySoon = !!bWho;
    const dealDueF = dealFacts_.filter((f) => f.daysToDue != null).sort((a, b) => a.daysToDue - b.daysToDue)[0];
    const dealDue = dealDueF ? dealDueF.daysToDue : undefined;
    const tour48 = (DB.tours || []).some((t) => t.client === c.id && t.status !== "done" && t.date && diffDays(T, t.date) >= 0 && diffDays(T, t.date) <= TH().riskDays);
    const waitMe = (DB.threads || []).some((t) => t.contact === c.id && t.status === "waiting_agent");
    const suggest = !!window.NBComms && deals.some((d) => NBComms.waiting(d.id)); // v1.5：他的交易里有对方来信超过 replyHours 没回（comms.js）= 有沟通建议没处理
    const missing = !touches.length && !c.phone && !c.email && !c.wechat;
    return { id: c.id, kindClass, stage, hot, warm, onlyClosed, allLost, daysSinceTouch, lastAt: last, cadence: cad, touchOverdue: touchOverdue == null ? null : touchOverdue, birthdaySoon, birthdayWho: bWho ? (bWho.name + " " + String(bWho.birthday).replace("-", "/")) : "", dealFresh: dealFacts_.some((f) => f.fresh), dealDue: dealDue == null ? null : dealDue, dealDueLabel: dealDueF ? dueText(dealDueF) : "", anyHigh: dealFacts_.some((f) => f.priority === "high"), allLow: dealFacts_.length > 0 && dealFacts_.every((f) => f.priority === "low"), tour48, waitMe, suggest, missing, deals: dealFacts_ };
  }

  function propertyFacts(p) {
    const T = todayIso();
    const deals = DB.deals.filter((d) => d.property === p.id);
    const df = deals.map(dealFacts);
    const hot = df.some((f) => f.offerOpen || ["under_contract", "clear_to_close", "lease_pending"].includes(f.stage));
    const warm = df.some((f) => ["listed", "applying"].includes(f.stage));
    const managed = df.some((f) => f.stage === "active");
    const onlyClosed = deals.length > 0 && deals.every((d) => d.stage === "closed");
    const ended = deals.length > 0 && deals.every((d) => ["closed", "terminated", "lost", "ended"].includes(d.stage)) && !["prospect", "watching"].includes(p.relationship);
    const relationship = p.relationship || (p.target ? "prospect" : managed ? "managed" : onlyClosed ? "sold" : "off_market");
    const dueF = df.filter((f) => f.daysToDue != null).sort((a, b) => a.daysToDue - b.daysToDue)[0];
    const odF = df.filter((f) => f.overdue).sort((a, b) => b.overdueDays - a.overdueDays)[0];
    const freshItems = df.flatMap((f) => f.freshItems || []);
    const showDates = (DB.tours || []).flatMap((t) => t.homes.filter((h) => h.prop === p.id && h.visit && h.visit.arrived).map(() => t.date));
    const listedDeal = deals.find((d) => ["listed", "offer"].includes(d.stage) && d.type !== "buyer");
    const listedDays = listedDeal ? diffDays(listedDeal.created || listedDeal.effective || T, T) : null;
    const cold = listedDays != null && listedDays >= 14 && !showDates.some((dt) => diffDays(dt, T) <= 7 && diffDays(dt, T) >= 0);
    const evAt = [...df.map((f) => f.lastAt), ...showDates.map((dt) => dt + " 12:00")];
    const last = maxStamp(evAt);
    return { id: p.id, relationship, hot, warm, managed, onlyClosed, ended, fresh: freshItems.length > 0, freshItems, overdue: !!odF, overdueLabel: odF ? odF.overdueLabel : "", overdueDays: odF ? odF.overdueDays : 0, daysToDue: dueF ? dueF.daysToDue : null, dueLabel: dueF ? dueF.dueLabel : "", nextTouchDue: !!(p.nextTouch && p.nextTouch <= T), leaseDays: df.map((f) => f.leaseDays).filter((x) => x != null)[0], tour48: df.some((f) => f.tour48), cold, feedback: df.some((f) => f.feedback), daysSinceTouch: last ? diffDays(day(last), T) : null, lastAt: last };
  }

  // ---------- 排序 · 分组 · 重点关注 ----------
  const FACTS = { deal: dealFacts, contact: contactFacts, property: propertyFacts };
  const SCORE = { deal: scoreDeal, contact: scoreContact, property: scoreProperty };
  const SECTIONS = {
    deal: [["sec_action", 999], ["sec_active", 999], ["sec_lease", 999], ["sec_ended", 999]],
    contact: [["sec_today", 999], ["sec_active", 999], ["sec_greet", 5], ["sec_other", 8], ["sec_missing", 0], ["sec_former", 0], ["sec_nonclient", 8]],
    property: [["sec_action", 999], ["sec_active", 999], ["sec_managed", 999], ["sec_watch", 999], ["sec_other", 8], ["sec_ended", 999]],
  };
  function rank(kind, items) {
    return items.map((it) => { const f = FACTS[kind](it); const s = SCORE[kind](f); const top = s.reasons.filter((r) => r.w > 0).sort((a, b) => b.w - a.w).slice(0, 2); return Object.assign({ item: it, id: it.id, facts: f, top, pinned: isPinned(kind, it.id), ended: s.section === "sec_ended" || (kind === "contact" && f.stage === "former") }, s); })
      .sort((a, b) => b.score - a.score || (b.facts.lastAt || "").localeCompare(a.facts.lastAt || "") || String(a.id).localeCompare(String(b.id)));
  }
  function pinsOf(kind) { const u = user(); DB.pins = DB.pins || {}; DB.pins[u] = DB.pins[u] || {}; DB.pins[u][kind] = DB.pins[u][kind] || {}; return DB.pins[u][kind]; }
  function isPinned(kind, id) { return !!(((DB.pins || {})[user()] || {})[kind] || {})[id]; }
  function isManual(kind) { return !!(((DB.pinManual || {})[user()] || {})[kind]); }
  function setManual(kind, on) { DB.pinManual = DB.pinManual || {}; DB.pinManual[user()] = DB.pinManual[user()] || {}; DB.pinManual[user()][kind] = on; }
  function togglePin(kind, id) {
    const ps = pinsOf(kind);
    if (ps[id]) { delete ps[id]; return false; }
    const minPos = Math.min(0, ...Object.values(ps).map((x) => x.pos));
    ps[id] = { pos: minPos - 1, at: nowStamp() }; // 位置可插值：手动顺序下新加星排最前；没手动排过就按分数（pinnedOrder）
    return true;
  }
  function pinnedOrder(kind, ranked) {
    const ps = pinsOf(kind);
    const rows = ranked.filter((r) => ps[r.id]);
    if (isManual(kind)) return rows.sort((a, b) => ps[a.id].pos - ps[b.id].pos);
    // 规矩：默认按分数；拖过 / 点过上移下移之后才按手动顺序
    return rows.sort((a, b) => b.score - a.score || ps[a.id].pos - ps[b.id].pos);
  }
  function reorder(kind, ids) { const ps = pinsOf(kind); ids.forEach((id, i) => { if (ps[id]) ps[id].pos = i + 1; }); setManual(kind, true); }
  function move(kind, id, dir, currentIds) {
    const ids = currentIds.slice(); const i = ids.indexOf(id); if (i < 0) return;
    ids.splice(i, 1);
    const j = dir === "top" ? 0 : dir === "up" ? Math.max(0, i - 1) : Math.min(ids.length, i + 1);
    ids.splice(j, 0, id);
    reorder(kind, ids);
  }
  function resetManual(kind) { setManual(kind, false); }
  function markOpened(kind, id) {
    DB.opened = DB.opened || {}; const u = user(); DB.opened[u] = DB.opened[u] || {};
    const cur = DB.opened[u][kind + ":" + id]; const now = nowStamp();
    if (cur && cur.slice(0, 16) === now.slice(0, 16)) return false; // 同一分钟内不重复写
    DB.opened[u][kind + ":" + id] = now; return true;
  }
  function layout(kind, items, opts) {
    opts = opts || {};
    const ranked = rank(kind, items);
    const pinned = pinnedOrder(kind, ranked);
    const pinSet = new Set(pinned.map((r) => r.id));
    const rest = ranked.filter((r) => !pinSet.has(r.id));
    if (opts.flat) return { pinned, groups: [{ key: "all", label: "", rows: rest, collapse: 0 }], manual: isManual(kind), ranked };
    const groups = SECTIONS[kind].map(([key, limit]) => ({ key, label: label(key), rows: rest.filter((r) => r.section === key), collapse: limit })).filter((g) => g.rows.length);
    // 该问候了：最久没联系的排前面
    groups.forEach((g) => { if (g.key === "sec_greet") g.rows.sort((a, b) => (b.facts.daysSinceTouch == null ? 9999 : b.facts.daysSinceTouch) - (a.facts.daysSinceTouch == null ? 9999 : a.facts.daysSinceTouch)); if (g.key === "sec_nonclient") g.rows.sort((a, b) => (b.facts.lastAt || "").localeCompare(a.facts.lastAt || "")); });
    return { pinned, groups, manual: isManual(kind), ranked };
  }
  function explain(kind, item) { const f = FACTS[kind](item); const s = SCORE[kind](f); return Object.assign({ facts: f }, s); }
  function sectionLabel(k) { return label(k); }

  // ---------- v1.5 · 截止的颜色 · 交易健康度 · Broker 看板 · 导航角标（三端同一套，阈值只读 TH()）----------
  const relDay = (iso) => { const n = diffDays(todayIso(), iso); return n === 0 ? "今天" : n === 1 ? "明天" : n === -1 ? "昨天" : n > 0 ? `${n} 天后` : `${-n} 天前`; };
  const ENDED = ["closed", "ended", "terminated", "lost"];
  // 低置信：置信度低于 lowConfidence，或者来源是扫描 / 手写 / 拍照（extract.js：不管置信度写多高都按低置信处理）
  const isLowField = (f) => window.NBExtract ? NBExtract.isLow(f) : (f.conf != null && f.conf < TH().lowConfidence);
  // urgency：没日期 mute · 已过或 ≤ urgentDays 天红（bad）· ≤ soonDays 天黄（warn）· 其余 acc（两个 core 原来各写一份，数字一样，现在只在这里）
  function urgency(iso) { if (!iso) return "mute"; const n = diffDays(todayIso(), iso); return n <= TH().urgentDays ? "bad" : n <= TH().soonDays ? "warn" : "acc"; }
  // dealHealth：100 − 逾期任务 × 8 − 待确认字段 × 3 − （下一个节点 ≤ urgentDays 天 ? 10 : 0），夹在 35–100；healthTone 把分数变成颜色
  function dealHealth(d) {
    const T = todayIso();
    const od = (DB.tasks[d.id] || []).filter((x) => x.status === "pending" && x.due && x.due < T).length;
    const pf = (DB.fields[d.id] || []).filter((f) => f.status === "pending").length;
    const ms = (DB.milestones[d.id] || []).filter((m) => m.status === "pending" && m.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    const soon = ms && diffDays(T, ms.date) <= TH().urgentDays ? 10 : 0;
    return Math.max(35, Math.min(100, 100 - od * 8 - pf * 3 - soon));
  }
  const healthTone = (h) => h < 70 ? "bad" : h < 85 ? "warn" : "ok";
  // Broker 看板「风险交易」：soonDays 天内到期（含逾期）的节点 · 低置信字段没确认 · 合同期里合规缺件超过 2 项。返回 [{ d, kind, why }]
  function brokerRisks() {
    const T = todayIso(); const out = [];
    DB.deals.filter((d) => !ENDED.includes(d.stage)).forEach((d) => {
      (DB.milestones[d.id] || []).forEach((m) => { if (m.status === "pending" && m.date && diffDays(T, m.date) <= TH().soonDays) out.push({ d, kind: "deadline", ms: m.id, why: `${m.label} ${relDay(m.date)}` }); });
      const low = (DB.fields[d.id] || []).filter((f) => f.status === "pending" && isLowField(f));
      if (low.length) out.push({ d, kind: "lowconf", why: `${low.length} 个低置信字段未确认` });
      const miss = window.NBComp ? NBComp.missing(d.id) : ((DB.compliance || {})[d.id] || []).filter((x) => !x.ok && x.phase !== "post");
      if (d.stage === "under_contract" && miss.length > 2) out.push({ d, kind: "compliance", why: `缺关键文件 ${miss.length} 项` });
    });
    return out;
  }
  // 导航角标：urgentDays 天内到期（含逾期）的待办任务数
  function dueSoonCount() { const T = todayIso(); return Object.values(DB.tasks || {}).flat().filter((x) => x.status === "pending" && x.due && diffDays(T, x.due) <= TH().urgentDays).length; }

  window.NBScore = { TH, urgency, dealHealth, healthTone, brokerRisks, dueSoonCount, isLowField, scoreDeal, scoreContact, scoreProperty, dealFacts, contactFacts, propertyFacts, rank, layout, explain, isPinned, togglePin, isManual, reorder, move, resetManual, markOpened, user, label, sectionLabel, pinsOf, openedAt, freshOf, dealActivity, contactTouches, diffDays, L };
})();
