/* NewBee OS · 三端共用：路线图与里程碑
   四张路线图（买房 / 卖房 / 放租 / 寻租）= 阶段 + 节点 + 线 + 分支；按 Jason 的《达拉斯购房 / 卖房交易全流程》PDF 整理。
   交易上存的进度：deal.rm = { pre: 已完成的签约前节点数, lines: { A: 已完成节点数 … }, out: { A: "ok" | "bad" }, close: 已完成的交割节点数 }
   v1.5 · 一套截止（决定 D2）：节点定义上写 ms = 里程碑的 key；这笔交易有同 key 的里程碑就显示它的日期（里程碑从已确认的合同字段派生），没有才按节点自己的规则估一个并标「估」；
   Option / 贷款审批天数只认已确认字段（option_period_days / buyer_approval_days），不知道就没有日期。阶段只由 type + rm 算出来（没有 side，没有 new / pending_fields）。
   两个终态动作（D11）：标为 合同终止 / 标为 落选 · 撤回，都能撤销。成交（D12）= 完成交割段最后一个节点「过户 · 交房」，合规和 Broker 审核的门挂在这一步。
   真实版：packages/core 的 roadmap.ts（纯函数）；deals.stage 枚举只增、进度存 deals.rm（jsonb）；里程碑和节点靠节点定义上的里程碑 key 对上（不加 milestones.node_key 这一列）；迁移编号轮到几号用几号。 */
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = (zh, en) => (window.DB && DB.ui && DB.ui.lang === "en" ? en : zh);
  const N = (id, t, e, d, extra) => Object.assign({ id, t, e, d }, extra || {});
  const L = (key, t, e, c, w, rule, nodes, out) => ({ key, t, e, c, w, rule, nodes, out });

  const ROADMAPS = {
    buyer: { type: "buyer", name: "买房", en: "Buyer", stages: ["prospecting", "offer", "under_contract", "clear_to_close", "closed"], phases: [
      { key: "pre", title: "① 签约前 · 顺序推进", sub: "PRE-CONTRACT · 达成一致即签约生效", nodes: [
        N("buyer_rep", "买方代理协议", "Buyer Rep Agmt", "看房 / 出价前书面签", { req: "必备", c: "代理协议已签", link: "contact" }),
        N("tours", "看房", "Showings · Tours", "实地 / 线上 · 锁定房源 → 目标房排队", { c: "看房", link: "tours" }),
        N("submit_offer", "出价", "Submit Offer", "价格 · 定金 · 期限（可同时几个）", { c: "已出价", link: "offers" }),
        N("negotiate", "议价 / 还价", "Negotiate", "逐条款 counter · 达成一致", { c: "谈判中", link: "offers", br: [["✓ 接受 → 签约", "ok"], ["挂起 / 撤回 → 可再激活", "warn"]] }),
        N("effective", "签约 · 合同生效", "Effective Date", "各项期限起算 · 第 0 天", { ms: "effective_date", m: "定金 + 期权费 3 日内 → Title", c: "签约 · 合同生效", due: "effective" }) ] },
      { key: "par", title: "② 合同生效后 · 多线并行", sub: "四线同时计时、互不等待，各按自身 deadline", lines: [
        L("A", "验房线", "Inspection · Option", "insp", "Option 期", "0 天 · 生效日 → Option 期最后一天 17:00", [N("option_begins", "验房期开始", "Option Begins", "合同生效日次日起", { c: "验房期开始", due: "effective+1" }), N("inspection", "验房", "Inspection", "持证验房师", { ms: "inspection", c: "验房", due: "option-3" }), N("repair_amend", "维修谈判", "Repair Amend", "卖家回应", { ms: "option_period_end", c: "维修谈判", due: "option" })], [["✓ 谈成 → 继续", "ok"], ["✗ 期内无条件终止 · 退 EM", "bad"]]),
        L("B", "产权线", "Title · Survey", "title", "异议期", "0 天 → 收到产权 · 地税 · 勘测图 +3 天 · 异议截止", [N("title_commitment", "产权承诺", "Title Commitment", "约定天数送达", { ms: "title_commitment", c: "产权检查", due: "effective+20" }), N("survey", "地界测量", "Survey · T-47", "旧测 / 新测", { ms: "survey_due", c: "地界图", due: "effective+5" }), N("title_objection", "产权异议期", "Title Objection", "瑕疵提异议", { ms: "objection_deadline", c: "产权检查 · 没问题 / 有问题", due: "effective+23" })], [["✓ 清晰 → 继续", "ok"], ["✗ 瑕疵未解 · 退 EM", "bad"]]),
        L("C", "HOA 线", "Subdivision Info", "hoa", "如适用", "0 天 → HOA 规定送达日 +3 天 · 查看截止", [N("request_cert", "申请文件", "Request Cert", "约 15 天送达", { c: "HOA 文件", due: "effective+3" }), N("resale_cert", "文件送达", "Resale Cert", "收到起算", { ms: "hoa_docs", c: "HOA 文件到了", due: "effective+15" }), N("review_period", "查看期", "Review Period", "不满可退", { ms: "hoa_termination_end", c: "HOA 文件 · 接受 / 不接受", due: "effective+18" })], [["✓ 接受 → 继续", "ok"], ["✗ 期内终止 · 退 EM", "bad"]]),
        L("D", "贷款线", "Financing · TPFA", "fin", "最长线", "0 天 → Finance Contingency 截止日", [N("loan_application", "贷款申请", "Loan Application", "尽快提交", { c: "贷款申请", due: "effective+3" }), N("appraisal", "房屋评估", "Appraisal", "估值 ≥ 房价", { ms: "appraisal", c: "评估", due: "effective+14" }), N("underwrite", "承销 + 保险", "Underwrite · Binder", "审批 / 放款前", { ms: "financing_deadline", c: "贷款批准", due: "financing" })], [["✓ Clear to Close", "ok"], ["✗ 估值低 · 退 EM / 补差", "bad"]]) ] },
      { key: "close", title: "③ Clear to Close · 交割就绪", sub: "四线清零后进入交割", nodes: [
        N("utilities", "开通水电气", "Set Up Utilities", "水 · 电 · 燃气过户至买家名下", { c: "你要做：开通水电气", due: "closing-5" }),
        N("final_walkthrough", "最终验看", "Final Walkthrough", "过户前确认房况与维修完成", { ms: "final_walkthrough", c: "最终验看", due: "closing-1" }),
        N("closing", "过户 · 交房", "Closing · Funding", "签署贷款 + 过户文件 · 放款", { ms: "closing", m: "交钥匙 · Possession", c: "过户 · 拿钥匙", due: "closing" }) ] } ] },
    seller: { type: "seller", name: "卖房", en: "Seller", stages: ["pre_listing", "listed", "offer", "under_contract", "clear_to_close", "closed"], phases: [
      { key: "pre", title: "① 上市前 · 顺序推进", sub: "PRE-LISTING · 委托 · 定价 · 披露 · 收 Offer 即签约", nodes: [
        N("listing_agmt", "上市委托协议", "Listing Agreement", "独家代理 · 佣金 · 期限", { req: "必备", c: "委托协议已签" }),
        N("cma", "定价分析", "CMA · Pricing", "可比成交 · 净收益预估", { c: "定价", link: "cma" }),
        N("prep_list", "准备 · 上市", "Prep & List", "拍摄 · 上 MLS · HOA 文件", { m: "卖方披露 → 生效日前交付", c: "上市" }),
        N("showings_offers", "看房 · 收 Offer", "Showings · Offers", "实地看房 · 收多份报价（并列比较）", { c: "看房 · 收 Offer", link: "offers", br: [["接受一个 → 签约", "ok"], ["全部 counter / 挂起", "warn"]] }),
        N("effective_s", "审 Offer · 签约", "Effective Date", "各项期限起算 · 第 0 天", { ms: "effective_date", m: "买方款项 3 日内 → Title 托管", c: "签约 · 合同生效", due: "effective" }) ] },
      { key: "par", title: "② 合同生效后 · 多线并行", sub: "卖方按各线期限交付 · 治愈 · 修缮", lines: [
        L("A", "验房 · 维修", "Inspection · Repairs", "insp", "Option 期", "0 天 · 生效日 → Option 期最后一天 17:00 → 维修完成 · Closing 前", [N("s_inspection", "配合验房", "Inspection", "买方持证验房师", { ms: "inspection", c: "买方验房", due: "option-3" }), N("s_repair_request", "维修请求", "Repair Amend", "收到买方修缮单", { ms: "option_period_end", c: "维修请求", due: "option" }), N("s_negotiate_fix", "谈判 · 修缮", "Negotiate · Fix", "Closing 前完成", { c: "维修谈判 · 修缮", due: "closing-3" })], [["✓ 达成 → 继续", "ok"], ["✗ 买方 Option 期内可终止", "bad"]]),
        L("B", "产权 · 勘测", "Title · Survey", "title", "治愈期", "0 天 → 交付产权 · 勘测图 → 异议 → 卖方 15 天治愈", [N("s_title_commitment", "产权承诺", "Title Commitment", "Title 公司出具", { ms: "title_commitment", c: "产权检查", due: "effective+20" }), N("s_survey", "地界勘测", "Survey · T-47", "既有勘测 + T-47", { ms: "survey_due", c: "地界图", due: "effective+5" }), N("s_cure_title", "治愈异议", "Cure Title", "清留置权 · 15 天", { c: "产权问题处理", due: "effective+38" })], [["✓ 清晰 → 继续", "ok"], ["✗ 未治愈 · 退买方 EM", "bad"]]),
        L("C", "HOA 文件", "Subdivision Docs", "hoa", "如适用", "0 天 → 送达 Resale Cert → 买方查看 +3 天", [N("s_order_cert", "订购文件", "Order Cert", "合同后订购 · 买方名", { c: "HOA 文件", due: "effective+3" }), N("s_deliver_info", "送达买方", "Deliver Info", "含财务 · 特别评估", { ms: "hoa_docs", c: "HOA 文件已送", due: "effective+15" }), N("s_review", "买方查看", "Review Period", "3 天可终止", { ms: "hoa_termination_end", c: "买方查看 HOA 文件", due: "effective+18" })], [["✓ 接受 → 继续", "ok"], ["✗ 买方 3 天内可终止", "bad"]]),
        L("D", "估值 · 放款", "Appraisal · Lender", "fin", "买方贷款", "0 天 → 评估完成 → Financing 截止日", [N("s_appraisal", "买方评估", "Appraisal", "估值 ≥ 售价", { ms: "appraisal", c: "买方评估", due: "effective+14" }), N("s_gap", "估值缺口", "Appraisal Gap", "低估 → 重谈 / 补差", { c: "估值结果", due: "effective+16" }), N("s_loan_approved", "贷款批准", "Loan Approved", "Financing 解除", { ms: "financing_deadline", c: "买方贷款批准", due: "financing" })], [["✓ Clear to Close", "ok"], ["✗ 估值低 / 拒贷 · 退买方 EM", "bad"]]) ] },
      { key: "close", title: "③ Clear to Close · 交割就绪", sub: "四线清零后进入交割", nodes: [
        N("payoff", "结清房贷", "Mortgage Payoff", "订 payoff · 留置权解除", { c: "结清房贷", due: "closing-7" }),
        N("settlement", "结算 · 净收益", "Settlement · Net", "审结算单 · 佣金 · 税费分摊", { c: "结算单 · 净到手", due: "closing-3" }),
        N("closing_s", "过户 · 交房", "Closing · Funding", "签契 · 放款 · 交钥匙", { ms: "closing", m: "净收益 → 卖方账户", c: "过户 · 交钥匙", due: "closing" }) ] } ] },
    lessor: { type: "lessor", name: "放租", en: "Landlord", stages: ["pre_listing", "listed", "applying", "lease_pending", "active", "ended"], phases: [
      { key: "pre", title: "① 上市前 · 顺序推进", sub: "委托 · 定租金 · 上市 · 收申请 · 批准", nodes: [
        N("l_agmt", "出租委托协议", "Listing Agreement", "独家代理 · 佣金 · 房东书面筛选标准（§92.3515）", { req: "必备", c: "委托协议已签" }),
        N("l_rent", "定租金", "Rent Pricing", "可比出租 · 空置成本", { c: "定租金" }),
        N("l_prep", "准备 · 上市", "Prep & List", "拍摄 · 上 MLS · HOA 租赁规定 · 宠物政策", { c: "上市" }),
        N("l_showings", "看房 · 收申请", "Showings · Applications", "申请费 · 材料清单 · 敏感信息先遮", { c: "看房 · 收申请", link: "lease" }),
        N("l_screen", "审申请 · 批准", "Screen · Approve", "按书面标准 · 批准 / 拒绝通知", { ms: "landlord_decision", c: "审申请", link: "lease", br: [["✓ 批准 → 签约前", "ok"], ["✗ 拒绝 → 继续收申请", "warn"]] }) ] },
      { key: "par", title: "② 批准后 · 两线并行", sub: "签租约和备房同时走", lines: [
        L("A", "租约线", "Lease", "title", "签约期", "批准日 → 入住日前签完", [N("l_draft", "起草租约", "Draft Lease", "TXR-2001 · 条款按批准的申请", { c: "租约起草" }), N("l_tenant_sign", "租客签字", "Tenant Signs", "电子签", { c: "租客签字" }), N("l_landlord_sign", "房东签字 · 生效", "Landlord Signs", "租约生效日", { ms: "lease_sign", c: "租约生效", due: "leaseStart-1" })], [["✓ 生效 → 交房", "ok"], ["✗ 租客退出 → 回到收申请", "bad"]]),
        L("B", "钱与交房线", "Money · Move-in", "fin", "入住前", "签约 → 入住日", [N("l_deposit", "押金 + 首月租金", "Deposit · First Rent", "收据 · 押金账户", { ms: "deposit", c: "押金 + 首月租金", due: "leaseStart-1" }), N("l_utilities", "租客保险 · 水电过户", "Insurance · Utilities", "入住前完成", { c: "租客保险 · 水电", due: "leaseStart" }), N("l_ready", "维修 / 清洁 · 入住检查表", "Make Ready", "拍照留底", { c: "房子备好", due: "leaseStart" })], [["✓ 备齐 → 交钥匙", "ok"], ["✗ 入住日前没备齐 → 推迟", "warn"]]) ] },
      { key: "close", title: "③ 交房 · 租赁中", sub: "钥匙交接后进入租赁运营", nodes: [
        N("l_keys", "钥匙交接 · 入住", "Move-in", "入住检查表签字", { ms: "move_in", c: "钥匙交接", due: "leaseStart" }),
        N("l_ops", "租赁运营", "Lease Operations", "租金时间线 · 维修工单 · 续约提醒 90 / 60 / 30", { c: "租赁中", link: "rentals" }),
        N("l_end", "到期 · 续约 / 退租", "Renew · Move-out", "退押金 · 结算 · 退租检查", { ms: "lease_end", m: "押金 30 天内结算", c: "到期 · 续约 / 退租", due: "leaseEnd" }) ] } ] },
    lessee: { type: "lessee", name: "寻租", en: "Tenant", stages: ["prospecting", "applying", "lease_pending", "active", "ended"], phases: [
      { key: "pre", title: "① 签约前 · 顺序推进", sub: "代理协议 · 看房 · 申请 · 审核 · 签约", nodes: [
        N("t_rep", "租客代理协议", "Tenant Rep Agmt", "看房前书面签", { req: "必备", c: "代理协议已签", link: "contact" }),
        N("t_tours", "看房", "Showings · Tours", "路线 · 收藏 → 目标房排队", { c: "看房", link: "tours" }),
        N("t_apply", "提交申请", "Application", "材料清单 · 申请费（可同时几套）", { c: "已提交申请", link: "lease" }),
        N("t_review", "房东审核", "Landlord Review", "批准 / 拒绝通知", { c: "房东审核中", br: [["✓ 批准 → 签约", "ok"], ["✗ 拒绝 → 下一套目标房", "warn"]] }),
        N("t_sign", "签租约 · 生效", "Lease Signed", "租约生效日", { ms: "lease_sign", m: "押金 + 首月租金 → 房东 / 管理方", c: "签租约", due: "leaseStart-1" }) ] },
      { key: "par", title: "② 生效后 · 两线并行", sub: "钱和入住准备同时走", lines: [
        L("A", "钱", "Money", "fin", "签约 → 入住", "签约日 → 入住日前", [N("t_deposit", "押金 + 首月租金", "Deposit · First Rent", "收据", { c: "押金 + 首月租金", due: "leaseStart-1" }), N("t_receipt", "收据入库", "Receipts", "押金去向留痕", { c: "收据" }), N("t_prorate", "分摊 / 宠物押金", "Prorate · Pet", "如适用", { c: "其他费用" })], [["✓ 付清 → 拿钥匙", "ok"], ["✗ 未付 → 推迟入住", "warn"]]),
        L("B", "入住准备", "Move-in Prep", "title", "入住前", "签约 → 入住日", [N("t_insurance", "租客保险", "Renter's Insurance", "按租约要求", { c: "租客保险", due: "leaseStart-1" }), N("t_utilities", "水电开通", "Utilities", "入住日生效", { c: "水电开通", due: "leaseStart" }), N("t_move", "搬家 · 入住检查", "Move-in Checklist", "拍照留底", { c: "搬家 · 入住检查", due: "leaseStart" })], [["✓ 备齐 → 入住", "ok"], ["✗ 没备齐 → 推迟", "warn"]]) ] },
      { key: "close", title: "③ 拿钥匙 · 租期中", sub: "入住后进入租期", nodes: [
        N("t_keys", "拿钥匙 · 入住", "Move-in", "入住检查表签字", { ms: "move_in", c: "拿钥匙", due: "leaseStart" }),
        N("t_living", "租期中", "Tenancy", "交租 · 报修 · 续约提醒", { c: "租期中" }),
        N("t_end", "续约 / 退租", "Renew · Move-out", "到期前 90 / 60 / 30 天提醒 · 退押金", { ms: "lease_end", c: "续约 / 退租", due: "leaseEnd" }) ] } ] },
  };
  const STAGE_ZH = { prospecting: "找房 · 看房", pre_listing: "上市前", listed: "挂牌中", offer: "Offer 中", under_contract: "合同期", clear_to_close: "交割就绪", closed: "已成交", applying: "申请审核中", lease_pending: "已批准 · 签约前", active: "租赁中", ended: "已到期 · 退租", terminated: "合同终止", lost: "落选 · 撤回" };
  const STAGE_EN = { prospecting: "Prospecting", pre_listing: "Pre-listing", listed: "Listed", offer: "Offer", under_contract: "Under contract", clear_to_close: "Clear to close", closed: "Closed", applying: "Applying", lease_pending: "Approved · pre-lease", active: "Active lease", ended: "Ended", terminated: "Terminated", lost: "Lost · withdrawn" };
  const STAGE_CLS = { prospecting: "warn", pre_listing: "warn", listed: "ai", offer: "acc", under_contract: "acc", clear_to_close: "ok", closed: "ok", applying: "warn", lease_pending: "warn", active: "ok", ended: "mute", terminated: "mute", lost: "mute" };
  const TERMINAL = ["closed", "terminated", "lost", "ended"];
  const STAGES = Object.keys(STAGE_ZH); // 十三个阶段（D8）；「待确认」是徽章，不是阶段
  const today = () => (window.TODAY ? TODAY() : new Date().toISOString().slice(0, 10));
  const LINE_ZH = { insp: "验房", title: "产权", hoa: "HOA", fin: "贷款" };

  // ---------- 进度 ----------
  const typeOf = (d) => d.type || "buyer"; // 买 / 卖 / 放租 / 寻租只看 type（没有 side 了）
  const isLease = (d) => ["lessor", "lessee"].includes(typeOf(d));
  const sideLabel = (d) => ({ buyer: T("买方代理", "Buyer side"), seller: T("卖方代理", "Listing side"), lessor: T("租赁", "Lease"), lessee: T("租赁", "Lease") })[typeOf(d)];
  const mapFor = (d) => ROADMAPS[typeOf(d)] || ROADMAPS.buyer;
  const rmOf = (d) => { d.rm = d.rm || { pre: 0, lines: {}, out: {}, close: 0 }; d.rm.lines = d.rm.lines || {}; d.rm.out = d.rm.out || {}; return d.rm; };
  const phaseOf = (map, key) => map.phases.find((p) => p.key === key);
  const preDone = (map, rm) => rm.pre >= phaseOf(map, "pre").nodes.length;
  const linesDone = (map, rm) => phaseOf(map, "par").lines.every((l) => rm.out[l.key] === "ok" || (rm.lines[l.key] || 0) >= l.nodes.length);
  const linesBad = (map, rm) => phaseOf(map, "par").lines.some((l) => rm.out[l.key] === "bad");
  function state(d, nodeId) {
    const map = mapFor(d), rm = rmOf(d);
    for (const ph of map.phases) {
      if (ph.nodes) { const i = ph.nodes.findIndex((n) => n.id === nodeId); if (i < 0) continue; const done = ph.key === "pre" ? rm.pre : rm.close; const active = ph.key === "pre" ? true : (preDone(map, rm) && linesDone(map, rm)); if (i < done) return "done"; if (i === done && active && !TERMINAL.includes(d.stage)) return "cur"; return "todo"; }
      for (const l of ph.lines) { const i = l.nodes.findIndex((n) => n.id === nodeId); if (i < 0) continue; const done = rm.lines[l.key] || 0; if (rm.out[l.key] === "ok" || i < done) return "done"; if (i === done && preDone(map, rm) && !TERMINAL.includes(d.stage) && !rm.out[l.key]) return "cur"; return "todo"; }
    }
    return "todo";
  }
  function currentNodes(d) { const out = []; mapFor(d).phases.forEach((ph) => { (ph.nodes || []).forEach((n) => { if (state(d, n.id) === "cur") out.push({ node: n, phase: ph }); }); (ph.lines || []).forEach((l) => l.nodes.forEach((n) => { if (state(d, n.id) === "cur") out.push({ node: n, phase: ph, line: l }); })); }); return out; }
  function stageOf(d) {
    if (TERMINAL.includes(d.stage)) return d.stage;
    const map = mapFor(d), rm = rmOf(d), t = map.type;
    const keeps = (o) => window.NBOffers ? NBOffers.keepsOfferStage(o) : ["negotiating", "on_hold"].includes(o.status); // 在谈或挂起都让交易留在 Offer 中（D8）
    const negotiating = ((window.DB && DB.offers && DB.offers[d.id]) || []).some(keeps);
    if (rm.close >= 3) return t === "buyer" || t === "seller" ? "closed" : "ended";
    if (t === "lessor") { if (rm.close >= 1) return "active"; if (rm.pre >= 5) return "lease_pending"; if (rm.pre === 4) return "applying"; return rm.pre === 3 ? "listed" : "pre_listing"; }
    if (t === "lessee") { if (rm.close >= 1) return "active"; if (rm.pre >= 5) return "lease_pending"; return rm.pre >= 3 ? "applying" : "prospecting"; }
    if (preDone(map, rm)) return linesDone(map, rm) ? "clear_to_close" : "under_contract";
    if (t === "buyer") return rm.pre >= 3 || negotiating ? "offer" : "prospecting";
    if (rm.pre >= 4) return "offer"; if (rm.pre === 3) return negotiating ? "offer" : "listed"; return "pre_listing";
  }
  function syncStage(d) { if (!TERMINAL.includes(d.stage)) d.stage = stageOf(d); return d.stage; }
  // 没上传合同就点了「签约 · 合同生效」时唯一允许的估算（合同字段确认后会被覆盖）：今天生效 · EST.closeDays 天后过户 · Option EST.optionDays 天；交易上记 est = true
  const EST = { optionDays: 7, closeDays: 30 };
  let lastBlock = ""; // 上一次 advance 被门挡住的原因（界面拿去提示）
  function advance(d, phaseKey, lineKey) { lastBlock = ""; const map = mapFor(d), rm = rmOf(d); if (lineKey) { if (!preDone(map, rm)) return null; const l = phaseOf(map, "par").lines.find((x) => x.key === lineKey); if (!l) return null; const i = rm.lines[lineKey] || 0; if (i >= l.nodes.length || rm.out[lineKey] === "bad") return null; rm.lines[lineKey] = i + 1; if (rm.lines[lineKey] >= l.nodes.length) rm.out[lineKey] = rm.out[lineKey] || "ok"; syncStage(d); return l.nodes[i]; } const ph = phaseOf(map, phaseKey); if (!ph || !ph.nodes) return null; const k = phaseKey === "pre" ? "pre" : "close"; if (k === "close" && !(preDone(map, rm) && linesDone(map, rm))) return null; if (rm[k] >= ph.nodes.length) return null; const n = ph.nodes[rm[k]];
    const sale = map.type === "buyer" || map.type === "seller"; const closing = k === "close" && sale && rm.close === ph.nodes.length - 1;
    // 成交 = 完成最后一个交割节点「过户 · 交房」：合规清单过户前那几段齐了、Broker 批了「合规 + CDA」才放行（work.js NBComp.gate）
    if (closing && window.NBComp) { const g = NBComp.gate(d.id); if (!g.ok) { lastBlock = g.why; return null; } }
    rm[k] += 1;
    if (k === "pre" && rm.pre >= ph.nodes.length && sale) { if (!d.effective) { d.effective = today(); d.est = true; } if (!d.closing) { d.closing = addDays(d.effective, EST.closeDays); d.est = true; } if (!d.optionDays && fieldDays(d, "option_period_days") == null) { d.optionDays = EST.optionDays; d.est = true; } }
    syncStage(d);
    if (closing && window.NBComp) NBComp.afterClose(d.id); // 成交后：过户后那一段合规材料变成待收任务
    return n; }
  // 撤销最后一步。撤销最后一个交割节点（已成交 / 已到期）时阶段要重新算：closed / ended 是终态，syncStage 不会自己退出来，这里先把它清掉；成交时建的「过户后收：…」任务（NBComp.afterClose）还没做的一起收回
  function undo(d, phaseKey, lineKey) {
    const rm = rmOf(d);
    if (lineKey) { if ((rm.lines[lineKey] || 0) > 0) rm.lines[lineKey] -= 1; delete rm.out[lineKey]; }
    else { const k = phaseKey === "pre" ? "pre" : "close"; if (rm[k] > 0) rm[k] -= 1; if (k === "close" && ["closed", "ended"].includes(d.stage)) { d.stage = ""; if (window.NBComp && NBComp.undoAfterClose) NBComp.undoAfterClose(d.id); } }
    syncStage(d);
  }
  function outcome(d, lineKey, which) { const map = mapFor(d), rm = rmOf(d); const l = phaseOf(map, "par").lines.find((x) => x.key === lineKey); rm.out[lineKey] = which; if (which === "ok") rm.lines[lineKey] = l.nodes.length; if (which === "bad") { if (map.type === "buyer" || map.type === "seller") { d.endedFrom = { stage: d.stage, at: today(), line: lineKey }; d.stage = "terminated"; } } else syncStage(d); }
  // 两个终态动作（D11）：kind = "terminated" 合同终止 | "lost" 落选 · 撤回；reopen 撤销（阶段按进度重新算）
  function terminate(dealId, kind, why) {
    const d = window.deal(dealId); if (!d || TERMINAL.includes(d.stage) || !["terminated", "lost"].includes(kind)) return null;
    d.endedFrom = { stage: d.stage, at: today() }; d.stage = kind; d.lastAction = today();
    if (window.audit) audit(dealId, `标为 ${STAGE_ZH[kind]}${why ? "：" + why : ""}（可撤销）`, "human");
    return d;
  }
  function reopen(dealId) {
    const d = window.deal(dealId); if (!d || !["terminated", "lost"].includes(d.stage)) return null;
    const from = d.stage, rm = rmOf(d); Object.keys(rm.out).forEach((k) => { if (rm.out[k] === "bad") delete rm.out[k]; });
    d.stage = ""; delete d.endedFrom; syncStage(d); d.lastAction = today();
    if (window.audit) audit(dealId, `撤销「${STAGE_ZH[from]}」→ 回到 ${STAGE_ZH[d.stage]}`, "human");
    return d;
  }

  // ---------- 截止 ----------
  const addDays = (iso, n) => { if (!iso) return null; const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  // 这笔交易里和节点同 key 的里程碑（没有 → null）
  const msOf = (d, node) => (node.ms && window.DB ? ((DB.milestones || {})[d.id] || []).find((m) => m.key === node.ms) : null) || null;
  // 已确认字段里的天数（"7 天" → 7）；没有这个字段或还没确认 → null
  function fieldDays(d, key) { const f = window.DB ? ((DB.fields || {})[d.id] || []).find((x) => x.key === key && x.status === "confirmed" && !x.absent) : null; const n = f ? parseInt(f.value, 10) : NaN; return isNaN(n) ? null : n; }
  // Option / 贷款审批天数：字段是源头；交易上的 optionDays / financingDays 只是字段的拷贝（或签约时的估算）；都没有 → null，不猜
  function daysOf(d, which) { const n = fieldDays(d, which === "option" ? "option_period_days" : "buyer_approval_days"); return n != null ? n : ((which === "option" ? d.optionDays : d.financingDays) || null); }
  // 节点的截止：{ date, time, est }。有同 key 里程碑 → 它的日期（已完成 / 不适用 / 没日期 → 不显示）；没有 → 按节点规则估（est: true）；算不出 → null
  function dueOf(d, node) {
    const time = node.due === "option" ? "17:00" : "";
    const m = msOf(d, node);
    if (m) return m.status === "pending" && m.date ? { date: m.date, time, est: false, ms: m.id } : null;
    if (!node.due) return null;
    const r = node.due.match(/^(effective|closing|leaseStart|leaseEnd|option|financing)([+-]\d+)?$/); if (!r) return null;
    const od = daysOf(d, "option"), fn = daysOf(d, "financing");
    const base = { effective: d.effective, closing: d.closing, leaseStart: d.leaseStart || d.availableFrom, leaseEnd: d.leaseEnd, option: od != null ? addDays(d.effective, od) : null, financing: fn != null ? addDays(d.effective, fn) : null }[r[1]]; if (!base) return null;
    return { date: addDays(base, r[2] ? Number(r[2]) : 0), time, est: true };
  }
  const allNodes = (d) => { const out = []; mapFor(d).phases.forEach((ph) => { (ph.nodes || []).forEach((n) => out.push({ node: n, phase: ph })); (ph.lines || []).forEach((l) => l.nodes.forEach((n) => out.push({ node: n, phase: ph, line: l }))); }); return out; };
  // 还没完成的节点里有日期的：[{ node, phase, line, date, time, est, state, days }]，按日期排
  function dues(d) { const T = today(); return allNodes(d).map((x) => { const st = state(d, x.node.id); if (st === "done") return null; const due = dueOf(d, x.node); return due && due.date ? Object.assign({}, x, due, { state: st, days: Math.round((new Date(due.date + "T00:00:00") - new Date(T + "T00:00:00")) / 864e5) }) : null; }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date)); }
  function nextDue(d) { return dues(d)[0] || null; }
  function nowText(d, client) {
    const cur = currentNodes(d); const nd = nextDue(d); const nm = (n) => client ? (n.c || n.t) : n.t;
    if (TERMINAL.includes(d.stage)) return STAGE_ZH[d.stage] + (d.stage === "lost" ? " · 可再激活" : "");
    const head = cur.length ? cur.map((x) => (x.line ? x.line.t + " · " : "") + nm(x.node)).slice(0, 2).join("；") : STAGE_ZH[stageOf(d)];
    const dayN = d.effective && ["under_contract", "clear_to_close"].includes(d.stage) ? `合同期第 ${(window.daysBetween ? daysBetween(d.effective, TODAY()) : 0) + 1} 天 · ` : "";
    const same = nd && cur.some((x) => x.node.id === nd.node.id);
    return dayN + head + (nd ? ` · ${same ? "" : nm(nd.node) + " "}${nd.days < 0 ? "截止已过 " + (-nd.days) + " 天" : nd.days === 0 ? "今天截止" : "还剩 " + nd.days + " 天"}${nd.est ? "（估）" : ""}` : "");
  }

  // ---------- 渲染 ----------
  // 只有「最后一个完成的节点」才能撤销（签约前阶段：四线 / 交割还没动过才允许）
  function lastDone(d, x, phaseKey, lineKey) {
    const map = mapFor(d), rm = rmOf(d);
    if (lineKey) { const l = phaseOf(map, "par").lines.find((y) => y.key === lineKey); const i = l.nodes.findIndex((n) => n.id === x.id); return !rm.out[lineKey] && i === (rm.lines[lineKey] || 0) - 1; }
    const ph = phaseOf(map, phaseKey); const i = ph.nodes.findIndex((n) => n.id === x.id);
    if (phaseKey === "pre") return i === rm.pre - 1 && !(rm.close > 0) && !Object.keys(rm.lines).some((k) => rm.lines[k] > 0) && !Object.keys(rm.out).length;
    return i === rm.close - 1;
  }
  // 链接只发当前这一端有的路由（shared.js NBLink）；它没加载时（单测）退回网站路由
  const linkTo = (kind, id, sub) => window.NBLink ? NBLink.to(kind, id, sub) : (kind === "deal" ? `#/deals/${id}${sub ? "/" + sub : ""}` : "#/" + kind);
  function nodeHtml(d, x, opt, lc, phaseKey, lineKey) {
    const s = state(d, x.id); const due = s === "done" ? null : dueOf(d, x); const client = opt.client;
    const title = client ? (x.c || x.t) : x.t;
    const act = opt.actions && s === "cur" ? `<div class="rm-act"><button class="btn xs pri" data-action="rm-done" data-arg="${d.id}|${phaseKey}|${lineKey || ""}">${T("完成", "Done")}</button>${x.link === "offers" && linkTo("deal", d.id, "offers") ? `<a class="btn xs" href="${linkTo("deal", d.id, "offers")}">Offer</a>` : x.link === "tours" && linkTo("showings") ? `<a class="btn xs" href="${linkTo("showings")}">${T("看房", "Tours")}</a>` : ""}</div>` : opt.actions && s === "done" && opt.undoable && lastDone(d, x, phaseKey, lineKey) ? `<div class="rm-act"><button class="btn xs ghost" data-action="rm-undo" data-arg="${d.id}|${phaseKey}|${lineKey || ""}">${T("撤销", "Undo")}</button></div>` : "";
    return `<div class="rm-node ${s} ${lc ? "on-line" : ""}" ${lc ? `style="--lc:var(--rm-${lc})"` : ""}><span class="rm-n">${s === "done" ? "✓" : x.n != null ? x.n : "·"}</span><div class="rm-t">${esc(title)}${client ? "" : ` <span class="rm-e">${esc(x.e)}</span>`}</div>${client ? "" : `<div class="rm-d">${esc(x.d)}</div>`}${due && due.date ? `<div class="rm-due ${s === "cur" ? (window.urgency ? urgency(due.date) : "") : ""}">${T("截止", "Due")} ${window.fd ? fd(due.date) : due.date}${due.time ? " " + due.time : ""}${s === "cur" && window.rel ? " · " + rel(due.date) : ""}${due.est ? ` <span class="rm-est" title="${T("这笔交易还没有对应的里程碑：按节点规则估的日期，合同字段确认后以派生的里程碑为准", "Estimated from the node rule; the derived milestone replaces it once contract fields are confirmed")}" style="opacity:.7">${T("估", "est.")}</span>` : ""}</div>` : ""}${x.m && !client ? `<div class="rm-m">${esc(x.m)}</div>` : ""}${x.req && !client ? `<div class="rm-req">${esc(x.req)}</div>` : ""}${x.br ? `<div class="rm-branch">${x.br.map((b) => `<span class="rm-pill ${b[1]}" style="opacity:${s === "cur" ? 1 : .55}">${esc(b[0])}</span>`).join("")}</div>` : ""}${act}</div>`;
  }
  function render(d, opt) {
    opt = opt || {}; const map = mapFor(d), rm = rmOf(d); const stage = TERMINAL.includes(d.stage) ? d.stage : stageOf(d); const vertical = opt.mode === "v"; const client = opt.client;
    let out = `<div class="rm ${vertical ? "v" : ""} ${client ? "client" : ""}">`;
    out += `<div class="rm-now"><span class="rm-dot"></span><span>${T("现在", "Now")}：${esc(nowText(d, !!client))}</span></div>`;
    const stages = map.stages.concat(TERMINAL.includes(stage) && !map.stages.includes(stage) ? [stage] : []);
    const ci = stages.indexOf(stage);
    out += `<div class="rm-stages">${stages.map((s, i) => `<span class="${i < ci ? "done" : i === ci ? "cur" : ""}">${esc(T(STAGE_ZH[s], STAGE_EN[s]) || s)}</span>`).join("")}</div>`;
    map.phases.forEach((ph) => {
      const ids = ph.nodes ? ph.nodes.map((n) => n.id) : [].concat.apply([], ph.lines.map((l) => l.nodes.map((n) => n.id)));
      const any = ids.some((i) => state(d, i) !== "todo"), all = ids.every((i) => state(d, i) === "done");
      const ps = all ? "done" : any ? "cur" : "todo";
      out += `<div class="rm-phase ${ps}"><div class="rm-ph"><b>${esc(ph.title)}</b>${client ? "" : `<span>${esc(ph.sub)}</span>`}<span class="rm-pst">${{ done: T("已完成", "Done"), cur: T("进行中", "In progress"), todo: T("还没到", "Not yet") }[ps]}</span></div>`;
      if (ph.nodes) out += `<div class="rm-seq ${ph.nodes.length === 3 ? "three" : ""}">${ph.nodes.map((n) => nodeHtml(d, n, opt, null, ph.key)).join("")}</div>`;
      else {
        out += `<div class="rm-lines">` + ph.lines.map((l) => {
          const cur = l.nodes.filter((n) => state(d, n.id) === "cur")[0]; const allTodo = l.nodes.every((n) => state(d, n.id) === "todo"); const done = rm.out[l.key] === "ok" || l.nodes.every((n) => state(d, n.id) === "done"); const bad = rm.out[l.key] === "bad";
          if (client === "seller" && l.key === "D") return `<div class="rm-lane dim1" style="--lc:var(--rm-fin)"><div class="rm-lanebody one"><div class="rm-lab"><b>${esc(l.t)}</b><span class="rm-pst">${bad ? "✗ " + T("未通过", "Failed") : done ? "✓ " + T("已批准", "Approved") : cur ? T("进行中", "In progress") + " · " + esc(cur.c || cur.t) : T("还没到", "Not yet")}</span></div></div></div>`;
          const body = `<div class="rm-lab"><b>${esc(l.key + " · " + l.t)}</b>${client ? "" : `<span class="rm-e">${esc(l.e)}</span><span class="rm-w">${esc(l.w)}</span><span class="rm-rule">${esc(l.rule)}</span>`}</div><div class="rm-mid">${l.nodes.map((n) => nodeHtml(d, n, opt, l.c, "par", l.key)).join("")}</div><div class="rm-out">${l.out.map((o, i) => `<span class="rm-pill ${o[1]} ${rm.out[l.key] === (i === 0 ? "ok" : "bad") ? "chosen" : ""}" style="opacity:${allTodo ? .55 : 1}">${esc(o[0])}</span>`).join("")}${opt.actions && !client && preDone(map, rm) && !rm.out[l.key] && !TERMINAL.includes(d.stage) ? `<div class="rm-act"><button class="btn xs ok" data-action="rm-out" data-arg="${d.id}|${l.key}|ok">${T("这条线走通了", "Line cleared")}</button><button class="btn xs ghost" data-action="rm-out" data-arg="${d.id}|${l.key}|bad">${T("终止", "Terminate")}</button></div>` : ""}</div>`;
          const lopen = vertical ? (!!cur && !opt.foldAll) : true;
          return `<div class="rm-lane ${allTodo ? "dim" : ""} ${bad ? "bad" : ""}" style="--lc:var(--rm-${l.c})"><details class="rm-fold" ${lopen ? "open" : ""}><summary><span><b>${esc(l.key + " · " + l.t)}</b> ${cur ? `<span class="rm-cur-in">● ${T("当前", "Now")}：${esc(client ? cur.c || cur.t : cur.t)}</span>` : bad ? `<span class="rm-cur-in bad">✗ ${T("已终止", "Terminated")}</span>` : done ? `<span class="rm-cur-in">✓ ${T("完成", "Done")}</span>` : `<span class="rm-e muted">${T("还没到", "Not yet")}</span>`}</span></summary><div class="rm-lanebody">${body}</div></details></div>`;
        }).join("") + `</div>`;
      }
      out += `</div>`;
    });
    return out + `</div>`;
  }
  const stageBadgeHtml = (s) => `<span class="badge ${STAGE_CLS[s] || "mute"}">${esc(T(STAGE_ZH[s], STAGE_EN[s]) || s)}</span>`;
  const stageLabel = (s) => T(STAGE_ZH[s], STAGE_EN[s]) || s;
  const typeLabel = (d) => ({ buyer: T("买房", "Buyer"), seller: T("卖房", "Seller"), lessor: T("放租", "Landlord"), lessee: T("寻租", "Tenant") })[typeOf(d)] || "";

  // ---------- 动作（三端通用；按钮只在经纪人端显示） ----------
  const SHARED = {};
  function reg() {
    const A = window.ACTIONS; if (!A) return;
    Object.assign(A, SHARED); // 每次都挂（不是「有了就跳过」）：DOMContentLoaded 时各端自己的文件都加载完了，这里的实现最后落定，同名的旧实现不会因为加载先后盖回来
  }
  {
    const A = SHARED;
    const after = (d, msg) => { if (window.DBsave) window.DBsave(); if (window.render) window.render(); if (window.toast) window.toast(msg); };
    A["rm-done"] = (el, arg, e) => { if (e) { e.preventDefault(); e.stopPropagation(); } const [id, ph, ln] = arg.split("|"); const d = window.deal(id); if (!d) return; const n = advance(d, ph, ln || null); if (!n) { if (lastBlock && window.toast) window.toast(lastBlock); return; } d.lastAction = TODAY(); if (window.audit) audit(id, `路线图：${ln ? ln + " 线 · " : ""}${n.t} 完成 → 阶段 ${STAGE_ZH[d.stage]}`, "human"); after(d, `${n.t} ✓${d.stage !== stageOf(d) ? "" : " · 阶段 " + STAGE_ZH[d.stage]}`); };
    A["rm-undo"] = (el, arg, e) => { if (e) { e.preventDefault(); e.stopPropagation(); } const [id, ph, ln] = arg.split("|"); const d = window.deal(id); if (!d) return; undo(d, ph, ln || null); if (window.audit) audit(id, `路线图：撤销 ${ln ? ln + " 线" : ph} 最后一步`, "human"); after(d, "已撤销"); };
    A["rm-out"] = (el, arg, e) => { if (e) { e.preventDefault(); e.stopPropagation(); } const [id, ln, which] = arg.split("|"); const d = window.deal(id); if (!d) return; outcome(d, ln, which); d.lastAction = TODAY(); if (window.audit) audit(id, `路线图：${ln} 线 ${which === "ok" ? "走通 → 继续" : "终止 → 退 EM（合同终止）"}`, "human"); after(d, which === "ok" ? ln + " 线走通" : "已按终止处理（合同终止，可在交易菜单里撤销）"); };
    // 交易菜单：标为 合同终止 / 标为 落选 · 撤回（arg = 交易 id|terminated 或 lost）· 撤销（arg = 交易 id）
    A["deal-terminate"] = (el, arg) => { const [id, kind] = arg.split("|"); const d = terminate(id, kind); if (d) after(d, `已标为 ${STAGE_ZH[kind]} · 可在交易菜单里撤销`); };
    A["deal-reopen"] = (el, arg) => { const d = reopen(arg); if (d) after(d, `已撤销 · 回到 ${STAGE_ZH[d.stage]}`); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reg); else reg();
  setTimeout(reg, 0);

  window.NBRoadmap = { ROADMAPS, STAGE_ZH, STAGE_EN, STAGE_CLS, STAGES, TERMINAL, LINE_ZH, EST, typeOf, isLease, sideLabel, typeLabel, mapFor, rmOf, state, currentNodes, stageOf, syncStage, advance, undo, outcome, terminate, reopen, lastBlock: () => lastBlock, msOf, fieldDays, daysOf, dueOf, dues, nextDue, nowText, render, stageBadgeHtml, stageLabel, addDays };
})();
