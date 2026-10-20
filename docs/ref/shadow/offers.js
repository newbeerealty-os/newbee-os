/* NewBee OS · 三端共用：Offer
   Offer = 一方签字的合同：Offer 阶段就上传；每个版本记谁提的（who: ours / theirs）；逐条款算 已同意 / 我方提出 / 对方 counter；
   买方交易可同时几个 Offer（各挂一套房 property），卖方交易同时收几个；挂起 / 撤回 / 落选都可再激活；对方签字 → 自动变合同（字段从最后一版带过去）→ 合同期。
   v1.5（决定 D8 / D9 / D13）：
   · 状态只有七种；「在谈的 Offer」= negotiating（isOpen）；在谈或挂起都让交易留在「Offer 中」（keepsOfferStage）。score.js / roadmap.js / work.js 都问这里，不各写一份。
   · 客户点「同意」只记同意时间（clientAgree → clientAgreedAt / clientAgreedBy / clientAgreedV），只有决策人能点；Offer 变成 accepted 只有一条路：对方签字 → accept()。
   · 卖方净到手只有一个算法：netToSeller = 价格 − 卖方付的费用 − 佣金（税费分摊、房贷余额以结算单为准）。
   · accept() 写的字段 key / 档位和合同字段表（window.NB_FIELDS）一致；Offer 里没写的天数不猜；买卖两边都派生里程碑（extract.js）。
   真实版：offers 加 property_id · status · doc_id；offer_versions 加 who · terms jsonb。 */
(function () {
  const D = () => window.DB;
  const T = (zh, en) => (D() && D().ui && D().ui.lang === "en" ? en : zh);
  const money = (n) => (window.money ? window.money(n) : "$" + n);
  const OFFER_ST = { negotiating: ["谈判中", "acc"], on_hold: ["挂起 · 可再激活", "mute"], withdrawn: ["已撤回 · 可再激活", "mute"], lost: ["落选 · 可再激活", "mute"], accepted: ["已接受 → 合同", "ok"], rejected: ["已拒", "mute"], backup: ["备选", "mute"] };
  const OPEN = ["negotiating"];
  // 只用来预填「新建 Offer」的表单和没有佣金字段时的估算比例；从不悄悄写进合同
  const DEFAULTS = { optionDays: 7, optionFee: 500, close: "30 天", financing: "Conventional 20%", commissionPct: 6 };
  const TERMS = [["price", "价格", (v) => money(v)], ["em", "定金 Earnest", (v) => money(v)], ["optionDays", "Option 天数", (v) => v + " 天"], ["optionFee", "Option 费", (v) => money(v)], ["close", "过户", (v) => v], ["financing", "贷款", (v) => v], ["sellerPaid", "卖方付费用", (v) => money(v)], ["titlePolicy", "Title policy 谁付", (v) => v], ["warranty", "Home Warranty", (v) => money(v)], ["appraisalGap", "Appraisal gap", (v) => v], ["leaseback", "Leaseback", (v) => v]];
  const list = (did) => (D().offers || {})[did] || [];
  const byId = (did, oid) => list(did).find((o) => o.id === oid);
  const last = (o) => o.versions[o.versions.length - 1];
  const isOpen = (o) => OPEN.includes(o.status);
  const keepsOfferStage = (o) => isOpen(o) || o.status === "on_hold"; // 僵持（挂起）不算丢：交易还在 Offer 中
  const openOf = (did) => list(did).filter(isOpen);
  const dealOf = (o) => Object.keys(D().offers || {}).find((did) => list(did).includes(o)) || null;
  const whoLabel = (w) => w === "ours" ? T("我方", "Us") : T("对方", "Them");
  // 逐条款：{ key, label, ours, theirs, status: agreed | ours | theirs | diff, text, latest }；已接受（双方签了最后一版）的 Offer 每一条都是「已同意」
  function clauses(o) {
    const vs = o.versions; const lastV = last(o);
    const oursV = vs.slice().reverse().find((v) => v.who === "ours"); const theirsV = vs.slice().reverse().find((v) => v.who === "theirs");
    return TERMS.map(([k, label, fmt]) => {
      const f = (v) => v == null || v === "" ? "—" : fmt(v);
      if (o.status === "accepted") return { key: k, label, ours: f(lastV[k]), theirs: f(lastV[k]), status: "agreed", text: T("已同意", "Agreed"), latest: f(lastV[k]) };
      const ov = oursV ? oursV[k] : undefined, tv = theirsV ? theirsV[k] : undefined;
      let status, text;
      if (oursV && theirsV) { if (String(ov) === String(tv)) { status = "agreed"; text = T("已同意", "Agreed"); } else { status = "diff"; text = lastV.who === "ours" ? T("我方 counter：", "Our counter: ") + f(ov) : T("对方 counter：", "Their counter: ") + f(tv); } }
      else { status = oursV ? "ours" : "theirs"; text = (oursV ? T("我方提出", "Proposed by us") : T("对方提出", "Proposed by them")) + T("，等回复", ", awaiting reply"); }
      return { key: k, label, ours: f(ov), theirs: f(tv), status, text, latest: f(lastV[k]) };
    });
  }
  const agreedCount = (o) => clauses(o).filter((c) => c.status === "agreed").length;
  function label(st) { return OFFER_ST[st] || [st, "mute"]; }

  // ---- 客户同意（D9）：只记时间戳，不改状态 ----
  // 决策人 = 这笔交易我方的签约人（含配偶）或客户视图里角色是「决策人」的成员；家人 / 参谋不是
  function isDecider(did, cid) {
    if (!cid) return false;
    if ((D().parties || []).some((p) => p.deal === did && p.party === cid && p.side === "ours" && p.signer)) return true;
    return ((D().portalMembers || {})[did] || []).some((m) => m.contactId === cid && m.role === "decision");
  }
  const consentOf = (o) => o && o.clientAgreedAt ? { at: o.clientAgreedAt, by: o.clientAgreedBy || null, v: o.clientAgreedV || null, current: (o.clientAgreedV || last(o).v) === last(o).v } : null;
  // by = 联系人 id。返回 { ok, why?, consent? }；不是决策人、Offer 不在谈 → 不记
  function clientAgree(did, oid, by) {
    const o = byId(did, oid); if (!o) return { ok: false, why: T("没有这个 Offer", "No such offer") };
    if (!isDecider(did, by)) return { ok: false, why: T("只有决策人（签约人，含配偶）能点「同意」；家人 / 参谋只能看", "Only decision makers (signers, incl. spouse) can agree") };
    if (!isOpen(o)) return { ok: false, why: T("这个 Offer 现在不在谈", "This offer is not open") };
    const x = new Date(); const p = (n) => String(n).padStart(2, "0");
    o.clientAgreedAt = `${D().today} ${p(x.getHours())}:${p(x.getMinutes())}`; o.clientAgreedBy = by; o.clientAgreedV = last(o).v;
    const who = ((D().contacts || []).find((c) => c.id === by) || {}).name || by;
    if (window.audit) audit(did, `客户「同意」Offer ${o.id} v${last(o).v}：只记同意时间 ${o.clientAgreedAt}（${who}）；对方签字后才变合同`, "human", who);
    return { ok: true, consent: consentOf(o) };
  }
  // 出了新版本：上一版的同意不再算数，挪进 consents[] 留底
  function archiveConsent(o) { if (!o.clientAgreedAt) return; (o.consents = o.consents || []).push({ v: o.clientAgreedV || null, at: o.clientAgreedAt, by: o.clientAgreedBy || null }); delete o.clientAgreedAt; delete o.clientAgreedBy; delete o.clientAgreedV; }

  // ---- 卖方净到手（D13）----
  // 佣金比例：这笔交易已确认的 commission_pct 字段（"3% + 买方经纪 3%" → 6）；没有就按 DEFAULTS.commissionPct 估
  function commissionPct(did) { const f = ((D().fields || {})[did] || []).find((x) => x.key === "commission_pct" && x.status === "confirmed"); const ps = f ? String(f.value).match(/\d+(\.\d+)?(?=\s*%)/g) : null; return ps ? ps.reduce((a, b) => a + Number(b), 0) : DEFAULTS.commissionPct; }
  // o = 一个 Offer（取最后一版）或一个版本；返回 { price, sellerPaid, commission, pct, net, label }。sellerPaid = 卖方付费用 + Home Warranty
  function netToSeller(o, did) {
    const v = o.versions ? last(o) : o; const pct = commissionPct(did || (o.versions ? dealOf(o) : null));
    const sellerPaid = (Number(v.sellerPaid) || 0) + (Number(v.warranty) || 0); const commission = Math.round(Number(v.price) * pct / 100);
    return { price: Number(v.price), sellerPaid, commission, pct, net: Number(v.price) - sellerPaid - commission, label: T(`价格 − 卖方付的费用 − 佣金 ${pct}%（税费分摊、房贷余额以结算单为准）`, `Price − seller-paid costs − ${pct}% commission (prorations and loan payoff per the settlement statement)`) };
  }

  // ---- 动作（纯数据；界面层负责 DBsave / render / toast）----
  function counter(did, oid, patch, who) {
    const o = byId(did, oid); const l = last(o);
    const v = Object.assign({}, l, patch || {}, { v: l.v + 1, at: TODAY(), who: who || "ours", by: (who === "theirs" ? T("对方", "Them") : T("我方", "Us")) + " counter" });
    if (v.optionDays != null) v.option = `${v.optionDays} 天 / ${money(v.optionFee)}`;
    v.em = v.em || Math.round(v.price * 0.01);
    archiveConsent(o);
    o.versions.push(v); o.status = "negotiating"; o.expires = window.__d(2) + " 17:00"; return v;
  }
  function hold(did, oid) { const o = byId(did, oid); o.status = "on_hold"; o.heldAt = TODAY(); syncDeal(did); return o; }
  function withdraw(did, oid) { const o = byId(did, oid); o.status = "withdrawn"; o.withdrawnAt = TODAY(); syncDeal(did); return o; }
  function reactivate(did, oid) {
    const o = byId(did, oid); o.status = "negotiating"; o.reactivatedAt = TODAY(); delete o.lostAt;
    const d = window.deal(did);
    if (d && ["lost", "terminated"].includes(d.stage)) { // 落选 / 合同终止之后重新谈：回到「Offer 中」；终止过的合同那几条线清零重走
      if (d.stage === "terminated") { const rm = window.NBRoadmap.rmOf(d); rm.pre = Math.min(rm.pre, 4); rm.lines = {}; rm.out = {}; rm.close = 0; }
      d.stage = "offer"; delete d.endedFrom;
    }
    syncDeal(did); return o;
  }
  function reject(did, oid) { const o = byId(did, oid); o.status = "rejected"; syncDeal(did); return o; }
  // outcome = 最后成交给别人的价格（记在这个 Offer 上：offers[].outcome）
  function markLost(did, oid, outcome) { const o = byId(did, oid); o.status = "lost"; o.lostAt = TODAY(); if (outcome) o.outcome = outcome; o.reason = o.reason || T("卖方接了别的 Offer · 可再激活", "Seller accepted another offer · can be reactivated"); syncDeal(did); return o; }

  // "30 天" → 生效日 + 30；写的是日期就用日期；看不懂 → null（不猜）
  const closeDate = (eff, close) => { const s = String(close == null ? "" : close).trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const m = s.match(/^(\d+)\s*(天|d|days?)?$/i); return m ? window.NBRoadmap.addDays(eff, Number(m[1])) : null; };
  const REG = (key) => (window.NB_FIELDS || []).find((f) => f.key === key) || { zh: key, tier: "all", para: "", type: "text" };
  // Offer 最后一版 → 合同字段（已确认，来源 Offer vN）。key、档位、段号照字段注册表；Offer 里没有的不写
  function fieldsFrom(o, l, eff, closing) {
    const quote = T("来自 Offer 最后一版（双方已签）", "From the final signed offer version"); const page = "Offer v" + l.v;
    const F = (key, value) => { const r = REG(key); const f = { key, tier: r.tier, para: r.para, label: r.zh, value, page, quote, conf: 1, status: "confirmed", v: 1, confirmedAt: eff, by: "system", source: "offer:" + o.id, src: "typed", docKind: "text" }; if (["money", "date"].includes(r.type)) { f.crop = { page, text: quote }; f.cropSeen = true; } return f; };
    const out = [F("sales_price", money(l.price))];
    if (l.em != null) out.push(F("earnest_money", money(l.em)));
    if (l.optionFee != null) out.push(F("option_fee", money(l.optionFee)));
    if (l.optionDays != null) out.push(F("option_period_days", l.optionDays + " 天"));
    out.push(F("effective_date", eff));
    if (closing) out.push(F("closing_date", closing));
    if (l.financing) { // "Conventional 20%" → 贷款类型 + 首付比例算出现金部分 / 贷款额；"现金" → 全额现金
      const m = String(l.financing).match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%$/); const cash = /现金|cash/i.test(l.financing);
      out.push(F("loan_type", cash ? T("现金", "Cash") : (m ? m[1] : String(l.financing))));
      if (m || cash) { const down = cash ? Number(l.price) : Math.round(Number(l.price) * Number(m[2]) / 100); out.push(F("cash_portion", money(down))); out.push(F("loan_amount", money(Number(l.price) - down))); }
    }
    out.push(F("seller_concessions", money(l.sellerPaid || 0)));
    if (l.titlePolicy) out.push(F("title_policy_payer", l.titlePolicy));
    out.push(F("residential_service_contract", money(l.warranty || 0)));
    return out;
  }
  // 对方签字 → 合同：字段从最后一版带过去，交易进合同期（阶段由进度算），其余在谈的 Offer 转备选 / 撤回
  function accept(did, oid) {
    const o = byId(did, oid); const d = window.deal(did); const l = last(o); const eff = TODAY(); const R = window.NBRoadmap;
    o.status = "accepted"; o.acceptedAt = eff;
    list(did).forEach((x) => { if (x.id !== oid && isOpen(x)) x.status = d.type === "seller" ? "backup" : "withdrawn"; });
    if (o.property) d.property = o.property;
    d.price = l.price; d.effective = eff; d.closing = closeDate(eff, l.close); delete d.est;
    if (l.optionDays != null) d.optionDays = Number(l.optionDays); else delete d.optionDays; // 字段的拷贝；Offer 里没写就没有
    const map = R.mapFor(d); const rm = R.rmOf(d); rm.pre = map.phases[0].nodes.length; rm.lines = {}; rm.out = {}; rm.close = 0; R.syncStage(d);
    const p = window.prop(d.property); if (p && d.type === "buyer") d.title = p.addr + " · 买方";
    D().fields[did] = fieldsFrom(o, l, eff, d.closing);
    D().documents = D().documents || [];
    if (o.doc) D().documents.unshift({ id: "doc-" + o.id, deal: did, name: o.doc.name.replace(/买方已签|对方已签|v\d+-/, "").replace(".pdf", "") + "-双方已签.pdf", pages: o.doc.pages, type: "trec_1_4", uploaded: eff, sha: "of" + o.id + "…", locked: false, sourceKind: "text", source: T("来自 Offer（对方签字后自动成为合同）", "From the offer, signed by both") });
    if (window.NBExtract) NBExtract.deriveAll(did); // 买卖两边都从已确认字段派生里程碑 / 任务 / 钱 / 合规清单
    syncTargets(did);
    return d;
  }
  // 从目标房 / 交易上新建一个 Offer（买方：挂在一套房上；卖方：来自一个买家）。没填的条款用 DEFAULTS 预填，经纪人在表单里改
  function create(did, opt) {
    const d = window.deal(did); D().offers = D().offers || {}; D().offers[did] = D().offers[did] || [];
    const price = Number(opt.price) || d.price || 0; const ours = d.type !== "seller";
    const od = Number(opt.optionDays) || DEFAULTS.optionDays, of = Number(opt.optionFee) || DEFAULTS.optionFee;
    const o = { id: "o" + Date.now().toString(36), side: ours ? "ours" : "theirs", property: ours ? (opt.property || d.property) : undefined, buyer: ours ? T("我方（", "Us (") + ((window.contact(d.primary) || {}).name || "") + T("）", ")") : (opt.buyer || T("新买家", "New buyer")), status: "negotiating", received: TODAY(), expires: window.__d(2) + " 17:00", doc: opt.doc || null, versions: [{ v: 1, at: TODAY(), by: ours ? T("我方", "Us") : T("买方", "Buyer"), who: ours ? "ours" : "theirs", price, em: Math.round(price * 0.01), optionDays: od, optionFee: of, option: `${od} 天 / ${money(of)}`, close: opt.close || DEFAULTS.close, financing: opt.financing || DEFAULTS.financing, sellerPaid: Number(opt.sellerPaid) || 0, titlePolicy: opt.titlePolicy || "卖方付", warranty: Number(opt.warranty) || 0, appraisalGap: opt.appraisalGap || "无", leaseback: "无" }] };
    D().offers[did].push(o); syncDeal(did); return o;
  }
  // 交易的 Offer 变了 → 进度 / 阶段 / 主房源 / 目标房状态跟着变（阶段只由 NBRoadmap.syncStage 算；全部落选是唯一直接写的终态）
  function syncDeal(did) {
    const d = window.deal(did); if (!d) return; const os = list(did); const R = window.NBRoadmap;
    if (d.type === "buyer" && d.rm) { if (os.length && d.rm.pre < 3) d.rm.pre = 3; if (os.some(isOpen) && d.rm.pre < 4) d.rm.pre = 4; }
    if (d.type === "seller" && d.rm && os.some(isOpen) && d.rm.pre < 4) d.rm.pre = 4;
    if (d.stage === "lost" && os.some(isOpen)) d.stage = "offer"; // 有一个重新在谈 → 不再是落选
    if (!R.TERMINAL.includes(d.stage)) R.syncStage(d);
    if (d.type === "buyer" && os.length && os.every((o) => o.status === "lost") && !["under_contract", "clear_to_close", "closed", "terminated"].includes(d.stage)) { d.endedFrom = d.endedFrom || { stage: d.stage, at: TODAY() }; d.stage = "lost"; }
    const primary = os.find((o) => o.status === "accepted") || os.find(isOpen) || os[0];
    if (d.type === "buyer" && primary && primary.property) d.property = primary.property;
    syncTargets(did);
  }
  // 目标房状态跟 Offer 走
  function syncTargets(did) { const d = window.deal(did); if (!d) return; list(did).forEach((o) => { if (!o.property || !window.NBTours) return; const st = o.status === "accepted" ? "won" : isOpen(o) ? "negotiating" : o.status === "on_hold" ? "on_hold" : o.status === "lost" ? "lost" : o.status === "withdrawn" ? "passed" : null; if (st) window.NBTours.setTargetStatus(d.primary, o.property, st, { offer: o.id, deal: did }); }); }
  const HELD = ["on_hold", "withdrawn", "lost"];
  const summary = (did) => { const os = list(did); const open = os.filter(isOpen).length, held = os.filter((o) => HELD.includes(o.status)).length; return { total: os.length, open, held, text: os.length ? `${os.length} 个 Offer · ${open} 个在谈${held ? " · " + held + " 个挂起 / 落选（可再激活）" : ""}` : T("还没有 Offer", "No offers") }; };
  window.NBOffers = { OFFER_ST, OPEN, DEFAULTS, TERMS, list, byId, last, isOpen, keepsOfferStage, openOf, dealOf, whoLabel, clauses, agreedCount, label, isDecider, consentOf, clientAgree, commissionPct, netToSeller, counter, hold, withdraw, reactivate, reject, markLost, accept, create, syncDeal, summary };
})();
