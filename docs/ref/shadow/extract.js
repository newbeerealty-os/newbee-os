/* NewBee OS · 三端共用：合同进件 —— 扫描件 · 手写 · 裁图 · 交叉校验（步骤 4b · 4h · 5 · F2）
   文件：documents[].sourceKind = text 电子版（有文字层）· scan 扫描件 · photo 手机拍照；扫描 / 拍照先预处理（转正 · 纠斜 · 提对比度 · ≥ 200 DPI）再抽。
   字段：fields[deal][] 每一行 = { key, value, page, quote（AI 看到的原文）, conf, src: typed 打印 | handwritten 手写 | checkbox 勾选, docKind, crop: { page, text }（钱和日期才有）, status }
   规矩（网站向导、字段 tab、经纪人 App 都调这里，不各写一份）：
   · 系统自己从不确认任何一格：每一格都是人点了才算（没有「零点击」的确认）。
   · 低置信 = 置信度低于 SCORE_CONFIG.thresholds.lowConfidence，或者来源是扫描件 / 手写 / 手机拍照（isLowSource：不管置信度写多高）。
   · 「确认全部」一次收下：电子版（有文字层）· 置信 ≥ 线 · 没卡在交叉校验上的每一行——钱和日期也在内（表上每行有值和 AI 看到的原文，看这一眼就是确认）。
   · 扫描 / 手写 / 拍照来的、低于线的、卡在交叉校验上的：不进「确认全部」，一条一条确认；其中的钱和日期，确认卡先把裁图摆出来（影子里裁图是一张小纸条，真实版是页面图片上裁下来的那一块）。
   · 每一行都有「不对」：标掉、不参加派生、写修改记录。
   · 交叉校验 4 项：房价 = 现金 + 贷款 · Earnest money = 收据金额 · 生效日 < Option 截止 < 过户日 · HOA 勾了就得有 HOA 附录。
   · 没有待确认的字段了才派生（deriveAll）：里程碑的日期全部从已确认的字段算，字段里没有的天数就没有日期；买方 / 卖方交易都派生。
   · createDeal 是「上传一份签好的合同 → 建交易」唯一的入口（网站向导和经纪人 App 都用它），选的交易类型照办。
   真实版：抽取在服务端跑，结果先成为提议；bbox 只给表单工具的审核页画框，运行时按段落锚点读、不按坐标。 */
(function () {
  const D = () => window.DB;
  const T = (zh, en) => (D() && D().ui && D().ui.lang === "en" ? en : zh);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => (window.TODAY ? TODAY() : D().today);
  const stamp = () => today() + " " + new Date().toTimeString().slice(0, 5);
  const deal = (id) => (D().deals || []).find((x) => x.id === id);
  const contact = (id) => (D().contacts || []).find((x) => x.id === id);
  const audit = (did, what, actor, who) => { if (window.audit) window.audit(did, what, actor || "human", who); };
  const meName = () => (D().me || {}).name || "Jason";
  const usd = (n) => "$" + Number(n || 0).toLocaleString("en-US");
  const TH = () => (window.SCORE_CONFIG && SCORE_CONFIG.thresholds) || { lowConfidence: 0.9 };
  const FIELDS = window.NB_FIELDS || [];
  const reg = (key) => FIELDS.find((f) => f.key === key) || { key, type: "text", zh: key, en: key, tier: "all", para: "" };
  const typeOfDeal = (d) => (window.NBRoadmap ? NBRoadmap.typeOf(d) : d.type || "buyer");
  const SOURCE_KIND = { text: ["电子版 · 有文字层", "ok"], scan: ["扫描件", "warn"], photo: ["手机拍照", "warn"] };
  const SRC = { typed: "打印", handwritten: "手写", checkbox: "勾选" };
  const PREP = ["转正", "纠斜", "提对比度", "≥ 200 DPI"];
  const DOC_TYPES = { bundle: "合同包", trec_1_4: "主合同 TREC 20-19", financing_addendum: "贷款附录 40-11", hoa_addendum: "HOA 附录 36-11", sellers_disclosure: "Seller's Disclosure", em_receipt: "Earnest money 收据", option_receipt: "Option fee 收据", iabs: "IABS", cpn: "Consumer Protection Notice", amendment: "Amendment", title_commitment: "Title Commitment", inspection_report: "验房报告", survey: "Survey", preapproval: "预审批信", offer: "Offer", buyer_rep: "Buyer Rep 协议", listing_agreement: "Listing Agreement", lease: "租约 TXR-2001", lease_application: "租房申请 TXR-2003", pet_agreement: "宠物附加协议", paystub: "工资单", offer_letter: "Offer letter", bank_statement: "银行流水", tax_return: "报税表", credit_report: "信用报告", income_docs: "收入材料", tenant_criteria: "房东书面租客标准", client_upload: "客户上传" };
  const SAMPLES = { typed: ["电子版", "有文字层的 PDF · 26 页"], scan: ["手写扫描", "手填后扫描：每一格都要逐条确认，手写的钱 / 日期先看裁图"], photo: ["手机拍照", "手机一页一页拍的：每一格都要逐条确认"] };

  const rowsOf = (did) => (D().fields || {})[did] || [];
  const live = (did) => rowsOf(did).filter((f) => !f.absent && f.status !== "rejected");
  const field = (did, key) => rowsOf(did).find((f) => f.key === key);
  const num = (v) => { const m = String(v == null ? "" : v).replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const isoOf = (v) => { const m = String(v == null ? "" : v).match(/\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; };
  const addDays = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); const p = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
  const dow = (iso) => new Date(iso + "T00:00:00").getDay();
  const rollForward = (iso) => { let x = iso; while (dow(x) === 0 || dow(x) === 6) x = addDays(x, 1); return x; };        // 递交类的截止遇周末顺延（节假日影子里不算）
  const bizBefore = (iso, n) => { let x = iso; while (n > 0) { x = addDays(x, -1); if (dow(x) !== 0 && dow(x) !== 6) n--; } return x; };

  // ---- 低置信 · 裁图 ----
  // 低置信来源（R-2）：扫描件 · 手写 · 手机拍照——不管置信度写多高都不进「确认全部」
  const isLowSource = (f) => !!f && (f.src === "handwritten" || f.docKind === "scan" || f.docKind === "photo");
  const isLow = (f) => !!f && (isLowSource(f) || (f.conf != null && f.conf < TH().lowConfidence));
  const needsCrop = (f) => ["money", "date"].includes(reg(f.key).type);
  function openCrop(did, key) { const f = field(did, key); if (!f) return null; f.cropSeen = true; return f; }

  // ---- 交叉校验 ----
  // 返回 [{ id, ok: true 对上 | false 对不上 | null 缺字段没法核对, text, keys }]
  function checks(did) {
    const d = deal(did); if (!d) return [];
    const v = (key) => { const f = live(did).find((x) => x.key === key); return f ? f.value : null; };
    if (["lessor", "lessee"].includes(typeOfDeal(d))) { const a = isoOf(v("lease_start")), b = isoOf(v("lease_end")); return a || b ? [{ id: "lease_dates", ok: a && b ? a < b : null, text: a && b ? (a < b ? `租约开始 ${a} 早于到期 ${b}` : `租约开始 ${a} 不早于到期 ${b}`) : "租约开始 < 到期：缺日期，没法核对", keys: ["lease_start", "lease_end"] }] : []; }
    const out = [];
    const price = num(v("sales_price")), cash = num(v("cash_portion")), loan = num(v("loan_amount"));
    out.push(price == null || cash == null || loan == null ? { id: "price", ok: null, text: "房价 = 现金 + 贷款：缺字段，没法核对", keys: ["sales_price", "cash_portion", "loan_amount"] } : { id: "price", ok: price === cash + loan, text: price === cash + loan ? `房价 ${usd(price)} = 现金 ${usd(cash)} + 贷款 ${usd(loan)}` : `房价 ${usd(price)} ≠ 现金 ${usd(cash)} + 贷款 ${usd(loan)}（差 ${usd(Math.abs(price - cash - loan))}）`, keys: ["sales_price", "cash_portion", "loan_amount"] });
    const em = num(v("earnest_money")), rc = num(v("earnest_money_receipt_amount"));
    out.push(em == null || rc == null ? { id: "em", ok: null, text: rc == null ? "Earnest money = 收据金额：还没有收据，收到后再核" : "Earnest money = 收据金额：缺合同金额", keys: ["earnest_money", "earnest_money_receipt_amount"] } : { id: "em", ok: em === rc, text: em === rc ? `Earnest money ${usd(em)} = 收据 ${usd(rc)}` : `Earnest money ${usd(em)} ≠ 收据 ${usd(rc)}`, keys: ["earnest_money", "earnest_money_receipt_amount"] });
    const eff = isoOf(v("effective_date")), cl = isoOf(v("closing_date")), od = num(v("option_period_days")); const opt = eff && od != null ? addDays(eff, od) : null;
    out.push(!eff || !cl ? { id: "dates", ok: null, text: "生效日 < Option 截止 < 过户日：缺日期，没法核对", keys: ["effective_date", "option_period_days", "closing_date"] } : { id: "dates", ok: opt ? eff < opt && opt < cl : eff < cl, text: opt ? `生效日 ${eff} < Option 截止 ${opt} < 过户日 ${cl}${eff < opt && opt < cl ? "" : " —— 顺序不对"}` : `生效日 ${eff} < 过户日 ${cl}${eff < cl ? "（没有 Option 期）" : " —— 顺序不对"}`, keys: ["effective_date", "option_period_days", "closing_date"] });
    const hoa = v("hoa_yes_no"); const hoaYes = hoa != null && /^(有|是|yes)/i.test(String(hoa).trim());
    const hasAdd = (D().documents || []).some((x) => x.deal === did && (x.type === "hoa_addendum" || (x.children || []).some((c) => c.type === "hoa_addendum"))) || /36-11|HOA/i.test(String(v("addenda") || ""));
    out.push(hoa == null ? { id: "hoa", ok: null, text: "HOA 勾了就得有 HOA 附录：没有 HOA 这一格", keys: ["hoa_yes_no"] } : { id: "hoa", ok: !hoaYes || hasAdd, text: !hoaYes ? "HOA 没勾：不需要 HOA 附录" : hasAdd ? "HOA 勾了，合同包里有 HOA 附录（36-11）" : "HOA 勾了，但合同包里没有 HOA 附录（36-11）", keys: ["hoa_yes_no", "addenda"] });
    return out;
  }
  const failingKeys = (did) => { const s = new Set(); checks(did).forEach((c) => { if (c.ok === false) c.keys.forEach((k) => s.add(k)); }); return s; };

  // ---- 确认 / 不对 / 改 ----
  const pending = (did) => rowsOf(did).filter((f) => !f.absent && f.status === "pending");
  // ---- 确认规矩（R-2）----
  // whyOne：这一行为什么要逐条看（空数组 = 可以进「确认全部」）。bad = 卡在交叉校验上的 key（不传就现算）
  function whyOne(did, f, bad) {
    const out = []; if (!f) return out; bad = bad || failingKeys(did);
    if (f.docKind === "scan") out.push("扫描件"); if (f.docKind === "photo") out.push("手机拍照"); if (f.src === "handwritten") out.push("手写");
    if (f.conf != null && f.conf < TH().lowConfidence) out.push(`置信 ${Number(f.conf).toFixed(2)} 低于 ${TH().lowConfidence}`);
    if (bad.has(f.key)) out.push("卡在交叉校验上");
    return out;
  }
  // 确认计划：{ batch: 「确认全部」会收下的行（钱和日期也在内）, single: [{ f, why: [原因], crop: 是钱或日期 → 确认卡先摆裁图 }] }
  function plan(did) { const bad = failingKeys(did); const batch = [], single = []; pending(did).forEach((f) => { const why = whyOne(did, f, bad); if (why.length) single.push({ f, why, crop: needsCrop(f) }); else batch.push(f); }); return { batch, single }; }
  const batchable = (did) => plan(did).batch;
  const mark = (f) => { f.status = "confirmed"; f.confirmedAt = today(); f.by = meName(); };
  // 确认一条。返回 { ok, why?, needCrop?, warn?, derived? }。逐条确认的那些行里，钱和日期没看过裁图 → needCrop（先看裁图）
  function confirm(did, key) {
    const f = field(did, key); if (!f || f.absent) return { ok: false, why: "没有这个字段" };
    if (f.status !== "pending") return { ok: false, why: "这一条不在待确认里" };
    const bad = failingKeys(did); const why = whyOne(did, f, bad);
    if (why.length && needsCrop(f) && !f.cropSeen) return { ok: false, needCrop: true, why: `这一格要逐条确认（${why.join(" · ")}）：钱和日期先看一眼裁图` };
    const stuck = bad.has(key); mark(f);
    audit(did, `字段确认：${f.label} = ${f.value}${why.length ? "（" + why.join(" · ") + "，逐条确认）" : ""}${stuck ? " · 交叉校验没对上，经纪人仍确认" : ""}`);
    return { ok: true, warn: stuck ? "这一格卡在交叉校验上：确认了，但对不上的那一项还在" : "", derived: maybeDerive(did) };
  }
  // 「确认全部」：一次点击收下计划里 batch 那些行
  function confirmBatch(did) { const list = plan(did).batch; list.forEach(mark); if (list.length) audit(did, `字段「确认全部」${list.length} 条（电子版 · 置信 ≥ ${TH().lowConfidence} · 交叉校验没问题；钱和日期也在内）`); return { n: list.length, left: pending(did).length, derived: maybeDerive(did) }; }
  // 「不对」：标掉，不参加派生
  function reject(did, key, reason) { const f = field(did, key); if (!f || f.absent || f.status === "rejected") return { ok: false, why: "没有这个字段" }; f.status = "rejected"; f.rejectedAt = today(); f.rejectedBy = meName(); if (reason) f.rejectReason = reason; audit(did, `字段标「不对」：${f.label} = ${f.value}${reason ? "（" + reason + "）" : ""} → 不参加派生`); return { ok: true, derived: maybeDerive(did) }; }
  // 改：生成新版本（旧版本留着），直接算已确认
  function edit(did, key, value, note) {
    const f = field(did, key); if (!f || value == null || value === "") return { ok: false, why: "没有这个字段或没填新值" };
    f.history = f.history || [{ v: f.v, value: f.value, page: f.page, quote: f.quote, by: f.by || meName(), at: f.confirmedAt || today(), source: "原件" }];
    const old = f.value; f.v = (f.v || 1) + 1; f.value = value; f.src = "typed"; f.conf = 1; f.cropSeen = true; mark(f);
    f.history.push({ v: f.v, value, page: "—", quote: "手动修订", by: meName(), at: today(), source: "手动", note: note || "" });
    audit(did, `字段 ${f.label} v${f.v - 1} → v${f.v}：${old} → ${value}${note ? "（" + note + "）" : ""}`);
    const d = deal(did); const re = d && d.derivedAt ? deriveAll(did) : null;
    return { ok: true, derived: re || maybeDerive(did) };
  }
  // 没有待确认的了、还没派生过 → 派生
  function maybeDerive(did) { const d = deal(did); if (!d || d.derivedAt || pending(did).length || !live(did).some((f) => f.status === "confirmed")) return null; return deriveAll(did); }

  // ---- 派生：里程碑 / 任务 / 钱 / 合规清单 / 客户视图成员，全部从已确认字段算 ----
  function deriveAll(did) {
    const d = deal(did); if (!d) return null; const D0 = D(); const type = typeOfDeal(d);
    const V = (key) => { const f = live(did).find((x) => x.key === key && x.status === "confirmed"); return f ? f.value : null; };
    const first = !d.derivedAt; const ms = (D0.milestones[did] = D0.milestones[did] || []); let added = 0;
    // 同 key 的里程碑：没有 → 加；有、还没完成、不是手改的、这次算得出日期 → 日期和规则跟着字段更新（算不出就不动原来的）
    // 这笔交易原来就有里程碑（挂牌期 / 申请期的）时，新加的 id 不和旧的撞——撞了以后「完成 / 改日期 / 核实」会点到另一条上
    const freeId = (id) => { if (!ms.some((x) => x.id === id)) return id; let n = ms.length + 1; while (ms.some((x) => x.id === "m" + n)) n++; return "m" + n; };
    const put = (id, key, label, kind, date, lane, rule) => { const m = ms.find((x) => x.key === key); if (!m) { ms.push(Object.assign({ id: freeId(id), key, label, kind, date: date || null, status: "pending", lane }, rule ? { rule } : {})); added++; } else if (m.status === "pending" && !m.manual && date) { m.date = date; if (rule) m.rule = rule; } };
    if (type === "buyer" || type === "seller") {
      const eff = isoOf(V("effective_date")) || d.effective || null, cl = isoOf(V("closing_date")) || d.closing || null;
      const od = num(V("option_period_days")), fin = num(V("buyer_approval_days")), sv = num(V("survey_days")), emd = num(V("earnest_money_due_days")) || 3; // 5A：递交期限是表单上印好的 3 天，除非这一格另外填了
      const cash = /现金|cash/i.test(String(V("loan_type") || "")); const hoa = /^(有|是|yes)/i.test(String(V("hoa_yes_no") || "").trim()); const who = type === "seller" ? "买方 " : "";
      if (eff) d.effective = eff; if (cl) d.closing = cl; if (num(V("sales_price")) != null) d.price = num(V("sales_price")); delete d.est;
      if (od != null) d.optionDays = od; else delete d.optionDays; if (fin != null) d.financingDays = fin; else delete d.financingDays; // 交易上的两个天数只是字段的拷贝
      if (eff) {
        const m1 = ms.find((x) => x.key === "effective_date"); if (!m1) { ms.push({ id: freeId("m1"), key: "effective_date", label: "合同生效", kind: "event", date: eff, status: "done", lane: 1 }); added++; } else m1.date = eff;
        const due = rollForward(addDays(eff, emd));
        if (V("option_fee") != null) put("m2", "option_fee_due", `${who}Option fee 递交`, "deadline", due, 1, `生效后 ${emd} 天 · 遇周末顺延`);
        if (V("earnest_money") != null) put("m3", "em_due", `${who}Earnest money 递交`, "deadline", due, 1, `生效后 ${emd} 天 · 遇周末顺延`);
        if (V("option_fee") != null || od != null) put("m5", "option_period_end", "Option 期截止", "deadline", od != null ? addDays(eff, od) : null, 1, od != null ? `生效后 ${od} 天 · 17:00 · 周末不顺延` : "Option 天数没有确认 → 没有日期");
        put("m4", "inspection", "验房", "event", null, 2);
        if (!cash) { put("m10", "appraisal", "Appraisal", "event", null, 2); put("m11", "financing_deadline", `${who}贷款批准截止`, "deadline", fin != null ? addDays(eff, fin) : null, 2, fin != null ? `生效后 ${fin} 天` : "贷款审批天数没有确认 → 没有日期"); }
        put("m6", "title_commitment", "Title commitment 收到", "event", null, 3);
        put("m7", "objection_deadline", "Title 异议截止", "deadline", null, 3, `收到后 ${num(V("objection_days")) != null ? num(V("objection_days")) + " 天" : "约定天数"}（收到才起算）`);
        if (hoa) { put("m8", "hoa_docs", "HOA 文件收到", "event", null, 3); put("m17", "hoa_termination_end", "HOA 终止权截止", "deadline", null, 3, `收到 HOA 文件后 ${num(V("hoa_termination_days")) != null ? num(V("hoa_termination_days")) + " 天" : "约定天数"}`); }
        put("m9", "survey_due", /新/.test(String(V("survey_new_or_existing") || "")) ? "Survey 完成" : "Survey / T-47 交付", "deadline", sv != null ? addDays(eff, sv) : null, 3, sv != null ? `生效后 ${sv} 天` : "Survey 天数没有确认 → 没有日期");
      }
      if (cl) { if (!cash) put("m13", "cd", "Closing Disclosure 收到", "deadline", bizBefore(cl, 3), 4, "过户前 3 个工作日"); put("m14", "final_walkthrough", "Final walkthrough", "event", addDays(cl, -1), 4); put("m15", "closing", "过户", "deadline", cl, 4); put("m16", "funding", "Funding · 交钥匙", "event", cl, 4); }
      if (first) {
        const tk = (id, name, rule, due, assignee, cv) => ({ id, name, rule, due: due || null, assignee, status: "pending", clientVisible: !!cv });
        const opt = eff && od != null ? addDays(eff, od) : null;
        if (!(D0.tasks[did] || []).length) D0.tasks[did] = type === "buyer"
          ? [tk("t1", "发欢迎信息给买家（中文 · 时间线）", "生效当天", eff, meName()), tk("t2", "Option fee / EM 收据交给 title", "生效后 1 天", eff ? addDays(eff, 1) : null, "团队"), tk("t3", "预约验房", "生效后 3 天内", eff ? addDays(eff, 3) : null, meName(), true), tk("t4", "客户：确认是否继续（option 到期前）", "Option 到期前 1 天", opt ? addDays(opt, -1) : null, "客户", true), tk("t5", "追 survey / T-47", "生效后 3 天", eff ? addDays(eff, 3) : null, "团队"), tk("t6", "客户：电汇前电话核实账户", "过户前 2 天", cl ? addDays(cl, -2) : null, "客户", true)]
          : [tk("t1", "发合同时间线给卖家（中文）", "生效当天", eff, meName()), tk("t2", "配合买方验房（约时间 · 钥匙）", "生效后 3 天内", eff ? addDays(eff, 3) : null, meName(), true), tk("t3", "订 HOA resale certificate / 产权文件", "生效后 3 天", eff ? addDays(eff, 3) : null, "团队"), tk("t4", "客户：回复买方的维修请求", "Option 到期前 1 天", opt ? addDays(opt, -1) : null, "客户", true), tk("t5", "订房贷 payoff · 审结算单", "过户前 3 天", cl ? addDays(cl, -3) : null, meName())];
        if (!(D0.money[did] || []).length) {
          const title = V("title_company") || "Title 公司"; const due = eff ? rollForward(addDays(eff, emd)) : null; const rows = []; const price = num(V("sales_price")), emv = num(V("earnest_money")), cashv = num(V("cash_portion"));
          if (num(V("option_fee")) != null) rows.push({ id: "mo1", label: "Option fee", amount: num(V("option_fee")), to: "卖方（经 title）", due, status: "due", how: "支票", refund: "不退：换来 Option 期内无条件退出的权利", refundWho: "—" });
          if (emv != null) rows.push({ id: "mo2", label: "Earnest money", amount: emv, to: title, due, status: "due", how: "电汇（先电话核实）", refund: "Option 期内退出可全退；过了按合同条款", refundWho: `${title}（双方签退款文件）` });
          if (type === "buyer") rows.push({ id: "mo5", label: "首付（过户费以 CD 为准）", amount: cashv != null && emv != null ? cashv - emv : null, to: title, due: cl ? addDays(cl, -1) : null, status: "upcoming", how: `${cashv != null ? "现金部分 " + usd(cashv) + " − 已交 EM" : "金额等合同字段确认"} · 电汇 · 只以电话核实账户`, wire: true, refund: "没过户就按合同处理", refundWho: `${title}（Closing Agent）` });
          else if (price != null && window.NBOffers) { const n = NBOffers.netToSeller({ price, sellerPaid: num(V("seller_concessions")) || 0, warranty: num(V("residential_service_contract")) || 0 }, did); rows.push({ id: "mo5", label: "预估 net to seller", amount: n.net, to: "卖方（过户时）", due: cl, status: "upcoming", how: `${n.label} · 过户后电汇 · 只以电话核实账户`, wire: true, refund: "—", refundWho: "—" }); }
          D0.money[did] = rows;
        }
        if (!(D0.compliance[did] || []).some((c) => c.phase === "contract")) {
          const c = contact(d.primary) || {}; const rep = c.buyerRep; const add = []; const have = new Set((D0.compliance[did] || []).map((x) => x.item));
          const it = (phase, item, ok, evidence, extra) => { if (!have.has(item)) add.push(Object.assign({ phase, item, ok: !!ok, evidence }, extra || {})); };
          if (type === "buyer") { it("pre", "IABS 已交付", true, "合同包 IABS 页"); it("pre", "Consumer Protection Notice", true, "合同包 CPN 页"); it("pre", "Buyer Representation 协议", !!(rep && rep.expires >= today()), rep ? `签署 ${rep.signed} · 到期 ${rep.expires}` : "联系人上还没有代理协议"); }
          else { it("pre", "IABS 已交付", true, "签上市协议时"); it("pre", "Listing Agreement 签署", true, "上市协议"); it("pre", "Seller's Disclosure 完成", true, "合同包 Seller's Disclosure"); }
          it("contract", "合同（20-19）", true, "合同包 p.1–11"); it("contract", "Earnest money 收据", V("earnest_money_receipt_amount") != null, V("earnest_money_receipt_amount") != null ? "收据页" : "待 title 回执"); it("contract", "Option fee 收据", V("option_fee_receipt") != null, V("option_fee_receipt") != null ? "收据页" : "待 title 回执");
          it("contract", type === "buyer" ? "Seller's Disclosure（买方签收）" : "Seller's Disclosure（买方签收回执）", type === "buyer", type === "buyer" ? "合同包 p.16–22" : "等买方经纪发回");
          if (!cash) it("contract", "Third Party Financing Addendum（40-11）", true, "合同包 p.12–13"); if (hoa) it("contract", "HOA Addendum（36-11）", checks(did).some((x) => x.id === "hoa" && x.ok), "合同包 p.14–15");
          it("close", "Title Commitment", false, "收到后归档"); it("post", "Closing Statement / CD", false, "过户后收");
          D0.compliance[did] = (D0.compliance[did] || []).concat(add);
        }
      }
    } else { // 租约：最少的一套
      const ls = isoOf(V("lease_start")), le = isoOf(V("lease_end"));
      if (ls) d.leaseStart = ls; if (le) d.leaseEnd = le; if (num(V("rent")) != null) d.price = num(V("rent"));
      if (ls) put("m1", "lease_start", "租约开始", "event", ls, 1);
      if (le) { (window.NBRent ? NBRent.RENEWAL : [90, 60, 30]).forEach((n, i) => put("m" + (3 + i), "renewal_" + n, `续约提醒 · 到期前 ${n} 天`, "deadline", addDays(le, -n), 4, `到期 − ${n} 天`)); put("m9", "lease_end", "租约到期", "deadline", le, 4); }
      if (first && !(D0.money[did] || []).length) { const rows = []; if (num(V("deposit")) != null) rows.push({ id: "mo1", label: "押金", amount: num(V("deposit")), to: "房东（托管）", due: ls ? addDays(ls, -1) : null, status: "upcoming", how: "签约时 · 只以电话核实账户", wire: true, refund: "退租检查后 30 天内结算", refundWho: "房东 / 管理方" }); if (num(V("rent")) != null) rows.push({ id: "mo2", label: "首月租金", amount: num(V("rent")), to: "房东", due: ls, status: "upcoming", how: "入住前", refund: "不退", refundWho: "—" }); D0.money[did] = rows; }
      D0.tasks[did] = D0.tasks[did] || [];
    }
    // 客户视图成员：这笔交易我方的签约人（没有各方记录就是主联系人）都是决策人
    D0.portalMembers = D0.portalMembers || {};
    if (!(D0.portalMembers[did] || []).length) { const ours = (D0.parties || []).filter((p) => p.deal === did && p.side === "ours" && p.signer && p.type === "person").map((p) => p.party); const ids = ours.length ? ours : (d.primary ? [d.primary] : []); D0.portalMembers[did] = ids.map((cid, i) => ({ id: "pm" + (i + 1), name: (contact(cid) || {}).name || cid, role: "decision", visibility: "all", opens: 0, lastOpen: null, contactId: cid, iabsAt: null })); }
    if (window.NBRoadmap) { const rm = NBRoadmap.rmOf(d); const n = NBRoadmap.mapFor(d).phases[0].nodes.length; if ((type === "buyer" || type === "seller") && rm.pre < n) rm.pre = n; NBRoadmap.syncStage(d); }
    d.derivedAt = stamp(); d.lastAction = today();
    const res = { milestones: ms.length, added, tasks: (D0.tasks[did] || []).length, money: (D0.money[did] || []).length };
    audit(did, `${first ? "字段全部确认 → 派生" : "字段改了 → 重派生"}：里程碑 ${res.milestones} · 任务 ${res.tasks} · 钱 ${res.money}（日期全部从已确认字段算）`, "system", "core");
    return res;
  }

  // ---- 上传一份签好的合同 → 建交易（样例固定是 777 Draft St 这一笔）----
  const CHILDREN = () => [
    { name: "TREC 20-19 One to Four Family Residential Contract", type: "trec_1_4", pages: "1–11", tv: "trec-20 @ 20-19" }, { name: "Third Party Financing Addendum (40-11)", type: "financing_addendum", pages: "12–13", tv: "trec-40 @ 40-11" },
    { name: "Addendum for Mandatory HOA (36-11)", type: "hoa_addendum", pages: "14–15", tv: "trec-36 @ 36-11" }, { name: "Seller's Disclosure Notice", type: "sellers_disclosure", pages: "16–22" },
    { name: "Earnest Money Receipt", type: "em_receipt", pages: "23" }, { name: "Option Fee Receipt", type: "option_receipt", pages: "24" }, { name: "Information About Brokerage Services (IABS)", type: "iabs", pages: "25" }, { name: "Consumer Protection Notice", type: "cpn", pages: "26" }];
  const WHO = { buyer: ["c10", "买方", "买方"], seller: ["c5", "卖方", "挂牌"], lessor: ["c4", "房东", "出租"], lessee: ["c31", "租客（寻租）", "寻租"] }; // 样例里我方客户是谁 · 各方角色 · 标题后缀
  // 样例字段：[key, value, page, quote, conf, src]；钱和日期在 scan 样例里是手写的
  function sampleRows(type, sample, eff) {
    const cl = addDays(eff, 30); const hw = sample === "scan" ? "handwritten" : "typed"; const cut = sample === "typed" ? 0 : sample === "scan" ? 0.12 : 0.07; const c = (x, hand) => Math.round(Math.max(0.5, x - (hand || sample === "photo" ? cut : 0)) * 100) / 100;
    if (type === "lessor" || type === "lessee") return [
      ["landlord_entity", type === "lessor" ? "王先生" : "Draft Holdings LLC", 1, "Landlord: " + (type === "lessor" ? "Wang, Bo" : "Draft Holdings LLC"), c(0.97), "typed"], ["tenant_names", "Kevin Liu", 1, "Tenant: Kevin Liu", c(0.97), "typed"],
      ["rent", "$2,400", 2, "Monthly Rent: $2,400.00", c(0.98, 1), hw], ["deposit", "$2,400", 3, "Security Deposit: $2,400.00", c(0.97, 1), hw], ["lease_start", addDays(eff, 14), 1, "Commencement Date: " + addDays(eff, 14), c(0.95, 1), hw], ["lease_end", addDays(eff, 379), 1, "Expiration Date: " + addDays(eff, 379), c(0.95, 1), hw],
      ["notice_days", "30 天", 2, "written notice at least 30 days before the Expiration Date", c(0.94), "typed"], ["pet_deposit", "$300", 9, "Pet deposit: $300", c(0.9, 1), hw]];
    const loan = sample === "scan" ? "$375,300" : "$373,500"; // 扫描样例：手写的贷款额两位数字看反了 → 房价 ≠ 现金 + 贷款，交叉校验会拦下来
    const rows = [
      ["buyer_names", type === "seller" ? "Sample Buyer LLC" : "赵女士", 1, "Buyer: " + (type === "seller" ? "Sample Buyer LLC" : "Zhao, Yan"), c(0.97), "typed"], ["seller_names", type === "seller" ? "李女士、李先生" : "J. & K. Sample", 1, "Seller: " + (type === "seller" ? "Li, Mei and Li, Jun" : "John Sample and Karen Sample"), c(0.96), "typed"],
      ["sales_price", "$498,000", 2, "Sales Price … $498,000.00", c(0.99, 1), hw], ["cash_portion", "$124,500", 2, "Cash portion of Sales Price … $124,500.00", c(0.97, 1), hw], ["loan_amount", loan, 12, "in the principal amount of " + loan, c(0.92, 1), hw], ["loan_type", "Conventional", 12, "conventional financing", c(0.93), "checkbox"],
      ["earnest_money", "$5,000", 2, "Earnest Money: $5,000", c(0.98, 1), hw], ["option_fee", "$400", 2, "Option Fee: $400", c(0.97, 1), hw], ["option_period_days", "10 天", 2, "within 10 days after the Effective Date", c(0.95, 1), hw],
      ["effective_date", eff, 9, "Effective Date: " + eff, c(0.93, 1), "handwritten"], ["closing_date", cl, 5, "on or before " + cl, c(0.94, 1), hw], ["buyer_approval_days", "21 天", 12, "within 21 days after the Effective Date", c(0.92, 1), hw],
      ["title_company", "Sample Title Co", 3, "Title Company: Sample Title Co", c(0.96), "typed"], ["survey_new_or_existing", "卖方提供现有 + T-47", 3, "Seller shall furnish the existing survey … T-47", c(0.71), "checkbox"], ["survey_days", "5 天", 3, "within 5 days after the Effective Date", c(0.9, 1), hw],
      ["hoa_yes_no", "有 · 买方付 resale cert", 14, "Buyer shall pay", c(0.66), "checkbox"], ["seller_concessions", "$4,000", 4, "Seller shall pay … $4,000", c(0.62, 1), hw], ["appraisal_waiver", "否 · 保留估价条件（贷款附录）", 13, "…underwriting requirements", c(0.8), "checkbox"], ["possession", "过户当天", 4, "upon closing and funding", c(0.95), "checkbox"]];
    if (sample === "photo") rows.push(["earnest_money_receipt_amount", "$5,000", 23, "EARNEST MONEY RECEIPT … $5,000", c(0.9, 1), "typed"]); // 拍照样例把收据页也拍了：第二项校验能对上
    return rows;
  }
  // type = buyer | seller | lessor | lessee；sample = typed | scan | photo。返回新建的交易（字段全部待确认，日期等确认后才派生）
  function createDeal(type, sample) {
    type = WHO[type] ? type : "buyer"; sample = SAMPLES[sample] ? sample : "typed"; const D0 = D(); const eff = today(); const lease = type === "lessor" || type === "lessee"; const id = "d6";
    if (deal(id)) { D0.deals = D0.deals.filter((x) => x.id !== id); ["fields", "fieldMeta", "milestones", "tasks", "money", "compliance", "portalMembers", "explain", "offers", "complianceState"].forEach((k) => { if (D0[k]) delete D0[k][id]; }); D0.documents = D0.documents.filter((x) => x.deal !== id); D0.parties = D0.parties.filter((x) => x.deal !== id); }
    if (!D0.properties.some((p) => p.id === "p7")) D0.properties.push({ id: "p7", addr: "777 Draft St", city: "Frisco", zip: "75035", mls: "20000007", beds: 4, baths: 3, sqft: 2740, year: 2018, lot: 0.17, hoa: 950, isd: "Frisco ISD", roof: 2018, hvac: 2018, notes: "新建交易（影子样例）", target: false });
    const rows = sampleRows(type, sample, eff); const [cid, role, suffix] = WHO[type]; const price = num((rows.find((r) => r[0] === (lease ? "rent" : "sales_price")) || [])[1]);
    const d = { id, type, property: "p7", stage: "", title: `777 Draft St · ${suffix}`, price, primary: cid, created: eff, lastAction: eff, priority: "high", tplVersion: ((D0.templates || []).find((t) => t.id === type) || {}).version || "v1.0", intake: { sample, at: stamp() }, rm: { pre: window.NBRoadmap ? NBRoadmap.ROADMAPS[type].phases[0].nodes.length : 5, lines: {}, out: {}, close: 0 } };
    if (window.NBRoadmap) NBRoadmap.syncStage(d); else d.stage = lease ? "lease_pending" : "under_contract";
    D0.deals.unshift(d); D0.parties.push({ deal: id, party: cid, type: "person", role, side: "ours", primary: true, signer: true });
    const docId = "doc" + Date.now().toString(36); const pages = sample === "photo" ? (lease ? 16 : 26) : lease ? 16 : 26;
    const doc = { id: docId, deal: id, name: lease ? { typed: "Lease.pdf", scan: "Lease-scan.pdf", photo: "Lease-photos.pdf" }[sample] : { typed: "Contract.pdf", scan: "Contract-scan.pdf", photo: "Contract-photos.pdf" }[sample], pages, type: lease ? "lease" : "bundle", uploaded: eff, sha: Math.random().toString(16).slice(2, 6) + "…" + Math.random().toString(16).slice(2, 4), locked: false, sourceKind: sample === "typed" ? "text" : sample, source: { typed: "上传的电子版", scan: "手填后扫描", photo: "手机拍照上传" }[sample] };
    if (sample !== "typed") doc.prep = PREP.slice(); if (lease) doc.tv = "txr-2001 @ 2001"; else doc.children = CHILDREN();
    D0.documents.unshift(doc);
    D0.fieldMeta = D0.fieldMeta || {}; D0.fieldMeta[id] = lease ? { template: "txr-2001", version: "2001", state: "registered", note: "TXR-2001 Residential Lease · 已登记" } : { template: "trec-20", version: "20-19", state: "registered", note: "页脚 TREC NO. 20-19 → 别名表 → trec-20 @ 20-19 · 已登记 → 用它的模板抽" };
    D0.fields[id] = rows.map(([key, value, page, quote, conf, src]) => { const r = reg(key); const f = { key, tier: r.tier, para: r.para, label: r.zh, value, page, quote, conf, status: "pending", v: 1, src, docKind: sample === "typed" ? "text" : sample }; if (["money", "date"].includes(r.type)) f.crop = { page, text: quote }; return f; });
    D0.milestones[id] = []; D0.tasks[id] = []; D0.money[id] = [];
    const log = (kind, model, cost) => (window.NBAi ? NBAi.log({ kind, model, cost, deal: id }) : D0.aiCalls.unshift({ at: stamp(), kind, model, cost, deal: id, reviewer: "—", flag: false }));
    log(`合同抽取（${pages} 页 · ${SAMPLES[sample][0]}）`, "sonnet", 0.11); log("文件分类", "haiku", 0.05);
    audit(id, `${doc.name} 上传（${SAMPLES[sample][0]}${doc.prep ? " · 预处理：" + PREP.join(" → ") : ""}）· ${lease ? "租约" : "分类 " + doc.children.length + " 份"} · 抽取 ${rows.length} 个字段（待确认）`, "ai", "抽取");
    return d;
  }
  // 给一笔交易加一份文件（上传记录的形状和种子一致）
  function addDoc(did, o) { const doc = Object.assign({ id: "doc" + Date.now().toString(36), deal: did, name: "文件.pdf", pages: 1, type: "client_upload", uploaded: today(), sha: Math.random().toString(16).slice(2, 6) + "…", locked: false, sourceKind: "text" }, o || {}); if (doc.sourceKind !== "text" && !doc.prep) doc.prep = PREP.slice(); (D().documents = D().documents || []).unshift(doc); return doc; }

  // ---- 中文人话摘要：从已确认字段生成；全部确认之后才能批准，批准一次，批准后客户视图「合同人话」那张卡才有内容 ----
  function summaryText(did) {
    const V = (key) => { const f = live(did).find((x) => x.key === key && x.status === "confirmed"); return f ? f.value : null; }; const out = []; const eff = isoOf(V("effective_date")), od = num(V("option_period_days"));
    if (od != null && eff) out.push({ key: "option_period_days", zh: `从生效日起 ${od} 天内（到 ${addDays(eff, od)} 下午 5 点，周末不顺延），您可以因任何理由终止合同，只损失${V("option_fee") ? " " + V("option_fee") + " 的" : ""} option fee。`, en: `Within ${od} days of the effective date you may terminate for any reason and forfeit only the option fee.` });
    if (V("earnest_money")) out.push({ key: "earnest_money", zh: `${V("earnest_money")} 交给产权公司${V("title_company") ? " " + V("title_company") : ""}保管，不是给卖家；顺利过户时算进您的首付。`, en: "Earnest money is held by the title company and credited to you at closing." });
    if (V("closing_date")) out.push({ key: "closing_date", zh: `预计 ${V("closing_date")} 过户。电汇前只以电话向产权公司核实账户，邮件里的账户信息都不要信。`, en: "Wire only after phone-verifying the account with the title company." });
    if (V("survey_new_or_existing")) out.push({ key: "survey_new_or_existing", zh: `地界测量图：${V("survey_new_or_existing")}${V("survey_days") ? "（" + V("survey_days") + "内）" : ""}，用来确认围栏、车道有没有越界。`, en: "The survey confirms boundaries and encroachments." });
    if (/^(有|是|yes)/i.test(String(V("hoa_yes_no") || "").trim())) out.push({ key: "hoa_yes_no", zh: "这个小区有强制 HOA。HOA 文件送到您手上后，您有几天可以因文件内容终止合同。", en: "Mandatory HOA; you may terminate within a few days of receiving the HOA documents." });
    if (V("lease_start") && V("lease_end")) out.push({ key: "lease_start", zh: `租期 ${V("lease_start")} 到 ${V("lease_end")}${V("rent") ? "，月租 " + V("rent") : ""}${V("deposit") ? "，押金 " + V("deposit") : ""}。`, en: "Lease term, rent and deposit as confirmed." });
    return out;
  }
  function summaryApprove(did) { const d = deal(did); if (!d) return { ok: false, why: "没有这笔交易" }; const p = pending(did).length; if (p) return { ok: false, why: `还有 ${p} 个字段没确认：全部确认后才能批准摘要` }; if (d.summaryApprovedAt) return { ok: false, why: "摘要已经批准过了" }; const lines = summaryText(did); if (!lines.length) return { ok: false, why: "没有可以写进摘要的已确认字段" }; (D().explain = D().explain || {})[did] = lines; d.summaryApprovedAt = stamp(); audit(did, `中文人话摘要批准（${lines.length} 条）→ 客户视图「合同人话」可见（T2）`); return { ok: true, lines }; }

  // ---- 界面零件（三端共用的 HTML）----
  const sourceText = (f) => `${SRC[f.src || "typed"] || f.src}${f.docKind && f.docKind !== "text" ? " · " + SOURCE_KIND[f.docKind][0] : ""}`;
  const sourceChip = (f) => `<span class="badge ${isLowSource(f) ? "warn" : "mute"}" title="${isLowSource(f) ? "扫描 / 手写 / 拍照：不管置信度多高都逐条确认" : "电子版 · 打印 / 勾选"}">${esc(sourceText(f))}</span>`;
  const docChip = (doc) => { const k = SOURCE_KIND[doc.sourceKind || "text"] || SOURCE_KIND.text; return `<span class="badge ${k[1]}">${k[0]}</span>`; };
  const prepLine = (doc) => (doc.prep && doc.prep.length ? `预处理：${doc.prep.join(" → ")}` : "");
  // 裁图：影子里画成一张小纸条（页码 + AI 看到的原文）
  const cropHtml = (f) => (f && f.crop ? `<div class="crop" style="display:inline-block;max-width:100%;padding:8px 12px;border:1px dashed currentColor;border-radius:3px;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.5;transform:rotate(-.5deg);opacity:.92"><span style="opacity:.6">p.${esc(f.crop.page)} · 裁图</span><br>${esc(f.crop.text)}</div>` : "");
  const checksHtml = (did) => { const cs = checks(did); return cs.length ? `<div class="list">${cs.map((c) => `<div class="li"><span class="badge ${c.ok === true ? "ok" : c.ok === false ? "bad" : "mute"}">${c.ok === true ? "对上" : c.ok === false ? "对不上" : "没法核对"}</span><div class="body"><div class="t small">${esc(c.text)}</div></div></div>`).join("")}</div>` : `<div class="empty small">这种文件没有交叉校验</div>`; };

  // ---- 三端通用动作：看裁图 → 确认 / 不对（arg = 交易 id|字段 key）· 批量确认（arg = 交易 id）----
  const A = {};
  const after = (msg) => { if (window.DBsave) window.DBsave(); if (window.render) window.render(); if (msg && window.toast) window.toast(msg); };
  const open = (html) => { const f = window.openModal || window.openSheet; if (f) f(html); };
  const close = () => { if (window.closeModal) window.closeModal(); else if (window.closeSheet) window.closeSheet(); };
  const closeBtn = () => (window.openModal ? "modal-close" : "sheet-close");
  const doneMsg = (r, ok) => (r.derived ? `${ok} · 没有待确认的了 → 已派生里程碑 ${r.derived.milestones} 个 · 任务 ${r.derived.tasks} 项 · 钱 ${r.derived.money} 笔` : ok);
  A["fx-crop"] = (el, arg) => { const [did, key] = arg.split("|"); const f = openCrop(did, key); if (!f) return; if (window.DBsave) window.DBsave(); const why = whyOne(did, f); open(`<h2>${esc(f.label)} · 看一眼裁图</h2><p class="small muted">AI 读到的值：<b>${esc(f.value)}</b> · ${sourceChip(f)} · 置信 ${Number(f.conf || 0).toFixed(2)}。${why.length ? "这一格要逐条确认（" + esc(why.join(" · ")) + "）：钱和日期先对着裁图看一眼。" : "电子版、置信够、校验没问题：这一格也可以留给「确认全部」。"}</p>${cropHtml(f) || `<div class="empty small">这一格没有裁图（不是钱或日期）</div>`}<div class="acts" style="margin-top:12px"><button class="btn" data-action="${closeBtn()}">关闭</button><button class="btn ghost" data-action="fx-reject" data-arg="${arg}">不对</button>${f.status === "pending" ? `<button class="btn pri" data-action="fx-confirm" data-arg="${arg}">对，确认</button>` : ""}</div>`); };
  A["fx-confirm"] = (el, arg) => { const [did, key] = arg.split("|"); const r = confirm(did, key); if (r.needCrop) { A["fx-crop"](el, arg); return; } close(); after(r.ok ? doneMsg(r, r.warn || "已确认") : r.why); };
  A["fx-reject"] = (el, arg) => { const [did, key] = arg.split("|"); const r = reject(did, key); close(); after(r.ok ? doneMsg(r, "已标「不对」：这一格不参加派生，修改记录里有一条") : r.why); };
  A["fx-batch"] = (el, did) => { const r = confirmBatch(did); after(doneMsg(r, r.n ? `「确认全部」收下 ${r.n} 条${r.left ? " · 还有 " + r.left + " 条要逐条看（扫描 / 手写 / 拍照 · 低于 " + TH().lowConfidence + " · 卡在交叉校验）" : ""}` : "没有能一次确认的：剩下的都要逐条看（扫描 / 手写 / 拍照 · 低于 " + TH().lowConfidence + " · 卡在交叉校验）")); };
  function reg0() { const X = window.ACTIONS; if (!X) return; Object.assign(X, A); } // 每次都挂（不是「有了就跳过」）：DOMContentLoaded 时各端自己的文件都加载完了，这里的实现最后落定，同名的旧实现不会因为加载先后盖回来
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg0); else reg0();
  setTimeout(reg0, 0);

  window.NBExtract = { FIELDS, reg, DOC_TYPES, SOURCE_KIND, SRC, PREP, SAMPLES, isLowSource, isLow, needsCrop, openCrop, checks, failingKeys, pending, whyOne, plan, batchable, confirm, confirmBatch, reject, edit, maybeDerive, deriveAll, createDeal, addDoc, summaryText, summaryApprove, sourceText, sourceChip, docChip, prepLine, cropHtml, checksHtml };
})();
