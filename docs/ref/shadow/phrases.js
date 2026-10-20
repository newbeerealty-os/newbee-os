/* NewBee OS · 三端共用：摘要语句（步骤 S1）
   一笔交易最要紧的几句话，从字段和算出来的值拼出来：交易首页一张卡、客户 App 几句、发给对方经纪 / Title / 贷款方的邮件几句。
   数据：DB.phrases[]（一句 = { key, name, audience: agent | client | both, dealType: buyer | seller | lessor | lessee | any, zh, en, cond, clientSafe, owner: system | agent, mergedFrom }）
        DB.phraseGroups[]（一组 = { id, name, desc, placement: deal_home | client_app | email | milestones, items: [key], owner, types }）
        DB.phraseOverrides[交易]（这笔交易自己的改动：groups 叠哪几组 · hidden 隐藏哪几句 · edited 改过文字的 · extra 临时加的一句）
   模板：{{key}} 换成值；{{#if 条件}}…{{else}}…{{/if}} 可以嵌套；条件 = key、key == 值、key != 值、key > 0，可以用 && 连起来。
        key = 字段注册表里的真实字段名（window.NB_FIELDS），或 computed() 算出来的值（截止日 · 还剩几天 · 比例 · 净到手 …）。
   铁规矩（代码里拦，编辑页上写一句）：
   · 一句里只要有一个要显示的值缺着，或者它的条件不成立，整句不出（不出半句话、不出空括号）。
   · clientSafe = false（🔒）的句子进不了客户 App 的分组，也不会渲染给客户。
   · 给客户看的只用已确认的值（ctx 的 confirmedOnly）。
   · 租房申请的句子只陈述申请内容和核实结果：不提任何受保护类别，不写「推荐 / 不推荐」。
   · 每一句都有中文和英文两个版本。
   真实版：句子和分组是机构级的表，交易级的改动另存一张；渲染是 packages/core 里的纯函数，客户端只拿渲染好的文字。 */
(function () {
  const D = () => window.DB;
  const lang = (l) => l || ((D().ui || {}).lang === "en" ? "en" : "zh");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => (window.TODAY ? TODAY() : D().today);
  const deal = (id) => (typeof id === "string" ? (D().deals || []).find((x) => x.id === id) : id);
  const contact = (id) => (D().contacts || []).find((x) => x.id === id);
  const usd = (n) => "$" + Number(n || 0).toLocaleString("en-US");
  const num = (v) => { if (typeof v === "number") return v; const m = String(v == null ? "" : v).replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const days = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
  const addDays = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
  const reg = (key) => (window.NB_FIELDS || []).find((f) => f.key === key) || null;
  const typeOf = (d) => (window.NBRoadmap ? NBRoadmap.typeOf(d) : d.type || "buyer");
  const yes = (v) => /^(有|是|yes|true)/i.test(String(v == null ? "" : v).trim());
  const phrases = () => (D().phrases = D().phrases || []);
  const groups = () => (D().phraseGroups = D().phraseGroups || []);
  const byKey = (key) => phrases().find((p) => p.key === key) || null;
  const group = (id) => groups().find((g) => g.id === id) || null;

  // ================= 模板 =================
  function parse(tpl) {
    const re = /\{\{\s*(#if\s+[^}]+|else|\/if|[^}]+?)\s*\}\}/g; const root = { kids: [] }; const stack = [root]; let last = 0, m;
    const push = (n) => { const t = stack[stack.length - 1]; (t.inElse ? t.no : t.kids).push(n); };
    while ((m = re.exec(tpl))) {
      if (m.index > last) push({ text: tpl.slice(last, m.index) }); last = re.lastIndex; const tag = m[1];
      if (tag.startsWith("#if")) { const n = { cond: tag.slice(3).trim(), kids: [], no: [], inElse: false }; push(n); stack.push(n); }
      else if (tag === "else") stack[stack.length - 1].inElse = true;
      else if (tag === "/if") { if (stack.length > 1) stack.pop(); }
      else push({ key: tag });
    }
    if (last < tpl.length) push({ text: tpl.slice(last) });
    return root.kids;
  }
  const has = (v) => v !== undefined && v !== null && v !== "" && v !== false;
  const truthy = (v) => has(v) && !(typeof v === "number" && v === 0) && !/^\$?0(\.0+)?$/.test(String(v).trim());
  const codeOf = (key, ctx) => { const c = (ctx.__codes || {})[key]; return c != null ? c : ctx[key]; };
  // 条件：key（有值且不是 0 / 否）· key == 值 · key != 值 · key > 数；值缺着的比较一律不成立；&& 连起来 = 都要成立
  function test(cond, ctx) {
    return String(cond || "").split("&&").map((x) => x.trim()).filter(Boolean).every((c) => {
      let m;
      if ((m = c.match(/^(\w+)\s*(==|!=)\s*(.+)$/))) { const v = codeOf(m[1], ctx); if (!has(v)) return false; const eq = String(v).toLowerCase() === m[3].trim().toLowerCase(); return m[2] === "==" ? eq : !eq; }
      if ((m = c.match(/^(\w+)\s*>\s*(-?\d+(?:\.\d+)?)$/))) { const n = num(ctx[m[1]]); return n != null && n > Number(m[2]); }
      return truthy(ctx[c]);
    });
  }
  // 渲染一句。返回文字；走到的分支里有一个要显示的值缺着 → null（整句不出）。miss 传一个数组进来可以拿到缺的是哪几个
  function render(tpl, ctx, miss) {
    ctx = ctx || {}; let ok = true;
    const walk = (nodes) => nodes.map((n) => { if (n.text != null) return n.text; if (n.cond != null) return walk(test(n.cond, ctx) ? n.kids : n.no); const v = ctx[n.key]; if (!has(v) || typeof v === "boolean") { ok = false; if (miss && !miss.includes(n.key)) miss.push(n.key); return ""; } return String(v); }).join("");
    const out = walk(parse(String(tpl || ""))).replace(/\s+/g, " ").replace(/[；;，,]\s*$/, "").trim(); // 条件分支留下的句尾分号 / 逗号收掉
    return ok && out ? out : null;
  }
  const keysIn = (tpl) => { const out = []; String(tpl || "").replace(/\{\{\s*(?:#if\s+)?([^}]+?)\s*\}\}/g, (_, t) => { if (t === "else" || t === "/if") return ""; t.split("&&").forEach((c) => { const k = c.trim().split(/\s*(==|!=|>)\s*/)[0]; if (k && !out.includes(k)) out.push(k); }); return ""; }); return out; };

  // ================= 值：字段 + 算出来的 =================
  // 字段的值怎么进模板：天数 / 数字 → 光数字（模板里自己写「天」）；勾选类 → true / false；其余照字段上写的
  function fieldValues(dealId, opts) {
    const out = {}; opts = opts || {};
    ((D().fields || {})[dealId] || []).forEach((f) => { if (f.absent || f.status === "rejected") return; if (opts.confirmedOnly && f.status !== "confirmed") return; const r = reg(f.key) || { type: "text" }; out[f.key] = r.type === "days" || r.type === "number" ? (num(f.value) != null ? num(f.value) : f.value) : r.type === "boolean" ? yes(f.value) : f.value; });
    return out;
  }
  // 还在 Offer 阶段、没有合同字段的交易：用主 Offer（已接受的，或在谈的）最后一版的条款
  function offerValues(d, zh) {
    const os = ((D().offers || {})[d.id] || []); const o = os.find((x) => x.status === "accepted") || os.find((x) => x.status === "negotiating"); if (!o) return {};
    const v = o.versions[o.versions.length - 1]; const out = { sales_price: usd(v.price), earnest_money: usd(v.em), option_period_days: v.optionDays, option_fee: usd(v.optionFee), seller_concessions: usd(v.sellerPaid || 0), residential_service_contract: usd(v.warranty || 0) };
    if (v.close) out.closing_date = /^\d+\s*天$/.test(v.close) ? (zh ? `签约后 ${parseInt(v.close, 10)} 天` : `${parseInt(v.close, 10)} days after signing`) : v.close;
    if (v.titlePolicy) out.title_policy_payer = v.titlePolicy.replace(/付$/, "");
    if (v.financing) { const m = String(v.financing).match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%$/); const cash = /现金|cash/i.test(v.financing); out.loan_type = cash ? "现金" : (m ? m[1] : v.financing); if (m || cash) { const down = cash ? v.price : Math.round(v.price * Number(m[2]) / 100); out.cash_portion = usd(down); out.loan_amount = usd(v.price - down); } }
    const lb = num(v.leaseback); if (lb) out.leaseback_days = lb;
    if (o.versions.length > 1 && v.who === "ours") out.counter_terms = zh ? `价格 ${usd(v.price)} · option ${v.optionDays} 天 / ${usd(v.optionFee)} · 过户 ${v.close}` : `price ${usd(v.price)} · option ${v.optionDays} days / ${usd(v.optionFee)} · closing ${v.close}`;
    out.__offer = o;
    return out;
  }
  // 算出来的值（一处算好，模板只管用）。deal = 交易或交易 id；opts = { confirmedOnly, lang }。返回 { 值…, __codes: { 比较用的代码 } }
  function computed(d0, opts) {
    const d = deal(d0); if (!d) return {}; opts = opts || {}; const zh = lang(opts.lang) === "zh"; const L = (a, b) => (zh ? a : b); const D0 = D(); const T0 = today();
    const F = fieldValues(d.id, opts); const O = F.sales_price ? {} : offerValues(d, zh); const o = O.__offer; delete O.__offer;
    const V = (k) => (F[k] !== undefined ? F[k] : O[k]); const c = Object.assign({}, O); const codes = {};
    const ms = (D0.milestones || {})[d.id] || []; const m = (key) => ms.find((x) => x.key === key); const type = typeOf(d);
    // —— 比较用的代码 ——
    const lt = V("loan_type"); if (lt != null) { codes.loan_type = /现金|cash/i.test(lt) ? "cash" : /fha/i.test(lt) ? "fha" : /\bva\b/i.test(lt) ? "va" : "conventional"; c.loan_type_label = codes.loan_type === "cash" ? L("全现金", "all cash") : L(`${lt} 贷款`, `${lt} loan`); }
    const sv = V("survey_new_or_existing"); if (sv != null) { codes.survey_new_or_existing = /现有|existing|T-47/i.test(sv) ? "existing" : /卖方|seller/i.test(sv) ? "new_seller" : "new_buyer"; c.survey_label = { existing: L("卖方现有 survey + T-47", "existing survey + T-47"), new_buyer: L("新 survey（买方付）", "new survey (buyer pays)"), new_seller: L("新 survey（卖方付）", "new survey (seller pays)") }[codes.survey_new_or_existing]; }
    const tp = V("title_policy_payer"); if (tp != null) { codes.title_policy_payer = /卖方|seller/i.test(tp) ? "seller" : "buyer"; c.title_policy_payer = codes.title_policy_payer === "seller" ? L("卖方", "seller") : L("买方", "buyer"); }
    const ps = V("possession"); if (ps != null) codes.possession = /过户|closing|fund/i.test(ps) && !/leaseback 后|回租/.test(ps) ? "closing" : "leaseback";
    // —— 公司名：字段里常把联系人写在括号里（"Sample Title Co（Maria Lopez）"），句子里只用公司名，联系人另有占位符 ——
    ["title_company", "lender"].forEach((k) => { const v = V(k); if (typeof v === "string" && v) c[k] = v.replace(/\s*[（(][^（()）]*[)）]\s*$/, ""); });
    // —— 比例 ——
    const price = num(V("sales_price")), loan = num(V("loan_amount")), cash = num(V("cash_portion"));
    if (price && loan != null) c.loan_pct = Math.round(loan / price * 100) + "%"; if (price && cash != null) c.down_payment_pct = Math.round(cash / price * 100) + "%";
    // —— 截止和天数：有里程碑用里程碑，没有就从生效日 + 已知的天数算；都没有就没有 ——
    const eff = d.effective || (typeof V("effective_date") === "string" ? V("effective_date") : null); const od = num(V("option_period_days")), fin = num(V("buyer_approval_days"));
    const dateOf = (key, n) => (m(key) && m(key).date ? m(key).date : eff && n != null && F.effective_date ? addDays(eff, n) : null);
    const set = (k, v) => { if (has(v)) c[k] = v; };
    set("option_period_end", dateOf("option_period_end", od)); set("em_due", dateOf("em_due", num(V("earnest_money_due_days")))); set("financing_deadline", dateOf("financing_deadline", fin));
    const cl = d.closing || (/^\d{4}-/.test(String(V("closing_date") || "")) ? V("closing_date") : null); if (cl && days(T0, cl) >= 0) c.days_to_closing = days(T0, cl);
    const next = ms.filter((x) => x.status === "pending" && x.date && x.date >= T0).sort((a, b) => a.date.localeCompare(b.date))[0]; if (next) { c.next_milestone_name = next.label; c.next_milestone_date = next.date; }
    // —— 收到没有 ——
    const done = (key) => !!(m(key) && m(key).status === "done"); const doneAt = (key) => (m(key) ? m(key).doneAt || (m(key).verified && m(key).verified.at.slice(0, 10)) || m(key).date : null);
    if (m("em_due")) { c.em_received = done("em_due"); if (c.em_received) c.em_received_date = doneAt("em_due"); c.em_pending = !c.em_received; }
    if (m("option_fee_due")) c.option_fee_received = done("option_fee_due");
    if (m("hoa_docs")) c.hoa_docs_received = done("hoa_docs");
    c.option_open = !!(c.option_period_end && c.option_period_end >= T0 && !["closed", "terminated", "lost", "ended"].includes(d.stage));
    const docs = (D0.documents || []).filter((x) => x.deal === d.id); const docOf = (t) => docs.find((x) => x.type === t || (x.children || []).some((k) => k.type === t));
    const sd = docOf("sellers_disclosure"); if (sd && type === "buyer") { c.sd_received = true; c.sd_received_date = sd.uploaded; }
    const pre = docOf("preapproval"); c.has_preapproval = !!pre; if (pre) { c.preapproval_lender = String(V("lender") || pre.source || "").replace(/（.*$/, ""); c.preapproval_date = pre.uploaded; }
    c.has_proof_of_funds = !!docOf("proof_of_funds");
    // —— HOA · 现状 · 附件 ——
    const hoaRaw = (((D0.fields || {})[d.id] || []).find((f) => f.key === "hoa_yes_no" && !f.absent && (!opts.confirmedOnly || f.status === "confirmed")) || {}).value;
    if (hoaRaw != null) { c.hoa_known = true; const nm = String(hoaRaw).match(/（([^）]+)）/); if (nm) c.hoa_name = nm[1]; if (/卖方/.test(hoaRaw)) c.hoa_docs_provider = L("卖方", "seller"); else if (/买方/.test(hoaRaw)) c.hoa_docs_provider = L("买方", "buyer"); }
    const pc = V("property_condition"); if (pc != null) c.as_is = /as.?is|现状/i.test(pc);
    const miss = ((D0.compliance || {})[d.id] || []).filter((x) => x.phase === "contract" && !(x.ok || x.na)).map((x) => x.item); if (miss.length) c.missing_attachments = miss.join("、");
    const p = (D0.properties || []).find((x) => x.id === d.property); if (p) c.property_address = `${p.addr}, ${p.city}${p.zip ? " " + p.zip : ""}`;
    // —— 谁付 ——
    c.seller_covers = truthy(V("seller_concessions")) || codes.title_policy_payer === "seller" || codes.survey_new_or_existing === "new_seller" || truthy(V("residential_service_contract"));
    const ofee = ((D0.money || {})[d.id] || []).find((x) => /option fee/i.test(x.label || "")); if (ofee) c.option_fee_to_title = /title/i.test(ofee.to || "");
    // —— 净到手（卖方）：一个算法，NBOffers.netToSeller ——
    if (type === "seller" && window.NBOffers) { const n = o ? NBOffers.netToSeller(o, d.id) : price ? NBOffers.netToSeller({ price, sellerPaid: num(V("seller_concessions")) || 0, warranty: num(V("residential_service_contract")) || 0 }, d.id) : null; if (n) c.net_proceeds = usd(n.net); }
    // —— 客户的下一步 · 贷款员 · 佣金 ——
    const ct = ((D0.tasks || {})[d.id] || []).filter((x) => x.status === "pending" && x.clientVisible && x.due).sort((a, b) => a.due.localeCompare(b.due))[0]; if (ct) { c.next_client_action = ct.name.replace(/^客户[:：]\s*/, ""); c.next_client_action_date = ct.due; }
    const lo = (D0.parties || []).find((x) => x.deal === d.id && /Loan Officer|贷款/.test(x.role || "")); const loc = lo && contact(lo.party); if (loc) c.loan_officer_contact = `${loc.name}${loc.phone ? " " + loc.phone : ""}`;
    const com = (D0.commission || {})[d.id]; if (com) { c.buyer_broker_comp = `${com.rate}%（${usd(com.gci)}）`; if (com.source) c.comp_source = com.source; c.my_split = `${com.split} · ${L("到手", "net")} ${usd(com.agent)}`; }
    // —— 租房申请（只有带申请字段的放租交易才有）：只陈述申请内容和核实结果 ——
    if (F.applicant_names !== undefined || ((D0.fields || {})[d.id] || []).some((f) => f.key === "applicant_names")) {
      c.is_application = true;
      if (F.applicant_names) c.applicant_count = String(F.applicant_names).split(/[、,，]/).filter(Boolean).length;
      if (F.rent) c.offered_rent = F.rent;
      const inc = num(F.income), rent = num(F.rent); const crit = (p && p.criteria) || {};
      if (opts.confirmedOnly ? inc != null : (((D0.fields || {})[d.id] || []).find((f) => f.key === "income") || {}).status === "confirmed") { c.verified_monthly_income = usd(inc); if (rent) c.income_to_rent_ratio = (Math.round(inc / rent * 10) / 10).toString(); }
      if (crit.incomeX != null) c.income_standard = crit.incomeX;
      c.has_income_docs = docs.some((x) => x.type === "income_docs");
      const fee = ((D0.money || {})[d.id] || []).find((x) => /申请费/.test(x.label || "")); if (fee) { c.application_fee = usd(fee.amount); c.fee_received = fee.status === "paid"; }
      if (F.pet_summary !== undefined) { c.pets_known = true; c.has_pets = !/^(无|没有|none|no\b)/i.test(String(F.pet_summary).trim()); }
    }
    c.__codes = codes;
    return c;
  }
  // 一笔交易渲染要用的全部值 = 字段的值 + 算出来的值（客户端传 confirmedOnly: true）
  function ctx(dealId, opts) { const d = deal(dealId); if (!d) return {}; return Object.assign({}, fieldValues(d.id, opts), computed(d, opts)); }

  // ================= 一笔交易上的句子 =================
  const ov = (dealId, make) => { const all = (D().phraseOverrides = D().phraseOverrides || {}); if (!all[dealId] && make) all[dealId] = { groups: [], hidden: [], edited: {}, extra: [] }; const o = all[dealId]; if (o) { o.groups = o.groups || []; o.hidden = o.hidden || []; o.edited = o.edited || {}; o.extra = o.extra || []; } return o || null; };
  // 这笔交易在某个位置能选的分组（按交易类型；申请类的分组只给有申请的放租交易）
  function groupsFor(dealId, placement) { const d = deal(dealId); if (!d) return []; const t = typeOf(d); const app = ((D().fields || {})[d.id] || []).some((f) => f.key === "applicant_names"); return groups().filter((g) => (!placement || g.placement === placement || (placement === "email" && g.alsoEmail)) && (!g.types || g.types.includes(t)) && (!g.application || app)); }
  // 这笔交易在某个位置现在用哪几组。交易上选的是一个清单（phraseOverrides[交易].groups）：
  //   交易首页那张卡（deal_home）= 清单里的全部（可以把给客户的、给 title 的也叠上来看）；别的位置 = 清单里属于那个位置的几组；
  //   清单里没有合适的 → 那个位置默认的一组（有申请的放租交易先用申请那一组）
  function groupsOf(dealId, placement) {
    placement = placement || "deal_home"; const o = ov(dealId); const all = groupsFor(dealId);
    const fits = (g) => g.placement === placement || (placement === "email" && g.alsoEmail);
    const sel = o ? o.groups.map(group).filter((g) => g && all.includes(g)) : []; const mine = placement === "deal_home" ? sel : sel.filter(fits);
    if (mine.length) return mine;
    const can = all.filter(fits); const def = can.find((g) => g.application) || can[0];
    return def ? [def] : [];
  }
  const forClient = (aud) => aud === "client" || aud === "family";
  // 这个联系人是不是这笔交易里「我方的客户」（主联系人 · 我方的各方 · 客户视图成员）。对方的人（例如放租交易里的申请人）不是：给客户的句子不出给他
  const isClientOf = (dealId, cid) => { const d = deal(dealId); if (!d || !cid) return false; return d.primary === cid || (D().parties || []).some((x) => x.deal === d.id && x.party === cid && x.side === "ours") || ((D().portalMembers || {})[d.id] || []).some((m) => m.contactId === cid); };
  // 渲染好的句子。where = 位置（deal_home / client_app / email / milestones）或一个分组 id；audience = agent | client。
  // opts = { lang, who }：who = 正在看的那个联系人（客户 App 一定要传）——他不是这笔交易里我方的客户，就一句也不出。
  // 返回 [{ key, name, text, group, edited, extra }]：缺字段 / 条件不成立 / 隐藏了 / 不该给这个人看的句子都不在里面
  function lines(dealId, where, audience, opts) {
    const d = deal(dealId); if (!d) return []; opts = opts || {}; audience = audience || "agent"; const cl = forClient(audience); const lg = lang(opts.lang);
    if (cl && opts.who && !isClientOf(d.id, opts.who)) return [];
    const gs = group(where) ? [group(where)] : groupsOf(d.id, where || "deal_home"); const o = ov(d.id) || { hidden: [], edited: {}, extra: [] };
    const cx = ctx(d.id, { confirmedOnly: cl, lang: lg }); const t = typeOf(d); const seen = {}; const out = [];
    if (cl) AGENT_ONLY.forEach((k) => { delete cx[k]; });
    gs.forEach((g) => { if (cl && g.placement !== "client_app") return; g.items.forEach((key) => {
      if (seen[key]) return; seen[key] = true; const p = byKey(key); if (!p || o.hidden.includes(key)) return;
      if (cl && (!p.clientSafe || p.audience === "agent")) return;
      if (p.dealType !== "any" && p.dealType !== t) return;
      if (p.application && !cx.is_application) return;
      if (p.cond && !test(p.cond, cx)) return;
      const tpl = o.edited[key] || p; const text = render(tpl[lg] || tpl.zh, cx); if (!text) return;
      out.push({ key, name: p.name, text, group: g.id, edited: !!o.edited[key], clientSafe: !!p.clientSafe });
    }); });
    if (!cl && !group(where)) o.extra.forEach((x) => { const text = render(x[lg] || x.zh, cx); if (text) out.push({ key: x.id, name: "临时加的", text, group: null, extra: true }); });
    return out;
  }
  // 为什么这一句没出来：{ text, missing: [缺的 key], condFalse, hidden }（编辑页预览、交易卡上的「恢复」用）
  function preview(keyOrPhrase, dealId, opts) {
    const p = typeof keyOrPhrase === "string" ? byKey(keyOrPhrase) : keyOrPhrase; const d = deal(dealId); if (!p || !d) return null; opts = opts || {}; const lg = lang(opts.lang);
    const cx = ctx(d.id, { confirmedOnly: !!opts.confirmedOnly, lang: lg }); const miss = []; const o = ov(d.id) || { hidden: [], edited: {} };
    const tpl = (!opts.raw && o.edited[p.key]) || p; const text = render(tpl[lg] || tpl.zh, cx, miss);
    const condFalse = !!p.cond && !test(p.cond, cx);
    return { text: condFalse ? null : text, missing: miss, condFalse, hidden: o.hidden.includes(p.key), typeMismatch: p.dealType !== "any" && p.dealType !== typeOf(d) };
  }

  // ================= 规矩：校验 · 能不能放进一组 =================
  const PROTECTED = /种族|肤色|宗教|信仰|性别|国籍|出生地|残疾|残障|家庭状况|有小孩|孩子|怀孕|婚姻|年龄|\b(race|color|religion|sex|gender|national origin|disab\w*|handicap|familial|children|kids?|pregnan\w*|marital|age)\b/i;
  const VERDICT = /推荐|不推荐|建议批准|建议拒绝|\b(recommend\w*)\b/i;
  const AGENT_ONLY = ["buyer_broker_comp", "comp_source", "my_split"]; // 佣金从不给客户看（D26）：用了这几个占位符的句子必须是 🔒 / 只给自己看；渲染给客户时这几个值也不进 ctx
  const COMPUTED = { loan_pct: "贷款比例", down_payment_pct: "首付比例", loan_type_label: "贷款类型（说法）", option_period_end: "Option 截止日", em_due: "EM 送达截止日", financing_deadline: "贷款审批截止日", days_to_closing: "距过户几天", next_milestone_name: "下一个节点", next_milestone_date: "下一个节点的日期", em_received: "EM 收到没有", em_received_date: "EM 收到日", em_pending: "EM 还没送到", option_fee_received: "Option fee 送到没有", option_open: "Option 期还开着", sd_received: "Seller's Disclosure 收到没有", sd_received_date: "Seller's Disclosure 收到日", sd_deadline: "Seller's Disclosure 截止日", hoa_docs_received: "HOA 文件收到没有", hoa_docs_provider: "HOA 文件谁提供", hoa_known: "有没有 HOA 这一格", hoa_name: "HOA 名字", hoa_buyer_pays: "HOA 转让费买方上限", survey_label: "Survey（说法）", net_proceeds: "预计净到手", next_client_action: "客户的下一步", next_client_action_date: "客户下一步的日期", missing_attachments: "缺的附件", has_preapproval: "有没有预审批信", preapproval_lender: "预审批的贷款方", preapproval_date: "预审批信日期", has_proof_of_funds: "有没有资金证明", as_is: "按现状", seller_covers: "卖方要承担东西", seller_repairs: "卖方要修的", possession_date: "交房日", non_realty_items: "随房转让的东西", property_address: "房产地址（全）", loan_officer_contact: "贷款员联系方式", buyer_broker_comp: "买方经纪佣金", comp_source: "佣金来源", my_split: "本方分成", counter_terms: "我方 counter 的条款", leaseback_days: "回租天数", leaseback_rent: "回租租金", additional_em_deadline: "追加 EM 截止日", appraisal_gap_amount: "估价缺口上限", option_fee_credited: "Option fee 过户时抵扣", option_fee_to_title: "Option fee 送 title", applicant_count: "申请人数", offered_rent: "出价租金", verified_monthly_income: "已核实月收入", income_to_rent_ratio: "收入是租金的几倍", income_standard: "房东书面标准（倍）", has_income_docs: "收入材料收了没有", application_fee: "申请费", fee_received: "申请费收了没有", has_pets: "有没有宠物", pets_known: "宠物这一格确认了", applicant_agent: "申请人经纪", applicant_brokerage: "申请人经纪公司", is_application: "这是一份租房申请" };
  // 占位符清单（编辑页的选择器）：字段注册表里的 + 算出来的
  const placeholders = () => (window.NB_FIELDS || []).map((f) => ({ key: f.key, label: f.zh, kind: "field", type: f.type })).concat(Object.keys(COMPUTED).map((k) => ({ key: k, label: COMPUTED[k], kind: "computed" })));
  // 一句合不合规矩。返回错误列表（空 = 可以存）
  function validate(p) {
    const e = []; if (!p) return ["没有这一句"];
    if (!String(p.zh || "").trim() || !String(p.en || "").trim()) e.push("中文和英文两个版本都要写");
    if (!["agent", "client", "both"].includes(p.audience)) e.push("给谁看要选一个：自己 / 客户 / 两边");
    if (!["buyer", "seller", "lessor", "lessee", "any"].includes(p.dealType)) e.push("交易类型要选一个");
    if (p.clientSafe === false && p.audience === "client") e.push("🔒 不给客户看的句子，不能把「给谁看」设成客户");
    const known = new Set(placeholders().map((x) => x.key)); const used = [...new Set(keysIn(p.zh).concat(keysIn(p.en), keysIn(p.cond ? `{{#if ${p.cond}}}{{/if}}` : "")))]; const bad = used.filter((k) => !known.has(k)); if (bad.length) e.push(`这些占位符不在字段表里：${bad.join("、")}`);
    if (p.clientSafe !== false && p.audience !== "agent" && used.some((k) => AGENT_ONLY.includes(k))) e.push("佣金不给客户看：用了佣金占位符的句子要标 🔒，或者把「给谁看」设成自己");
    if (p.application) { const txt = `${p.zh} ${p.en}`.replace(/\{\{[^}]*\}\}/g, " "); if (PROTECTED.test(txt)) e.push("租房申请的句子不能提受保护类别（种族、宗教、性别、国籍、残疾、家庭状况、年龄 …）"); if (VERDICT.test(txt)) e.push("租房申请的句子只陈述事实，不写「推荐 / 不推荐」"); }
    return e;
  }
  // 这一句能不能放进这一组
  function canPlace(key, groupId) {
    const p = byKey(key), g = group(groupId); if (!p || !g) return { ok: false, why: "没有这一句或这一组" };
    if (g.placement === "client_app" && (!p.clientSafe || p.audience === "agent")) return { ok: false, why: "🔒 不给客户看的句子进不了客户 App 的分组" };
    if (g.application && !p.application) return { ok: false, why: "租房申请这一组只放申请类的句子（Fair Housing）" };
    return { ok: true };
  }
  function addToGroup(groupId, key) { const r = canPlace(key, groupId); if (!r.ok) return r; const g = group(groupId); if (!g.items.includes(key)) g.items.push(key); return { ok: true, g }; }
  function removeFromGroup(groupId, key) { const g = group(groupId); if (!g) return { ok: false, why: "没有这一组" }; g.items = g.items.filter((k) => k !== key); return { ok: true, g }; }
  const newKey = (pre) => { let n = 1; while (byKey(pre + n)) n++; return pre + n; };
  // 存一句（新建或改）。新建的归经纪人自己（owner: agent）；系统自带的可以改文字，不能删
  function save(p) {
    const cur = p.key ? byKey(p.key) : null; const next = Object.assign({ cond: "", clientSafe: true, owner: "agent", mergedFrom: [] }, cur || {}, p); const e = validate(next); if (e.length) return { ok: false, errors: e };
    if (cur) { Object.assign(cur, next); const bad = groups().filter((g) => g.items.includes(cur.key) && !canPlace(cur.key, g.id).ok); bad.forEach((g) => { g.items = g.items.filter((k) => k !== cur.key); }); return { ok: true, phrase: cur, removedFrom: bad.map((g) => g.id) }; }
    next.key = next.key || newKey("U"); phrases().push(next); return { ok: true, phrase: next };
  }
  function remove(key) { const p = byKey(key); if (!p) return { ok: false, why: "没有这一句" }; if (p.owner === "system") return { ok: false, why: "系统自带的句子不能删（可以从分组里拿掉，或在交易上隐藏）" }; D().phrases = phrases().filter((x) => x.key !== key); groups().forEach((g) => { g.items = g.items.filter((k) => k !== key); }); return { ok: true }; }
  // 两句合并成一句新的（归经纪人）：条件 = 两句的条件都成立；任何一句是 🔒，合并后也是 🔒
  function merge(keyA, keyB) {
    const a = byKey(keyA), b = byKey(keyB); if (!a || !b || a === b) return { ok: false, why: "要选两句不同的" };
    if (a.dealType !== b.dealType && a.dealType !== "any" && b.dealType !== "any") return { ok: false, why: "这两句属于不同的交易类型，合不到一起" };
    const aud = a.audience === b.audience ? a.audience : [a.audience, b.audience].includes("agent") ? "agent" : "client";
    return save({ key: newKey("M"), name: `${a.name} + ${b.name}`, audience: aud === "client" && !(a.clientSafe && b.clientSafe) ? "agent" : aud, dealType: a.dealType === "any" ? b.dealType : a.dealType, zh: `${a.zh}；${b.zh}`, en: `${a.en}; ${b.en}`, cond: [a.cond, b.cond].filter(Boolean).join(" && "), clientSafe: !!(a.clientSafe && b.clientSafe), application: !!(a.application || b.application) || undefined, owner: "agent", mergedFrom: [keyA, keyB] });
  }

  // ================= 交易自己的改动（不动分组本身）=================
  const O = {
    get: (dealId) => ov(dealId),
    // 这笔交易叠哪几组。placement 给了 → 只换那个位置的几组，别的位置选过的不动；不给 → 整个换掉
    setGroups(dealId, ids, placement) { const o = ov(dealId, true); const next = (ids || []).filter((id) => group(id)); o.groups = placement ? o.groups.filter((id) => group(id) && group(id).placement !== placement).concat(next.filter((id) => group(id).placement === placement)) : next; return o; },
    hide(dealId, key) { const o = ov(dealId, true); if (!o.hidden.includes(key)) o.hidden.push(key); return o; },
    unhide(dealId, key) { const o = ov(dealId, true); o.hidden = o.hidden.filter((k) => k !== key); return o; },
    // 只在这笔交易里改这一句的文字（中英都要有）
    edit(dealId, key, t) { const p = byKey(key); if (!p) return { ok: false, errors: ["没有这一句"] }; const e = validate(Object.assign({}, p, { zh: t.zh, en: t.en })); if (e.length) return { ok: false, errors: e }; ov(dealId, true).edited[key] = { zh: t.zh, en: t.en }; return { ok: true }; },
    restore(dealId, key) { const o = ov(dealId, true); delete o.edited[key]; o.hidden = o.hidden.filter((k) => k !== key); return o; },
    addExtra(dealId, t) { if (!String(t.zh || "").trim()) return { ok: false, errors: ["先写一句"] }; const o = ov(dealId, true); const x = { id: "x" + Date.now().toString(36), zh: t.zh, en: t.en || t.zh }; o.extra.push(x); return { ok: true, extra: x }; },
    removeExtra(dealId, id) { const o = ov(dealId, true); o.extra = o.extra.filter((x) => x.id !== id); return o; },
  };
  // 一段现成的只读 HTML（经纪人 App 的交易总览、客户 App 首页直接放）：没有句子 → 空串
  function linesHtml(dealId, where, audience, opts) { const ls = lines(dealId, where, audience, opts); return ls.length ? `<div class="list phr">${ls.map((x) => `<div class="li" data-phrase="${esc(x.key)}"><div class="body"><div class="t small">${esc(x.text)}</div></div></div>`).join("")}</div>` : ""; }

  window.NBPhrase = { all: phrases, groups, byKey, group, parse, test, render, keysIn, fieldValues, computed, ctx, groupsFor, groupsOf, isClientOf, lines, linesHtml, preview, placeholders, COMPUTED, AGENT_ONLY, validate, canPlace, addToGroup, removeFromGroup, save, remove, merge, override: O, hide: O.hide, unhide: O.unhide, edit: O.edit, restore: O.restore, addExtra: O.addExtra, removeExtra: O.removeExtra, setGroups: O.setGroups };
})();
