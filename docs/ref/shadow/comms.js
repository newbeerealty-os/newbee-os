/* NewBee OS · 三端共用：邮件待归档 + 沟通时间线（步骤 E1a · E1b · 16b · 13f）
   邮件：DB.emails[] 每封带 matchBy（怎么归到交易上的：sender 发件人是这笔交易的已知一方 · address 地址 · mls MLS 号 · template 预约网站的固定模板 · manual 手动 · null 没归上）。
        归不上的 = status "unfiled"（deal 为空，why = 为什么没归上，candidates = 可能是哪几笔）：经纪人「归到…」一笔交易、「忽略」，或「以后都忽略这个发件人」。
        归档时附件看起来是一份签好的合同 → 出一条 T2 提议「进件：<文件名>」，你点了才进件。
   看房确认邮件两种：「Your showing has been confirmed」= 我自己约的 → 那一站标已确认 + 写入日历（T1 自动 + 通知）；
                    「The following showing has been confirmed」= 别人带客户看我的挂牌 → 只进这套挂牌的看房反馈列表，不进我的日历。
   时间线：一笔交易的全部往来排成一列，新的在上——归到这笔交易的邮件 · 电话 · 微信导入 · 手记的短信 / 电话 / 微信 · 记一下 · 会面 · 日历 · 看房 · 挂在这笔交易上的对话消息。
        每一行 { at, channel, dir: in 对方来的 | out 我发的 | null, who, text, href }；日期还没到的（日历、约好的看房）带 future: true，排在最上面。
   待回复：最后一条有来有往的记录是对方来的、而且超过 SCORE_CONFIG.thresholds.replyHours 小时没回。「下一步」是一条 T2 提议（AI 起草的回复，你点了才发）。
   真实版：邮件只读同步（Gmail），按交易授权；时间线是一个只读视图，把这几张表并起来；系统从不自动发微信。 */
(function () {
  const D = () => window.DB;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => (window.TODAY ? TODAY() : D().today);
  const stamp = () => today() + " " + new Date().toTimeString().slice(0, 5);
  const deal = (id) => (D().deals || []).find((x) => x.id === id);
  const contact = (id) => (D().contacts || []).find((x) => x.id === id);
  const audit = (did, what, actor, who) => { if (window.audit) window.audit(did, what, actor || "human", who); };
  const meName = () => (D().me || {}).name || "Jason";
  const TH = () => (window.SCORE_CONFIG && SCORE_CONFIG.thresholds) || { replyHours: 24 };
  const link = (kind, id, sub) => (window.NBLink ? NBLink.to(kind, id, sub) : null);
  const short = (d) => (d && d.title ? d.title.split(" · ")[0] : "");
  const CHANNEL = { email: "邮件", call: "电话", wechat: "微信", sms: "短信", note: "记一下", meeting: "会面", calendar: "日历", showing: "看房", message: "消息" };
  const emails = () => (D().emails = D().emails || []);
  const emailById = (id) => emails().find((e) => e.id === id);
  // "Bob Lee <bob@x.example>" → { name, addr }
  const sender = (e) => { const m = String((e && e.from) || "").match(/^(.*?)\s*<([^>]+)>\s*$/); return m ? { name: m[1].trim(), addr: m[2].trim().toLowerCase() } : { name: String((e && e.from) || ""), addr: String((e && e.from) || "").toLowerCase() }; };

  // ================= 待归档 =================
  const unfiled = () => emails().filter((e) => e.status === "unfiled").sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  // 这封可能是哪几笔交易：种子里给的 candidates，没有就看主题里有没有哪套房的门牌
  function candidates(e) {
    if (!e) return []; const ids = (e.candidates && e.candidates.length ? e.candidates : (D().deals || []).filter((d) => { const p = (D().properties || []).find((x) => x.id === d.property); return p && String(e.subject || "").toLowerCase().includes(p.addr.split(",")[0].toLowerCase()); }).map((d) => d.id));
    return ids.map(deal).filter(Boolean);
  }
  const looksSigned = (a) => a && (a.kind === "contract" || /executed|signed|双方已签/i.test(a.name || ""));
  // 归到一笔交易。返回 { ok, e, proposal? }：附件像签好的合同 → 多出一条 T2 提议「进件：…」
  function file(emailId, dealId) {
    const e = emailById(emailId), d = deal(dealId); if (!e || !d) return { ok: false, why: "没有这封邮件或这笔交易" };
    e.deal = dealId; e.status = "confirmed"; e.matchBy = "manual"; e.filedAt = stamp(); e.filedBy = meName(); e.action = `已归到 ${short(d)}`;
    audit(dealId, `邮件归档：《${e.subject}》（${sender(e).name}）→ ${short(d)}（手动）`, "human");
    const att = (e.attachments || []).find(looksSigned); let proposal = null;
    if (att && window.NBProp) proposal = NBProp.add({ key: "intake|" + e.id, type: "intake", tier: 2, deal: dealId, title: `进件：${att.name}`, evidence: `邮件《${e.subject}》· ${sender(e).name} · 附件 ${att.pages || "?"} 页，看起来是双方签好的合同 · 你点了才进件`, cost: 0.004, payload: { email: e.id, doc: { name: att.name, pages: att.pages || 1, type: "trec_1_4", source: `邮件附件（${sender(e).name} · 归档后进件）` } } });
    return { ok: true, e, proposal };
  }
  function ignore(emailId) { const e = emailById(emailId); if (!e) return { ok: false, why: "没有这封邮件" }; e.status = "ignored"; e.action = "忽略"; audit(null, `邮件忽略：《${e.subject}》`, "human"); return { ok: true, e }; }
  const isIgnoredSender = (addr) => (D().ignoredSenders || []).some((x) => x.addr === String(addr || "").toLowerCase());
  // 以后都忽略这个发件人：记进名单，这个人现在待归档的也一起忽略
  function ignoreSender(emailId) {
    const e = emailById(emailId); if (!e) return { ok: false, why: "没有这封邮件" }; const s = sender(e);
    D().ignoredSenders = D().ignoredSenders || []; if (!isIgnoredSender(s.addr)) D().ignoredSenders.push({ addr: s.addr, name: s.name, at: stamp(), by: meName() });
    let n = 0; emails().forEach((x) => { if (x.status === "unfiled" && sender(x).addr === s.addr) { x.status = "ignored"; x.action = "忽略（发件人在忽略名单里）"; n++; } });
    audit(null, `以后都忽略发件人 ${s.name || s.addr}（这次一起忽略 ${n} 封）`, "human");
    return { ok: true, n, sender: s };
  }
  // 看房邮件是哪一种："mine" 我自己约的确认 · "listing" 别人看我的挂牌（确认）· v1.7："request" 约看申请 · "declined" 被拒 · "cancelled" 取消 · null 不是
  const SHOWING_MAIL = [["mine", /^your showing has been confirmed/i], ["listing", /^the following showing has been confirmed/i], ["request", /^showing request/i], ["declined", /^showing declined|has been declined/i], ["cancelled", /^showing (cancelled|canceled)|has been cancell?ed/i]];
  const classifyShowingMail = (subject) => { const s = String(subject || "").trim(); const hit = SHOWING_MAIL.find(([, re]) => re.test(s)); return hit ? hit[0] : null; };
  // 把一封看房邮件落到数据上（T1，只读邮件）。mine → 那一站标已确认 + 写入日历；listing（确认）→ 有 requested 行就 confirm 它，没有就新建 confirmed；
  // request → NBLShow.request（自动确认的交易直接 confirmed，我批 / 卖家批的进等批）；declined → 同交易最近的 requested / confirmed 行标被拒；cancelled → 同上标过期（影子里过期和取消合一标 expired）。info = { time, agent, at, window, agentPhone, agentEmail }
  function applyShowingMail(emailId, info) {
    const e = emailById(emailId); const kind = e ? classifyShowingMail(e.subject) : null; if (!kind) return { ok: false, why: "这不是看房确认邮件" }; info = info || {}; e.showing = kind; e.matchBy = e.matchBy || "template"; e.noReply = true;
    const addr = String(e.subject).split(/[–-]\s*/).slice(1).join("-").trim().toLowerCase();
    if (["request", "declined", "cancelled"].includes(kind)) {
      const d = (D().deals || []).find((x) => { const p = (D().properties || []).find((y) => y.id === x.property); return p && addr && p.addr.toLowerCase().startsWith(addr) && ["seller", "lessor"].includes(x.type); });
      if (!d || !window.NBLShow) return { ok: false, why: "没找到这套挂牌对应的交易" };
      e.deal = d.id;
      if (kind === "request") { const row = NBLShow.request(d.id, { at: info.at || e.at, window: info.window, agent: info.agent, agentPhone: info.agentPhone, agentEmail: info.agentEmail, source: e.id }); e.status = row.status === "confirmed" ? "auto" : "pending"; e.action = row.status === "confirmed" ? "自动确认：只记不推" : row.approver === "me" ? "等你批（打开邮件里的链接，在 BrokerBay 里点批准）" : `等${NBLShow.approverWord(d)}批；${TH().showingEscalateHours} 小时没人批 → 升级给你`; return { ok: true, kind, row }; }
      const row = NBLShow.forDeal(d.id).find((s) => ["requested", "confirmed"].includes(s.status) && (!info.at || s.at === info.at)) || NBLShow.forDeal(d.id).find((s) => ["requested", "confirmed"].includes(s.status));
      if (!row) return { ok: false, why: "这套挂牌没有在等批 / 约好的那一场" };
      if (kind === "declined") NBLShow.decline(row.id); else NBLShow.expire(row.id);
      e.status = "auto"; e.action = kind === "declined" ? "那一场标「被拒」" : "那一场标「过期」（取消在影子里也标过期）";
      return { ok: true, kind, row };
    }
    if (kind === "mine") {
      let hit = null; (D().tours || []).forEach((t) => { if (t.status === "done") return; t.homes.forEach((h) => { if (!hit && addr && h.addr.toLowerCase().startsWith(addr)) hit = { t, h }; }); });
      if (!hit || !window.NBTours) return { ok: false, why: "没找到这套房对应的看房站" };
      const before = { status: hit.h.status, time: hit.h.time, how: hit.h.how }; NBTours.confirmHome(hit.t.id, hit.h.id, { time: info.time, source: e.id }); e.deal = e.deal || hit.t.deal || null; e.status = "auto";
      const cal = (D().calendar || []).find((c) => c.tour === hit.t.id && c.home === hit.h.id);
      if (window.NBProp) NBProp.add({ type: "derive", tier: 1, deal: hit.t.deal || null, title: `看房确认邮件 → ${hit.h.addr.split(",")[0]} 标「已确认」+ 写入日历`, evidence: `邮件《${e.subject}》· 预约网站的固定模板 · 我自己约的看房`, cost: 0.002, created: cal ? [{ coll: "calendar", id: cal.id }] : [], undo: [{ coll: "tours", id: hit.t.id, home: hit.h.id, set: Object.assign(before, { calendar: null }) }] });
      return { ok: true, kind, tour: hit.t.id, home: hit.h.id };
    }
    const d = (D().deals || []).find((x) => { const p = (D().properties || []).find((y) => y.id === x.property); return p && addr && p.addr.toLowerCase().startsWith(addr) && ["seller", "lessor"].includes(x.type); });
    if (!d) return { ok: false, why: "没找到这套挂牌对应的交易" };
    // v1.7：先找在等批的那一场（批了 = 确认邮件到了）；没有才新建一行 confirmed
    const pend = window.NBLShow ? NBLShow.forDeal(d.id).find((s) => s.status === "requested" && (!info.at || s.at === info.at)) : null;
    if (pend) { NBLShow.confirm(pend.id); e.deal = d.id; e.status = "auto"; return { ok: true, kind, row: pend }; }
    const row = window.NBLShow ? NBLShow.addConfirmed(d.id, { at: info.at || e.at, window: info.window, agent: info.agent || "对方经纪", agentPhone: info.agentPhone, agentEmail: info.agentEmail, source: e.id }) : { id: "ls" + Date.now().toString(36), deal: d.id, at: info.at || e.at, agent: info.agent || "对方经纪", status: "confirmed", source: e.id, feedback: null };
    if (!window.NBLShow) { (D().listingShowings = D().listingShowings || []).unshift(row); audit(d.id, `看房确认邮件（别人看我的挂牌）→ 进看房反馈列表，不进我的日历：${row.at}`, "ai", "Email Intake"); }
    e.deal = d.id; e.status = "auto";
    return { ok: true, kind, row };
  }

  // ================= 沟通时间线 =================
  const full = (at) => (String(at || "").length <= 10 ? `${at} 00:00` : String(at));
  // opts = { channels: [只看这几种], limit }。新的在上
  function timeline(dealId, opts) {
    const d = deal(dealId); if (!d) return []; opts = opts || {}; const D0 = D(); const rows = []; const add = (r) => { if (r.at) rows.push(Object.assign({ dir: null, who: "", href: null }, r, { at: full(r.at) })); };
    emails().forEach((e) => { if (e.deal === dealId && e.status !== "ignored") add({ id: "e|" + e.id, at: e.at, channel: "email", dir: "in", who: sender(e).name, text: `${e.subject || ""}${e.detected && e.detected !== "—" ? " · " + e.detected : ""}`, href: link("inbox", dealId), noReply: !!e.noReply }); });
    const ours = new Set([d.primary].concat((D0.parties || []).filter((p) => p.deal === dealId && p.side === "ours").map((p) => p.party)));
    (D0.meetings || []).forEach((m) => { if (m.deal === dealId || (!m.deal && ours.has(m.contact))) { const call = /电话|语音|call/i.test(m.where || ""); add({ id: "mt|" + m.id, at: m.at, channel: call ? "call" : "meeting", dir: call ? "out" : null, who: (contact(m.contact) || {}).name || "", text: `${m.where ? m.where + "：" : ""}${m.text || ""}`, href: link("contact", m.contact), touch: true }); } });
    (D0.wechat || []).forEach((w) => { if (w.deal !== dealId) return; const dg = w.digest || {}; add({ id: "w|" + w.id, at: w.imported, channel: "wechat", who: (contact(w.contact) || {}).name || "", text: `微信导入 ${w.messages} 条 · 答应的 ${(dg.promises || []).length} · 没回的 ${(dg.unanswered || []).length}${dg.sentiment ? " · " + dg.sentiment : ""}`, href: link("deal", dealId, "comms") }); (dg.unanswered || []).forEach((u, i) => { if (u.at) add({ id: `wu|${w.id}|${i}`, at: u.at, channel: "wechat", dir: "in", who: (contact(w.contact) || {}).name || "", text: `没回的：${u.t}` }); }); });
    (D0.commLog || []).forEach((c) => { if (c.deal === dealId) add({ id: "cl|" + c.id, at: c.at, channel: c.channel, dir: c.dir || null, who: c.whoName || (contact(c.who) || {}).name || "", text: c.text, awaiting: !!c.awaiting }); });
    (D0.captures || []).forEach((c) => { if (c.deal === dealId && c.synced !== false) add({ id: "cap|" + c.uid, at: c.at, channel: "note", who: meName(), text: c.text }); });
    (D0.calendar || []).forEach((c) => { if (c.deal === dealId) add({ id: "cal|" + c.id, at: c.at, channel: "calendar", who: "", text: c.title }); });
    (D0.tours || []).forEach((t) => { if (t.deal === dealId) add({ id: "tour|" + t.id, at: `${t.date} ${t.start || "00:00"}`, channel: "showing", who: (contact(t.client) || {}).name || "", text: `看房 ${t.homes.length} 套：${t.homes.map((h) => h.addr.split(",")[0]).join(" → ")}${t.summary ? " · " + t.summary : ""}`, href: link("tour", t.id) }); });
    // v1.7：看房行带状态（等批细分 · 约好了 · 看完了 · 被拒 · 过期）+ 时段；链接到看房页的「别人看我的挂牌」
    (D0.listingShowings || []).forEach((s) => { if (s.deal !== dealId) return; const st = window.NBLShow ? NBLShow.statusLabel(s) : (s.status === "confirmed" ? "约好了" : s.status); add({ id: "ls|" + s.id, at: s.at, channel: "showing", who: s.agent || "", text: `看我的挂牌 · ${st}${s.window ? " · " + s.window : ""}${s.feedback ? ` · 反馈：${s.feedback}` : s.status === "done" ? " · 还没有反馈" : ""}${s.source === "手记" ? " · 手记" : ""}`, href: link("lshow") }); });
    if (window.NBMsg) NBMsg.threads().forEach((t) => { if (t.deal !== dealId) return; NBMsg.msgsOf(t.id).slice().reverse().forEach((m) => { if ((m.ai && m.ai.draft) || m.only) return; const role = (m.from || {}).role; add({ id: "m|" + m.id, at: m.at, channel: "message", dir: m.internal || ["system", "ai"].includes(role) ? null : role === "agent" ? "out" : "in", who: (m.from || {}).name || "", text: m.internal ? `（内部备注）${m.text || ""}` : m.kind === "request" ? `${NBMsg.REQ_LABEL[(m.request || {}).action] || "请求"}：${(m.request || {}).title || ""}` : m.text || "", href: link("thread", t.id), noReply: m.kind === "system" || ["broker", "tc"].includes(role) }); }); }); // Broker / 团队的话不算「对方来信」：它们有自己的对话状态（等经纪人），不进「待回复」
    const nowAt = stamp(); rows.forEach((r) => { if (r.at > nowAt) r.future = true; }); // 还没到的（日历、约好的看房）排在最上面，带 future 标记
    let out = rows.sort((a, b) => b.at.localeCompare(a.at)); // 同一分钟的：排序是稳定的，按收集时的顺序（各表都是新的在前）
    if (opts.channels && opts.channels.length) out = out.filter((r) => opts.channels.includes(r.channel));
    return opts.limit ? out.slice(0, opts.limit) : out;
  }
  const hoursAgo = (at) => (Date.now() - new Date(full(at).replace(" ", "T") + ":00").getTime()) / 36e5;
  // 待回复：最后一条有来有往的记录（对方来的 / 我发的 / 通了电话见了面）是对方来的，而且超过 replyHours 小时。返回那一行，没有 → null
  function waiting(dealId) {
    const last = timeline(dealId).find((r) => !r.noReply && (r.dir === "in" || r.dir === "out" || r.touch));
    return last && last.dir === "in" && hoursAgo(last.at) >= TH().replyHours ? last : null;
  }
  // 手记一条（电话 / 微信 / 短信 …）。o = { channel, dir, who（联系人 id，可空）, whoName, text, at?, awaiting? }
  function addRow(dealId, o) {
    const d = deal(dealId); if (!d || !o || !String(o.text || "").trim()) return null; const c = o.who ? contact(o.who) : null;
    const row = { id: "cl" + Date.now().toString(36), deal: dealId, at: o.at || stamp(), channel: o.channel || "call", dir: o.dir || "out", who: o.who || null, whoName: o.whoName || (c ? c.name : ""), text: String(o.text).trim(), by: meName() }; if (o.awaiting) row.awaiting = true;
    (D().commLog = D().commLog || []).unshift(row); if (c) c.lastTouch = today();
    // 对方回了：之前发出去在等回信的那几条不用再等
    if (row.dir === "in") (D().commLog || []).forEach((x) => { if (x !== row && x.deal === dealId && x.awaiting && (!row.who || x.who === row.who)) delete x.awaiting; });
    audit(dealId, `沟通记录（${CHANNEL[row.channel] || row.channel} · ${row.dir === "in" ? "对方来的" : "我发的"}）：${row.whoName ? row.whoName + "：" : ""}${row.text.slice(0, 60)}`, "human");
    return row;
  }
  // 下一步：给待回复的那条起草一个回复，变成一条 T2 提议（你点了才发）。没有待回复 → null
  function suggest(dealId) {
    const w = waiting(dealId); const d = deal(dealId); if (!w || !d || !window.NBProp) return null;
    const next = window.NBRoadmap ? NBRoadmap.nowText(d, true) : ""; const text = `${w.who || "您"}好，收到您说的「${String(w.text).replace(/^没回的：/, "").slice(0, 40)}」。${next ? "目前进展：" + next + "。" : ""}我今天之内给您一个明确的答复。—— ${meName()}`;
    const src = (D().commLog || []).find((c) => "cl|" + c.id === w.id); const viaThread = w.channel === "message" && w.href; const tid = viaThread ? String(w.id).slice(2) : null; const m = tid && window.NBMsg ? NBMsg.messages().find((x) => x.id === tid) : null;
    const payload = m ? { message: { thread: m.thread, text } } : { reply: { deal: dealId, channel: w.channel === "wechat" ? "sms" : w.channel, to: src ? src.who : null, toName: w.who, text, cat: "client_out" } }; // 微信不能代发：回复改走短信 / 你自己发
    return NBProp.add({ key: `reply|${dealId}|${w.at}`, type: "client_text", tier: 2, deal: dealId, title: `回复 ${w.who || "对方"}（${CHANNEL[w.channel] || w.channel}）：${text.slice(0, 28)}…`, evidence: `${w.who || "对方"} ${w.at} 说：“${String(w.text).slice(0, 50)}” · 超过 ${TH().replyHours} 小时没回 · AI 起草，你点了才发`, cost: 0.004, payload });
  }

  // ================= 界面零件 + 三端通用动作 =================
  // 时间线（三端共用的 HTML）：渠道筛选 · 待回复标记 · 「＋ 记一条」·「下一步」。筛选存在 DB.ui.commFilter[交易] 里（只是界面状态）
  function timelineHtml(dealId, opts) {
    opts = opts || {}; const f = ((D().ui || {}).commFilter || {})[dealId] || "all"; const all = timeline(dealId); const rows = f === "all" ? all : all.filter((r) => r.channel === f); const w = waiting(dealId);
    const used = [...new Set(all.map((r) => r.channel))]; const btn = opts.small ? "btn xs" : "btn sm";
    const chips = `<div class="seg" style="margin-bottom:8px">${[["all", "全部"]].concat(used.map((k) => [k, CHANNEL[k] || k])).map(([k, l]) => `<button class="${f === k ? "on" : ""}" data-action="comm-filter" data-arg="${dealId}|${k}">${l}</button>`).join("")}</div>`;
    const head = `<div class="row" style="margin-bottom:8px">${w ? `<span class="badge bad">待回复</span><span class="small">${esc(w.who)} ${esc(w.at)} 来的还没回（超过 ${TH().replyHours} 小时）</span>` : `<span class="badge ok">没有欠的回复</span>`}<span class="sp"></span>${w ? `<button class="${btn} ai" data-action="comm-suggest" data-arg="${dealId}">下一步 · AI 起草回复</button>` : ""}<button class="${btn}" data-action="comm-add" data-arg="${dealId}">＋ 记一条</button></div>`;
    const list = rows.length ? `<div class="list">${rows.slice(0, opts.limit || 40).map((r) => `<div class="li ${w && r.id === w.id ? "wait" : ""}"><span class="badge ${r.dir === "in" ? "acc" : r.dir === "out" ? "ok" : "mute"}">${esc(CHANNEL[r.channel] || r.channel)}${r.dir === "in" ? " ←" : r.dir === "out" ? " →" : ""}</span><div class="body"><div class="t small">${r.href ? `<a href="${r.href}">${esc(r.text)}</a>` : esc(r.text)}</div><div class="d">${esc(r.who)}${r.who ? " · " : ""}${esc(r.at)}${r.future ? " · 还没到" : ""}${r.awaiting ? " · 在等回信" : ""}${w && r.id === w.id ? ` · <b class="bad">待回复</b>` : ""}</div></div></div>`).join("")}</div>` : `<div class="empty small">这个渠道还没有记录</div>`;
    return head + chips + list;
  }
  const A = {};
  const after = (msg) => { if (window.DBsave) window.DBsave(); if (window.render) window.render(); if (msg && window.toast) window.toast(msg); };
  const open = (html) => { const f = window.openModal || window.openSheet; if (f) f(html); };
  const close = () => { if (window.closeModal) window.closeModal(); else if (window.closeSheet) window.closeSheet(); };
  const closeBtn = () => (window.openModal ? "modal-close" : "sheet-close");
  const val = (k) => (document.getElementById(k) || {}).value || "";
  A["comm-filter"] = (el, arg) => { const [did, k] = arg.split("|"); D().ui.commFilter = Object.assign({}, D().ui.commFilter, { [did]: k }); after(); };
  A["comm-add"] = (el, did) => { const d = deal(did); if (!d) return; const ids = [...new Set([d.primary].concat((D().parties || []).filter((p) => p.deal === did && p.party && contact(p.party)).map((p) => p.party)).filter(Boolean))]; open(`<h2>记一条沟通 · ${esc(short(d))}</h2><p class="small muted">电话、微信、短信里说过的事记在这里，进这笔交易的沟通时间线。微信不会由系统代发。</p><div class="row"><label class="small">渠道 <select id="ca-ch"><option value="call">电话</option><option value="wechat">微信</option><option value="sms">短信</option></select></label><label class="small">方向 <select id="ca-dir"><option value="in">对方来的</option><option value="out">我发的</option></select></label><label class="small">谁 <select id="ca-who">${ids.map((id) => `<option value="${id}">${esc(contact(id).name)}</option>`).join("")}<option value="">别人</option></select></label></div><textarea id="ca-text" rows="3" style="width:100%;margin-top:8px" placeholder="说了什么（一两句）"></textarea><div class="acts" style="margin-top:10px"><button class="btn" data-action="${closeBtn()}">取消</button><button class="btn pri" data-action="comm-add-ok" data-arg="${did}">记下</button></div>`); };
  A["comm-add-ok"] = (el, did) => { const row = addRow(did, { channel: val("ca-ch") || "call", dir: val("ca-dir") || "in", who: val("ca-who") || null, text: val("ca-text") }); if (!row) { if (window.toast) window.toast("先写一句说了什么"); return; } close(); after(row.dir === "in" ? `已记下 · 超过 ${TH().replyHours} 小时没回会标「待回复」` : "已记下"); };
  A["comm-suggest"] = (el, did) => { const p = suggest(did); after(p ? "回复草稿进了「需要你」：你点了才发（T2）" : "这笔交易现在没有欠的回复"); };
  A["mail-file"] = (el, arg) => { const [eid, did0] = String(arg).split("|"); const did = did0 || val("mf-deal-" + eid); if (!did) { if (window.toast) window.toast("先选归到哪一笔交易"); return; } const r = file(eid, did); close(); after(r.ok ? (r.proposal ? `已归档 · 附件像签好的合同 → 出了一条提议「${r.proposal.title}」（你点了才进件）` : "已归档到这笔交易") : r.why); };
  A["mail-ignore"] = (el, eid) => { const r = ignore(eid); after(r.ok ? "已忽略" : r.why); };
  A["mail-ignore-sender"] = (el, eid) => { const r = ignoreSender(eid); after(r.ok ? `以后都忽略 ${r.sender.name || r.sender.addr}（这次一起忽略 ${r.n} 封）` : r.why); };
  function reg() { const X = window.ACTIONS; if (!X) return; Object.assign(X, A); } // 每次都挂（不是「有了就跳过」）：DOMContentLoaded 时各端自己的文件都加载完了，这里的实现最后落定，同名的旧实现不会因为加载先后盖回来
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  setTimeout(reg, 0);

  window.NBComms = { CHANNEL, sender, unfiled, candidates, file, ignore, ignoreSender, isIgnoredSender, classifyShowingMail, applyShowingMail, timeline, waiting, add: addRow, suggest, timelineHtml };
})();
