/* NewBee OS · 三端共用：工作流零件
   NBToday    今天页五块（需要你 / 有风险 / 在等对方 / 人情节点 / AI 已处理）+ 顶部一句话 —— 网站和经纪人 App 用同一套判断
   NBProp     AI 提议四档：T0 只记录 · T1 自动执行 + 事后通知（可撤销）· T2 我点了才写 · T3 Broker 批。批准 / 拒绝（要原因）/ 撤销（连它建出来的一起删）/ 先不改（第二天回来）
   NBCommit   「谁答应了谁」承诺表：等待 / 逾期 / 已兑现 · 催一下 · 兑现后解开它挡住的路线图节点
   NBVerify   「已核实」：钱和截止节点三态，核实要有证据
   NBNotify   经纪人通知四级：立刻打断 · 攒一小时 · 每天汇总 · 只进列表（每人可调，存在共享设置里）
   NBPack     阶段包：交易类型 + 阶段 → 默认露出的 tab / 字段档 / 动作 / 提示
   NBCapture  记一下：每条带唯一号，没网先存手机，有网再传（重试不记两遍）
   NBConflict 冲突卡：说法 vs 数据，点一下选哪个算数，选了才改
   NBComp     合规清单分四段（签约前 · 合同期 · 过户前 · 过户后）· 一次提交「合规 + CDA」（T3）· 过户那一步的门
   NBRent     租赁运营的规矩：维修审批门 · 续约提醒 90 / 60 / 30 · 申请 60 天 / 收入材料 30 天后删 · 房东名下的资产行
   NBAuto     延迟发送队列：总开关 / 分类开关 · 撤回的回到「需要你」
   NBMoney    钱：标已付 · 改金额 · 缺金额 · 可退吗 / 退找谁
   NBOrg      账单（底价 + 活跃席 + 闲置席 + AI 用量）· NBAi 调用记账 · NBCall 打电话前一张卡
   阈值（几天算快到了 · 低置信线 · 多久没回算待回复）只读 SCORE_CONFIG.thresholds；链接走 NBLink（当前这一端没有的页面不出链接）。
   真实版：packages/core 同名纯函数；迁移只增，编号轮到几号用几号。 */
(function () {
  const D = () => window.DB;
  const T = () => (window.TODAY ? TODAY() : D().today);
  const now = () => new Date().toTimeString().slice(0, 5);
  const stamp = () => T() + " " + now();
  const days = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
  const deal = (id) => (D().deals || []).find((x) => x.id === id);
  const contact = (id) => (D().contacts || []).find((x) => x.id === id);
  const nameOf = (id) => { const c = contact(id); if (c) return c.name; const o = (D().orgs || []).find((x) => x.id === id); return o ? o.name : id; };
  const audit = (did, what, actor, who) => { if (window.audit) window.audit(did, what, actor || "human", who); };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TH = () => (window.SCORE_CONFIG && SCORE_CONFIG.thresholds) || { riskDays: 2, soonDays: 3, urgentDays: 1, weekDays: 7, lowConfidence: 0.9, replyHours: 24 };
  const WEB = { deal: (id, sub) => `#/deals/${id}${sub ? "/" + sub : ""}`, contact: (id) => `#/contacts/${id}`, thread: (id) => `#/messages/${id}`, tour: (id) => `#/showings/${id}`, today: () => "#/today", automation: () => "#/automation", ai: () => "#/broker/ai", showings: () => "#/showings" };
  const link = (kind, id, sub) => window.NBLink ? NBLink.to(kind, id, sub) : (WEB[kind] ? WEB[kind](id, sub) : null);
  const isLow = (f) => window.NBExtract ? NBExtract.isLow(f) : (f.conf != null && f.conf < TH().lowConfidence);
  const short = (d) => (d && d.title ? d.title.split(" · ")[0] : "");
  const meName = () => (D().me || {}).name || "Jason";
  const usd = (n) => (window.money ? window.money(n) : "$" + Number(n || 0).toLocaleString("en-US"));
  const TERM = () => (window.NBRoadmap ? NBRoadmap.TERMINAL : ["closed", "terminated", "lost", "ended"]);
  const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ================= 承诺表 =================
  const CM_ST = { waiting: ["在等", "warn"], overdue: ["到点没兑现", "bad"], fulfilled: ["已兑现", "ok"], cancelled: ["已取消", "mute"] };
  const cmAll = () => (D().commitments = D().commitments || []);
  function cmRefresh() { const cur = stamp(); cmAll().forEach((c) => { if (c.status === "waiting" && c.due && c.due < cur) c.status = "overdue"; }); }
  const cmOpen = () => { cmRefresh(); return cmAll().filter((c) => c.status === "waiting" || c.status === "overdue").sort((a, b) => (a.due || "").localeCompare(b.due || "")); };
  const cmForDeal = (did) => { cmRefresh(); return cmAll().filter((c) => c.deal === did); };
  const cmForWho = (id) => { cmRefresh(); return cmAll().filter((c) => c.who === id); };
  function cmAdd(o) { const c = Object.assign({ id: "cm" + Date.now().toString(36), status: "waiting", nudges: [], created: stamp(), by: "human", tier: 2 }, o); cmAll().unshift(c); cmRefresh(); audit(c.deal, `承诺：${c.whoName || nameOf(c.who)} 答应「${c.what}」· ${c.due || "没定时间"}`, c.by === "ai" ? "ai" : "human"); return c; }
  function cmNudge(id, how) { const c = cmAll().find((x) => x.id === id); if (!c) return null; c.nudges.push({ at: stamp(), how: how || "消息" }); audit(c.deal, `催了一下 ${c.whoName || nameOf(c.who)}：${c.what}（第 ${c.nudges.length} 次）`); return c; }
  // 兑现：记证据；它挡住的路线图节点如果正好是当前节点 → 那条线往前走一步
  function cmFulfill(id, evidence) {
    const c = cmAll().find((x) => x.id === id); if (!c) return null;
    c.status = "fulfilled"; c.fulfilledAt = stamp(); if (evidence) c.evidence = evidence;
    let unlocked = null;
    const d = deal(c.deal);
    if (d && c.blocks && window.NBRoadmap) {
      const map = NBRoadmap.mapFor(d);
      map.phases.forEach((ph) => { (ph.lines || []).forEach((l) => { l.nodes.forEach((n) => { if (n.id === c.blocks && NBRoadmap.state(d, n.id) === "cur") { NBRoadmap.advance(d, "par", l.key); unlocked = { line: l, node: n }; } }); }); (ph.nodes || []).forEach((n) => { if (n.id === c.blocks && NBRoadmap.state(d, n.id) === "cur") { if (NBRoadmap.advance(d, ph.key)) unlocked = { node: n }; } }); });
    }
    audit(c.deal, `承诺兑现：${c.whoName || nameOf(c.who)} · ${c.what}${evidence ? "（" + evidence + "）" : ""}${unlocked ? " → 解开路线图「" + unlocked.node.t + "」" : ""}`, "system");
    return { c, unlocked };
  }
  function cmFromProposal(p) { const pl = p.payload || {}; return cmAdd({ deal: p.deal, who: pl.who, whoName: pl.whoName, what: pl.what, due: pl.due, source: pl.source, blocks: pl.blocks || null, by: "ai", tier: p.tier }); }
  const cmLabel = (c) => CM_ST[c.status] || [c.status, "mute"];
  const cmDueText = (c) => { if (!c.due) return "没定时间"; const [dd, tm] = c.due.split(" "); const n = days(T(), dd); const rel = n === 0 ? "今天" : n === 1 ? "明天" : n === -1 ? "昨天" : n > 0 ? `${n} 天后` : `${-n} 天前`; return `${rel} ${tm || ""}`.trim(); };
  window.NBCommit = { ST: CM_ST, all: cmAll, open: cmOpen, forDeal: cmForDeal, forWho: cmForWho, add: cmAdd, nudge: cmNudge, fulfill: cmFulfill, fromProposal: cmFromProposal, label: cmLabel, dueText: cmDueText, refresh: cmRefresh };

  // ================= 已核实 =================
  const VERIFY_KEYS = ["option_fee_due", "em_due", "cd", "closing", "funding", "commission", "cda", "deposit", "first_rent", "wire"];
  const vRequired = (m) => !!m && (VERIFY_KEYS.includes(m.key) || /定金|Earnest|Option fee|Closing Disclosure|过户|押金|首月|电汇|佣金/.test(m.label || ""));
  const vState = (m) => m.status !== "done" ? "todo" : (m.verified ? "verified" : "done");
  function vVerify(did, mid, evidence, by) { const m = ((D().milestones || {})[did] || []).find((x) => x.id === mid); if (!m) return null; if (m.status !== "done") m.status = "done"; m.verified = { at: stamp(), by: by || meName(), evidence: evidence || "—" }; audit(did, `已核实：${m.label}（${m.verified.evidence}）`, "human"); return m; }
  function vUnverified() { const out = []; Object.entries(D().milestones || {}).forEach(([did, arr]) => { const d = deal(did); if (!d || TERM().includes(d.stage)) return; (arr || []).forEach((m) => { if (vRequired(m) && vState(m) === "done") out.push({ did, m }); }); }); return out; }
  const vBadge = (m) => { const s = vState(m); return s === "verified" ? `<span class="badge ok" title="${(m.verified.evidence || "").replace(/"/g, "&quot;")}">已核实 ✓</span>` : s === "done" ? `<span class="badge warn">做了 · 待核实</span>` : ""; };
  window.NBVerify = { KEYS: VERIFY_KEYS, required: vRequired, state: vState, verify: vVerify, unverified: vUnverified, badge: vBadge };

  // ================= 延迟发送队列（AI 自动化）=================
  // 进队列的只有两种（R-3）：人已经点过的对外动作（你放行的 AI 草稿 / 话术 · 你点的催办 · 你点了「给卖家看」的看房反馈 · Broker 批过的 T3）和通知契约里的固定提醒；等 5 分钟再发，之前随时撤回。没人点过的 AI 文字进不来。
  // 总开关关着 → 队列整个暂停（paused）；某一类的开关关着 → 那一类不进队列；撤回的动作不丢，回到今天页「需要你」，可以再发或不发了。
  const auto = () => { const a = (D().automation = D().automation || {}); a.queue = a.queue || []; a.switches = a.switches || []; if (a.masterOn == null) a.masterOn = true; return a; };
  const swOn = (cat) => { const s = auto().switches.find((x) => x.key === cat); return !s || s.on !== false; };
  // o = { title, d, deal, cat, text? }；返回队列项；这一类的开关关着 → null（没有进队列）
  function qAdd(o) { const a = auto(); if (o.cat && !swOn(o.cat)) return null; const q = Object.assign({ id: newId("q"), at: 300, status: a.masterOn ? "queued" : "paused", created: stamp() }, o); a.queue.unshift(q); return q; }
  const qActive = () => auto().queue.filter((q) => q.status === "queued" || q.status === "paused");
  const qRevoked = () => auto().queue.filter((q) => q.status === "revoked");
  // 队列项带 ls（卖家看房反馈那一场，tours.js showToSeller）：放行（released）≠ 卖家看到（shown）——发出（deliver）那一刻才 shown；撤回 = 回到没放行，再发 = 重新放行
  const lsReleased = (q, on) => { if (!q || !q.ls) return; const s = (D().listingShowings || []).find((x) => x.id === q.ls); if (!s) return; if (on) { s.released = true; s.releasedAt = s.releasedAt || stamp(); } else { delete s.released; delete s.releasedAt; } };
  // 这一行是哪条提议放行出来的（client_text 的回复 / 话术）：撤回 = 回到草稿——提议回到「需要你」的确认卡，它发出去的消息 / 记录一起撤
  const qOrigin = (q) => props().find((p) => p.status === "approved" && (p.created || []).some((x) => x.coll === "queue" && x.id === q.id)) || null;
  function qRevoke(id) {
    const q = auto().queue.find((x) => x.id === id); if (!q || !["queued", "paused"].includes(q.status)) return null;
    const p = qOrigin(q);
    if (p) { propUndo(p.id); p.status = "pending"; delete p.undoneAt; delete p.by; delete p.approvedAt; p.created = []; p.undo = []; q.status = "dropped"; q.revokedAt = stamp(); q.backTo = p.id; audit(q.deal || null, `延迟发送撤回：${q.title}（没发出去，回到草稿 · 确认卡又在「需要你」里）`, "human"); return q; }
    q.status = "revoked"; q.revokedAt = stamp(); lsReleased(q, false); audit(q.deal || null, `延迟发送撤回：${q.title}（没发出去，回到「需要你」）`, "human"); return q;
  }
  function qRequeue(id) { const q = auto().queue.find((x) => x.id === id); if (!q || q.status !== "revoked") return null; if (q.cat && !swOn(q.cat)) return { blocked: true, q }; q.status = auto().masterOn ? "queued" : "paused"; q.at = 300; delete q.revokedAt; lsReleased(q, true); audit(q.deal || null, `撤回的动作重新进延迟队列：${q.title}`, "human"); return q; }
  function qDrop(id) { const q = auto().queue.find((x) => x.id === id); if (!q || q.status !== "revoked") return null; q.status = "dropped"; audit(q.deal || null, `撤回的动作不发了：${q.title}`, "human"); return q; }
  // 影子没有真的倒计时：「模拟：5 分钟到了」= 发出（sent）。发出之后不能撤回；卖家看房反馈这时才给卖家看到（shown）
  function qDeliver(id) { const q = auto().queue.find((x) => x.id === id); if (!q || q.status !== "queued") return null; q.status = "sent"; q.sentAt = stamp(); q.at = 0; if (q.ls) { const s = (D().listingShowings || []).find((x) => x.id === q.ls); if (s) { s.shown = true; s.shownAt = stamp(); } } audit(q.deal || null, `延迟发送已发出：${q.title}（5 分钟到了 · 不能再撤回）`, "system"); return q; }
  const qFlush = () => auto().queue.filter((q) => q.status === "queued").map((q) => qDeliver(q.id)).filter(Boolean);
  const qSent = () => auto().queue.filter((q) => q.status === "sent");
  // 机构级的开关改动：修改记录里记一条，Broker 的审计卡（DB.auditEvents，影子里是另一份数据）也记一条
  const orgEvent = (what) => { audit(null, what, "human"); (D().auditEvents = D().auditEvents || []).unshift({ at: stamp(), who: isBroker() ? brokerName() : meName(), what, kind: "policy" }); };
  function qSetMaster(on) { const a = auto(); a.masterOn = !!on; a.queue.forEach((q) => { if (!on && q.status === "queued") q.status = "paused"; if (on && q.status === "paused") q.status = "queued"; }); orgEvent(`AI 自动化总开关 → ${on ? "开（队列继续）" : "关（队列暂停，一条也不发）"}`); return a; }
  function qSetSwitch(key, on) { const s = auto().switches.find((x) => x.key === key); if (!s) return null; s.on = !!on; orgEvent(`AI 自动化 · ${s.name} → ${on ? "开" : "关（这一类不再进队列）"}`); return s; }
  window.NBAuto = { enqueue: qAdd, queue: qActive, revoked: qRevoked, sent: qSent, revoke: qRevoke, requeue: qRequeue, drop: qDrop, deliver: qDeliver, flush: qFlush, origin: qOrigin, setMaster: qSetMaster, setSwitch: qSetSwitch, switchOn: swOn };

  // ================= AI 调用记账 =================
  // gate = "out"（门卫判定和业务无关、没有调模型）→ 不计费，成本记 0
  function aiLog(o) { const row = Object.assign({ at: stamp(), kind: "助手", model: "haiku", cost: 0, deal: null, reviewer: "—", flag: false }, o || {}); if (row.gate === "out") row.cost = 0; (D().aiCalls = D().aiCalls || []).unshift(row); return row; }
  window.NBAi = { log: aiLog };

  // ================= AI 提议（四档）=================
  const props = () => (D().proposals = D().proposals || []);
  const propById = (id) => props().find((x) => x.id === id);
  const isBroker = (actor) => (actor && actor.role ? actor.role === "broker" : !!(D().ui && D().ui.role === "broker"));
  const brokerName = () => ((((D().org || {}).members || []).find((m) => m.role === "broker") || {}).name || "Broker") + "（Broker）";
  const actorName = (actor) => (actor && actor.name && !isBroker(actor) ? actor.name : isBroker(actor) ? brokerName() : meName());
  // T0 / T1 从来不是等你批的卡：有就直接算已自动执行（可撤销到第二天）
  function propNormalize() { props().forEach((p) => { if (p.status === "pending" && Number(p.tier) <= 1) { p.status = "auto"; p.undoUntil = p.undoUntil || window.__d(1); } }); }
  // 等谁点：经纪人 = T2（含冲突卡 / 承诺卡）；Broker = T3。「先不改」搁置的到第二天自己回来
  function propPending(actor) {
    propNormalize(); const day = T();
    props().forEach((p) => { if (p.status === "snoozed" && p.snoozeUntil && p.snoozeUntil <= day) { p.status = "pending"; p.wokeAt = day; delete p.snoozeUntil; } });
    const broker = isBroker(actor);
    return props().filter((p) => p.status === "pending" && (Number(p.tier) === 3) === broker);
  }
  // 经纪人这边「已发给 Broker · 等批」的 T3
  const propWaitingBroker = () => props().filter((p) => p.status === "pending" && Number(p.tier) === 3);
  // 最低档（决定 D14）：给客户看的文字 ≥ T2 · 涉钱 ≥ T2 · CDA 和发给对方 / title / lender 的 = T3。新建提议时低于这个数的自动抬上来；「AI 档位」设置页也读这张表
  const TIER_MIN = { client_text: 2, money_date: 2, offer_version: 2, cda: 3, outbound: 3 };
  const minTier = (type) => TIER_MIN[type] || 0;
  // 新建一条提议。T0 → logged；T1 → auto（调用方已经做了动作，把 created / undo 带进来）；T2 / T3 → pending。key 相同且还在等的不重复建
  function propAdd(o) {
    if (o.key) { const ex = props().find((p) => p.key === o.key && p.status === "pending"); if (ex) return ex; }
    const tier = Math.max(Number(o.tier == null ? 2 : o.tier), minTier(o.type));
    const p = Object.assign({ id: newId("pr"), status: tier === 0 ? "logged" : tier === 1 ? "auto" : "pending", at: stamp(), cost: 0 }, o, { tier });
    if (p.status === "auto" && !p.undoUntil) p.undoUntil = window.__d(1);
    props().unshift(p); return p;
  }
  // 批准之后真正做的事；每做一样都记进 p.created（建出来的）/ p.undo（改掉之前的值），撤销时照着还原
  function propEffect(p) {
    const pl = p.payload || {}; const made = (p.created = p.created || []); const undo = (p.undo = p.undo || []); const notes = [];
    const addTask = (did, name, due, assignee, note) => { D().tasks[did] = D().tasks[did] || []; const t = { id: newId("t"), name, rule: "助手建的", due: due || null, assignee: assignee || meName(), status: "pending", clientVisible: false, note: note || "来自 AI 提议 " + p.id }; D().tasks[did].push(t); made.push({ coll: "tasks", deal: did, id: t.id }); return t; };
    if (p.type === "commitment") { const c = cmFromProposal(p); made.push({ coll: "commitments", id: c.id }); notes.push(`已记成承诺：${c.whoName || nameOf(c.who)} → ${c.what}`); }
    if (p.type === "note") {
      if (pl.contactNote) { const c = contact(pl.contactNote.contact); if (c) { undo.push({ coll: "contacts", id: c.id, set: { notes: c.notes || "" } }); c.notes = (c.notes ? c.notes + "；" : "") + pl.contactNote.text; notes.push(`记到 ${c.name} 的备注`); } }
      if (pl.task && p.deal) { addTask(p.deal, pl.task, pl.due, pl.assignee); notes.push("已建任务"); }
      if (pl.openHouse) { // Open House 登记里没有经纪的访客 → 各建一个线索联系人 + 一条跟进任务
        const oh = (D().marketing || {}).openHouse || { signins: [] };
        (pl.openHouse.signins || []).forEach((i) => { const s = oh.signins[i]; if (!s || s.followup === "done") return; undo.push({ coll: "signins", idx: i, set: { followup: s.followup } }); s.followup = "done"; const c = { id: newId("c"), name: s.name, kind: "lead", stage: "prospect", tags: ["线索", "Open House"], phone: s.phone, source: "Open House · " + s.source, lang: s.wechat ? "zh" : "en", channel: s.wechat ? "微信" : "电话" }; D().contacts.push(c); made.push({ coll: "contacts", id: c.id }); addTask(p.deal || oh.deal, `跟进 Open House 访客 ${s.name}`, pl.due || window.__d(1), pl.assignee); });
        notes.push("已建线索联系人 + 跟进任务");
      }
    }
    if (p.type === "offer_version" && window.NBOffers && pl.offer) { const v = NBOffers.counter(p.deal, pl.offer, pl.patch || {}, pl.who || "theirs"); if (pl.by) v.by = pl.by; made.push({ coll: "offerVersions", deal: p.deal, offer: pl.offer, v: v.v }); notes.push(`Offer ${pl.offer} 记成 v${v.v}`); }
    if (p.type === "cda") { // Broker 批了「合规 + CDA」：锁数、出 CDA、开过户的门
      const com = (D().commission || {})[p.deal]; if (com) { undo.push({ coll: "commission", deal: p.deal, set: { cda: com.cda || null } }); com.cda = [{ st: "申请", at: (p.at || stamp()).slice(0, 10) }, { st: "Broker 批准", at: T() }]; }
      const cs = ((D().complianceState = D().complianceState || {})[p.deal] = D().complianceState[p.deal] || { proposal: p.id }); undo.push({ coll: "complianceState", deal: p.deal, set: { approvedAt: cs.approvedAt || null, by: cs.by || null } }); cs.approvedAt = stamp(); cs.by = p.by; cs.proposal = cs.proposal || p.id;
      notes.push("已锁数并出 CDA · 过户的门打开");
    }
    if (p.type === "outbound") { const q = qAdd({ title: p.title, d: `${short(deal(p.deal))} · Broker 已批（T3）· 5 分钟后发出`, deal: p.deal, cat: "party_nudge" }); if (q) { made.push({ coll: "queue", id: q.id }); notes.push("进了 5 分钟延迟队列"); } else notes.push("「催协作方」开关关着：没有发出"); }
    if (p.type === "client_text") {
      if (pl.message && window.NBMsg) { const m0 = pl.message; const th = m0.thread ? NBMsg.thread(m0.thread) : NBMsg.ensureThread({ kind: m0.kind || "client", deal: m0.deal || p.deal || null, contact: m0.contact || null, members: m0.contact ? [m0.contact] : [], subject: m0.subject || short(deal(m0.deal || p.deal)) }); const m = NBMsg.send({ thread: th.id, from: { role: "agent", id: (D().me || {}).id, name: meName() }, kind: "text", text: m0.text, attach: m0.attach, ai: { tier: 2, approvedBy: p.by, approvedAt: stamp() } }); made.push({ coll: "messages", id: m.id }); notes.push("已发到对话"); }
      if (pl.reply) { const r = pl.reply; const row = { id: newId("cl"), deal: r.deal || p.deal, at: stamp(), channel: r.channel || "email", dir: "out", who: r.to || null, whoName: r.toName || "", text: r.text, by: meName(), awaiting: true }; (D().commLog = D().commLog || []).unshift(row); made.push({ coll: "commLog", id: row.id }); const q = qAdd({ title: "回复：" + (r.toName || ""), d: `${short(deal(row.deal))} · AI 起草 · 你已放行 · 5 分钟后发出`, deal: row.deal, cat: r.cat || "party_nudge" }); if (q) made.push({ coll: "queue", id: q.id }); notes.push(q ? "回复进了 5 分钟延迟队列" : "这一类的开关关着：只记了一条，没有发出"); }
    }
    if (p.type === "intake" && pl.doc) { const doc = Object.assign({ id: newId("doc"), deal: p.deal, pages: 1, type: "trec_1_4", uploaded: T(), sha: "in" + Date.now().toString(36).slice(-4) + "…", locked: false, sourceKind: "text", source: "邮件附件 · 归档后进件" }, pl.doc); (D().documents = D().documents || []).unshift(doc); made.push({ coll: "documents", id: doc.id }); addTask(p.deal, `核对进件：${doc.name}（字段 tab 逐条确认）`, T(), meName()); notes.push(`文件「${doc.name}」已归到交易，建了一条核对任务`); }
    return notes.join(" · ");
  }
  // 批准。actor = { role: "agent" | "broker", name }（缺省 = 当前界面身份）。T3 只有 Broker 能批：经纪人点了只会得到「已发给 Broker · 等批」
  function propApprove(id, actor) {
    const p = propById(id); if (!p) return { ok: false, why: "没有这条提议" };
    if (p.status !== "pending") return { ok: false, why: "这条已经处理过了" };
    if (p.type === "conflict") return { ok: false, why: "冲突卡要在卡上选一边（以这个为准）" };
    if (Number(p.tier) === 3 && !isBroker(actor)) return { ok: false, t3: true, why: "T3 · 已发给 Broker · 等批（经纪人自己批不了）" };
    p.status = "approved"; p.by = actorName(actor); p.approvedAt = stamp();
    const note = propEffect(p);
    audit(p.deal, `提议 ${p.id} 批准：${p.title}${note ? " → " + note : ""}`, "human", p.by);
    return { ok: true, p, note };
  }
  // 这个身份能不能点「批准」（卡片上要不要画批准按钮）· 卡片上那行档位说明（T3 在经纪人这边 = 已发给 Broker · 等批）
  const propCanApprove = (p, actor) => !!p && p.status === "pending" && p.type !== "conflict" && (Number(p.tier) !== 3 || isBroker(actor));
  const propTierText = (p, actor) => ({ 0: "只记录", 1: "自动执行 + 事后通知（可撤销）", 2: "需要你确认", 3: isBroker(actor) ? "需要你批（Broker）" : "已发给 Broker · 等批" })[Number(p.tier)] || "";
  const REJECT_PRESETS = ["信息不对", "已经处理过了", "现在不需要", "要先问客户"];
  // 拒绝 / 退回：要一句原因，写进修改记录。经纪人也可以撤回自己发给 Broker 的 T3
  function propReject(id, reason, actor) {
    const p = propById(id); if (!p) return { ok: false, why: "没有这条提议" };
    if (p.status !== "pending") return { ok: false, why: "这条已经处理过了" };
    p.status = "rejected"; p.reason = (reason || "").trim() || "没写原因"; p.by = actorName(actor); p.rejectedAt = stamp();
    if (p.type === "cda") { const cs = (D().complianceState || {})[p.deal]; if (cs && cs.proposal === p.id) { cs.returnedAt = stamp(); cs.returnReason = p.reason; } }
    audit(p.deal, `提议 ${p.id} ${isBroker(actor) ? "退回" : "拒绝"}：${p.title} · 原因：${p.reason}`, "human", p.by);
    return { ok: true, p };
  }
  const setPath = (o, path, v) => { const ks = path.split("."); let x = o; ks.slice(0, -1).forEach((k) => { x = x[k] = x[k] || {}; }); x[ks[ks.length - 1]] = v; };
  function dropCreated(x) {
    const D0 = D(); const cut = (arr, f) => { const i = (arr || []).findIndex(f); if (i >= 0) { arr.splice(i, 1); return 1; } return 0; };
    if (x.coll === "commitments") return cut(D0.commitments, (c) => c.id === x.id);
    if (x.coll === "tasks") return cut((D0.tasks || {})[x.deal], (t) => t.id === x.id);
    if (x.coll === "milestones") return cut((D0.milestones || {})[x.deal], (m) => m.id === x.id);
    if (x.coll === "documents") return cut(D0.documents, (d) => d.id === x.id);
    if (x.coll === "contacts") return cut(D0.contacts, (c) => c.id === x.id);
    // 发到对话里的消息：撤回成一行「已撤回」（留痕）。消息在标签页之间是按 id 合并的，直接删掉会被另一个标签页合并回来
    if (x.coll === "messages") { const m = (D0.messages || []).find((y) => y.id === x.id); if (!m || m.retracted) return 0; const st = window.NBMsg ? NBMsg.stamp() : stamp(); const t = (D0.threads || []).find((y) => y.id === m.thread); if (t && t.lastText === m.text) { t.lastText = "（这条消息已撤回）"; t.upd = st; } Object.assign(m, { kind: "system", from: { role: "system", name: "系统" }, text: "（这条消息已撤回）", retracted: true, upd: st }); delete m.attach; delete m.ai; return 1; }
    if (x.coll === "commLog") return cut(D0.commLog, (c) => c.id === x.id);
    if (x.coll === "queue") return cut((D0.automation || {}).queue, (q) => q.id === x.id);
    if (x.coll === "calendar") return cut(D0.calendar, (c) => c.id === x.id);
    if (x.coll === "offerVersions" && window.NBOffers) { const o = NBOffers.byId(x.deal, x.offer); return o && o.versions.length > 1 ? cut(o.versions, (v) => v.v === x.v) : 0; }
    return 0;
  }
  function restore(u) {
    const D0 = D(); let row = null;
    if (u.coll === "deals") { const d = deal(u.id); if (!d) return 0; if (u.path) setPath(d, u.path, u.value); if (u.set) Object.assign(d, u.set); if (window.NBRoadmap) NBRoadmap.syncStage(d); return 1; }
    if (u.coll === "milestones" || u.coll === "tasks" || u.coll === "money") row = ((D0[u.coll] || {})[u.deal] || []).find((x) => x.id === u.id);
    if (u.coll === "contacts") row = contact(u.id);
    if (u.coll === "signins") row = (((D0.marketing || {}).openHouse || {}).signins || [])[u.idx];
    if (u.coll === "commission") row = (D0.commission || {})[u.deal];
    if (u.coll === "complianceState") row = (D0.complianceState || {})[u.deal];
    if (u.coll === "tours") { const t = (D0.tours || []).find((x) => x.id === u.id); row = t && u.home ? t.homes.find((h) => h.id === u.home) : t; }
    if (!row || !u.set) return 0;
    Object.keys(u.set).forEach((k) => { if (u.set[k] === null && ["cda", "approvedAt", "by", "verified", "calendar"].includes(k)) delete row[k]; else row[k] = u.set[k]; });
    return 1;
  }
  // 撤销：T1 自动做的（撤销期内）和已批准的都能撤——它建出来的记录删掉、改掉的值还原
  function propUndo(id) {
    const p = propById(id); if (!p || !["auto", "approved"].includes(p.status)) return { ok: false, why: "这条没有可撤销的" };
    if (p.status === "auto" && p.undoUntil && p.undoUntil < T()) return { ok: false, why: "过了可撤销的时间" };
    let removed = 0, restored = 0;
    (p.created || []).slice().reverse().forEach((x) => { removed += dropCreated(x); });
    (p.undo || []).slice().reverse().forEach((u) => { restored += restore(u); });
    p.status = "undone"; p.undoneAt = stamp(); delete p.picked;
    audit(p.deal, `提议 ${p.id} 撤销：${p.title}（删掉它建的 ${removed} 条 · 还原 ${restored} 处）`, "human");
    return { ok: true, p, removed, restored };
  }
  // 先不改：搁到第二天再回来
  function propSnooze(id) { const p = propById(id); if (!p || p.status !== "pending") return null; p.status = "snoozed"; p.snoozedAt = stamp(); p.snoozeUntil = window.__d(1); audit(p.deal, `冲突卡先不改：${p.title}（明天再提醒）`); return p; }
  window.NBProp = { all: props, byId: propById, add: propAdd, normalize: propNormalize, pending: propPending, waitingBroker: propWaitingBroker, canApprove: propCanApprove, tierText: propTierText, TIER_MIN, minTier, approve: propApprove, reject: propReject, undo: propUndo, snooze: propSnooze, REJECT_PRESETS, isBroker };

  // ================= 通知四级 =================
  const LEVELS = { 1: ["立刻打断", "bad"], 2: ["攒一小时一批", "warn"], 3: ["每天一条汇总", "acc"], 4: ["只进列表不推", "mute"] };
  const policy = () => D().notifyPolicy || [];
  const level = (key) => { const ov = window.NBSet ? NBSet.notifyLevel(key) : null; if (ov) return ov; const p = policy().find((x) => x.key === key); return p ? p.level : 4; };
  function setLevel(key, lv) { if (window.NBSet) NBSet.setNotifyLevel(key, lv); }
  function resetLevels() { if (window.NBSet) NBSet.resetNotify(); }
  // 今天会发出的通知（从数据算出来，按级分组）
  function digest() {
    const out = []; const today = T(); const push = (key, text, href) => out.push({ key, level: level(key), text, href, label: (policy().find((x) => x.key === key) || {}).label || key });
    Object.entries(D().tasks || {}).forEach(([did, arr]) => (arr || []).forEach((x) => { if (x.status === "pending" && x.due === today) push("due_today", `今天截止：${x.name}`, link("deal", did, "tasks")); }));
    Object.entries(D().milestones || {}).forEach(([did, arr]) => (arr || []).forEach((m) => { if (m.status === "pending" && m.date === today) push("due_today", `今天截止：${m.label}`, link("deal", did, "milestones")); }));
    Object.entries(D().money || {}).forEach(([did, arr]) => (arr || []).forEach((m) => { if (m.status === "due" && m.due && days(today, m.due) <= TH().riskDays) push("money", `钱：${m.label} ${m.amount == null ? "金额待定" : usd(m.amount)} · ${m.to}`, link("deal", did, "money")); }));
    propPending().forEach((p) => { if (p.type === "conflict") push("conflict", p.title, link("today")); });
    // 客户点了同意 / 决定卡有答复：只算今天的；「需要商量」只出一条
    (window.NBMsg ? NBMsg.messages() : []).forEach((m) => { const r = m.kind === "request" && m.request; if (!r) return; if (r.status === "discuss") push("client_agreed", `需要商量：${r.title}`, link("thread", m.thread)); else if (r.action === "decide" && r.status === "done" && (r.doneAt || "").startsWith(today)) push("client_agreed", `客户决定卡有答复：${r.title} → ${r.answer || ""}`, link("thread", m.thread)); });
    Object.entries(D().offers || {}).forEach(([did, arr]) => (arr || []).forEach((o) => {
      if (o.clientAgreedAt && o.clientAgreedAt.startsWith(today)) push("client_agreed", `客户点了「同意」：${short(deal(did))} · ${o.buyer || ""}（只记同意，对方签字后才变合同）`, link("deal", did, "offers"));
      if (window.NBOffers && NBOffers.isOpen(o) && o.expires && o.expires.slice(0, 10) <= window.__d(TH().urgentDays)) push("negotiation", `Offer 到期：${o.buyer || ""} ${o.expires}`, link("deal", did, "offers"));
    }));
    (window.NBMsg ? NBMsg.messages() : []).filter((m) => m.kind === "text" && m.from && m.from.role === "client" && m.at && m.at.startsWith(today) && !(m.seen && m.seen.agent)).forEach((m) => push("new_message", `新消息：${m.from.name}：${(m.text || "").slice(0, 30)}`, link("thread", m.thread)));
    (D().documents || []).filter((x) => (x.uploaded || x.at) === today).forEach((x) => push("new_doc", `新文件：${x.name}`, link("deal", x.deal, "docs")));
    cmOpen().filter((c) => c.status === "overdue").forEach((c) => push("commitment_overdue", `${c.whoName || nameOf(c.who)} 答应的「${c.what}」到点没兑现`, link("deal", c.deal, "commitments")));
    moments().forEach((m) => push("touch_due", m.text, m.href));
    (D().tours || []).filter((t) => t.status === "done" && t.date === today).forEach((t) => push("tour_feedback", `看房完成：${(contact(t.client) || {}).name} ${t.homes.length} 套`, link("showings")));
    // v1.7：别的经纪约看我的挂牌——要我批的 / 升级给我的（第 1 级）· 当天约好 / 自动确认的（第 4 级只进列表）· 当天被拒 / 过期的（第 2 级）· 看完 24 小时没反馈（第 3 级）
    if (window.NBLShow) {
      NBLShow.escalateCheck(); const lsLink = link("lshow") || link("today"); const dayOf = (x) => String(x || "").slice(0, 10);
      NBLShow.needsMe().forEach(({ s, d }) => push("showing_request", `约看申请：${s.agent} 约 ${NBLShow.when(s)} 看 ${short(d)} · ${NBLShow.statusLabel(s)}`, lsLink));
      NBLShow.rows("all").forEach(({ s, d }) => {
        if (s.status === "confirmed" && dayOf(s.confirmedAt || s.requestedAt) === today) push("showing_confirmed", `约好了${(s.approver || NBLShow.approverOf(d)) === "auto" ? "（自动确认）" : ""}：${s.agent} ${NBLShow.when(s)} 看 ${short(d)}`, lsLink);
        if ((s.status === "declined" && dayOf(s.declinedAt) === today) || (s.status === "expired" && dayOf(s.expiredAt) === today)) push("showing_declined", `约看${s.status === "declined" ? "被拒" : "过期"}：${s.agent} ${NBLShow.when(s)} 看 ${short(d)}`, lsLink);
      });
      NBLShow.feedbackDue().forEach(({ s, d }) => push("feedback_ask", `去要反馈：${short(d)} · ${NBLShow.when(s)} ${s.agent} 看完 ${TH().feedbackAskHours} 小时没反馈（AI 起草，你自己发）`, lsLink));
    }
    qActive().forEach((q) => push("ai_done", `延迟发送（可撤回）：${q.title}`, link("automation")));
    (D().deals || []).forEach((d) => { const low = ((D().fields || {})[d.id] || []).filter((f) => f.status === "pending" && isLow(f)).length; if (low) push("other", `${short(d)} · ${low} 个低置信字段`, link("deal", d.id, "fields")); });
    return out.sort((a, b) => a.level - b.level);
  }
  const counts = () => { const c = { 1: 0, 2: 0, 3: 0, 4: 0 }; digest().forEach((n) => { c[n.level]++; }); return c; };
  window.NBNotify = { LEVELS, policy, level, setLevel, reset: resetLevels, digest, counts };

  // ================= 阶段包 =================
  function packFor(d) { const t = window.NBRoadmap ? NBRoadmap.typeOf(d) : (d.type || "buyer"); const packs = (D().stagePacks || {})[t] || {}; const st = window.NBRoadmap && !NBRoadmap.TERMINAL.includes(d.stage) ? NBRoadmap.stageOf(d) : d.stage; return Object.assign({ stage: st, type: t, tabs: ["overview", "milestones", "fields", "docs"], tier: "minimal", actions: [], tip: "" }, packs[st] || packs[Object.keys(packs)[0]] || {}, { stage: st, type: t }); }
  window.NBPack = { for: packFor };

  // ================= 记一下 =================
  const caps = () => (D().captures = D().captures || []);
  const uid = () => "cap-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // AI 归属：先看当前上下文（打开的交易 / 客户），再看文字里有没有地址 / 名字；都没有 → 需要确认
  function guess(text, ctx) {
    const t = (text || "").toLowerCase(); let did = ctx && ctx.deal || null, cid = ctx && ctx.contact || null; let how = did || cid ? "当前页面" : "";
    if (!did) { const d = (D().deals || []).find((x) => { const p = (D().properties || []).find((y) => y.id === x.property); return p && t.includes(p.addr.split(",")[0].toLowerCase().split(" ")[0]); }); if (d) { did = d.id; how = "文字里有地址"; } }
    if (!cid) { const c = (D().contacts || []).find((x) => x.name && t.includes(x.name.toLowerCase())); if (c) { cid = c.id; how = how || "文字里有名字"; } }
    if (!did && cid) { const d = (D().deals || []).find((x) => x.primary === cid && !TERM().includes(x.stage)); if (d) did = d.id; }
    if (!cid && did) { const d = deal(did); if (d) cid = d.primary; }
    return { deal: did, contact: cid, how, sure: !!(did || cid) && how !== "" };
  }
  function capAdd(o) {
    const offline = !!(D().ui && D().ui.offline) || (typeof navigator !== "undefined" && navigator.onLine === false);
    const c = Object.assign({ uid: uid(), at: stamp(), mode: "text", text: "", deal: null, contact: null, synced: !offline, attributed: o.attributed || "confirmed" }, o);
    if (caps().some((x) => x.uid === c.uid)) return caps().find((x) => x.uid === c.uid); // 幂等：同一唯一号不记两遍
    caps().unshift(c);
    if (c.synced) capApply(c);
    return c;
  }
  // 上传后落到哪：这条记录本身就是交易沟通时间线里的一行（comms.js）；再写一条修改记录，像任务的句子顺手建任务，挂了人就更新「最近联系」
  function capApply(c) {
    if (c.applied) return; c.applied = true;
    audit(c.deal, `记一下（${{ voice: "语音", photo: "照片", text: "一句话" }[c.mode] || c.mode}）：${c.text}${c.contact ? " · " + nameOf(c.contact) : ""}`, "human");
    if (/提醒|明天|记得|要|跟进|发|问|查|约/.test(c.text || "") && c.deal) { D().tasks[c.deal] = D().tasks[c.deal] || []; D().tasks[c.deal].push({ id: "t" + Date.now().toString(36), name: c.text.slice(0, 40), rule: "记一下", due: window.__d(1), assignee: meName(), status: "pending", clientVisible: false, note: "来自记一下 " + c.uid }); c.task = true; }
    if (c.contact) { const ct = contact(c.contact); if (ct) ct.lastTouch = T(); }
  }
  function capSync() { let n = 0; caps().forEach((c) => { if (!c.synced) { c.synced = true; c.syncedAt = stamp(); capApply(c); n++; } }); return n; }
  const capPending = () => caps().filter((c) => !c.synced);
  window.NBCapture = { all: caps, add: capAdd, sync: capSync, pending: capPending, guess, uid };

  // ================= 冲突卡 =================
  function conflictApply(p, side) {
    const pl = p.payload || {}; const pick = side === "a" ? pl.a : pl.b; const ap = pl.apply || {}; let note = ""; p.undo = p.undo || []; p.created = p.created || [];
    if (ap.kind === "milestone") { const m = ((D().milestones || {})[ap.deal] || []).find((x) => x.id === ap.ms); if (m) { if (m.date !== pick.value) p.undo.push({ coll: "milestones", deal: ap.deal, id: m.id, set: { date: m.date, manual: m.manual || false, source: m.source || null } }); m.date = pick.value; m.manual = true; m.source = pick.src; note = `里程碑「${m.label}」改为 ${pick.label}`; } }
    if (ap.kind === "offer" && window.NBOffers) { const o = NBOffers.byId(ap.deal, ap.offer); if (o) { const patch = {}; patch[ap.key] = pick.value; const v = NBOffers.counter(ap.deal, ap.offer, patch, "theirs"); v.by = "对方（按邮件更正）"; p.created.push({ coll: "offerVersions", deal: ap.deal, offer: ap.offer, v: v.v }); note = `Offer ${o.id} 记成 v${v.v}：${ap.key} = ${pick.label}`; } }
    if (ap.kind === "money") { const mo = ((D().money || {})[ap.deal] || []).find((x) => x.id === ap.mo); if (mo) { p.undo.push({ coll: "money", deal: ap.deal, id: mo.id, set: { status: mo.status } }); mo.status = pick.value; note = `钱「${mo.label}」改为 ${pick.label}`; } }
    p.status = "approved"; p.by = meName(); p.picked = side; p.resolvedAt = stamp();
    audit(p.deal, `冲突卡：以「${pick.src}」为准（${pick.label}）· 另一边「${(side === "a" ? pl.b : pl.a).src}」${note ? " → " + note : ""}`, "human");
    return note;
  }
  function conflictCard(p, opts) {
    opts = opts || {}; const pl = p.payload || {}; const btn = opts.small ? "btn xs" : "btn sm"; const d = p.deal ? deal(p.deal) : null; const dh = d ? link("deal", d.id) : null;
    const col = (k, x) => `<div class="cf-side"><div class="cf-k">${k === "a" ? "一边说" : "系统里"}</div><div class="cf-src">${esc(x.src)}</div><div class="cf-q">“${esc(x.quote || "")}”</div><div class="cf-v">${esc(x.label)}</div><div class="cf-at">${esc(x.at || "")}</div><button class="${btn} ${k === "a" ? "pri" : ""}" data-action="prop-pick" data-arg="${p.id}|${k}">以这个为准</button></div>`;
    return `<div class="confirm conflict"><div class="row between"><span class="t">T${p.tier} · 说了 ≠ 事实</span><span class="badge bad">冲突</span></div><div class="cf-title">${esc(p.title)}</div><div class="cf-grid">${col("a", pl.a || {})}${col("b", pl.b || {})}</div><div class="ev">${esc(p.evidence)}${d ? (dh ? ` · <a href="${dh}">${esc(d.title)}</a>` : ` · ${esc(d.title)}`) : ""}</div><div class="acts"><button class="${btn} ghost" data-action="prop-pick" data-arg="${p.id}|skip">先不改</button></div></div>`;
  }
  window.NBConflict = { apply: conflictApply, card: conflictCard };

  // ================= 合规：四段 · 一次提交 · 过户的门 =================
  const PHASES = [["pre", "签约前"], ["contract", "合同期"], ["close", "过户前"], ["post", "过户后"]];
  const compList = (did) => (D().compliance || {})[did] || [];
  const compOk = (c) => !!(c.ok || c.na);
  const compByPhase = (did) => PHASES.map(([key, label]) => { const items = compList(did).filter((c) => (c.phase || "contract") === key); const ok = items.filter(compOk).length; return { key, label, items, ok, total: items.length, done: items.length > 0 && ok === items.length }; }).filter((x) => x.total);
  // 过户前要齐的 = 签约前 + 合同期 + 过户前三段；过户后那一段成交后再收
  const compMissing = (did) => compList(did).filter((c) => c.phase !== "post" && !compOk(c));
  const compCounts = (did) => { const pre = compList(did).filter((c) => c.phase !== "post"), post = compList(did).filter((c) => c.phase === "post"); return { ok: pre.filter(compOk).length, total: pre.length, post: post.length, postOk: post.filter(compOk).length }; };
  const compReady = (did) => { const c = compCounts(did); return c.total > 0 && c.ok === c.total; };
  // 现在这笔交易的阶段该齐到哪一段了（今天页「合规」风险只报已经该齐的）
  const PHASE_AT = { under_contract: 1, clear_to_close: 2, closed: 3 };
  const compDue = (did) => { const d = deal(did); const upto = d ? (PHASE_AT[d.stage] || 0) : 0; return compList(did).filter((c) => !compOk(c) && PHASES.findIndex((x) => x[0] === (c.phase || "contract")) <= upto); };
  // 状态：open 还差几项 · ready 可以提交 · submitted 已发给 Broker · 等批 · returned Broker 退回 · approved Broker 已批（CDA 已出，过户的门开了）
  function compState(did) {
    const cs = (D().complianceState || {})[did] || {}; const all = props().filter((x) => x.type === "cda" && x.deal === did && x.status !== "undone");
    const p = (cs.proposal && propById(cs.proposal)) || all[0] || null; const miss = compMissing(did);
    if ((cs.approvedAt && (!p || p.status === "approved")) || (p && p.status === "approved")) return { key: "approved", label: "Broker 已批准 · CDA 已出", p, at: cs.approvedAt || (p && p.approvedAt) || null, by: cs.by || (p && p.by) || null };
    if (p && p.status === "pending") return { key: "submitted", label: "已发给 Broker · 等批", p, at: cs.submittedAt || p.at };
    if (p && p.status === "rejected" && !miss.length && cs.returnedAt) return { key: "returned", label: "Broker 退回：" + (p.reason || ""), p };
    return miss.length || !compList(did).length ? { key: "open", label: compList(did).length ? `过户前还差 ${miss.length} 项` : "这笔交易没有合规清单", p: null } : { key: "ready", label: "过户前清单齐了 · 可以提交 Broker 审核", p: null };
  }
  // CDA 最晚哪天提交：过户前 3 个工作日
  function cdaDue(did) { const d = deal(did); if (!d || !d.closing) return null; const x = new Date(d.closing + "T00:00:00"); let n = 3; while (n > 0) { x.setDate(x.getDate() - 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; } const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; }
  // 一次提交「合规 + CDA」（T3）：过户前那三段 100% 才能提交；建一条 T3 提议，在经纪人 ↔ Broker 的对话里放一张审批卡
  function compSubmit(did) {
    const d = deal(did); if (!d) return { ok: false, why: "没有这笔交易" };
    const st = compState(did);
    if (st.key === "submitted") return { ok: false, why: "已经发给 Broker 了 · 等批" };
    if (st.key === "approved") return { ok: false, why: "Broker 已经批过了" };
    if (!compReady(did)) { const miss = compMissing(did); return { ok: false, why: miss.length ? `过户前的合规清单还差 ${miss.length} 项：${miss.map((c) => c.item).join("、")}` : "这笔交易没有合规清单" }; }
    const c = compCounts(did); const com = (D().commission || {})[did]; const addr = short(d);
    const p = propAdd({ type: "cda", tier: 3, deal: did, title: `合规 + CDA 申请 · ${addr}${com ? " · 佣金 " + usd(com.gci) : ""}`, evidence: `${d.closing ? "预计过户 " + d.closing + " · " : ""}过户前清单 ${c.ok} / ${c.total}${c.post ? "（过户后 " + c.post + " 项另收）" : ""}` });
    (D().complianceState = D().complianceState || {})[did] = { submittedAt: stamp(), proposal: p.id };
    if (window.NBMsg) { const th = NBMsg.ensureThread({ kind: "broker", deal: did, anchor: { type: "deal", id: did }, subject: `合规 + CDA 审批 · ${addr}` }); NBMsg.send({ thread: th.id, from: { role: "agent", id: (D().me || {}).id, name: meName() }, kind: "request", text: `${addr}${d.closing ? " 预计 " + d.closing + " 过户" : ""}。过户前清单 ${c.ok} / ${c.total} 已齐${c.post ? "（过户后的 " + c.post + " 项另收）" : ""}，CDA 一起提交。`, request: { action: "approve", to: "broker", title: p.title + "（T3）", due: cdaDue(did), options: [{ label: "批准", outcome: "done" }, { label: "退回", outcome: "declined" }], effect: { type: "proposal", proposal: p.id } }, attach: [{ type: "proposal", id: p.id, label: `提议 ${p.id} · 合规 + CDA` }] }); }
    audit(did, `提交 Broker 审核：合规 + CDA（T3）· 过户前清单 ${c.ok} / ${c.total}`, "human");
    return { ok: true, p };
  }
  // 过户这一步的门：有合规清单的交易，过户前三段要齐 + Broker 批了「合规 + CDA」才放行；没有清单的交易不挡
  function compGate(did) {
    if (!compList(did).length) return { ok: true };
    const miss = compMissing(did); if (miss.length) return { ok: false, why: `过户前的合规清单还差 ${miss.length} 项（${miss[0].item}${miss.length > 1 ? " 等" : ""}）：补齐并提交 Broker 审核后才能点「过户 · 交房」` };
    const st = compState(did);
    if (st.key !== "approved") return { ok: false, why: st.key === "submitted" ? "合规 + CDA 已发给 Broker · 等批；批了才能点「过户 · 交房」" : "合规清单齐了，还没提交 Broker 审核（合规 + CDA）：先在合规 tab 提交" };
    return { ok: true };
  }
  // 成交之后：过户后那一段（Closing Statement …）没收到的每一项变成一条待办
  function compAfterClose(did) {
    const post = compList(did).filter((c) => c.phase === "post" && !compOk(c)); if (!post.length) return 0;
    D().tasks[did] = D().tasks[did] || []; let n = 0;
    post.forEach((c) => { const name = `过户后收：${c.item}`; if (D().tasks[did].some((t) => t.name === name)) return; D().tasks[did].push({ id: newId("t"), name, rule: "合规清单 · 过户后", due: window.__d(3), assignee: meName(), status: "pending", clientVisible: false }); n++; });
    if (n) audit(did, `成交：过户后还要收 ${n} 项合规材料（已建任务）`, "system");
    return n;
  }
  // 撤销了「过户 · 交房」：成交时建的、还没做的「过户后收：…」任务收回（做过的留着）
  function compUndoAfterClose(did) { const arr = (D().tasks || {})[did] || []; const keep = arr.filter((t) => !(t.rule === "合规清单 · 过户后" && t.status === "pending")); const n = arr.length - keep.length; if (n) { D().tasks[did] = keep; audit(did, `撤销过户：收回 ${n} 条「过户后收」任务`, "system"); } return n; }
  window.NBComp = { PHASES, list: compList, isOk: compOk, byPhase: compByPhase, missing: compMissing, due: compDue, counts: compCounts, ready: compReady, state: compState, cdaDue, submit: compSubmit, gate: compGate, afterClose: compAfterClose, undoAfterClose: compUndoAfterClose };

  // ================= 租赁运营的规矩 =================
  const RETENTION = { application: 60, income: 30 }; // 申请材料 60 天后自动删 · 收入材料 30 天后删（只留核实后的数字）
  const RENEWAL = [90, 60, 30];                       // 续约提醒：到期前 90 / 60 / 30 天
  const PETS = { max: 2, lb: 40 };                    // 样例房东书面标准：≤ 2 只 · 每只 ≤ 40 lb
  const orders = () => ((D().rentals || {}).orders || []);
  const woById = (id) => orders().find((x) => x.id === id);
  const woThreshold = (wo) => (wo && wo.threshold != null ? Number(wo.threshold) : ((D().rentals || {}).threshold != null ? Number(D().rentals.threshold) : null));
  // 要不要房东批：工单在「报价审批」这一步 · 报价超过门槛 · 还没批
  const woNeedsApproval = (wo) => !!wo && wo.stage === 2 && wo.cost != null && woThreshold(wo) != null && Number(wo.cost) > woThreshold(wo) && !wo.approved;
  function woDispatch(wo) { D().vjobs = D().vjobs || []; if (!wo.vendor || D().vjobs.some((j) => j.wo === wo.id)) return null; const v = contact(wo.vendor) || {}; const j = { id: newId("j"), contact: wo.vendor, deal: wo.deal, cats: (v.vcats || []).slice(0, 1), date: T(), what: `${wo.id} · ${wo.what}`, cost: wo.cost || 0, by: "me", wo: wo.id }; D().vjobs.unshift(j); return j; }
  function woQuote(id, cost, vendor) { const wo = woById(id); if (!wo) return null; wo.cost = Number(cost); if (vendor) wo.vendor = vendor; wo.approved = false; delete wo.declined; if (wo.stage < 2) wo.stage = 2; audit(wo.deal, `${wo.id} 报价 ${usd(wo.cost)}${woNeedsApproval(wo) ? " · 超过门槛 " + usd(woThreshold(wo)) + " → 要房东批" : " · 没超门槛"}`, "human"); return wo; }
  // 往前走一步；被审批门挡住时不动
  function woAdvance(id) { const wo = woById(id); if (!wo) return { ok: false, why: "没有这张工单" }; if (woNeedsApproval(wo)) return { ok: false, why: `报价 ${usd(wo.cost)} 超过房东设的 ${usd(woThreshold(wo))} 门槛：房东批了才能派单` }; if (wo.stage >= wo.stages.length - 1) return { ok: false, why: "已经是最后一步" }; wo.stage += 1; if (wo.stage === 3) woDispatch(wo); audit(wo.deal, `${wo.id} → ${wo.stages[wo.stage]}`, "human"); return { ok: true, wo }; }
  function woApprove(id, by) { const wo = woById(id); if (!wo) return null; wo.approved = true; wo.approvedBy = by || "房东"; wo.approvedAt = stamp(); delete wo.declined; if (wo.stage === 2) { wo.stage = 3; woDispatch(wo); } audit(wo.deal, `${wo.id} 房东已批准（${wo.approvedBy}）→ 派单 Vendor`, "human", wo.approvedBy); return { wo, note: `${wo.id} 房东已批准 → 派单 Vendor` }; }
  function woDecline(id, reason, by) { const wo = woById(id); if (!wo) return null; wo.approved = false; wo.declined = { at: stamp(), by: by || "房东", reason: reason || "" }; audit(wo.deal, `${wo.id} 房东没批${reason ? "（" + reason + "）" : ""}· 工单留在报价审批`, "human", by); return { wo, note: `${wo.id} 房东没批${reason ? "（" + reason + "）" : ""} · 工单留在报价审批，不施工` }; }
  const addDay = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
  // 这份租约的三次续约提醒：[{ n, date, done }]
  function renewalDates(d) { if (!d || !d.leaseEnd) return []; const ms = (D().milestones || {})[d.id] || []; return RENEWAL.map((n) => { const m = ms.find((x) => x.key === "renewal_" + n); const date = m ? m.date : addDay(d.leaseEnd, -n); return { n, date, done: m ? m.status === "done" : date < T() }; }); }
  const nextRenewal = (d) => renewalDates(d).find((x) => !x.done) || null;
  // 房东名下的资产行：他是房东的每一笔放租交易一行（房东 = 交易的主联系人，或各方里「房东」那一方）
  function rentAssets(cid) {
    const mine = (d) => d.type === "lessor" && (d.primary === cid || (D().parties || []).some((p) => p.deal === d.id && p.party === cid && p.side === "ours"));
    return (D().deals || []).filter(mine).map((d) => { const p = (D().properties || []).find((x) => x.id === d.property) || {}; const tp = (D().parties || []).find((x) => x.deal === d.id && x.side === "theirs" && /租客/.test(x.role || "")); const nr = nextRenewal(d); return { deal: d.id, property: d.property, addr: p.addr || short(d), stage: d.stage, rent: d.price, tenant: tp ? nameOf(tp.party) : "", tenantRole: tp ? tp.role : "", leaseEnd: d.leaseEnd || null, daysLeft: d.leaseEnd ? days(T(), d.leaseEnd) : null, renewal: nr, openOrders: orders().filter((o) => o.deal === d.id && o.stage < o.stages.length - 1).length }; });
  }
  window.NBRent = { RETENTION, RENEWAL, PETS, orders, byId: woById, threshold: woThreshold, needsApproval: woNeedsApproval, quote: woQuote, advance: woAdvance, approve: woApprove, decline: woDecline, renewalDates, nextRenewal, assets: rentAssets };

  // ================= 钱 =================
  const moneyRow = (did, id) => ((D().money || {})[did] || []).find((x) => x.id === id);
  const moneyMissing = (m) => m.amount == null || m.amount === "";
  function moneyPaid(did, id, how) { const m = moneyRow(did, id); if (!m) return null; if (moneyMissing(m)) return { blocked: true, why: "还没有金额：先填金额再标已付" }; m.status = "paid"; m.paidAt = T(); m.paidBy = meName(); if (how) m.how = how; audit(did, `钱：${m.label} ${usd(m.amount)} 标已付`, "human"); return m; }
  function moneyAmount(did, id, amount) { const m = moneyRow(did, id); if (!m) return null; const v = amount === "" || amount == null || isNaN(Number(amount)) ? null : Number(amount); (m.history = m.history || []).push({ at: stamp(), from: m.amount == null ? null : m.amount, to: v, by: meName() }); m.amount = v; audit(did, `钱：${m.label} 金额改为 ${v == null ? "待定" : usd(v)}`, "human"); return m; }
  // 两句人话：可退吗 / 退找谁
  const moneyMeta = (m) => ({ missing: moneyMissing(m), refund: m.refund || "以合同条款为准", refundWho: m.refundWho || "—" });
  window.NBMoney = { row: moneyRow, missing: moneyMissing, markPaid: moneyPaid, setAmount: moneyAmount, meta: moneyMeta };

  // ================= 账单 =================
  // 账单 = 底价（含 Broker 席位）+ 活跃席单价 × N + 闲置席单价 × N + AI 实际用量。活跃席 = 当月有 ≥ 1 笔活跃交易的经纪人
  function bill() {
    const o = D().org || {}; const p = o.plan || { base: 0, active: 0, idle: 0 }; const ms = (o.members || []).filter((m) => m.role !== "broker");
    const active = ms.filter((m) => Number(m.deals) >= 1).length, idle = ms.length - active; const ai = Number(o.aiUsed) || 0;
    const lines = [["底价（含 Broker 席位）", p.base], [`活跃席 $${p.active} × ${active}`, p.active * active], [`闲置席 $${p.idle} × ${idle}`, p.idle * idle], ["AI 实际用量", ai]];
    return { base: p.base, active, idle, ai, lines, total: Math.round(lines.reduce((s, x) => s + Number(x[1] || 0), 0) * 100) / 100 };
  }
  window.NBOrg = { bill, seatOf: (m) => (m.role === "broker" ? "included" : Number(m.deals) >= 1 ? "active" : "idle") };

  // ================= 今天页五块 =================
  const KIND_RISK = () => `${TH().riskDays * 24} 小时`;
  function needsYou() {
    const out = []; const broker = isBroker();
    propPending().forEach((p) => out.push({ kind: p.type === "conflict" ? "冲突" : p.type === "commitment" ? "承诺" : broker ? "等你批" : "待确认", t: p.title, d: p.evidence, href: link("today"), id: "prop|" + p.id, p }));
    qRevoked().forEach((q) => out.push({ kind: "撤回了", t: `撤回的动作：${q.title}`, d: `${q.d || ""} · 没发出去：再发，或不发了`, href: link("automation"), id: "rq|" + q.id, q, deal: q.deal || null }));
    vUnverified().forEach(({ did, m }) => out.push({ kind: "待核实", t: `${m.label} 做了，还没核实`, d: `${(deal(did) || {}).title || ""} · 钱 / 截止节点要有证据（哪份文件 · 哪个字段）`, href: link("deal", did, "milestones"), id: "verify|" + did + "|" + m.id }));
    const asked = {};
    (window.NBMsg ? NBMsg.messages() : []).forEach((m) => {
      const r = m.kind === "request" && m.request; if (!r) return;
      if (r.status === "discuss") { const ans = (r.decision && r.decision.answers) || {}; const many = r.decision && (r.decision.deciders || []).length > 1; out.push({ kind: "需要商量", t: many && new Set(Object.values(ans)).size > 1 ? `${r.title}：两位决策人答得不一样` : `${r.title}：客户想先商量`, d: (Object.keys(ans).length ? Object.entries(ans).map(([cid, a]) => `${nameOf(cid)}：${a}`).join(" · ") : `${nameOf(r.by)}：${r.answer || ""}`) + " → 打个电话", href: link("thread", m.thread), id: "discuss|" + m.id }); }
      if (r.status === "pending" && r.to === "agent" && !broker) { asked[m.thread] = true; out.push({ kind: "等你回答", t: r.title, d: `${(m.from || {}).name || ""} · ${m.at}${r.due ? " · 截止 " + r.due : ""}`, href: link("thread", m.thread), id: "ask|" + m.id }); }
    });
    if (window.NBMsg) NBMsg.threads().forEach((t) => {
      if (t.status !== "waiting_agent" || asked[t.id]) return;
      if (t.kind === "client") out.push({ kind: "客户在等你回", t: `${t.subject}：${t.lastText || ""}`, d: `${(contact(t.contact) || {}).name || ""} · ${t.lastAt}`, href: link("thread", t.id), id: "thread|" + t.id });
      else if (t.kind === "broker" && !t.broadcast && !broker) out.push({ kind: "Broker 回了", t: `${t.subject}：${t.lastText || ""}`, d: `${brokerName()} · ${t.lastAt}`, href: link("thread", t.id), id: "thread|" + t.id, deal: t.deal || null }); // Broker 在对话里回了话 / 批了 / 退回了
    });
    Object.entries(D().tasks || {}).forEach(([did, arr]) => (arr || []).forEach((x) => { if (x.status === "pending" && x.due === T()) out.push({ kind: "今天到期", t: x.name, d: `${(deal(did) || {}).title || ""} · ${x.assignee}`, href: link("deal", did, "tasks"), id: "task|" + did + "|" + x.id, task: { did, x } }); }));
    // 对方来信超过 replyHours 没回（comms.js；这个文件单独加载时没有这一类）
    if (window.NBComms) (D().deals || []).forEach((d) => { if (TERM().includes(d.stage)) return; const w = NBComms.waiting(d.id); if (w) out.push({ kind: "待回复", t: `${short(d)} · ${w.who || ""}：${(w.text || "").slice(0, 40)}`, d: `${NBComms.CHANNEL[w.channel] || w.channel} · ${w.at} · 超过 ${TH().replyHours} 小时没回`, href: link("deal", d.id, "comms"), id: "reply|" + d.id, deal: d.id }); });
    // 预约请求备好了还没点发送（D19：发送是你点的）
    if (window.NBTours) (D().tours || []).forEach((t) => { if (t.status === "done" || t.date < T()) return; t.homes.forEach((h) => { if (NBTours.reqState(h) === "ready") out.push({ kind: "待你发送", t: `${h.addr.split(",")[0]} 的预约请求备好了`, d: `${(contact(t.client) || {}).name || ""} · ${NBToursLabel(t)} · 你点发送`, href: link("tour", t.id), id: "send|" + t.id + "|" + h.id }); }); });
    capPending().forEach((c) => out.push({ kind: "没网 · 待上传", t: `记一下：${c.text.slice(0, 30)}`, d: "有网自动上传（唯一号 " + c.uid + "）", href: link("today"), id: "cap|" + c.uid }));
    // v1.7：别的经纪约看我的挂牌——要我批的 + 等卖家 / 租客批超时升级给我的（lshow.js；先跑一次升级检查）。排在冲突 / 待确认之后、任务之前；「批准」永远是我在 BrokerBay 那一场里点，这里的按钮只打开链接 / 模拟邮件
    if (window.NBLShow && !broker) { NBLShow.escalateCheck(); NBLShow.needsMe().forEach(({ s, d }) => { const ap = s.approver || NBLShow.approverOf(d); out.push({ kind: "约看申请", t: `${s.agent} 约 ${NBLShow.when(s)} 看 ${short(d)}`, d: ap === "me" ? "要你批 · 打开邮件里 BrokerBay 那一场点批准" : `等${NBLShow.approverWord(d)}批超过 ${TH().showingEscalateHours} 小时 / 离看房不到 ${TH().showingSoonHours} 小时 → 升级给你，可以替他批`, href: link("deal", d.id), id: "lsreq|" + s.id, ls: s, deal: d.id }); }); }
    // 先出需要「拍板」的：冲突卡 → 两位决策人不一致 → 承诺卡 → 约看申请（排在任务之前）；其余按原顺序（稳定排序）
    const PRI = { "冲突": 0, "需要商量": 1, "承诺": 2, "没网 · 待上传": 3, "约看申请": 5, "今天到期": 6, "待回复": 6, "待你发送": 6 }; // 没列的（待确认 · 撤回了 · 待核实 · 等你回答 · 客户在等你回 …）= 4
    return out.map((x, i) => [x, i]).sort((a, b) => ((PRI[a[0].kind] ?? 4) - (PRI[b[0].kind] ?? 4)) || (a[1] - b[1])).map((x) => x[0]);
  }
  const overdueTasks = () => { const out = []; Object.entries(D().tasks || {}).forEach(([did, arr]) => (arr || []).forEach((x) => { if (x.status === "pending" && x.due && x.due < T()) out.push({ did, x, n: -days(T(), x.due) }); })); return out; };
  function atRisk() {
    const out = []; const th = TH(); const today = T();
    overdueTasks().forEach(({ did, x, n }) => out.push({ kind: "逾期", t: x.name, d: `${(deal(did) || {}).title || ""} · 逾期 ${n} 天${n >= 4 ? " · 已推送催办" : n >= 2 ? " · 今天必做" : ""}`, href: link("deal", did, "tasks"), id: "od|" + did + "|" + x.id, n, deal: did, date: x.due, task: { did, x } }));
    (D().deals || []).forEach((d) => {
      if (TERM().includes(d.stage)) return;
      ((D().milestones || {})[d.id] || []).forEach((m) => {
        if (m.status !== "pending" || !m.date || m.kind !== "deadline") return; const n = days(today, m.date);
        if (n < 0) out.push({ kind: "逾期", t: `${short(d)} · ${m.label}`, d: `${window.fd ? fd(m.date) : m.date} · 已过 ${-n} 天${m.rule ? " · " + m.rule : ""}`, href: link("deal", d.id, "milestones"), id: "odm|" + d.id + "|" + m.id, n: -n, deal: d.id, date: m.date });
        else if (n <= th.riskDays) out.push({ kind: KIND_RISK(), t: `${short(d)} · ${m.label}`, d: `${window.fd ? fd(m.date) : m.date}${m.rule ? " · " + m.rule : ""}`, href: link("deal", d.id, "milestones"), id: "ms|" + d.id + "|" + m.id, deal: d.id, date: m.date });
      });
      ((D().offers || {})[d.id] || []).forEach((o) => { if (window.NBOffers && NBOffers.isOpen(o) && o.expires && o.expires.slice(0, 10) <= window.__d(th.riskDays)) out.push({ kind: "谈判", t: `${short(d)} · Offer 到期（${o.buyer || ""}）`, d: `${o.expires} 前要回复`, href: link("deal", d.id, "offers"), id: "of|" + d.id + "|" + o.id, deal: d.id, date: o.expires.slice(0, 10) }); });
      const low = ((D().fields || {})[d.id] || []).filter((f) => f.status === "pending" && isLow(f)); if (low.length) out.push({ kind: "低置信", t: `${short(d)} · ${low.length} 个低置信字段`, d: low.map((f) => f.label).join("、") + `（置信度低于 ${th.lowConfidence}，或来源是扫描 / 手写 / 拍照）`, href: link("deal", d.id, "fields"), id: "lf|" + d.id, deal: d.id });
      // 路线图节点自己估的日期（这笔交易还没有对应的里程碑）才在这里报；有里程碑的已经在上面了，不报两遍
      if (window.NBRoadmap && d.rm) { const nd = NBRoadmap.dues(d).find((x) => x.est); if (nd && nd.days <= th.riskDays) out.push({ kind: "路线图截止", t: `${short(d)} · ${nd.node.t}（估）`, d: nd.days < 0 ? `已过 ${-nd.days} 天` : nd.days === 0 ? "今天截止" : `还剩 ${nd.days} 天`, href: link("deal", d.id, "milestones"), id: "rm|" + d.id + "|" + nd.node.id, deal: d.id, date: nd.date }); }
      const miss = compDue(d.id); if (miss.length) out.push({ kind: "合规", t: `${short(d)} · 合规缺 ${miss.length} 项：${miss[0].item}${miss.length > 1 ? " 等" : ""}`, d: miss[0].evidence || "", href: link("deal", d.id, "compliance"), id: "cp|" + d.id, deal: d.id });
    });
    const seen = {}; return out.filter((x) => seen[x.id] ? false : (seen[x.id] = true)).sort((a, b) => (a.n != null ? -1 : 0) - (b.n != null ? -1 : 0) || (a.date || "").localeCompare(b.date || ""));
  }
  const NBToursLabel = (t) => (window.NBTours ? NBTours.dayLabel(t.date) : t.date) + " " + t.start;
  function waiting() {
    const out = [];
    cmOpen().forEach((c) => out.push({ kind: c.status === "overdue" ? "到点没兑现" : "答应了", t: `${c.whoName || nameOf(c.who)} → ${c.what}`, d: `${cmDueText(c)}${c.nudges.length ? " · 催过 " + c.nudges.length + " 次" : ""}${c.blocks ? " · 挡着路线图下一步" : ""}`, href: link("deal", c.deal, "commitments"), id: "cm|" + c.id, c, deal: c.deal }));
    // v1.7（排在承诺之后，别的等待之前：都是今天就要动的）：别的经纪约看我的挂牌——等卖家 / 租客批、还没升级的（不推）；看完 24 小时没反馈的（第 3 级汇总；「要反馈」= AI 起草一句，你自己发）
    if (window.NBLShow && !isBroker()) {
      NBLShow.escalateCheck();
      NBLShow.waitingSeller().forEach(({ s, d }) => out.push({ kind: `等${NBLShow.approverWord(d)}批`, t: `${s.agent} 约 ${NBLShow.when(s)} 看 ${short(d)}`, d: `${TH().showingEscalateHours} 小时没人批或离看房不到 ${TH().showingSoonHours} 小时会升级给你`, href: link("deal", d.id), id: "lswait|" + s.id, ls: s, deal: d.id }));
      NBLShow.feedbackDue().forEach(({ s, d }) => out.push({ kind: "等反馈", t: `${short(d)} · ${NBLShow.when(s)} ${s.agent} 看完 ${TH().feedbackAskHours} 小时没反馈`, d: "点「要反馈」AI 起草一句，你自己发", href: link("deal", d.id), id: "lsfb|" + s.id, ls: s, deal: d.id }));
    }
    if (window.NBMsg) NBMsg.messages().forEach((m) => { if (m.kind === "request" && m.request && m.request.status === "pending" && m.request.to === "client") { const t = NBMsg.thread(m.thread); out.push({ kind: "等客户", t: `${m.request.title}`, d: `${t ? (contact(t.contact) || {}).name || "" : ""} · 发出 ${m.at}${m.request.due ? " · 截止 " + m.request.due : ""}`, href: link("thread", m.thread), id: "req|" + m.id }); } });
    (D().tours || []).forEach((t) => { if (t.status !== "done" && t.date >= T()) t.homes.forEach((h) => { if (h.status === "booking" && (!window.NBTours || NBTours.reqState(h) === "sent")) out.push({ kind: "等回执", t: `${h.addr.split(",")[0]} 的看房确认`, d: `${(contact(t.client) || {}).name || ""} · ${NBToursLabel(t)}`, href: link("tour", t.id), id: "bk|" + t.id + "|" + h.id }); }); });
    (D().commLog || []).filter((c) => c.awaiting && c.dir === "out").forEach((c) => out.push({ kind: "等回信", t: `${c.whoName || nameOf(c.who) || ""}：${(c.text || "").slice(0, 40)}`, d: `${short(deal(c.deal))} · 发出 ${c.at}`, href: link("deal", c.deal, "comms"), id: "aw|" + c.id, deal: c.deal }));
    // T3：经纪人这边只显示「已发给 Broker · 等批」，没有批准按钮（Broker 身份下它们在「需要你」里）
    if (!isBroker()) propWaitingBroker().forEach((p) => out.push({ kind: "等 Broker 批", t: p.title, d: `T3 · 已发给 Broker · 等批${p.at ? " · " + p.at : ""}`, href: p.deal ? link("deal", p.deal, p.type === "cda" ? "compliance" : null) : link("today"), id: "t3|" + p.id, prop: p, deal: p.deal }));
    return out;
  }
  function moments() {
    const out = []; const Tm = T(); const md = Tm.slice(5); const yr = Number(Tm.slice(0, 4));
    const within = (mmdd, n) => { if (!mmdd) return null; const cand = [`${yr}-${mmdd}`, `${yr + 1}-${mmdd}`]; for (const c of cand) { const k = days(Tm, c); if (k >= 0 && k <= n) return k; } return null; };
    (D().contacts || []).forEach((c) => { const k = within(c.birthday, 15); if (k != null && ["client", "lead", "family"].includes(c.kind)) out.push({ kind: "生日", t: `${c.name} ${k === 0 ? "今天生日" : k + " 天后生日"}`, d: c.tags ? c.tags.join(" · ") : "", href: link("contact", c.id), id: "bd|" + c.id, text: `${c.name} ${k === 0 ? "今天生日" : k + " 天后生日"}`, cid: c.id }); });
    (D().deals || []).forEach((d) => { if (d.stage === "closed" && d.closing) { const k = within(d.closing.slice(5), 15); const yrs = yr - Number(d.closing.slice(0, 4)) + (d.closing.slice(5) < md ? 1 : 0); if (k != null && yrs >= 1) out.push({ kind: "成交周年", t: `${(contact(d.primary) || {}).name || ""} · ${short(d)} 成交 ${yrs} 周年${k === 0 ? "（今天）" : "（" + k + " 天后）"}`, d: "一条问候 + 房价更新，推荐链从这里来", href: link("deal", d.id), id: "anniv|" + d.id, text: `${(contact(d.primary) || {}).name || ""} 成交 ${yrs} 周年`, cid: d.primary }); } if (d.stage === "active" && d.leaseStart) { const k = within(d.leaseStart.slice(5), 15); const yrs = yr - Number(d.leaseStart.slice(0, 4)) + (d.leaseStart.slice(5) < md ? 1 : 0); if (k != null && yrs >= 1) out.push({ kind: "入住周年", t: `${(contact(d.primary) || {}).name || ""} · ${short(d)} 入住 ${yrs} 周年`, d: "续约前打个招呼", href: link("deal", d.id), id: "move|" + d.id, text: `${(contact(d.primary) || {}).name || ""} 入住 ${yrs} 周年`, cid: d.primary }); } });
    // v1.6：目标房源（我在培养的业主）到了该联系的日子（propfile.js NBPropFile.dueTargets）：排在「该问候」前面（一套房一条，点过去是房源页；「记一次联系」把下次联系日往后推一个节奏）
    if (window.NBPropFile) NBPropFile.dueTargets().forEach(({ p, days }) => { const pr = p.prospect || {}; const owner = NBPropFile.ownerOf(p.id); const name = owner ? NBPropFile.ownerLabel(owner) : "业主"; out.push({ kind: "该联系", t: `该联系 ${name} 了 · ${p.addr}`, d: `目标房源 · ${pr.reason || ""} · 每 ${pr.every || "—"} 天${days > 0 ? " · 已过 " + days + " 天" : ""}`, href: link("property", p.id), id: "ptouch|" + p.id, text: `该联系 ${name}：${p.addr}`, pid: p.id }); });
    if (window.NBScore) (D().contacts || []).forEach((c) => { if (!["client", "lead"].includes(c.kind)) return; const f = NBScore.contactFacts(c); if (f.touchOverdue != null && f.stage !== "former") out.push({ kind: "该问候", t: `${c.name} · ${f.daysSinceTouch == null ? "还没联系过" : f.daysSinceTouch + " 天没联系"}`, d: `节奏每 ${f.cadence} 天`, href: link("contact", c.id), id: "touch|" + c.id, text: `该问候：${c.name}`, cid: c.id }); });
    return out;
  }
  function aiDone() {
    const out = [];
    qActive().forEach((q) => out.push({ kind: "延迟发送", t: q.title, d: q.status === "paused" ? `${q.d} · 总开关关着：已暂停，不会发` : `${q.d} · ${q.at} 秒内可撤回`, href: link("automation"), id: "q|" + q.id, q }));
    propNormalize();
    props().filter((p) => p.status === "auto" && (!p.undoUntil || p.undoUntil >= T())).forEach((p) => out.push({ kind: "自动做了", t: p.title, d: p.evidence, href: link("today"), id: "auto|" + p.id, p }));
    (D().aiCalls || []).filter((c) => c.at && c.at.startsWith(T())).forEach((c) => out.push({ kind: "AI 调用", t: `${c.kind}（${c.model}）`, d: `${c.gate === "out" ? "门卫挡下 · 不计费" : "$" + c.cost}${c.deal && c.deal !== "—" ? " · " + ((deal(c.deal) || {}).title || "") : ""}`, href: link("ai"), id: "ai|" + c.at + c.kind }));
    return out;
  }
  function blocks() { return { needsYou: needsYou(), atRisk: atRisk(), waiting: waiting(), moments: moments(), aiDone: aiDone() }; }
  function oneLiner(b) { b = b || blocks(); const n = (k) => b[k].length; return `今天：需要你 ${n("needsYou")} 件 · 有风险 ${n("atRisk")} · 在等对方 ${n("waiting")} · 人情 ${n("moments")} · AI 处理了 ${n("aiDone")}`; }
  // 一键重排逾期：把逾期任务顺延到明天；记下原来的日期，当天可以撤销
  function reschedule() { const od = overdueTasks(); if (!od.length) return 0; D().lastReschedule = { at: stamp(), day: T(), items: od.map(({ did, x }) => ({ did, id: x.id, due: x.due })) }; od.forEach(({ x }) => { x.due = window.__d(1); }); audit(null, `一键重排 ${od.length} 条逾期任务到明天（可撤销）`, "human"); return od.length; }
  const lastReschedule = () => { const r = D().lastReschedule; return r && r.day === T() ? r : null; };
  function rescheduleUndo() { const r = lastReschedule(); if (!r) return 0; let n = 0; r.items.forEach((it) => { const x = ((D().tasks || {})[it.did] || []).find((y) => y.id === it.id); if (x) { x.due = it.due; n++; } }); delete D().lastReschedule; audit(null, `撤销一键重排：${n} 条任务回到原来的日期`, "human"); return n; }
  window.NBToday = { needsYou, atRisk, waiting, moments, aiDone, blocks, oneLiner, overdueTasks, reschedule, rescheduleUndo, lastReschedule, riskById: (id) => atRisk().find((x) => x.id === id) || null };

  // ================= 打电话前一张卡 =================
  function briefHtml(cid) {
    const c = window.contact(cid); if (!c) return "";
    const cf = NBScore.contactFacts(c);
    const ths = NBMsg.threads().filter((t) => t.kind === "client" && (t.contact === cid || (t.members || []).includes(cid)));
    // 往来 = 真的发出去 / 收到的；内部备注和没放行的 AI 草稿不算
    const msgs = ths.flatMap((t) => NBMsg.msgsOf(t.id).filter((m) => m.kind !== "system" && !m.internal && !(m.ai && m.ai.draft) && !m.only).map((m) => Object.assign({ th: t }, m))).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const recent = msgs.slice(0, 3);
    const unanswered = ths.filter((t) => t.status === "waiting_agent").map((t) => t.lastText).filter(Boolean);
    const ds = (window.DB.deals || []).filter((d) => d.primary === cid && !NBRoadmap.TERMINAL.includes(d.stage));
    const cms = NBCommit.forWho(cid).filter((x) => x.status === "waiting" || x.status === "overdue");
    const mom = NBToday.moments().filter((m) => m.cid === cid);
    const meet = (window.DB.meetings || []).find((m) => m.contact === cid);
    const row = (k, v) => `<div class="cb-row"><span class="k">${k}</span><div class="v">${v}</div></div>`;
    return `<h2>打给 ${esc(c.name)} 之前</h2><p class="small muted">${esc(c.phone || "—")}${c.wechat ? " · 微信 " + esc(c.wechat) : ""} · 最近联系 ${cf.daysSinceTouch == null ? "还没联系过" : cf.daysSinceTouch === 0 ? "今天" : cf.daysSinceTouch + " 天前"} · 节奏每 ${cf.cadence} 天</p><div class="callbrief">` +
      row("最近 3 条往来", recent.length ? recent.map((m) => `<div class="small">${esc((m.from || {}).name || "")} · ${esc(m.at || "")}：${esc(m.kind === "request" ? "请求：" + (m.request || {}).title : (m.text || "").slice(0, 60))}</div>`).join("") + (meet ? `<div class="small">会面 ${esc(meet.at)}：${esc(meet.text.slice(0, 60))}</div>` : "") : `<span class="small muted">还没有往来记录</span>`) +
      row("他的交易下一步", ds.length ? ds.map((d) => { const h = link("deal", d.id); return `<div class="small">${h ? `<a href="${h}">${esc(d.title)}</a>` : esc(d.title)}：${esc(NBRoadmap.nowText(d))}</div>`; }).join("") : `<span class="small muted">没有进行中的交易</span>`) +
      row("未答的问题", unanswered.length ? unanswered.map((q) => `<div class="small">“${esc(q)}”</div>`).join("") : `<span class="small muted">没有欠他的回复</span>`) +
      row("在等他的", cms.length ? cms.map((x) => `<div class="small">${esc(x.what)} · ${esc(NBCommit.dueText(x))}${x.nudges.length ? " · 催过 " + x.nudges.length + " 次" : ""}</div>`).join("") : `<span class="small muted">没有</span>`) +
      row("生日 / 节点", mom.length ? mom.map((m) => `<div class="small">${esc(m.t)}</div>`).join("") : `<span class="small muted">${c.birthday ? "生日 " + esc(c.birthday) : "—"}</span>`) +
      `</div><div class="acts" style="margin-top:10px"><button class="btn pri" data-action="call-done" data-arg="${cid}">☏ 拨打（模拟）→ 打完记一句</button></div>`;
  }
  function doneHtml(cid) {
    const c = window.contact(cid); const cf = NBScore.contactFacts(c);
    return `<h2>打完了 · ${esc(c.name)}</h2><p class="small muted">记一句 + 下次该联系的日子；会同时更新「最近联系」和建一条「联系 ${esc(c.name)}」的任务。</p><textarea id="cd-note" rows="3" style="width:100%" placeholder="聊了什么、他在等什么、你答应了什么"></textarea><div class="row" style="margin-top:8px"><label class="small">下次联系 <input id="cd-next" type="date" value="${window.__d(cf.cadence || 7)}"></label><label class="small"><input id="cd-cm" type="checkbox"> 他答应了一件事（记成承诺）</label></div><div class="acts" style="margin-top:10px"><button class="btn pri" data-action="call-done-ok" data-arg="${cid}">记下</button></div>`;
  }
  window.NBCall = { briefHtml, doneHtml };

  // ================= 三端通用动作 =================
  // 这些名字归这个文件：三端都用这里的实现（界面文件里同名的旧实现会被它盖掉）
  const A = {};
  const after = (msg) => { if (window.DBsave) window.DBsave(); if (window.render) window.render(); if (msg && window.toast) window.toast(msg); };
  const close = () => { if (window.closeModal) window.closeModal(); else if (window.closeSheet) window.closeSheet(); };
  const open = (html) => { const f = window.openModal || window.openSheet; if (f) f(html); };
  const closeBtn = () => (window.openModal ? "modal-close" : "sheet-close");
  const stop = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } };
  const val = (k) => (document.getElementById(k) || {}).value || "";
  // ---- 提议 ----
  A["prop-pick"] = (el, arg, e) => { stop(e); const [id, side] = arg.split("|"); const p = propById(id); if (!p || p.type !== "conflict" || p.status !== "pending") return; if (side === "skip") { propSnooze(id); after("先不改，明天再提醒"); return; } if (!["a", "b"].includes(side)) return; const note = conflictApply(p, side); after(note ? "已改：" + note : "已选定，数据照这个来"); };
  A["prop-approve"] = (el, id, e) => { stop(e); const r = propApprove(id); after(r.ok ? (r.note || "已批准并执行，可在修改记录里看到") : r.why); return r; };
  // 点「拒绝」→ 先问一句原因（可选预设）；代码里直接调（el 为空）→ 用默认原因立刻拒绝
  A["prop-reject"] = (el, id, e) => {
    stop(e); const p = propById(id); if (!p) return;
    if (!el) { const r = propReject(id, "经纪人拒绝"); after(r.ok ? "" : r.why); return r; }
    open(`<h2>${isBroker() ? "退回" : "拒绝"}这条提议</h2><p class="small muted">${esc(p.title)}</p><p class="small muted">写一句原因（可以点一个现成的），会记进修改记录；同一类连着拒几次，说明这一档该调了。</p><div class="quick">${REJECT_PRESETS.map((x) => `<button class="chipbtn" data-action="prop-reject-ok" data-arg="${id}|${esc(x)}">${esc(x)}</button>`).join("")}</div><input id="pr-reason" style="width:100%;margin-top:8px" placeholder="或者自己写一句"><div class="acts" style="margin-top:10px"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn pri" data-action="prop-reject-ok" data-arg="${id}">${isBroker() ? "退回" : "拒绝"}</button></div>`);
  };
  A["prop-reject-ok"] = (el, arg, e) => { stop(e); const [id, preset] = String(arg).split("|"); const r = propReject(id, preset || val("pr-reason")); close(); after(r.ok ? `已${isBroker() ? "退回" : "拒绝"} · 原因已记：${r.p.reason}` : r.why); };
  A["prop-undo"] = (el, id, e) => { stop(e); const r = propUndo(id); after(r.ok ? `已撤销${r.removed || r.restored ? "：删掉它建的 " + r.removed + " 条 · 还原 " + r.restored + " 处" : ""}` : r.why); };
  // ---- 任务 ----
  A["task-done"] = (el, arg, e) => { stop(e); const [did, tid] = arg.split("|"); const x = ((D().tasks || {})[did] || []).find((y) => y.id === tid); if (!x) return; x.status = x.status === "done" ? "pending" : "done"; x.doneAt = x.status === "done" ? T() : null; x.doneBy = x.status === "done" ? meName() : null; audit(did, `任务${x.status === "done" ? "完成（完成人 " + meName() + "）" : "重新打开"}：${x.name}`); after(); };
  A["esc-reschedule"] = (el, arg, e) => { stop(e); const n = reschedule(); after(n ? `已把 ${n} 条逾期任务顺延到明天 · 今天之内可以撤销（记入修改记录）` : "没有逾期任务"); };
  A["esc-undo"] = (el, arg, e) => { stop(e); const n = rescheduleUndo(); after(n ? `已撤销：${n} 条任务回到原来的日期` : "没有可撤销的重排"); };
  // ---- 有风险：转任务 / 话术（arg = NBToday.atRisk 里那一行的 id）----
  A["risk-task"] = (el, id, e) => { stop(e); const r = NBToday.riskById(id); if (!r || !r.deal) return; D().tasks[r.deal] = D().tasks[r.deal] || []; D().tasks[r.deal].push({ id: newId("t"), name: `处理风险：${r.t}`, rule: "有风险 → 转任务", due: r.date && r.date >= T() ? r.date : T(), assignee: meName(), status: "pending", clientVisible: false, note: r.d }); audit(r.deal, `有风险 → 任务：${r.t}`); after("已转成任务（今天页 · 任务 tab 都能看到）"); };
  const riskWhen = (r) => { if (!r.date) return "今天"; const n = days(T(), r.date); return n < 0 ? `已过 ${-n} 天` : n === 0 ? "今天" : n === 1 ? "明天" : `${n} 天后`; };
  A["risk-script"] = (el, id, e) => { stop(e); const r = NBToday.riskById(id); if (!r) return; const d = r.deal ? deal(r.deal) : null; const who = d ? (contact(d.primary) || {}).name : "客户"; const txt = `${who}您好，提醒一下：${r.t.replace(/^[^·]+· /, "")}（${riskWhen(r)}）。这边我在跟进，需要您做的我会单独发一张确认卡，有进展第一时间告诉您。—— ${meName()}`; open(`<h2>给客户的话术</h2><p class="small muted">AI 起草 · 你看一眼再发（T2）。不含金额和对方经纪的私人信息；发出前等 5 分钟，可撤回。</p><textarea id="rs-txt" rows="6" style="width:100%">${esc(txt)}</textarea><div class="acts" style="margin-top:10px"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn" data-action="nb-copy" data-arg="rs-txt">复制</button><button class="btn pri" data-action="risk-script-queue" data-arg="${esc(id)}">发出（延迟 5 分钟 · 可撤回）</button></div>`); };
  A["risk-script-queue"] = (el, id, e) => { stop(e); const r = NBToday.riskById(id); const text = val("rs-txt"); const q = qAdd({ title: "客户话术：" + (r ? r.t : ""), d: `${text.slice(0, 40)}… · 已放行 · 5 分钟后发出`, deal: r ? r.deal : null, cat: "client_out", text }); close(); after(q ? (q.status === "paused" ? "总开关关着：已进队列但暂停，不会发" : "已进延迟发送队列，5 分钟内可以撤回") : "「对客户外发」开关关着：没有发出"); };
  // ---- 延迟发送队列 ----
  A["auto-revoke"] = (el, id, e) => { stop(e); const q = qRevoke(id); after(q ? (q.backTo ? "已撤回，没有发出去；回到草稿——确认卡又在「需要你」里" : "已撤回，没有发出去；它回到了「需要你」") : "这条已经不在队列里"); };
  // 影子没有倒计时：「模拟：5 分钟到了」把一条（或整个队列）发出去；发出之后不能撤回
  A["auto-deliver"] = (el, id, e) => { stop(e); const q = qDeliver(id); after(q ? `已发出：${q.title}（不能再撤回）` : "这条不在等发的队列里（暂停着的要先恢复总开关）"); };
  A["auto-flush"] = (el, arg, e) => { stop(e); const n = qFlush().length; after(n ? `已发出 ${n} 条（不能再撤回）` : "队列里没有等发的"); };
  A["auto-requeue"] = (el, id, e) => { stop(e); const q = qRequeue(id); after(!q ? "没有这条" : q.blocked ? "这一类的开关关着：没有进队列" : "已重新进延迟队列"); };
  A["auto-drop"] = (el, id, e) => { stop(e); const q = qDrop(id); after(q ? "好，这条不发了" : "没有这条"); };
  // ---- 承诺 ----
  A["cm-nudge"] = (el, id, e) => {
    stop(e); const c = cmAll().find((x) => x.id === id); if (!c) return; const isClient = !!(contact(c.who) && ["client", "lead", "applicant"].includes(contact(c.who).kind));
    if (isClient && window.NBMsg && c.deal) { const d = deal(c.deal); const th = NBMsg.ensureThread({ kind: "client", deal: c.deal, contact: c.who, members: [c.who], subject: d ? d.title : "" }); NBMsg.send({ thread: th.id, from: { role: "agent", id: D().me.id, name: D().me.name }, kind: "text", text: `提醒一下：${c.what}（您说 ${cmDueText(c)}），方便的时候发我就行。` }); cmNudge(id, "消息"); after("已发到客户对话"); return; }
    const q = qAdd({ title: "催一下：" + (c.whoName || nameOf(c.who)), d: `${c.what} · 你点的催办 · 已放行 · 5 分钟后发出`, deal: c.deal, cat: "party_nudge" });
    if (!q) { after("「催协作方」开关关着：没有发出"); return; }
    cmNudge(id, "催办（延迟 5 分钟发出）"); after(q.status === "paused" ? "总开关关着：催办已进队列但暂停" : "催办进了 5 分钟延迟队列（可撤回）");
  };
  A["cm-done"] = (el, id, e) => { stop(e); const r = cmFulfill(id, "手工标记（文件 / 回复已到）"); if (!r) return; close(); after(r.unlocked ? `已兑现 → 路线图「${r.unlocked.node.t}」往前走了` : "已兑现"); };
  A["cm-cancel"] = (el, id, e) => { stop(e); const c = cmAll().find((x) => x.id === id); if (c) { c.status = "cancelled"; audit(c.deal, `承诺取消：${c.what}`); } after("已取消"); };
  A["cm-add-ok"] = (el, did) => { const who = val("cm-who"); const c = contact(who); cmAdd({ deal: did, who, whoName: c ? c.name : who, what: val("cm-what") || "（没写）", due: val("cm-due") ? val("cm-due") + " " + (val("cm-time") || "17:00") : null, source: { kind: val("cm-src") || "call", at: stamp(), quote: val("cm-quote") || "" } }); close(); after("已记一条承诺 · 到点没兑现会进「在等对方」"); };
  A["ms-verify-ok"] = (el, arg) => { const [did, mid] = arg.split("|"); const docSel = val("vf-doc"), fld = val("vf-field"), note = val("vf-note"); const ev = [docSel ? "文件 " + docSel : "", fld ? "字段 " + fld : "", note].filter(Boolean).join(" · ") || "经纪人核对"; vVerify(did, mid, ev); close(); after("已核实 · 证据已记"); };
  // ---- 通知 · 记一下 ----
  A["notify-level"] = (el, key) => { if (!el || !LEVELS[Number(el.value)]) return; setLevel(key, el.value); after(`「${(policy().find((x) => x.key === key) || {}).label || key}」改为 ${LEVELS[Number(el.value)][0]}`); };
  A["notify-reset"] = () => { resetLevels(); after("已恢复默认四级"); };
  A["cap-sync"] = () => { if ((D().ui || {}).offline) { after("没网：先存在手机上，有网自动上传"); return; } const n = capSync(); after(n ? `已上传 ${n} 条（唯一号去重，不会记两遍）` : "没有待上传的"); };
  A["offline-toggle"] = () => { D().ui.offline = !D().ui.offline; if (!D().ui.offline) capSync(); after(D().ui.offline ? "模拟断网：记一下先存手机" : "恢复联网：待上传的已自动上传"); };
  // ---- 合规：提交 Broker 审核 + CDA（arg = 交易 id）----
  A["comp-submit"] = (el, did, e) => { stop(e); const r = compSubmit(did); after(r.ok ? "已发给 Broker · 等批（T3）· 批了才开过户的门" : r.why); };
  // ---- 钱：标已付 / 改金额（arg = 交易 id|钱 id）----
  A["money-paid"] = (el, arg, e) => { stop(e); const [did, id] = arg.split("|"); const m = moneyPaid(did, id); after(!m ? "没有这一笔" : m.blocked ? m.why : "已标已付（修改记录里有一条）"); };
  A["money-amount"] = (el, arg, e) => { stop(e); const [did, id] = arg.split("|"); const m = moneyRow(did, id); if (!m) return; open(`<h2>改金额 · ${esc(m.label)}</h2><p class="small muted">留空 = 金额待定（钱 tab 会标「缺金额」）。改动记进修改记录。</p><input id="mo-amount" type="number" style="width:100%" value="${m.amount == null ? "" : esc(m.amount)}" placeholder="金额（美元）"><div class="acts" style="margin-top:10px"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn pri" data-action="money-amount-ok" data-arg="${did}|${id}">保存</button></div>`); };
  A["money-amount-ok"] = (el, arg, e) => { stop(e); const [did, id] = arg.split("|"); moneyAmount(did, id, val("mo-amount")); close(); after("金额已改"); };

  function reg() { const X = window.ACTIONS; if (!X) return; Object.assign(X, A); } // 每次都挂（不是「有了就跳过」）：DOMContentLoaded 时各端自己的文件都加载完了，这里的实现最后落定，同名的旧实现不会因为加载先后盖回来
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  setTimeout(reg, 0);

  // 核实弹窗（三端共用的 HTML；网站用 modal，App 用 sheet）
  window.NBVerify.formHtml = function (did, mid) {
    const m = ((D().milestones || {})[did] || []).find((x) => x.id === mid); const docs = (D().documents || []).filter((x) => x.deal === did); const fields = ((D().fields || {})[did] || []).filter((f) => f.status === "confirmed");
    return `<h2>核实 · ${esc(m ? m.label : "")}</h2><p class="small muted">光「做了」不算完：挑一份文件、一个字段当证据，谁核的、什么时候自动记。</p><label class="small muted">证据文件</label><select id="vf-doc" style="width:100%"><option value="">—</option>${docs.map((x) => `<option>${esc(x.name)}</option>`).join("")}</select><label class="small muted" style="display:block;margin-top:8px">对照字段</label><select id="vf-field" style="width:100%"><option value="">—</option>${fields.map((f) => `<option>${esc(f.label)} = ${esc(f.value)}</option>`).join("")}</select><label class="small muted" style="display:block;margin-top:8px">一句话</label><input id="vf-note" style="width:100%" placeholder="例：收据金额 $5,000 = 合同 5A"><div class="acts" style="margin-top:10px"><button class="btn pri" data-action="ms-verify-ok" data-arg="${did}|${mid}">记为已核实</button></div>`;
  };
  window.NBCommit.formHtml = function (did) {
    const people = (D().contacts || []).filter((c) => ["client", "lead", "applicant", "agent", "title_lending", "vendor", "tc"].includes(c.kind));
    return `<h2>记一条承诺</h2><p class="small muted">谁答应了什么、几点；到点没兑现会进今天页「在等对方」并建议催一下。</p><label class="small muted">谁</label><select id="cm-who" style="width:100%">${people.map((c) => `<option value="${c.id}">${esc(c.name)}${c.tags && c.tags.length ? "（" + esc(c.tags[0]) + "）" : ""}</option>`).join("")}</select><label class="small muted" style="display:block;margin-top:8px">答应什么</label><input id="cm-what" style="width:100%" placeholder="例：下午回复 repair amendment"><div class="row" style="margin-top:8px"><label class="small">哪天 <input id="cm-due" type="date" value="${window.__d(0)}"></label><label class="small">几点 <input id="cm-time" type="time" value="17:00"></label><label class="small">来源 <select id="cm-src"><option value="call">电话</option><option value="message">消息</option><option value="email">邮件</option><option value="wechat">微信</option></select></label></div><label class="small muted" style="display:block;margin-top:8px">原话（可选）</label><input id="cm-quote" style="width:100%"><div class="acts" style="margin-top:10px"><button class="btn pri" data-action="cm-add-ok" data-arg="${did}">记下</button></div>`;
  };
  // 承诺列表（三端共用）
  window.NBCommit.listHtml = function (list, opts) {
    opts = opts || {}; const btn = opts.small ? "btn xs" : "btn sm";
    if (!list.length) return `<div class="empty small">${opts.empty || "没有在等的"}</div>`;
    return `<div class="list">${list.map((c) => { const st = cmLabel(c); return `<div class="li cm ${c.status}"><span class="badge ${st[1]}">${st[0]}</span><div class="body"><div class="t">${esc(c.whoName || nameOf(c.who))} → ${esc(c.what)}</div><div class="d">${esc(cmDueText(c))}${c.nudges.length ? " · 催过 " + c.nudges.length + " 次（" + c.nudges[c.nudges.length - 1].at.slice(11) + "）" : ""}${c.blocks && c.status !== "fulfilled" ? " · 挡着路线图下一步" : ""}${c.status === "fulfilled" ? " · " + esc(c.fulfilledAt || "") + (c.evidence ? " · " + esc(c.evidence) : "") : ""}${c.source && c.source.quote ? `<div class="tiny muted">“${esc(c.source.quote)}” · ${esc({ email: "邮件", message: "消息", call: "电话", wechat: "微信" }[c.source.kind] || c.source.kind)} ${esc(c.source.at || "")}</div>` : ""}</div></div>${c.status === "waiting" || c.status === "overdue" ? `<div class="acts"><button class="${btn}" data-action="cm-nudge" data-arg="${c.id}">催一下</button><button class="${btn} ok" data-action="cm-done" data-arg="${c.id}">兑现了</button>${opts.cancel ? `<button class="${btn} ghost" data-action="cm-cancel" data-arg="${c.id}">取消</button>` : ""}</div>` : ""}</div>`; }).join("")}</div>`;
  };
})();
