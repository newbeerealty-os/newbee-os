/* NewBee OS · 三端共用：房源档案（v1.6 · 「业主想卖、我在争取 Listing」这条路 —— 手册 15a-2 · 15a-3 · 15b · 4g）
   房源：＋ 房源（地址归一：同一个地址再加 → 落在已有的那套上）· 从 Matrix PDF 建档 · 房源详情「上传 Matrix PDF」。
   Matrix 三种文件（房源单 · History 报表 · 税务记录）走同一条待确认线：上传 = 点一下用写好的样例（真实版读 PDF 文字层、删掉私人段落再发模型）；
   每份文件出一张待确认表（字段行 · 历史行 · 产权人行）：字段行 置信 ≥ SCORE_CONFIG.thresholds.lowConfidence 且不是地址的进「确认全部」；
   地址永远逐条；历史 / 产权人行没有置信度，一律逐条（15a-3 第 7 条）。系统自己从不确认任何一行。
   税务记录：只演示「业主姓名 + 转手日期 → 产权人」两行 + 一个占位说明——显示哪些项等样例分析后定；电话永远不出现。
   产权人：一行允许 owner: null + name（不是我的联系人、只存名字）；显示用 ownerLabel(o)；前任 = 有 to。
   目标房源（我在培养的业主）：p.target + p.prospect = { reason, moveFrom, moveTo, every }，到点今天页出「该联系」（work.js moments）；
   和「某位客户的目标房」（tours.js targets，客户想要的房子）不是一回事。
   建卖方交易：createManualDeal("seller", 客户, 房源) → 落在「上市前」，第一步「上市委托协议」没完成 = 还在争取。
   每个写动作都 audit；写完由调用方 DBsave() + render()；这里不碰 DOM。真实版：property_history · documents.property_id · packages/core 同名纯函数。 */
(function () {
  const D = () => window.DB;
  const today = () => (window.TODAY ? TODAY() : D().today);
  const stamp = () => today() + " " + new Date().toTimeString().slice(0, 5);
  const audit = (did, what, actor, who) => { if (window.audit) window.audit(did, what, actor || "human", who); };
  const meName = () => (D().me || {}).name || "Jason";
  const TH = () => (window.SCORE_CONFIG && SCORE_CONFIG.thresholds) || { lowConfidence: 0.9 };
  const TERM = () => (window.NBRoadmap ? NBRoadmap.TERMINAL : ["closed", "terminated", "lost", "ended"]);
  const contact = (id) => (D().contacts || []).find((x) => x.id === id);
  const org = (id) => (D().orgs || []).find((x) => x.id === id);
  const prop = (id) => (D().properties || []).find((x) => x.id === id);
  const deal = (id) => (D().deals || []).find((x) => x.id === id);
  const link = (kind, id, sub) => (window.NBLink ? NBLink.to(kind, id, sub) : null);
  const addDays = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + Number(n || 0)); const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
  const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
  const usd = (n) => (n == null || n === "" ? "—" : "$" + Number(n).toLocaleString("en-US"));
  const num = (v) => { if (v == null || v === "") return null; const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  let seq = 0;
  const newId = (p) => { let id = p + Date.now().toString(36); const taken = (x) => ["properties", "contacts", "propDocs", "deals"].some((k) => (D()[k] || []).some((r) => r.id === x)); while (taken(id)) id = p + Date.now().toString(36) + (++seq).toString(36); return id; };
  const nameOf = (id) => (contact(id) || org(id) || {}).name || id || "";
  // 产权人行的显示名：只存了名字的（不是我的联系人）用 name；是联系人 / 公司的查名字
  const ownerLabel = (o) => (o ? (o.name || nameOf(o.owner)) : "");
  const owners = () => (D().owners = D().owners || []);
  const history = () => (D().propHistory = D().propHistory || []);
  const docs = () => (D().propDocs = D().propDocs || []);
  // 这套房的现任产权人里挑一行（优先是我的联系人），给今天页 / 建卖方交易预选用
  const ownerOf = (pid) => { const cur = owners().filter((o) => o.property === pid && !o.to); return cur.find((o) => o.owner && contact(o.owner)) || cur[0] || null; };

  // ================= 文件类型 =================
  const TYPES = {
    mls_listing: { label: "Matrix 房源单", yields: "规格 · 挂牌价 · 税 · 学校 · 这张单子上的挂牌记录" },
    mls_history: { label: "Matrix History 报表", yields: "历次挂牌 / 调价 / 进合同 / 成交 / 下架" },
    tax_record: { label: "Matrix 税务记录", yields: "业主姓名 + 转手日期（→ 产权人）· 其余字段等样例分析后定" },
  };
  const TAX_NOTE = "税务记录的字段清单等样例分析后定（手册 15a-3）；这里只演示业主姓名 + 转手日期 → 产权人";
  // 历史九种（15a-3）
  const HKIND = { listed: ["挂牌", "acc"], price_change: ["调价", "warn"], pending: ["进合同", "ai"], sold: ["成交 · 转手", "ok"], leased: ["租出", "ok"], withdrawn: ["撤下", "mute"], expired: ["到期", "mute"], cancelled: ["取消", "mute"], back_on_market: ["回到市场", "acc"] };
  // 字段 → 写到哪：房源列（col）或 p.fields（key）
  const COLS = { address: "addr", mls_no: "mls", beds: "beds", baths: "baths", sqft: "sqft", year_built: "year", hoa_fee: "hoa" };
  const NUMERIC = new Set(["beds", "baths", "sqft", "year_built", "hoa_fee", "list_price", "tax_annual", "tax_year", "garage", "stories"]);
  const FLABEL = { address: "地址", mls_no: "MLS#", beds: "房", baths: "卫", sqft: "面积（sqf）", year_built: "建于", hoa_fee: "HOA（年）", list_price: "挂牌价", tax_annual: "年税", tax_year: "税年", elementary: "小学", middle: "初中", high: "高中", garage: "车库", stories: "层数", pool: "泳池", owner_name: "业主姓名", transfer_date: "转手日期" };
  const fieldLabel = (key) => FLABEL[key] || key;

  // ================= 地址归一 =================
  const SUFFIX = { ct: "ct", court: "ct", dr: "dr", drive: "dr", ln: "ln", lane: "ln", st: "st", street: "st", blvd: "blvd", boulevard: "blvd", ave: "ave", avenue: "ave", way: "way", pl: "pl", place: "pl", trl: "trl", trail: "trl", pkwy: "pkwy", parkway: "pkwy" };
  function normAddr(s) {
    const street = String(s == null ? "" : s).split(",")[0].toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    return street.split(" ").map((w) => SUFFIX[w] || w).join(" ");
  }
  const streetOf = (s) => String(s == null ? "" : s).split(",")[0].replace(/\s+/g, " ").trim();
  function findProp({ addr, mls } = {}) {
    const m = String(mls || "").trim(); const a = normAddr(addr);
    return (D().properties || []).find((p) => (m && String(p.mls || "").trim() === m) || (a && normAddr(p.addr) === a)) || null;
  }
  // ＋ 房源：同一个地址 / 同一个 MLS# → 不建，落在已有的那套上
  function addProperty({ addr, city, zip, mls } = {}) {
    const a = streetOf(addr); if (!a) return { error: "地址不能为空" };
    const have = findProp({ addr: a, mls }); if (have) return { dup: true, prop: have };
    const p = { id: newId("p"), addr: a, city: String(city || "").trim(), zip: String(zip || "").trim(), mls: String(mls || "").trim(), beds: null, baths: null, sqft: null, year: null, lot: null, hoa: null, isd: "", roof: null, hvac: null, notes: "", target: false };
    (D().properties = D().properties || []).push(p);
    audit(null, `新建房源 ${p.addr}${p.city ? "（" + p.city + (p.zip ? " " + p.zip : "") + "）" : ""}${p.mls ? " · MLS " + p.mls : ""}`, "human");
    return { created: true, prop: p };
  }
  const KIND_TAGS = { lead: ["线索"], client: ["客户"], family: ["家人"], agent: ["对方经纪"], vendor: ["服务商"], applicant: ["租客申请人"], tc: ["TC"], title_lending: ["Title / 贷款"] };
  function addContact({ name, kind = "lead", phone, wechat, source, notes } = {}) {
    const n = String(name || "").trim(); if (!n) return null; kind = KIND_TAGS[kind] ? kind : "lead";
    const c = { id: newId("c"), name: n, kind, tags: KIND_TAGS[kind].slice(), lang: /[一-鿿]/.test(n) ? "zh" : "en", channel: wechat ? "微信" : phone ? "电话" : "" };
    if (phone) c.phone = String(phone).trim(); if (wechat) c.wechat = String(wechat).trim(); if (source) c.source = String(source).trim(); if (notes) c.notes = String(notes).trim();
    if (kind === "lead") c.stage = "prospect";
    (D().contacts = D().contacts || []).push(c);
    audit(null, `新建联系人 ${c.name}（${kind}）${c.phone ? " · " + c.phone : ""}${c.source ? " · 来源 " + c.source : ""}`, "human");
    return c;
  }

  // ================= 产权人 =================
  let lastWarn = "";
  // 同一套房、同名 / 同 owner、同 from 的不重复；新的现任进来时，原来的现任（from 更早）份额会超过 100 → 不自动卸任，只提示（lastWarn）
  function addOwner(pid, { owner, name, share, form, from, to, source = "手填" } = {}) {
    lastWarn = ""; const p = prop(pid); if (!p) return null;
    const nm = String(name || "").trim(); owner = owner || null; if (!owner && !nm) return null;
    from = from || null; to = to || null; share = num(share) == null ? 100 : num(share); form = form || "单独";
    const same = owners().find((o) => o.property === pid && ((owner && o.owner === owner) || (nm && (o.name || "") === nm)) && (o.from || null) === from);
    if (same) return same;
    const row = { property: pid, owner, share, form, from, to, source }; if (!owner) row.name = nm;
    if (!to) { const cur = owners().filter((o) => o.property === pid && !o.to && (o.from || "") < (from || "")); const total = cur.reduce((s, o) => s + (num(o.share) || 0), 0) + share; if (cur.length && total > 100) lastWarn = `现任份额合计 ${total}%：原来的 ${cur.map(ownerLabel).join("、")} 没有自动卸任——确认了再把「止」填上`; }
    owners().push(row);
    audit(null, `房源 ${p.addr} 产权人 + ${ownerLabel(row)} ${share}%（${form} · ${from || "?"} → ${to || "至今"} · ${source}）`, "human");
    return row;
  }

  // ================= 历史时间线 =================
  // 一条线：propHistory + 产权人起止 + 这套房上的交易，新的在上；每项 { at, kind, label, sub, price, href?, tone }
  function timeline(pid) {
    const p = prop(pid); if (!p) return []; const out = [];
    history().filter((h) => h.property === pid).forEach((h) => { const k = HKIND[h.kind] || [h.kind, "mute"]; out.push({ at: h.at, kind: h.kind, label: k[0], sub: [...new Set([h.note, h.source].filter(Boolean))].join(" · "), price: h.price == null ? null : h.price, tone: k[1], id: h.id }); });
    owners().filter((o) => o.property === pid).forEach((o) => {
      const who = ownerLabel(o); const sub = `${o.form || ""} · ${o.share}% · ${o.source || ""}`;
      if (o.from) out.push({ at: o.from, kind: "owner_from", label: `产权人 ${who} 起`, sub, price: null, tone: "mute", href: o.owner && contact(o.owner) ? link("contact", o.owner) : null });
      if (o.to) out.push({ at: o.to, kind: "owner_to", label: `产权人 ${who} 止`, sub, price: null, tone: "mute", href: o.owner && contact(o.owner) ? link("contact", o.owner) : null });
    });
    (D().deals || []).filter((d) => d.property === pid).forEach((d) => {
      const R = window.NBRoadmap; const tl = R ? R.typeLabel(d) : d.type; const st = R ? R.stageLabel(d.stage) : d.stage; const who = (contact(d.primary) || {}).name || "";
      if (d.created) out.push({ at: d.created, kind: "deal", label: `交易建立 · ${tl}`, sub: `现在：${st}${who ? " · 我方客户 " + who : ""}`, price: d.price || null, tone: "acc", href: link("deal", d.id), deal: d.id });
      if (d.stage === "closed" && d.closing) out.push({ at: d.closing, kind: "deal_closed", label: `交易成交 · ${tl}`, sub: who ? `我方客户 ${who}` : "", price: d.price || null, tone: "ok", href: link("deal", d.id), deal: d.id });
      if (["terminated", "lost"].includes(d.stage) && d.endedFrom && d.endedFrom.at) out.push({ at: d.endedFrom.at, kind: "deal_ended", label: `交易${st}`, sub: `从「${R ? R.stageLabel(d.endedFrom.stage) : d.endedFrom.stage}」${d.stage === "lost" ? "撤回 · 房源 / 业主 / 联系记录都留着" : "终止"}`, price: null, tone: "mute", href: link("deal", d.id), deal: d.id });
    });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  // ================= 目标房源（我在培养的业主）=================
  function markTarget(pid, { reason, moveFrom, moveTo, every } = {}) {
    const p = prop(pid); if (!p) return null; const n = Math.max(1, num(every) || 30);
    p.target = true; p.relationship = "prospect"; p.prospect = { reason: String(reason || "").trim(), moveFrom: moveFrom || "", moveTo: moveTo || "", every: n }; p.nextTouch = addDays(today(), n);
    audit(null, `房源 ${p.addr} 标为目标房源：${p.prospect.reason || "—"} · 预计 ${p.prospect.moveFrom || "?"} – ${p.prospect.moveTo || "?"} 动 · 每 ${n} 天联系 · 下次 ${p.nextTouch}`, "human");
    return p;
  }
  function unTarget(pid) { const p = prop(pid); if (!p) return null; p.target = false; delete p.relationship; delete p.nextTouch; audit(null, `房源 ${p.addr} 取消目标房源（原因留着，可再标）`, "human"); return p; }
  // 记一次联系：lastTouch = 今天；标了目标 → nextTouch = 今天 + every；沟通记录挂房源（有没到终态的卖方交易就同时挂它）
  function touch(pid, { text, who } = {}) {
    const p = prop(pid); if (!p) return null; const T = today();
    p.lastTouch = T; if (p.target && p.prospect && p.prospect.every) p.nextTouch = addDays(T, p.prospect.every);
    const d = (D().deals || []).find((x) => x.property === pid && x.type === "seller" && !TERM().includes(x.stage)) || null;
    const c = who ? contact(who) : null; if (c) c.lastTouch = T;
    const row = { id: "cl" + Date.now().toString(36), deal: d ? d.id : null, property: pid, at: stamp(), channel: "call", dir: "out", who: who || null, whoName: c ? c.name : (who || ""), text: String(text || "").trim() || "联系了一次", by: meName() };
    (D().commLog = D().commLog || []).unshift(row); if (d) d.lastAction = T;
    audit(d ? d.id : null, `房源 ${p.addr} 记一次联系${c ? "（" + c.name + "）" : ""}：${row.text.slice(0, 60)}${p.nextTouch ? " · 下次 " + p.nextTouch : ""}`, "human");
    return row;
  }
  const dueTargets = () => { const T = today(); return (D().properties || []).filter((p) => p.target && p.nextTouch && p.nextTouch <= T).map((p) => ({ p, days: daysBetween(p.nextTouch, T) })); };

  // ================= 模拟上传：样例固定是 9090 Pursuit Ct 这一套 =================
  const SAMPLE = { addr: "9090 Pursuit Ct", city: "Frisco", zip: "75035", mls: "20000017" };
  const F = (key, value, quote, page, conf, display) => ({ key, label: fieldLabel(key), value, display: display == null ? String(value) : display, quote, page, conf });
  function sampleRows(type, addr) {
    const a = streetOf(addr || SAMPLE.addr); const full = `${a}, ${SAMPLE.city}, TX ${SAMPLE.zip}`;
    const address = F("address", a, `Address: ${full}`, 1, 1);
    if (type === "mls_listing") return {
      fields: [address, F("mls_no", SAMPLE.mls, `MLS#: ${SAMPLE.mls}`, 1, 0.99), F("beds", 4, "Beds: 4", 1, 0.98), F("baths", 3, "Baths: 3 / 0", 1, 0.98), F("sqft", 3120, "SqFt: 3,120 / Tax", 1, 0.97, "3,120"), F("year_built", 2012, "Yr Built: 2012 / Appraisal District", 1, 0.99),
        F("hoa_fee", 950, "HOA Fee: $950 / Annual · Mandatory", 2, 0.95, "$950 / 年"), F("list_price", 489000, "LP: $489,OOO（数字 0 印成了字母 O）", 1, 0.82, "$489,000"), F("tax_annual", 9850, "Taxes: $9,850", 2, 0.96, "$9,850"), F("tax_year", 2025, "Tax Year: 2025", 2, 0.93),
        F("elementary", "Sample Elem", "Elementary: Sample Elem", 2, 0.97), F("middle", "Demo MS", "Middle: Demo MS", 2, 0.97), F("high", "Placeholder HS", "High: Placeholder HS", 2, 0.97)],
      history: [{ at: "2019-05-02", kind: "listed", price: 389900, quote: "List Date: 05/02/2019 · Orig LP $389,900（这张单子上的挂牌记录）" }], owners: [] };
    if (type === "mls_history") return {
      fields: [address],
      history: [{ at: "2016-03-10", kind: "leased", price: 2400, quote: "03/10/2016 · Leased · $2,400 / mo" }, { at: "2019-05-02", kind: "listed", price: 389900, quote: "05/02/2019 · Active · $389,900" }, { at: "2019-06-01", kind: "price_change", price: 379900, quote: "06/01/2019 · Price Change · $379,900" }, { at: "2019-06-20", kind: "pending", price: null, quote: "06/20/2019 · Pending" }, { at: "2019-07-18", kind: "sold", price: 372000, quote: "07/18/2019 · Sold · $372,000" }],
      owners: [] };
    // 税务记录：只演示两行 + 占位说明；产权人行从转手记录来；电话永远不出现
    return {
      fields: [F("owner_name", "Lin, Sample", "Owner Name: LIN SAMPLE", 1, 0.97), F("transfer_date", "2019-07-18", "Deed Date: 07/18/2019", 2, 0.95)],
      history: [{ at: "2012-04-30", kind: "sold", price: 315000, quote: "Deed 04/30/2012 · $315,000（新房成交）" }],
      owners: [{ name: "Lin, Sample", from: "2019-07-18", to: null, form: "单独", quote: "Owner: LIN SAMPLE · Deed 07/18/2019" }, { name: "Davis, Mark & Lisa", from: "2012-04-30", to: "2019-07-18", form: "夫妻共有", quote: "Prior Owner: DAVIS MARK & LISA · 04/30/2012 – 07/18/2019" }, { name: "Sample Homes LLC", from: "2011-09-15", to: "2012-04-30", form: "LLC", quote: "Prior Owner: SAMPLE HOMES LLC · 09/15/2011 – 04/30/2012（建商）" }],
      note: TAX_NOTE };
  }
  const curVal = (p, key) => (COLS[key] ? p[COLS[key]] : ((p.fields || {})[key]));
  const sameVal = (a, b) => (a == null || a === "") ? (b == null || b === "") : String(a).trim().toLowerCase() === String(b == null ? "" : b).trim().toLowerCase();
  const reviewDocs = (pid) => docs().filter((x) => x.property === pid && x.status === "review" && !x.deleted);
  const pendRows = (doc) => { const P = doc.pending || {}; return [].concat(P.fields || [], P.history || [], P.owners || []).filter((r) => r.status === "pending"); };
  // 模拟上传：建 propDoc（status review，pending 里是待确认的行）。pid 为空 = 列表页「从 Matrix PDF 建档」：按样例里的 MLS# / 地址 findProp，没有就 addProperty。
  // 同一套房传第二份：不多出房源；已经在房源上的（列 · p.fields · 历史 · 产权人）和别的待确认表里已经有的一样的值不再出待确认行（dedupe）
  function upload(pid, type, opts) {
    opts = opts || {}; type = TYPES[type] ? type : "mls_listing"; let p = pid ? prop(pid) : null; let created = false;
    const sample = sampleRows(type, p ? p.addr : opts.addr);
    if (!p) { const addr = streetOf(opts.addr || SAMPLE.addr); p = findProp({ addr, mls: opts.addr ? "" : SAMPLE.mls }); if (!p) { const r = addProperty({ addr, city: SAMPLE.city, zip: SAMPLE.zip, mls: "" }); p = r.prop; created = true; } }
    if (!p) return null;
    const others = reviewDocs(p.id).flatMap(pendRows);
    let n = 0; const rid = (k) => k + (++n);
    const fields = sample.fields.filter((f) => f.key === "address" || !(sameVal(curVal(p, f.key), f.value) || others.some((o) => o.key === f.key && sameVal(o.value, f.value)))).map((f) => Object.assign({ id: rid("f"), row: "field", status: "pending" }, f));
    const hist = sample.history.filter((h) => !history().some((x) => x.property === p.id && x.at === h.at && x.kind === h.kind && (x.price == null ? null : Number(x.price)) === (h.price == null ? null : Number(h.price))) && !others.some((o) => o.row === "history" && o.at === h.at && o.kind === h.kind)).map((h) => Object.assign({ id: rid("h"), row: "history", status: "pending", label: (HKIND[h.kind] || [h.kind])[0] }, h));
    const own = sample.owners.filter((o) => !owners().some((x) => x.property === p.id && (x.from || null) === (o.from || null)) && !others.some((x) => x.row === "owner" && x.from === o.from)).map((o) => Object.assign({ id: rid("o"), row: "owner", status: "pending" }, o));
    const doc = { id: newId("pd"), property: p.id, name: `${TYPES[type].label} · ${p.addr}.pdf`, type, pages: type === "tax_record" ? 3 : type === "mls_history" ? 2 : 4, uploaded: today(), sourceKind: "text", status: "review", source: `${meName()} 从 Matrix 导出（影子：样例）`, pending: { fields, history: hist, owners: own, note: sample.note || "" } };
    docs().unshift(doc);
    const total = fields.length + hist.length + own.length;
    if (window.NBAi) NBAi.log({ kind: `Matrix 文件抽取（${TYPES[type].label} · ${doc.pages} 页）`, model: "haiku", cost: 0.02, deal: null });
    audit(null, `${doc.name} 上传（模拟）· ${TYPES[type].label} · 抽取 ${total} 行待确认（字段 ${fields.length} · 历史 ${hist.length} · 产权人 ${own.length}）${created ? " · 新建房源" : ""}`, "ai", "抽取");
    if (!total) doc.status = "confirmed";
    return { doc, prop: p, created };
  }
  const docById = (id) => docs().find((x) => x.id === id && !x.deleted);
  // 为什么要逐条看（空数组 = 可以进「确认全部」）
  function whyOne(r) { const out = []; if (!r) return out; if (r.row === "field") { if (r.key === "address") out.push("地址：先确认这份文件是这套房的"); if (r.conf != null && r.conf < TH().lowConfidence) out.push(`置信 ${Number(r.conf).toFixed(2)} 低于 ${TH().lowConfidence}`); } else out.push(r.row === "history" ? "历史记录没有置信度：逐条看" : "产权人没有置信度：逐条看（写进产权人表）"); return out; }
  // 确认计划：fields 里 conf ≥ 线且不是地址的进 batch；history / owners 一律逐条
  function plan(docId) { const doc = docById(docId); const batch = [], single = []; if (!doc) return { batch, single }; pendRows(doc).forEach((r) => { const why = whyOne(r); if (why.length) single.push(Object.assign({}, r, { why })); else batch.push(Object.assign({}, r, { why: [] })); }); return { batch, single }; }
  const rowOf = (doc, rowId) => [].concat((doc.pending || {}).fields || [], (doc.pending || {}).history || [], (doc.pending || {}).owners || []).find((r) => r.id === rowId);
  // 写入：字段 → 房源列或 p.fields；历史 → propHistory（同房 · 同日 · 同种 · 同价只留一条）；产权人 → owners（来源「税务记录（Matrix · 已确认）」）
  function applyRow(doc, r) {
    const p = prop(doc.property); if (!p) return "";
    if (r.row === "field") {
      const v = NUMERIC.has(r.key) ? num(r.value) : r.value;
      if (r.key === "address") { if (normAddr(p.addr) !== normAddr(r.value)) { const old = p.addr; p.addr = streetOf(r.value); return `地址 ${old} → ${p.addr}`; } return `地址对上：${p.addr}`; }
      if (COLS[r.key]) { const old = p[COLS[r.key]]; p[COLS[r.key]] = r.key === "mls_no" ? String(r.value == null ? "" : r.value).trim() : v; return `${r.label} ${old == null || old === "" ? "—" : old} → ${r.display}`; }
      p.fields = p.fields || {}; const old = p.fields[r.key]; p.fields[r.key] = v == null ? r.value : v; return `${r.label} ${old == null ? "—" : old} → ${r.display}`;
    }
    if (r.row === "history") {
      const price = r.price == null ? null : Number(r.price);
      if (!history().some((x) => x.property === p.id && x.at === r.at && x.kind === r.kind && (x.price == null ? null : Number(x.price)) === price)) history().push({ id: newId("ph"), property: p.id, at: r.at, kind: r.kind, price, note: r.quote || "", source: TYPES[doc.type].label, doc: doc.id });
      return `历史 + ${r.at} ${(HKIND[r.kind] || [r.kind])[0]}${price != null ? " " + usd(price) : ""}`;
    }
    const row = addOwner(p.id, { owner: null, name: r.name, share: r.share == null ? 100 : r.share, form: r.form || "单独", from: r.from, to: r.to || null, source: "税务记录（Matrix · 已确认）" });
    return `产权人 + ${r.name}（${r.from || "?"} → ${r.to || "至今"}${r.to ? " · 前任" : ""}）`;
  }
  function finish(doc) { if (!pendRows(doc).length && doc.status === "review") { doc.status = "confirmed"; doc.confirmedAt = today(); audit(null, `${doc.name}：待确认的行都处理完了 → 已确认`, "human"); } }
  const mark = (r, st) => { r.status = st; r.at2 = today(); r.by = meName(); };
  // 「确认全部」：一次收下计划里 batch 那些行
  function confirmAll(docId) {
    const doc = docById(docId); if (!doc) return { n: 0, left: 0 }; const list = plan(docId).batch.map((x) => rowOf(doc, x.id)).filter((r) => r && r.status === "pending"); const notes = [];
    list.forEach((r) => { mark(r, "confirmed"); notes.push(applyRow(doc, r)); });
    if (list.length) audit(null, `${doc.name}「确认全部」${list.length} 行（置信 ≥ ${TH().lowConfidence} · 不含地址 / 历史 / 产权人）：${notes.join("；").slice(0, 160)}`, "human");
    finish(doc); return { n: list.length, left: pendRows(doc).length };
  }
  function confirmRow(docId, rowId) {
    const doc = docById(docId); const r = doc && rowOf(doc, rowId); if (!r) return { ok: false, why: "没有这一行" }; if (r.status !== "pending") return { ok: false, why: "这一行不在待确认里" };
    mark(r, "confirmed"); const note = applyRow(doc, r); audit(null, `${doc.name} 确认：${note}${whyOne(r).length ? "（逐条）" : ""}`, "human"); finish(doc);
    return { ok: true, note, left: pendRows(doc).length };
  }
  function rejectRow(docId, rowId) {
    const doc = docById(docId); const r = doc && rowOf(doc, rowId); if (!r) return { ok: false, why: "没有这一行" }; if (r.status !== "pending") return { ok: false, why: "这一行不在待确认里" };
    mark(r, "rejected"); audit(null, `${doc.name} 标「不对」：${r.row === "field" ? r.label + " = " + r.display : r.row === "history" ? r.at + " " + (HKIND[r.kind] || [r.kind])[0] : "产权人 " + r.name} → 不写入`, "human"); finish(doc);
    return { ok: true, left: pendRows(doc).length };
  }
  const pendingCount = (pid) => reviewDocs(pid).reduce((s, d) => s + pendRows(d).length, 0);
  const docsOf = (pid) => docs().filter((x) => x.property === pid && !x.deleted).slice().sort((a, b) => String(b.uploaded || "").localeCompare(String(a.uploaded || "")));
  // 软删：它带来的待确认行一并作废（已经确认写进去的不动）
  function removeDoc(docId) { const doc = docById(docId); if (!doc) return null; doc.deleted = true; doc.deletedAt = today(); pendRows(doc).forEach((r) => mark(r, "void")); if (doc.status === "review") doc.status = "removed"; audit(null, `${doc.name} 删除（软删 · 它带来的待确认行作废）`, "human"); return doc; }

  // ================= 手动建交易（三端一套；网站 deal-new-ok · 房源详情「建卖方交易」· 经纪人 App 都调它）=================
  function createManualDeal(type, cid, pid) {
    type = ["buyer", "seller", "lessor", "lessee"].includes(type) ? type : "seller"; const c = contact(cid); const p = pid ? prop(pid) : null; if (!c) return null;
    const id = newId("d"); const tplV = ((D().templates || []).find((x) => x.id === type) || {}).version || "v1.0"; const T = today();
    const d = { id, type, property: p ? p.id : null, stage: "", title: `${p ? p.addr : c.name} · ${{ buyer: "买方", seller: "挂牌", lessor: "出租", lessee: "寻租" }[type]}`, price: 0, primary: c.id, created: T, lastAction: T, priority: "medium", tplVersion: tplV, rm: { pre: 0, lines: {}, out: {}, close: 0 } };
    if (type === "lessor") d.landlordOrg = null;
    if (window.NBRoadmap) NBRoadmap.syncStage(d); else d.stage = { buyer: "prospecting", seller: "pre_listing", lessor: "pre_listing", lessee: "prospecting" }[type];
    (D().deals = D().deals || []).unshift(d);
    (D().parties = D().parties || []).push({ deal: id, party: c.id, type: "person", role: { buyer: "买方", seller: "卖方", lessor: "房东", lessee: "租客（寻租）" }[type], side: "ours", primary: true, signer: true });
    D().milestones = D().milestones || {}; D().tasks = D().tasks || {}; D().money = D().money || {}; D().milestones[id] = []; D().tasks[id] = []; D().money[id] = [];
    audit(id, `手动新建交易（${type}）→ 路线图第一步${p ? " · " + p.addr : ""}${type === "seller" ? "（上市前 · 上市委托协议没完成 = 还在争取）" : ""}`, "human");
    return d;
  }

  // ================= 小零件（不碰 DOM，只是字符串）=================
  const fmtNum = (v) => (v == null || v === "" || isNaN(Number(v)) ? "—" : Number(v).toLocaleString("en-US"));
  const specLine = (p) => (p ? `${p.beds == null ? "—" : p.beds} 房 ${p.baths == null ? "—" : p.baths} 卫 · ${fmtNum(p.sqft)} sqf · ${p.year == null ? "—" : p.year}` : "—");
  const relLabel = (p) => (!p ? "" : p.target ? "目标房源" : p.relationship === "watching" ? "客户关注" : p.relationship === "managed" ? "在管出租" : p.relationship === "sold" ? "已成交" : "其他");

  window.ownerLabel = ownerLabel;
  window.NBPropFile = { TYPES, TAX_NOTE, HKIND, COLS, fieldLabel, normAddr, findProp, addProperty, addContact, addOwner, lastWarn: () => lastWarn, timeline, markTarget, unTarget, touch, dueTargets, upload, plan, whyOne, confirmAll, confirmRow, rejectRow, pendingCount, docsOf, reviewDocs, removeDoc, createManualDeal, ownerLabel, ownerOf, fmtNum, specLine, relLabel, sampleRows };
})();
