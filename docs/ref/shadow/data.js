/* NewBee OS 三端影子 · 种子数据（网站 OS · 经纪人 App · 客户 App 共用；全部示例，人名 / 地址 / 金额均为虚构） */
(function () {
  const T0 = new Date(); T0.setHours(0, 0, 0, 0);
  function iso(x) { const m = String(x.getMonth() + 1).padStart(2, "0"), d = String(x.getDate()).padStart(2, "0"); return `${x.getFullYear()}-${m}-${d}`; }
  function d(n) { const x = new Date(T0); x.setDate(x.getDate() + n); return iso(x); }
  const YEAR = T0.getFullYear();
  const TODAY = d(0);
  const PREP = ["转正", "纠斜", "提对比度", "≥ 200 DPI"]; // 扫描 / 拍照件抽取前的预处理
  const FIRST = (k) => iso(new Date(T0.getFullYear(), T0.getMonth() + k, 1)); // 这个月（0）/ 下个月（1）/ 上个月（-1）的 1 日：交租日是「每月 1 日」，不能用「今天 + 几天」凑
  const fdISO = (iso) => { const x = new Date(iso + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}`; };
  // v1.7：约看的时间戳按「现在」算——NOW0 = 加载这一刻；hm(h) = 今天的整点（现在 + h 小时，压在今天 00:00–23:00 之内，演示里永远落在今天）；ago(min) = 现在往前推 min 分钟（可以跨到昨天）
  const NOW0 = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const hourAt = (h) => Math.max(0, Math.min(22, NOW0.getHours() + h));
  const hmAt = (h) => `${TODAY} ${pad2(hourAt(h))}:00`;
  const winAt = (h) => `${pad2(hourAt(h))}:00–${pad2(hourAt(h) + 1)}:00`;
  const ago = (min) => { const x = new Date(NOW0.getTime() - min * 6e4); return `${iso(x)} ${pad2(x.getHours())}:${pad2(x.getMinutes())}`; };
  const Y_HOUR = Math.min(10, Math.max(0, NOW0.getHours() - 2)); // 「昨天 10:00 看完、超过 24 小时没反馈」那一场的整点：不管现在几点都 ≥ 26 小时前

  // ===== v1.2 · 默认排序的权重（一处集中，以后设置页可调）=====
  // 总分 = 基础分 + 各项加减分；卡片最多显示 2 个理由标签（加分最多的）；同分时最近有动静的排前。
  // reserved: true = 对应模块真实版还没上线，真实版第一版返回 0（reservedOn=false）；影子里看房 / 消息已有，所以 reservedOn=true 直接生效。
  // v1.5（决定 D3 / D4）：thresholds = 所有「几天算快到了」和置信度线，只在这里写一次；用途不同数不同，但各有名字：
  //   riskDays 今天页「有风险」和通知里的 48 小时 · soonDays 列表 +30 / Broker 看板 / 黄色 · urgentDays 红色 / 导航角标 · weekDays 列表 +10 / AI 说的「本周」
  //   lowConfidence 低置信线（低于它的字段逐条确认；系统自己从不确认任何一格）· replyHours 对方来信超过这么久没回 = 待回复
  //   v1.7（决定 67–69）：showingEscalateHours 等卖家 / 租客批超过这么久没人批 → 升级给经纪人 · showingSoonHours 离看房不到这么久还没批 → 升级 · feedbackAskHours 看完这么久没反馈 → 去要反馈 · busyShowings 「看房不少、没有 Offer」的场次线
  window.SCORE_CONFIG = {
    thresholds: { riskDays: 2, soonDays: 3, urgentDays: 1, weekDays: 7, lowConfidence: 0.9, replyHours: 24, showingEscalateHours: 1, showingSoonHours: 3, feedbackAskHours: 24, busyShowings: 6 },
    deal: {
      base: { offer_open: 100, under_contract: 95, lease_pending: 95, clear_to_close: 90, applying: 85, listed: 80, offer: 30, prospecting: 70, pre_listing: 70, active: 40, closed: 10, ended: 5, terminated: 0, lost: 0, default: 70 },
      // offer = 「Offer 中」但没有一个在谈（全部挂起）；有在谈的 Offer 走 offer_open
      add: {
        fresh: { w: 40, note: "有新动态：上次打开之后出现了新文件 / 新 AI 提议 / 新沟通 / stage 变化，自己的操作不算" },
        overdue: { w: 35, note: "有未完成的里程碑或任务已逾期" },
        due3: { w: 30, note: "最近的截止日 ≤3 天" }, due7: { w: 10, note: "最近的截止日 4–7 天" },
        pending: { w: 20, note: "有待我确认的字段或 AI 提议" },
        prioHigh: { w: 30, note: "priority = high" }, prioLow: { w: -30, note: "priority = low" },
        lease60: { w: 20, note: "租赁中且租约 60 天内到期" }, lease90: { w: 10, note: "租约 61–90 天到期" },
        tour48: { w: 20, reserved: true, note: "48 小时内有预约看房" }, waiting: { w: 5, reserved: true, note: "在等对方回复" }, feedback: { w: 2, reserved: true, note: "有待催的看房反馈" },
        touch1: { w: 15, note: "最后动静 ≤1 天" }, touch3: { w: 8, note: "最后动静 ≤3 天" }, stale30: { w: -20, note: "超过 30 天没动静" },
      },
      actionThreshold: 20, otherCollapse: 8, reservedOn: true,
    },
    contact: {
      // 热度：从上往下命中第一条
      heat: { hot: 100, warm: 80, prospectRecent: 60, prospect: 30, other: 20, onlyClosed: 10, future: 10, allLost: 0 },
      add: {
        deal_fresh: { w: 40, note: "他的交易有新动态" }, deal_due3: { w: 30, note: "他的交易截止 ≤3 天" }, deal_due7: { w: 10, note: "他的交易截止 4–7 天" },
        deal_high: { w: 30, note: "他的交易 priority = high" }, deal_low: { w: -30, note: "他的交易全部是 low" },
        touchdue: { min: 5, max: 30, perDay: 5, note: "到了该联系的日子：+min(30, max(5, 逾期天数 × 5))" },
        birthday: { w: 15, note: "本人或家庭圈成员 15 天内过生日" },
        tour48: { w: 20, reserved: true, note: "48 小时内有看房" }, suggest: { w: 20, reserved: true, note: "有没处理的沟通建议" }, waitme: { w: 5, reserved: true, note: "在等我回复" },
        touch1: { w: 15, note: "最近联系 ≤1 天" }, touch3: { w: 8, note: "最近联系 ≤3 天" }, stale30: { w: -20, note: "超过 30 天没联系" },
      },
      former: -1000,
      cadence: { hot: 2, warm: 3, other: 30, note: "手动设置的优先；没设：有 offer / under_contract / lease_pending 的 2 天；潜在客户或有 listed / applying 的 3 天；其余 30 天" },
      actionThreshold: 20, greetCollapse: 5, otherCollapse: 8, reservedOn: true,
    },
    property: {
      // 影子里房源已经按全套规则打分（enabled: true）；enabled: false = 只有基础分（真实版第一版先不先打分，由手册那一步定）
      enabled: true,
      base: { hot: 100, warm: 80, prospect: 60, managed: 50, watching: 50, onlyClosed: 10, other: 20 },
      add: {
        fresh: { w: 40, note: "关联交易有新动态" }, overdue: { w: 35, note: "关联交易有逾期未完成的里程碑" },
        due3: { w: 30, note: "关联交易截止 ≤3 天" }, due7: { w: 10, note: "关联交易截止 4–7 天" },
        next_touch: { w: 20, note: "next_touch_at 已到" },
        lease60: { w: 20, note: "租约 60 天内到期" }, lease90: { w: 10, note: "租约 61–90 天到期" },
        tour48: { w: 20, reserved: true, note: "48 小时内有看房" }, cold: { w: 10, reserved: true, note: "挂牌满 14 天且最近 7 天没有看房 → 看房冷清" }, feedback: { w: 2, reserved: true, note: "有待催的看房反馈" },
        touch1: { w: 15, note: "最后动静 ≤1 天" }, touch3: { w: 8, note: "最后动静 ≤3 天" }, stale30: { w: -20, note: "超过 30 天没动静" },
      },
      actionThreshold: 20, otherCollapse: 8, reservedOn: true,
    },
  };

  // ===== v1.5 · 字段注册表（影子版）=====
  // 最后一列 core：1 = review/newbee-os/packages/core/src/schemas/deal-fields.ts 里已有的 key（名字照它，一个字不改）；0 = 影子样例合同里多出来的格子（真实版由 forms-spec 登记）。
  // type：text | number | money | days | date | boolean | list —— 钱和日期的行带裁图；扫描 / 手写 / 拍照来的、低于 0.9 的、卡在交叉校验上的钱和日期，确认前先看裁图（extract.js · 确认规矩 R-2）。tier = 字段 tab 的档（极简 / 标准 / 全部）。
  window.NB_FIELDS = [
    ["buyer_names", "list", "买方", "Buyer(s)", "minimal", "1", 1], ["seller_names", "list", "卖方", "Seller(s)", "minimal", "1", 1],
    ["listing_agent", "text", "卖方经纪", "Listing Agent", "all", "经纪信息页", 1], ["buyer_agent", "text", "买方经纪", "Buyer Agent", "all", "经纪信息页", 1], ["listing_brokerage", "text", "卖方经纪公司", "Listing Brokerage", "all", "经纪信息页", 1], ["buyer_brokerage", "text", "买方经纪公司", "Buyer Brokerage", "all", "经纪信息页", 1],
    ["title_company", "text", "产权公司", "Title Company", "minimal", "6A · 18", 1], ["escrow_officer", "text", "Escrow Officer", "Escrow Officer", "all", "18", 1], ["lender", "text", "贷款方", "Lender", "all", "40-11", 1],
    ["sales_price", "money", "成交价", "Sales Price (3C)", "minimal", "3C", 1], ["cash_portion", "money", "现金部分（首付）", "Cash Portion (3A)", "standard", "3A", 1], ["loan_amount", "money", "贷款额", "Loan Amount (3B)", "standard", "3B · 40-11 A", 1], ["loan_type", "text", "贷款类型", "Loan Type", "minimal", "40-11", 1],
    ["seller_concessions", "money", "卖方付费用", "Seller Concessions", "standard", "12A(1)(b)", 1], ["earnest_money", "money", "Earnest Money", "Earnest Money", "minimal", "5A", 1], ["earnest_money_due_days", "days", "EM 递交天数", "EM Due (days)", "all", "5A", 1], ["additional_earnest_money", "money", "追加 Earnest Money", "Additional Earnest Money", "all", "5A", 1],
    ["option_fee", "money", "Option Fee", "Option Fee", "minimal", "5B", 1], ["option_period_days", "days", "Option 天数", "Option Period (days)", "minimal", "5B", 1], ["buyer_approval_days", "days", "贷款审批天数", "Buyer Approval (days)", "standard", "40-11 2A", 1], ["appraisal_waiver", "boolean", "放弃估价条件", "Appraisal Waiver", "standard", "40-11 B · 49-1", 1],
    ["first_met", "date", "第一次见面", "First Met", "all", "—", 1], ["view_house_date", "date", "看房 / 上市面谈", "View House / Listing Appointment", "all", "—", 1], ["listing_date", "date", "挂牌日", "Listing Date", "all", "—", 1], ["offer_received_date", "date", "收到 Offer", "Offer Received", "all", "—", 1],
    ["effective_date", "date", "生效日", "Effective Date", "minimal", "签名页", 1], ["closing_date", "date", "过户日", "Closing Date", "minimal", "9A", 1], ["possession", "text", "交房", "Possession", "standard", "10A", 1],
    ["survey_days", "days", "Survey 交付天数", "Survey Delivery (days)", "standard", "6C", 1], ["objection_days", "days", "产权异议天数", "Objection Period (days)", "all", "6D", 1], ["hoa_docs_delivery_days", "days", "HOA 文件送达天数", "HOA Docs Delivery (days)", "all", "36-11 A", 1], ["hoa_termination_days", "days", "HOA 终止权天数", "HOA Termination (days)", "all", "36-11 A", 1], ["lead_paint_days", "days", "含铅漆检查天数", "Lead Paint Inspection (days)", "all", "OP-L", 1],
    ["property_address", "text", "房产地址", "Property Address", "minimal", "2", 1], ["legal_description", "text", "法律描述", "Legal Description", "all", "2A", 1], ["exclusions", "text", "不含物品", "Exclusions", "all", "2D", 1], ["hoa_yes_no", "boolean", "HOA", "Subject to HOA", "standard", "6E · 36-11", 1], ["survey_new_or_existing", "text", "Survey", "Survey (new / existing T-47)", "standard", "6C", 1],
    ["addenda", "list", "附件清单", "Addenda checked", "all", "22", 1], ["commission_pct", "number", "佣金", "Commission %", "standard", "—", 1], ["referral_pct", "number", "推荐费", "Referral %", "all", "—", 1],
    ["rent", "money", "月租", "Monthly Rent", "minimal", "租约 3", 1], ["deposit", "money", "押金", "Security Deposit", "minimal", "租约 5", 1], ["lease_start", "date", "租约开始", "Lease Start", "minimal", "租约 2", 1], ["lease_end", "date", "租约到期", "Lease End", "minimal", "租约 2", 1], ["notice_days", "days", "续约 / 退租通知期", "Notice (days)", "standard", "租约 4", 1],
    // —— 影子样例里多出来的（core = 0）——
    ["leases", "text", "现有租约", "Leases", "all", "4", 0], ["title_policy_payer", "text", "产权保险谁付", "Title policy paid by", "all", "6A", 0], ["property_condition", "text", "房屋状况接受方式", "Property condition (as is)", "all", "7D", 0], ["residential_service_contract", "money", "Home warranty（卖方补贴）", "Residential service contract", "all", "7H", 0],
    ["brokers", "text", "经纪信息", "Broker information", "all", "8", 0], ["special_provisions", "text", "特别条款", "Special provisions", "all", "11", 0], ["buyer_broker_fee", "text", "买方经纪费（示例）", "Buyer broker fee", "all", "12A", 0], ["prorations", "text", "费用分摊", "Prorations", "all", "13", 0], ["notices_buyer", "text", "买方通知地址", "Notices to buyer", "all", "21", 0],
    ["option_fee_receipt", "text", "Option fee 收据", "Option fee receipt", "all", "收据页", 0], ["earnest_money_receipt_amount", "money", "Earnest money 收据金额", "Earnest money receipt amount", "all", "收据页", 0],
    ["list_price", "money", "挂牌价", "List price", "minimal", "3", 0], ["listing_term", "text", "挂牌期限", "Listing term", "minimal", "4", 0],
    ["applicant_names", "list", "申请人", "Applicant(s)", "minimal", "申请表 1", 0], ["requested_move_in", "date", "期望入住日", "Requested move-in", "minimal", "申请表 2", 0], ["requested_term", "number", "申请租期（月）", "Requested term (months)", "minimal", "申请表 2", 0], ["pet_summary", "text", "宠物", "Pets", "standard", "申请表 5", 0], ["vehicle_count", "number", "车辆", "Vehicles", "standard", "申请表 6", 0], ["income", "money", "月收入（申报）", "Stated monthly income", "standard", "申请表 4", 0],
    ["landlord_entity", "text", "房东（签约主体）", "Landlord", "minimal", "租约 1", 0], ["tenant_names", "list", "租客", "Tenant(s)", "minimal", "租约 1", 0], ["occupant_count", "number", "占用人数", "Occupants", "standard", "租约 1", 0], ["rent_due_day", "number", "交租日", "Rent due day", "standard", "租约 3", 0], ["late_fee_start_day", "number", "滞纳金起算日", "Late fee starts (day)", "standard", "租约 3", 0], ["late_fee", "text", "滞纳金", "Late fee", "standard", "租约 3", 0],
    ["utilities_tenant", "text", "租客付的水电", "Utilities paid by tenant", "standard", "租约 11", 0], ["utilities_landlord", "text", "房东付的水电", "Utilities paid by landlord", "standard", "租约 11", 0], ["pet_deposit", "money", "宠物押金", "Pet deposit", "standard", "宠物附录", 0],
  ].map(([key, type, zh, en, tier, para, core]) => ({ key, type, zh, en, tier, para, core: !!core }));

  // ===== v1.5 · 摘要语句（步骤 S1）的写法 =====
  // 占位符 {{key}} = 字段注册表里的 key，或 phrases.js NBPhrase.computed() 算出来的值（截止日 / 天数 / 比例 / net to seller …）；{{#if key}}…{{else}}…{{/if}} 可以嵌套，条件支持 key、key == 值、key != 值、key > 0。
  // audience：agent 只给自己 / 对方经纪 / Title / 贷款方看 · client 给客户看 · both 两边都能用；clientSafe: false（🔒）的句子进不了客户 App 的分组。
  const PH = (key, name, audience, dealType, zh, en, cond, extra) => Object.assign({ key, name, audience, dealType, zh, en, cond: cond || "", clientSafe: true, owner: "system", mergedFrom: [] }, extra || {});

  const SEED = {
    version: "v1.7",
    today: TODAY,
    ui: { lang: "zh", role: "agent", portalRole: "decision", theme: "system", seen: {}, fieldTier: null, mode: "guide", offline: false, vv: { cats: [], mode: "or", q: "", sel: null } },
    // v1.5（B-22）：ui 只放这个标签页自己的界面状态（语言 · 主题 · 展开的 tab · 模拟断网），不同步；要三端一致的设置放 settings（同步）——
    // 通知级别按人 · 客户视图透明度按交易 · 字段默认档按人（null = 跟着阶段包走）· 大字按人。读写走 shared.js 的 NBSet；真实版存在 agents.settings（jsonb）和 deals 上。
    settings: { notifyLevels: { u1: {}, u4: {} }, transparency: { d1: "tiered", d2: "tiered" }, fieldTierDefault: { u1: null, u4: null }, bigFont: {} },
    me: { id: "u1", name: "Jason", role: "agent", org: "org1", title: "Broker Associate" },
    org: {
      id: "org1", name: "NewBee Realty（示例机构）", license: "TREC #000000", broker: "Ann Broker", phone: "972-000-0000",
      // D31：账单 = 底价 $199（含 Broker 席位）+ 活跃席 $29 × N + 闲置席 $5 × N + AI 实际用量；活跃席 = 当月有 ≥ 1 笔活跃交易的经纪人（算法在 work.js NBOrg.bill）
      plan: { base: 199, active: 29, idle: 5 },
      aiBudget: 20, aiUsed: 6.4,
      members: [
        { id: "u1", name: "Jason", role: "agent", seat: "active", cap: 18000, capUsed: 12400, split: "80 / 20", deals: 5, lastLogin: d(0) },
        { id: "u2", name: "Lisa", role: "tc", seat: "idle", cap: 0, capUsed: 0, split: "—", deals: 0, lastLogin: d(-9) },
        { id: "u3", name: "Mike", role: "provisional", seat: "active", cap: 18000, capUsed: 2100, split: "70 / 30", deals: 2, lastLogin: d(-1) },
        { id: "u4", name: "Ann", role: "broker", seat: "included", cap: 0, capUsed: 0, split: "—", deals: 0, lastLogin: d(0) },
        { id: "u5", name: "Mary Liu", role: "agent", seat: "active", cap: 18000, capUsed: 6800, split: "80 / 20", deals: 3, lastLogin: d(0) },
      ],
    },
    // 团队（第 19 步）：一个机构里可以有团队；派给团队的任务谁先做算谁的
    team: { id: "team1", name: "Jason & Mary Team", lead: "u1", members: ["u1", "u5"] },
    // 交易成员（deal_members）：只有成员看得到这笔交易；没列的交易默认只有 Jason
    dealMembers: {
      d1: [{ user: "u1", role: "lead" }, { user: "u5", role: "co_agent" }, { user: "u2", role: "tc" }],
      d5: [{ user: "u5", role: "lead" }, { user: "u1", role: "co_agent" }],
      d7: [{ user: "u1", role: "lead" }, { user: "u5", role: "co_agent" }],
    },
    tiers: [
      { type: "classify", label: "文件分类 / 拆分", tier: 0 },
      { type: "extract", label: "合同字段抽取", tier: 1 },
      { type: "derive", label: "派生任务 / 收到日", tier: 1 },
      { type: "owners", label: "成交后写入产权人", tier: 1 },
      { type: "note", label: "记备注 / 建任务", tier: 2 },
      { type: "money_date", label: "钱 / 日期字段", tier: 2 },
      { type: "client_text", label: "给客户看的文字", tier: 2 },
      { type: "offer_version", label: "新 offer 版本", tier: 2 },
      { type: "cda", label: "CDA / 合规签核", tier: 3 },
      { type: "outbound", label: "发给 title / lender 的一切", tier: 3 },
    ],
    // v1.4（决定 45）：给经纪人的通知也分四级——1 立刻打断 · 2 攒一小时一批 · 3 每天一条汇总 · 4 只进列表不推；每人可调（settings.notifyLevels[人] 覆盖；真实版存在 agents.settings 里）
    notifyPolicy: [
      { key: "due_today", label: "今天截止的节点 / 任务", level: 1 }, { key: "money", label: "钱：到期 · 收到 · 电汇核实", level: 1 }, { key: "client_agreed", label: "客户点了同意 / 决定卡有答复", level: 1 }, { key: "negotiation", label: "谈判：对方 counter · Offer 到期", level: 1 }, { key: "conflict", label: "说法和数据打架（冲突卡）", level: 1 },
      { key: "showing_request", label: "约看申请：要我批的 / 等卖家批超时升级的", level: 1 }, // v1.7
      { key: "new_message", label: "新消息（客户 / 对方经纪）", level: 2 }, { key: "new_doc", label: "新文件到了（邮件侦测 / 客户上传）", level: 2 }, { key: "commitment_overdue", label: "对方答应的事到点没兑现", level: 2 },
      { key: "showing_declined", label: "约看被拒 / 过期", level: 2 }, // v1.7
      { key: "touch_due", label: "该问候的人 · 生日 · 周年", level: 3 }, { key: "tour_feedback", label: "看房反馈 · 看房完成", level: 3 }, { key: "feedback_ask", label: "看完 24 小时没反馈 · 去要反馈", level: 3 }, { key: "ai_done", label: "AI 已处理的清单（可撤销）", level: 3 }, // v1.7：feedback_ask
      { key: "showing_confirmed", label: "别人约看我的挂牌：约好了 / 自动确认", level: 4 }, // v1.7
      { key: "other", label: "其他（系统 · 统计 · 低置信字段）", level: 4 },
    ],
    notify: { maxPerDay: 1, quiet: "21:00–08:00", client: ["截止提醒（72h + 当日）", "钱：金额 · 收款方 · 截止"], family: "零推送（可自开）", advisor: "永不" },
    subscription: { tier: "专业", price: 49, aiCredits: 100, aiUsed: 38 },

    contacts: [
      { id: "c1", name: "陈先生", kind: "client", tags: ["买方", "决策人"], phone: "469-000-0001", wechat: "chen_w", birthday: "03-15", lang: "zh", source: "推荐", referredBy: "c12", channel: "微信", buyerRep: { signed: d(-30), expires: d(+150), doc: "Buyer Rep Agreement（陈）.pdf" }, notes: "偏好微信沟通" },
      { id: "c2", name: "陈太太", kind: "client", tags: ["买方", "决策人"], phone: "469-000-0002", wechat: "chen_tt", birthday: "11-02", lang: "zh", source: "推荐", channel: "微信" },
      { id: "c3", name: "陈小明", kind: "family", tags: ["子女"], born: 2012, lang: "zh" },
      { id: "c4", name: "王先生", kind: "client", tags: ["投资人", "买方", "房东"], phone: "469-000-0004", wechat: "wang_bp", lang: "zh", source: "微信", channel: "微信", buyerRep: { signed: d(-20), expires: d(+160), doc: "Buyer Rep Agreement（王）.pdf" }, lastTouch: d(-1) },
      { id: "c5", name: "李女士", kind: "client", tags: ["卖方", "决策人"], phone: "214-000-0005", wechat: "li_ms", birthday: "07-20", lang: "zh", source: "小红书", channel: "微信" },
      { id: "c6", name: "李先生", kind: "client", tags: ["卖方"], phone: "214-000-0006", lang: "zh", source: "小红书", channel: "电话" },
      { id: "c7", name: "张先生", kind: "client", tags: ["已成交"], phone: "972-000-0007", wechat: "zhang_h", birthday: "09-28", lang: "zh", source: "电话", channel: "微信", lastTouch: d(-45) },
      { id: "c8", name: "张太太", kind: "client", tags: ["已成交"], birthday: "05-05", lang: "zh", channel: "微信", lastTouch: d(-31) },
      { id: "c9", name: "刘先生", kind: "applicant", tags: ["租客申请人"], phone: "469-000-0009", lang: "zh", source: "微信", channel: "微信", notes: "申请 3690 Placeholder Ct（房东王先生的出租房）；一只小型犬 12 lb" },
      { id: "c10", name: "赵女士", kind: "client", stage: "prospect", tags: ["买方", "Offer 中"], phone: "214-000-0010", wechat: "zhao_y", lang: "zh", source: "推荐", referredBy: "c7", channel: "微信", buyerRep: { signed: d(-12), expires: d(+168), doc: "Buyer Rep Agreement.pdf" }, notes: "孩子 2027 高中毕业，只看 Frisco ISD" },
      { id: "c11", name: "孙女士", kind: "lead", tags: ["线索"], wechat: "sun_xhs", lang: "zh", source: "小红书", channel: "微信", notes: "小红书私信 → 加微信，想买 Frisco ISD 学区房，预算 60–70 万；还没签 Buyer Rep（看房模式会挡住）", lastTouch: d(-4) },
      { id: "c27", name: "吴先生", kind: "client", stage: "former", tags: ["不再是"], phone: "214-000-0027", lang: "zh", channel: "微信", notes: "2025 搬去休斯顿，已换经纪；节日问候即可", lastTouch: d(-200) },
      { id: "c28", name: "郑女士", kind: "lead", stage: "future", tags: ["未来"], wechat: "zheng_f", lang: "zh", source: "推荐", referredBy: "c5", channel: "微信", notes: "明年夏天孩子上学再买；先发学区资料", lastTouch: d(-10) },
      { id: "c29", name: "Ryan", kind: "lead", tags: ["Open House 登记"], lang: "en", source: "Open House", notes: "只留了名字，电话 / 邮箱 / 微信都没有" },
      { id: "c30", name: "Grace Lin", kind: "client", tags: ["租客"], phone: "469-000-0030", lang: "en", source: "朋友介绍", channel: "短信", notes: "4444 Template Trl 的租客（租约 75 天后到期）", lastTouch: d(-12) },
      { id: "c31", name: "Kevin Liu", kind: "lead", stage: "prospect", tags: ["寻租", "看房中"], phone: "469-000-0035", wechat: "kevin_l", lang: "zh", source: "推荐", referredBy: "c9", channel: "微信", notes: "公司搬来 Plano，12 月 1 日前要入住；预算 $2,400 以内，要两个车位", lastTouch: d(-1), tenantRep: { signed: d(-3), expires: d(+177), doc: "Tenant Rep Agreement（Kevin）.pdf" } },
      { id: "c32", name: "Ben Carter", kind: "client", tags: ["租客"], phone: "469-000-0034", lang: "en", source: "MLS", channel: "短信", notes: "2468 Model Way 的租客", lastTouch: d(-20) },
      { id: "c12", name: "周先生", kind: "client", tags: ["推荐人", "已成交 2021"], phone: "972-000-0012", wechat: "zhou_r", birthday: "12-01", lang: "zh", channel: "微信", cadence: 30, lastTouch: d(-33) },
      { id: "c13", name: "Amy Smith", kind: "agent", tags: ["对方经纪"], phone: "214-000-0013", org: "o4", licenseType: "sales_agent", lang: "en", channel: "邮件" },
      { id: "c14", name: "Lisa", kind: "tc", tags: ["TC"], phone: "469-000-0014", org: "o5", lang: "zh", channel: "微信" },
      { id: "c15", name: "Maria Lopez", kind: "title_lending", tags: ["Escrow Officer"], vcats: ["title"], phone: "972-000-0015", org: "o2", lang: "en", channel: "邮件" },
      { id: "c16", name: "Kevin Park", kind: "title_lending", tags: ["Loan Officer"], vcats: ["lender"], phone: "972-000-0016", org: "o3", lang: "en", channel: "邮件" },
      { id: "c17", name: "Tom Reyes", kind: "vendor", tags: ["验房师"], vcats: ["inspector"], phone: "469-000-0017", org: "o6", lang: "en", channel: "电话" },
      { id: "c18", name: "Bob Lee", kind: "agent", tags: ["对方经纪"], phone: "214-000-0018", org: "o4", licenseType: "sales_agent", lang: "en", channel: "邮件" },
      { id: "c20", name: "赵小雨", kind: "family", tags: ["子女"], born: 2009, lang: "zh" },
      { id: "c21", name: "Mike Chen", kind: "vendor", tags: [], vcats: ["plumber", "handyman"], phone: "469-000-0021", org: "o7", lang: "zh", channel: "微信", source: "Wise Agent Vendor List" },
      { id: "c22", name: "Sara Kim", kind: "vendor", tags: [], vcats: ["warranty"], phone: "214-000-0022", org: "o8", lang: "en", channel: "邮件", source: "Wise Agent Vendor List" },
      { id: "c23", name: "David Wu", kind: "vendor", tags: [], vcats: ["stager", "photographer"], phone: "972-000-0023", org: "o9", lang: "zh", channel: "微信" },
      { id: "c24", name: "Carlos Diaz", kind: "vendor", tags: [], vcats: ["electrician", "handyman"], phone: "469-000-0024", org: "o10", lang: "en", channel: "电话" },
      { id: "c25", name: "Nina Patel", kind: "vendor", tags: [], vcats: ["cleaner"], phone: "214-000-0025", org: "o11", lang: "en", channel: "短信" },
      { id: "c26", name: "Leo Zhang", kind: "vendor", tags: [], vcats: ["roofer"], phone: "972-000-0026", org: "o12", lang: "zh", channel: "微信", source: "Wise Agent Vendor List" },
      // v1.6：两位「业主想卖」的卖方线索——一个在争取中（林先生 · 9090 Pursuit Ct），一个落选了（何女士 · 2020 Bygone Dr）
      { id: "c33", name: "林先生", kind: "lead", stage: "prospect", tags: ["卖方线索", "业主"], phone: "214-000-0033", wechat: "lin_sell", lang: "zh", source: "推荐", referredBy: "c7", channel: "微信", cadence: 14, lastTouch: d(-6), notes: "9090 Pursuit Ct 的业主；想明年春天换大房，先要 CMA；我在争取这个 Listing" },
      { id: "c35", name: "何女士", kind: "lead", stage: "future", tags: ["卖方线索", "业主"], phone: "972-000-0035", wechat: "he_f", lang: "zh", source: "微信", channel: "微信", cadence: 180, lastTouch: d(-50), notes: "2020 Bygone Dr 的业主；2026-08 选了朋友的经纪挂牌（我方落选）；那份挂牌 6 个月到期前再联系" },
      // v1.7：7575 Showcase Ln 的卖方（看房不少、没有 Offer 的那套）
      { id: "c36", name: "马先生", kind: "client", tags: ["卖方", "决策人"], phone: "972-000-0036", wechat: "ma_sell", lang: "zh", source: "推荐", referredBy: "c12", channel: "微信", lastTouch: d(-1) },
    ],
    orgs: [
      { id: "o1", name: "Sample Holdings LLC", kind: "llc", formed: "2023-04", state: "TX" },
      { id: "o2", name: "Sample Title Co", kind: "title", phone: "972-000-0100" },
      { id: "o3", name: "Demo Mortgage", kind: "lender", phone: "972-000-0200" },
      { id: "o4", name: "Other Realty", kind: "brokerage" },
      { id: "o5", name: "NewBee Realty（示例机构）", kind: "brokerage" },
      { id: "o6", name: "Demo Home Inspections", kind: "vendor" },
      { id: "o7", name: "Demo Plumbing", kind: "vendor" },
      { id: "o8", name: "Sample Home Warranty", kind: "vendor" },
      { id: "o9", name: "Placeholder Staging", kind: "vendor" },
      { id: "o10", name: "Example Electric", kind: "vendor" },
      { id: "o11", name: "Demo Clean Co", kind: "vendor" },
      { id: "o12", name: "Sample Roofing", kind: "vendor" },
    ],
    links: [
      { from: "c1", to: "c2", kind: "spouse" }, { from: "c1", to: "c3", kind: "child" }, { from: "c1", to: "c4", kind: "business_partner" },
      { from: "c4", to: "o1", kind: "manager", share: 50 }, { from: "c1", to: "o1", kind: "member", share: 50 },
      { from: "c5", to: "c6", kind: "spouse" }, { from: "c7", to: "c8", kind: "spouse" }, { from: "c10", to: "c20", kind: "child" },
    ],
    properties: [
      { id: "p1", addr: "1234 Sample Dr", city: "Frisco", zip: "75035", mls: "20000001", beds: 4, baths: 3, sqft: 2860, year: 2016, lot: 0.18, hoa: 850, isd: "Frisco ISD", roof: 2016, hvac: 2016, notes: "买方交易中", target: false },
      { id: "p2", addr: "5678 Demo Ln", city: "Plano", zip: "75024", mls: "20000002", beds: 4, baths: 3.5, sqft: 3320, year: 2004, lot: 0.22, hoa: 600, isd: "Plano ISD", roof: 2021, hvac: 2019, notes: "我方挂牌", target: false },
      { id: "p3", addr: "910 Example Ct", city: "Allen", zip: "75013", mls: "20000003", beds: 3, baths: 2, sqft: 2140, year: 2009, lot: 0.16, hoa: 450, isd: "Allen ISD", roof: 2018, hvac: 2009, notes: "已成交 45 天", target: false },
      { id: "p4", addr: "2468 Model Way", city: "McKinney", zip: "75071", mls: "", beds: 3, baths: 2, sqft: 1980, year: 2019, lot: 0.14, hoa: 720, isd: "McKinney ISD", roof: 2019, hvac: 2019, notes: "LLC 持有 · 出租中", target: false },
      { id: "p5", addr: "1357 Prototype Blvd", city: "Frisco", zip: "75033", mls: "20000005", beds: 5, baths: 4, sqft: 3610, year: 2013, lot: 0.24, hoa: 900, isd: "Frisco ISD", roof: 2013, hvac: 2020, notes: "offer 落选 · 成交价 $628,000", target: false, relationship: "off_market" },
      { id: "p8", addr: "3690 Placeholder Ct", city: "Frisco", zip: "75035", mls: "20000008", beds: 3, baths: 2, sqft: 1890, year: 2015, lot: 0.13, hoa: 680, isd: "Frisco ISD", roof: 2015, hvac: 2015, notes: "王先生个人持有 · 出租挂牌 · 收申请中", target: false, criteria: { incomeX: 3, credit: 620, pets: "≤ 2 只 · 每只 ≤ 40 lb · 押金 $300 / 只", evictionYears: 7, other: "无欠租记录；每卧室 ≤ 2 人；不接受转租" } },
      // v1.6：目标房源（我在培养的业主）带 prospect = { reason 原因, moveFrom / moveTo 业主预计什么时候动（年-月）, every 多久联系一次（天）}；lastTouch / nextTouch 到点今天页出「该联系」（propfile.js NBPropFile.dueTargets）
      { id: "p6", addr: "4321 Wishlist Ave", city: "Frisco", zip: "75034", mls: "", beds: 4, baths: 3, sqft: 3050, year: 2011, lot: 0.2, hoa: 1100, isd: "Frisco ISD", roof: 2011, hvac: 2011, notes: "目标房源：业主孩子 2027 毕业，可能换房", target: true, relationship: "prospect", prospect: { reason: "业主家孩子 2027 年高中毕业，可能换房", moveFrom: "2027-06", moveTo: "2027-08", every: 180 }, lastTouch: d(-182), nextTouch: d(-2) },
      { id: "p9", addr: "8765 Pattern Pl", city: "Frisco", zip: "75035", mls: "20000009", beds: 4, baths: 3, sqft: 2980, year: 2015, lot: 0.19, hoa: 900, isd: "Frisco ISD", roof: 2015, hvac: 2015, notes: "赵女士的目标房第 1 名 · Offer 谈判中（对方 counter $598,000）", target: false, relationship: "watching" },
      { id: "p12", addr: "3333 Sample St", city: "Frisco", zip: "75034", mls: "20000012", beds: 4, baths: 3, sqft: 2700, year: 2014, lot: 0.18, hoa: 800, isd: "Frisco ISD", roof: 2014, hvac: 2014, notes: "孙女士明天看房第 1 站", target: false, relationship: "watching" },
      { id: "p13", addr: "6060 Placeholder Pkwy", city: "Frisco", zip: "75034", mls: "20000013", beds: 3, baths: 2.5, sqft: 2350, year: 2017, lot: 0.14, hoa: 950, isd: "Frisco ISD", roof: 2017, hvac: 2017, notes: "孙女士明天看房第 2 站 · 预约中", target: false },
      { id: "p14", addr: "1010 Draft Ln", city: "Plano", zip: "75025", mls: "20000014", beds: 3, baths: 2, sqft: 1850, year: 2010, lot: 0.13, hoa: 400, isd: "Plano ISD", roof: 2019, hvac: 2010, notes: "出租房源（对方挂牌）· Kevin 明天看 · $2,350 / 月", target: false, relationship: "watching" },
      { id: "p15", addr: "7700 Mock Dr", city: "Frisco", zip: "75033", mls: "20000015", beds: 4, baths: 2, sqft: 2500, year: 2005, lot: 0.2, hoa: 0, isd: "Frisco ISD", roof: 2005, hvac: 2012, notes: "赵女士上周看过 · 否（太旧）", target: false, relationship: "off_market" },
      { id: "p16", addr: "5050 Blueprint Blvd", city: "Frisco", zip: "75035", mls: "20000016", beds: 4, baths: 3, sqft: 2950, year: 2015, lot: 0.19, hoa: 850, isd: "Frisco ISD", roof: 2015, hvac: 2015, notes: "陈先生签约前看过 · 位置好但太贵", target: false, relationship: "off_market" },
      { id: "p10", addr: "2222 Mockup Ct", city: "Frisco", zip: "75033", mls: "20000010", beds: 3, baths: 2, sqft: 1760, year: 2012, lot: 0.12, hoa: 500, isd: "Frisco ISD", roof: 2012, hvac: 2018, notes: "王先生第二套投资房 · Offer 中（我方 $560,000 现金，等对方回复）", target: false },
      { id: "p11", addr: "4444 Template Trl", city: "Plano", zip: "75025", mls: "", beds: 4, baths: 2.5, sqft: 2410, year: 2008, lot: 0.17, hoa: 0, isd: "Plano ISD", roof: 2016, hvac: 2008, notes: "LLC 持有 · 出租中 · 租约 2.5 个月后到期", target: false },
      // v1.6：「业主想卖、我在争取 Listing」这条路——fields = 房源单 / 税务记录确认后多出来的格子（车库 · 层数 · 泳池 · 年税 · 学校 …），不在房源列里的都放这里
      { id: "p17", addr: "9090 Pursuit Ct", city: "Frisco", zip: "75035", mls: "", beds: 4, baths: 3, sqft: 3120, year: 2012, lot: 0.2, hoa: 950, isd: "Frisco ISD", roof: 2012, hvac: 2019, notes: "争取 Listing 中：业主明年春天想卖；10-06 上门谈过一次（CMA 下周给）", target: true, relationship: "prospect", prospect: { reason: "业主明年春天换大房（孩子上高中）", moveFrom: "2027-03", moveTo: "2027-05", every: 14 }, lastTouch: d(-6), nextTouch: d(+8), fields: { garage: 2, stories: 2, pool: "无", tax_annual: 9850, tax_year: 2025, elementary: "Sample Elem", middle: "Demo MS", high: "Placeholder HS" } },
      { id: "p18", addr: "2020 Bygone Dr", city: "Plano", zip: "75025", mls: "", beds: 3, baths: 2, sqft: 2210, year: 2008, lot: 0.16, hoa: 0, isd: "Plano ISD", roof: 2018, hvac: 2008, notes: "争取过的 Listing：业主 2026-08 选了别家（我方落选 · 撤回）；房源、业主、联系记录都留着，挂牌到期再联系", target: false, relationship: "off_market" },
      // v1.7：我方挂牌 · 看房不少但没有 Offer（定价信号「看房 N 场、没有 Offer」的示例）
      { id: "p19", addr: "7575 Showcase Ln", city: "Plano", zip: "75024", mls: "20000019", beds: 4, baths: 3, sqft: 2980, year: 2010, lot: 0.2, hoa: 700, isd: "Plano ISD", roof: 2019, hvac: 2010, notes: "我方挂牌 · 看房不少但没有 Offer", target: false },
    ],
    // 产权人：从 v1.6 起一行允许 owner: null + name（不是我的联系人、只存名字——税务记录里的前任业主，照手册 15b）；显示用 window.ownerLabel(o)
    owners: [
      { property: "p2", owner: "c5", share: 50, form: "夫妻共有", from: "2018-06-15", to: null, source: "deed" },
      { property: "p2", owner: "c6", share: 50, form: "夫妻共有", from: "2018-06-15", to: null, source: "deed" },
      { property: "p3", owner: "c7", share: 50, form: "夫妻共有", from: d(-45), to: null, source: "合同各方（AI 提议 · 已确认）" },
      { property: "p3", owner: "c8", share: 50, form: "夫妻共有", from: d(-45), to: null, source: "合同各方（AI 提议 · 已确认）" },
      { property: "p4", owner: "o1", share: 100, form: "LLC", from: "2023-05-20", to: null, source: "deed" },
      { property: "p8", owner: "c4", share: 100, form: "单独", from: "2021-11-03", to: null, source: "deed" },
      { property: "p17", owner: "c33", share: 100, form: "单独", from: "2019-07-18", to: null, source: "税务记录（Matrix · 已确认）" },
      { property: "p17", owner: null, name: "Davis, Mark & Lisa", share: 100, form: "夫妻共有", from: "2012-04-30", to: "2019-07-18", source: "税务记录（Matrix · 已确认）" },
      { property: "p18", owner: "c35", share: 100, form: "单独", from: "2016-10-05", to: null, source: "手填" },
      { property: "p19", owner: "c36", share: 100, form: "单独", from: "2015-03-10", to: null, source: "deed" },
    ],
    // v1.6：房源历史（真实版 property_history）：kind 只用九种 listed · price_change · pending · sold · leased · withdrawn · expired · cancelled · back_on_market；来自 Matrix History 报表 / 税务记录（确认后写入），时间线在 propfile.js NBPropFile.timeline
    propHistory: [
      { id: "ph1", property: "p17", at: "2012-04-30", kind: "sold", price: 315000, note: "新房成交（税务记录）", source: "税务记录", doc: "pd2" },
      { id: "ph2", property: "p17", at: "2019-05-02", kind: "listed", price: 389900, note: "History 报表", source: "History 报表", doc: "pd1" },
      { id: "ph3", property: "p17", at: "2019-06-01", kind: "price_change", price: 379900, note: "", source: "History 报表", doc: "pd1" },
      { id: "ph4", property: "p17", at: "2019-06-20", kind: "pending", price: null, note: "", source: "History 报表", doc: "pd1" },
      { id: "ph5", property: "p17", at: "2019-07-18", kind: "sold", price: 372000, note: "History 报表 · 税务记录转手", source: "History 报表", doc: "pd1" },
      { id: "ph6", property: "p18", at: "2016-10-05", kind: "sold", price: 298000, note: "History 报表", source: "History 报表", doc: "pd3" },
      { id: "ph7", property: "p18", at: "2026-08-20", kind: "listed", price: 459000, note: "别家挂牌（History 报表）", source: "History 报表", doc: "pd3" },
    ],
    // v1.6：只挂房源、不挂交易的文件（Matrix 导出的 PDF · 手机拍的照片）。影子里单独一份；真实版是同一张 documents 表加 property_id。status：review 还有待确认的行 · confirmed 都处理完了
    propDocs: [
      { id: "pd1", property: "p17", name: "Matrix History · 9090 Pursuit Ct.pdf", type: "mls_history", pages: 2, uploaded: d(-6), sourceKind: "text", status: "confirmed", source: "Jason 从 Matrix 导出" },
      { id: "pd2", property: "p17", name: "Matrix 税务记录 · 9090 Pursuit Ct.pdf", type: "tax_record", pages: 3, uploaded: d(-6), sourceKind: "text", status: "confirmed", source: "Jason 从 Matrix 导出" },
      { id: "pd3", property: "p18", name: "Matrix History · 2020 Bygone Dr.pdf", type: "mls_history", pages: 1, uploaded: d(-52), sourceKind: "text", status: "confirmed", source: "Jason 从 Matrix 导出" },
    ],
    deals: [
      // v1.3：type 决定用哪张路线图（buyer / seller / lessor / lessee）；stage 由路线图进度算出来（NBRoadmap.stageOf）；rm = 进度（pre 签约前已完成节点数 · lines 各线已完成节点数 · out 各线结果 · close 交割已完成节点数）
      // v1.5：没有 side 了（买 / 卖 / 租只看 type）；optionDays / financingDays 只是已确认字段 option_period_days / buyer_approval_days 的拷贝（字段才是源头，没有就没有日期）；primary = 我方客户；tplVersion = 建这笔交易时用的模板版本
      { id: "d1", type: "buyer", property: "p1", stage: "under_contract", title: "1234 Sample Dr · 买方", price: 515000, effective: d(-6), closing: d(+24), optionDays: 7, financingDays: 21, primary: "c1", created: d(-7), lastAction: d(0), priority: "high", tplVersion: "v1.2", rm: { pre: 5, lines: { A: 2, B: 2, C: 2, D: 1 }, out: {}, close: 0 } },
      // v1.7：showingApprover = 别的经纪约看这套挂牌时谁批（auto 自动确认 · me 我批 · seller 卖家 / 租客批）；没有这个字段的挂牌按 "me"（lshow.js NBLShow.approverOf）
      { id: "d2", type: "seller", property: "p2", stage: "offer", title: "5678 Demo Ln · 挂牌", price: 685000, listed: d(-21), primary: "c5", created: d(-25), lastAction: d(-1), priority: "high", showings: 9, tplVersion: "v1.1", rm: { pre: 3, lines: {}, out: {}, close: 0 }, showingApprover: "me" },
      { id: "d3", type: "buyer", property: "p3", stage: "closed", title: "910 Example Ct · 已成交", price: 445000, effective: d(-80), closing: d(-45), primary: "c7", created: d(-82), lastAction: d(-3), priority: "low", tplVersion: "v1.2", rm: { pre: 5, lines: { A: 3, B: 3, C: 3, D: 3 }, out: { A: "ok", B: "ok", C: "ok", D: "ok" }, close: 3 } },
      { id: "d4", type: "lessor", property: "p4", stage: "active", title: "2468 Model Way · 租赁", price: 2650, leaseStart: d(-60), leaseEnd: d(+305), primary: "c4", landlordOrg: "o1", created: d(-70), lastAction: d(-20), priority: "low", tplVersion: "v1.0", rm: { pre: 5, lines: { A: 3, B: 3 }, out: { A: "ok", B: "ok" }, close: 2 } },
      { id: "d7", type: "lessor", property: "p8", stage: "listed", title: "3690 Placeholder Ct · 出租", price: 2400, listed: d(-9), availableFrom: d(+12), primary: "c4", created: d(-10), lastAction: d(-1), priority: "medium", showings: 4, tplVersion: "v1.0", rm: { pre: 3, lines: {}, out: {}, close: 0 }, showingApprover: "seller" },
      { id: "d8", type: "buyer", property: "p10", stage: "offer", title: "2222 Mockup Ct · 买方", price: 560000, primary: "c4", created: d(-1), lastAction: d(-1), priority: "medium", tplVersion: "v1.2", rm: { pre: 3, lines: {}, out: {}, close: 0 } },
      { id: "d9", type: "lessor", property: "p11", stage: "active", title: "4444 Template Trl · 租赁", price: 2350, leaseStart: d(-290), leaseEnd: d(+75), primary: "c4", landlordOrg: "o1", created: d(-300), lastAction: d(-15), priority: "medium", tplVersion: "v1.0", rm: { pre: 5, lines: { A: 3, B: 3 }, out: { A: "ok", B: "ok" }, close: 2 } },
      { id: "d5", type: "buyer", property: "p9", stage: "offer", title: "8765 Pattern Pl · 买方", price: 598000, primary: "c10", created: d(-16), lastAction: d(0), priority: "high", tplVersion: "v1.2", rm: { pre: 3, lines: {}, out: {}, close: 0 } },
      { id: "d10", type: "lessee", property: null, stage: "prospecting", title: "Kevin Liu · 寻租", price: 2400, primary: "c31", created: d(-3), lastAction: d(-1), priority: "medium", tplVersion: "v1.0", rm: { pre: 1, lines: {}, out: {}, close: 0 } },
      // v1.6：争取 Listing——卖方交易落在「上市前」，第一步「上市委托协议」没完成 = 还在争取（d12；d10 已经是 Kevin Liu 的寻租）；没拿到就标「落选 · 撤回」（d11），房源 / 业主 / 联系记录都留着
      { id: "d12", type: "seller", property: "p17", stage: "pre_listing", title: "9090 Pursuit Ct · 挂牌", price: 0, primary: "c33", created: d(-6), lastAction: d(-6), priority: "medium", tplVersion: "v1.1", rm: { pre: 0, lines: {}, out: {}, close: 0 } },
      { id: "d11", type: "seller", property: "p18", stage: "lost", title: "2020 Bygone Dr · 挂牌", price: 0, primary: "c35", created: d(-70), lastAction: d(-50), priority: "low", tplVersion: "v1.1", endedFrom: { stage: "pre_listing", at: d(-50) }, rm: { pre: 0, lines: {}, out: {}, close: 0 } },
      // v1.7：挂牌 20 天、看完 7 场、没有 Offer——定价信号「看房不少、没有 Offer」的示例；约看自动确认（只记不推）
      { id: "d13", type: "seller", property: "p19", stage: "listed", title: "7575 Showcase Ln · 挂牌", price: 489000, listed: d(-20), primary: "c36", created: d(-24), lastAction: d(-1), priority: "medium", showings: 7, tplVersion: "v1.1", rm: { pre: 3, lines: {}, out: {}, close: 0 }, showingApprover: "auto" },
    ],
    parties: [
      { deal: "d1", party: "c1", type: "person", role: "买方", side: "ours", primary: true, signer: true },
      { deal: "d1", party: "c2", type: "person", role: "买方", side: "ours", signer: true },
      { deal: "d1", party: "c14", type: "person", role: "TC", side: "ours" },
      { deal: "d1", party: null, name: "Smith Family Trust", type: "org_external", role: "卖方", side: "theirs", signer: true },
      { deal: "d1", party: "c13", type: "person", role: "卖方经纪", side: "theirs" },
      { deal: "d1", party: "c15", type: "person", role: "Escrow Officer", side: "neutral" },
      { deal: "d1", party: "c16", type: "person", role: "Loan Officer", side: "neutral" },
      { deal: "d1", party: "c17", type: "person", role: "验房师", side: "neutral" },
      { deal: "d2", party: "c5", type: "person", role: "卖方", side: "ours", primary: true, signer: true },
      { deal: "d2", party: "c6", type: "person", role: "卖方", side: "ours", signer: true },
      { deal: "d2", party: "c18", type: "person", role: "买方经纪（offer 1）", side: "theirs" },
      { deal: "d3", party: "c7", type: "person", role: "买方", side: "ours", primary: true, signer: true },
      { deal: "d3", party: "c8", type: "person", role: "买方", side: "ours", signer: true },
      { deal: "d3", party: "c15", type: "person", role: "Escrow Officer", side: "neutral" },
      { deal: "d3", party: "c21", type: "person", role: "水管工", side: "neutral" },
      { deal: "d3", party: "c22", type: "person", role: "房屋保修 Warranty", side: "neutral" },
      { deal: "d2", party: "c23", type: "person", role: "软装 Staging", side: "neutral" },
      { deal: "d2", party: "c25", type: "person", role: "清洁", side: "neutral" },
      { deal: "d4", party: "c24", type: "person", role: "电工", side: "neutral" },
      { deal: "d4", party: "c21", type: "person", role: "杂工 Handyman", side: "neutral" },
      { deal: "d4", party: "o1", type: "org", role: "房东（签约主体）", side: "ours", signer: true },
      { deal: "d4", party: "c4", type: "person", role: "房东（LLC 经理）", side: "ours", primary: true },
      { deal: "d4", party: "c32", type: "person", role: "租客", side: "theirs", signer: true },
      { deal: "d5", party: "c10", type: "person", role: "买方", side: "ours", primary: true, signer: true },
      { deal: "d5", party: "c13", type: "person", role: "卖方经纪", side: "theirs" },
      { deal: "d7", party: "c4", type: "person", role: "房东", side: "ours", primary: true, signer: true },
      { deal: "d7", party: "c9", type: "person", role: "租客申请人", side: "theirs", signer: true },
      { deal: "d8", party: "c4", type: "person", role: "买方", side: "ours", primary: true, signer: true },
      { deal: "d10", party: "c31", type: "person", role: "租客（寻租）", side: "ours", primary: true, signer: true },
      { deal: "d9", party: "o1", type: "org", role: "房东（签约主体）", side: "ours", signer: true }, { deal: "d9", party: "c4", type: "person", role: "房东（LLC 经理）", side: "ours", primary: true }, { deal: "d9", party: "c30", type: "person", role: "租客", side: "theirs", signer: true },
      { deal: "d12", party: "c33", type: "person", role: "卖方", side: "ours", primary: true, signer: true },
      { deal: "d11", party: "c35", type: "person", role: "卖方", side: "ours", primary: true, signer: true },
      { deal: "d13", party: "c36", type: "person", role: "卖方", side: "ours", primary: true, signer: true },
    ],
    documents: [
      // v1.5（扫描件 · 步骤 4h）：sourceKind = text 电子版（有文字层）· scan 扫描 · photo 手机拍照；扫描 / 拍照先预处理（prep）再抽取。类型名用这里这一套（lease · pet_agreement · income_docs …），上传记录也是这个形状。
      { id: "doc1", deal: "d1", name: "Contract.pdf", pages: 26, type: "bundle", uploaded: d(-7), sha: "9f3c…a1", locked: false, sourceKind: "text", children: [
        { name: "TREC 20-19 One to Four Family Residential Contract", type: "trec_1_4", pages: "1–11", tv: "trec-20 @ 20-19" },
        { name: "Third Party Financing Addendum (40-11)", type: "financing_addendum", pages: "12–13", tv: "trec-40 @ 40-11" },
        { name: "Addendum for Mandatory HOA (36-11)", type: "hoa_addendum", pages: "14–15", tv: "trec-36 @ 36-11" },
        { name: "Seller's Disclosure Notice", type: "sellers_disclosure", pages: "16–22" },
        { name: "Earnest Money Receipt", type: "em_receipt", pages: "23" },
        { name: "Option Fee Receipt", type: "option_receipt", pages: "24" },
        { name: "Information About Brokerage Services (IABS)", type: "iabs", pages: "25" },
        { name: "Consumer Protection Notice", type: "cpn", pages: "26" },
      ] },
      { id: "doc2", deal: "d1", name: "Title Commitment.pdf", pages: 14, type: "title_commitment", uploaded: d(-2), sha: "4b7e…c9", locked: false, sourceKind: "text", source: "邮件侦测（Sample Title）" },
      { id: "doc3", deal: "d1", name: "Inspection Report.pdf", pages: 48, type: "inspection_report", uploaded: d(-3), sha: "77d1…0e", locked: false, sourceKind: "text" },
      { id: "doc4", deal: "d1", name: "Amendment.pdf", pages: 2, type: "amendment", uploaded: d(-1), sha: "e0a9…52", locked: false, sourceKind: "scan", prep: PREP, source: "双方手签后扫描（成交价手写改成 $515,000）" },
      { id: "doc14", deal: "d1", name: "Survey.pdf", pages: 3, type: "survey", uploaded: d(0), sha: "6d2b…8c", locked: false, sourceKind: "text", source: "邮件侦测（Sample Title）· T1 自动归档" },
      { id: "doc15", deal: "d1", name: "Pre-approval letter.pdf", pages: 2, type: "preapproval", uploaded: d(-12), sha: "2a9e…41", locked: false, sourceKind: "text", source: "Demo Mortgage（Kevin Park）" },
      { id: "doc5", deal: "d3", name: "Closing Package.pdf", pages: 63, type: "bundle", uploaded: d(-45), sha: "1c2d…77", locked: true, sourceKind: "text", retention: `${YEAR + 4}-` + d(-45).slice(5) },
      { id: "doc8", deal: "d4", name: "Lease.pdf", pages: 16, type: "lease", uploaded: d(-62), sha: "c1a0…77", locked: true, sourceKind: "text", source: "签约版本 · TXR-2001", tv: "txr-2001 @ 2001" },
      { id: "doc9", deal: "d4", name: "房东书面租客标准.pdf", pages: 2, type: "tenant_criteria", uploaded: d(-70), sha: "e93b…02", locked: false, sourceKind: "text", source: "§92.3515 书面标准" },
      { id: "doc10", deal: "d7", name: "Application.pdf", pages: 4, type: "lease_application", uploaded: d(-2), sha: "0f9d…5a", locked: false, sourceKind: "photo", prep: PREP, source: "申请人手机拍照提交（客户 App）", retention: d(+58) + "（申请 60 天后自动删）" },
      { id: "doc11", deal: "d7", name: "Pet Agreement 草稿.pdf", pages: 2, type: "pet_agreement", uploaded: d(-1), sha: "77ab…1e", locked: false, sourceKind: "text", source: "经纪人起草" },
      { id: "doc12", deal: "d5", name: "Buyer Rep Agreement.pdf", pages: 8, type: "buyer_rep", uploaded: d(-12), sha: "51c2…9b", locked: true, sourceKind: "text", source: "签约版本" },
      { id: "doc13", deal: "d5", name: "Offer v2（落选）.pdf", pages: 11, type: "offer", uploaded: d(-13), sha: "b4e1…c3", locked: true, sourceKind: "text", source: "我方 offer · 对方选了更高价" },
      { id: "doc6", deal: "d2", name: "Listing Agreement.pdf", pages: 12, type: "listing_agreement", uploaded: d(-25), sha: "aa10…3f", locked: false, sourceKind: "text" },
      { id: "doc7", deal: "d2", name: "Seller's Disclosure.pdf", pages: 7, type: "sellers_disclosure", uploaded: d(-24), sha: "b5c1…9d", locked: false, sourceKind: "text" },
    ],
    fields: {
      // v1.5：key 用真实字段名（window.NB_FIELDS 里 core = 1 的照 deal-fields.ts）。src = 这一格是怎么填的：typed 打印 · handwritten 手写 · checkbox 勾选（缺省 typed）；docKind = 来自哪种文件（缺省 text）。
      // 钱和日期的行带 crop（裁图：页码 + 原文）——文件末尾统一补，影子里画成一张小纸条。扫描 / 手写 / 拍照来源不管置信度多高都按低置信处理、逐条确认（NBExtract.isLowSource）。
      d2: [
        { key: "seller_names", tier: "minimal", para: "1", label: "卖方", value: "李女士、李先生", page: 1, quote: "Seller: Li, Mei and Li, Jun", conf: 0.98, status: "confirmed", v: 1 },
        { key: "list_price", tier: "minimal", para: "3", label: "挂牌价", value: "$685,000", page: 1, quote: "Listing Price: $685,000", conf: 0.99, status: "confirmed", v: 1 },
        { key: "listing_term", tier: "minimal", para: "4", label: "挂牌期限", value: d(-25) + " → " + d(+155), page: 2, quote: "Term: ... through 6 months", conf: 0.96, status: "confirmed", v: 1 },
        { key: "commission_pct", tier: "standard", para: "5", label: "佣金", value: "3% + 买方经纪 3%", page: 2, quote: "Broker fee: 3% ...", conf: 0.97, status: "confirmed", v: 1 },
        { key: "hoa_yes_no", tier: "standard", para: "6", label: "强制 HOA", value: "是（Demo Park HOA）", page: 3, quote: "Mandatory HOA: Yes", conf: 0.95, status: "confirmed", v: 1, src: "checkbox" },
      ],
      d7: [
        { key: "applicant_names", tier: "minimal", para: "申请表 1", label: "申请人", value: "刘先生", page: 1, quote: "Applicant: Liu, Wei", conf: 0.99, status: "confirmed", v: 1, docKind: "photo" },
        { key: "requested_move_in", tier: "minimal", para: "申请表 2", label: "期望入住日", value: d(+12), page: 1, quote: "Desired move-in: " + d(+12), conf: 0.97, status: "confirmed", v: 1, src: "handwritten", docKind: "photo" },
        { key: "requested_term", tier: "minimal", para: "申请表 2", label: "申请租期", value: "12 个月", page: 1, quote: "Lease term requested: 12 months", conf: 0.96, status: "confirmed", v: 1, docKind: "photo" },
        { key: "rent", tier: "minimal", para: "申请表 2", label: "月租", value: "$2,400", page: 1, quote: "Monthly rent: $2,400", conf: 0.99, status: "confirmed", v: 1, docKind: "photo" },
        { key: "vehicle_count", tier: "standard", para: "申请表 6", label: "车辆", value: "1 辆", page: 3, quote: "Vehicles: 1", conf: 0.95, status: "confirmed", v: 1, docKind: "photo" },
        { key: "pet_summary", tier: "standard", para: "申请表 5", label: "宠物", value: "小型犬 1 只（12 lb）", page: 2, quote: "Pets: 1 dog, 12 lb", conf: 0.92, status: "pending", v: 1, src: "handwritten", docKind: "photo" },
        { key: "income", tier: "standard", para: "申请表 4", label: "月收入（申报）", value: "$8,200", page: 2, quote: "Monthly income: 8,200", conf: 0.86, status: "pending", v: 1, src: "handwritten", docKind: "photo" },
      ],
      d4: [
        { key: "landlord_entity", tier: "minimal", para: "租约 1", label: "房东（签约主体）", value: "Sample Holdings LLC", page: 1, quote: "Landlord: Sample Holdings LLC", conf: 0.98, status: "confirmed", v: 1 },
        { key: "tenant_names", tier: "minimal", para: "租约 1", label: "租客", value: "Ben Carter", page: 1, quote: "Tenant: Ben Carter", conf: 0.98, status: "confirmed", v: 1 },
        { key: "occupant_count", tier: "standard", para: "租约 1", label: "占用人数", value: "2 人", page: 1, quote: "Occupants: 2", conf: 0.95, status: "confirmed", v: 1 },
        { key: "rent", tier: "minimal", para: "租约 3", label: "月租", value: "$2,650", page: 2, quote: "Monthly Rent: $2,650.00", conf: 0.99, status: "confirmed", v: 1 },
        { key: "lease_start", tier: "minimal", para: "租约 2", label: "租约开始", value: d(-60), page: 1, quote: "Commencement Date: " + d(-60), conf: 0.97, status: "confirmed", v: 1 },
        { key: "lease_end", tier: "minimal", para: "租约 2", label: "租约到期", value: d(+305), page: 1, quote: "Expiration Date: " + d(+305), conf: 0.97, status: "confirmed", v: 1 },
        { key: "deposit", tier: "minimal", para: "租约 5", label: "押金", value: "$2,650", page: 3, quote: "Security Deposit: $2,650.00", conf: 0.98, status: "confirmed", v: 1 },
        { key: "rent_due_day", tier: "standard", para: "租约 3", label: "交租日", value: "每月 1 日", page: 2, quote: "due on the first day of each month", conf: 0.96, status: "confirmed", v: 1 },
        { key: "late_fee_start_day", tier: "standard", para: "租约 3", label: "滞纳金起算日", value: "3 日", page: 2, quote: "not received by 11:59 p.m. on the 3rd day", conf: 0.93, status: "confirmed", v: 1 },
        { key: "late_fee", tier: "standard", para: "租约 3", label: "滞纳金", value: "$75 + $25 / 日", page: 2, quote: "initial late charge $75 … daily late charge $25", conf: 0.93, status: "confirmed", v: 1 },
        { key: "utilities_tenant", tier: "standard", para: "租约 11", label: "租客付的水电", value: "水 · 电 · 燃气 · 网络", page: 6, quote: "Tenant will pay all utilities except …", conf: 0.92, status: "confirmed", v: 1 },
        { key: "utilities_landlord", tier: "standard", para: "租约 11", label: "房东付的水电", value: "HOA · 垃圾", page: 6, quote: "… except: HOA dues, trash", conf: 0.9, status: "confirmed", v: 1 },
        { key: "notice_days", tier: "standard", para: "租约 4", label: "续约 / 退租通知期", value: "30 天", page: 2, quote: "written notice at least 30 days before the Expiration Date", conf: 0.95, status: "confirmed", v: 1 },
      ],
      d1: [
        { key: "buyer_names", tier: "minimal", para: "1", label: "买方", value: "陈先生、陈太太", page: 1, quote: "Buyer: Chen, Wei and Chen, Li", conf: 0.98, status: "confirmed", v: 1 },
        { key: "seller_names", tier: "minimal", para: "1", label: "卖方", value: "Smith Family Trust", page: 1, quote: "Seller: Smith Family Trust", conf: 0.97, status: "confirmed", v: 1 },
        { key: "sales_price", tier: "minimal", para: "3C", label: "成交价", value: "$515,000", page: 1, quote: "Amendment: Sales Price is changed to $515,000", conf: 0.99, status: "confirmed", v: 2, src: "handwritten", docKind: "scan", history: [{ v: 1, value: "$520,000", page: 2, quote: "Sales Price … $520,000.00", by: "Jason", at: d(-6), source: "Contract.pdf" }, { v: 2, value: "$515,000", page: 1, quote: "Amendment: Sales Price is changed to $515,000", by: "Jason", at: d(-1), source: "Amendment.pdf", note: "验房后修理谈判：减 $5,000 代替修屋顶" }] },
        { key: "cash_portion", tier: "standard", para: "3A", label: "现金部分（首付）", value: "$103,000", page: 1, quote: "Amendment: cash portion of Sales Price … $103,000", conf: 0.97, status: "confirmed", v: 2, src: "handwritten", docKind: "scan", history: [{ v: 1, value: "$108,000", page: 2, quote: "Cash portion of Sales Price … $108,000.00", by: "Jason", at: d(-6), source: "Contract.pdf" }, { v: 2, value: "$103,000", page: 1, quote: "Amendment: cash portion … $103,000", by: "Jason", at: d(-1), source: "Amendment.pdf", note: "成交价减 $5,000，贷款额不变" }] },
        { key: "loan_amount", tier: "standard", para: "3B · 40-11 A", label: "贷款额", value: "$412,000", page: 12, quote: "in the principal amount of $412,000", conf: 0.9, status: "confirmed", v: 1 },
        { key: "loan_type", tier: "minimal", para: "40-11", label: "贷款类型", value: "Conventional", page: 12, quote: "Third Party Financing Addendum … conventional financing", conf: 0.93, status: "confirmed", v: 1, src: "checkbox" },
        { key: "earnest_money", tier: "minimal", para: "5A", label: "Earnest Money", value: "$5,000", page: 2, quote: "Earnest Money: $5,000", conf: 0.99, status: "confirmed", v: 1 },
        { key: "option_fee", tier: "minimal", para: "5B", label: "Option Fee", value: "$500", page: 2, quote: "Option Fee: $500", conf: 0.98, status: "confirmed", v: 1 },
        { key: "option_period_days", tier: "minimal", para: "5B", label: "Option 天数", value: "7 天", page: 2, quote: "within 7 days after the Effective Date", conf: 0.96, status: "confirmed", v: 1 },
        { key: "effective_date", tier: "minimal", para: "签名页", label: "生效日", value: d(-6), page: 9, quote: "Effective Date: " + d(-6), conf: 0.95, status: "confirmed", v: 1, src: "handwritten" },
        { key: "closing_date", tier: "minimal", para: "9A", label: "过户日", value: d(+24), page: 5, quote: "The closing of the sale will be on or before " + d(+24), conf: 0.94, status: "confirmed", v: 1 },
        { key: "buyer_approval_days", tier: "standard", para: "40-11 2A", label: "贷款审批天数", value: "21 天", page: 12, quote: "within 21 days after the Effective Date", conf: 0.92, status: "confirmed", v: 1 },
        { key: "title_company", tier: "minimal", para: "6A · 18", label: "产权公司", value: "Sample Title Co（Maria Lopez）", page: 3, quote: "Title Company: Sample Title Co", conf: 0.97, status: "confirmed", v: 1 },
        { key: "survey_new_or_existing", tier: "standard", para: "6C", label: "Survey", value: "买方新做", page: 3, quote: "Buyer shall obtain a new survey", conf: 0.88, status: "confirmed", v: 1, src: "checkbox" },
        { key: "survey_days", tier: "standard", para: "6C", label: "Survey 交付天数", value: "20 天", page: 3, quote: "within 20 days after the Effective Date", conf: 0.9, status: "confirmed", v: 1 },
        { key: "hoa_yes_no", tier: "standard", para: "6E · 36-11", label: "HOA", value: "有 · 卖方付 resale cert", page: 14, quote: "Mandatory Owners' Association … Seller shall pay", conf: 0.9, status: "confirmed", v: 1, src: "checkbox" },
        { key: "seller_concessions", tier: "standard", para: "12A(1)(b)", label: "卖方付费用", value: "$0", page: 4, quote: "Seller shall pay … $0", conf: 0.85, status: "confirmed", v: 1 },
        { key: "appraisal_waiver", tier: "standard", para: "40-11 B", label: "放弃估价条件", value: "否 · 保留估价条件（贷款附录）", page: 13, quote: "…if the Property does not satisfy the lender's underwriting requirements", conf: 0.82, status: "confirmed", v: 1, src: "checkbox" },
        { key: "possession", tier: "standard", para: "10A", label: "交房", value: "过户当天 · 无 leaseback", page: 4, quote: "upon closing and funding", conf: 0.96, status: "confirmed", v: 1, src: "checkbox" },
        // 全部档才露出的（没放进任何 tab，按表单段号排）+ 一条“本版无此项”示例
        { key: "legal_description", tier: "all", para: "2A", label: "法律描述", value: "Lot 12, Block C, Sample Addition", page: 1, quote: "Lot 12, Block C, Sample Addition, Collin County", conf: 0.97, status: "confirmed", v: 1 },
        { key: "exclusions", tier: "all", para: "2D", label: "不含物品", value: "无", page: 1, quote: "EXCLUSIONS: (none)", conf: 0.9, status: "confirmed", v: 1 },
        { key: "leases", tier: "all", para: "4", label: "现有租约", value: "无", page: 2, quote: "LEASES: … not subject to any leases", conf: 0.92, status: "confirmed", v: 1 },
        { key: "earnest_money_due_days", tier: "all", para: "5A", label: "EM 递交天数", value: "3 天", page: 2, quote: "within 3 days after the Effective Date", conf: 0.99, status: "confirmed", v: 1 },
        { key: "title_policy_payer", tier: "all", para: "6A", label: "产权保险谁付", value: "卖方", page: 3, quote: "at Seller's expense an owner policy of title insurance", conf: 0.94, status: "confirmed", v: 1, src: "checkbox" },
        { key: "property_condition", tier: "all", para: "7D", label: "房屋状况接受方式", value: "As Is（现状）", page: 5, quote: "Buyer accepts the Property As Is", conf: 0.95, status: "confirmed", v: 1, src: "checkbox" },
        { key: "residential_service_contract", tier: "all", para: "7H", label: "Home warranty（卖方补贴）", value: "$600", page: 5, quote: "Seller shall reimburse Buyer … not exceeding $600", conf: 0.91, status: "confirmed", v: 1 },
        { key: "brokers", tier: "all", para: "8", label: "经纪信息", value: "Listing：Other Realty（Amy Smith）· Other：NewBee Realty（Jason）", page: 9, quote: "BROKER INFORMATION", conf: 0.96, status: "confirmed", v: 1 },
        { key: "special_provisions", tier: "all", para: "11", label: "特别条款", value: "无", page: 6, quote: "SPECIAL PROVISIONS: (blank)", conf: 0.89, status: "confirmed", v: 1 },
        { key: "buyer_broker_fee", tier: "all", para: "12A", label: "买方经纪费（示例）", absent: true, note: "示例：spec 里有这个 key（来自另一版模板），本版表单上没有这一格 → 显示“本版无此项”，不算缺失、不派生。" },
        { key: "prorations", tier: "all", para: "13", label: "费用分摊", value: "按过户日分摊：税 · HOA · 租金", page: 6, quote: "Taxes … will be prorated through the Closing Date", conf: 0.9, status: "confirmed", v: 1 },
        { key: "notices_buyer", tier: "all", para: "21", label: "买方通知地址", value: "邮件 chen_w@example.com", page: 9, quote: "To Buyer at: … chen_w@example.com", conf: 0.88, status: "confirmed", v: 1 },
        { key: "addenda", tier: "all", para: "22", label: "附件清单", value: "40-11 贷款附录 · 36-11 HOA 附录 · Seller's Disclosure", page: 9, quote: "AGREEMENT OF PARTIES … addenda which are a part of this contract", conf: 0.95, status: "confirmed", v: 1, src: "checkbox" },
        { key: "hoa_docs_delivery_days", tier: "all", para: "36-11 A", label: "HOA 文件送达天数", value: "10 天", page: 14, quote: "Within 10 days after the effective date … Subdivision Information", conf: 0.93, status: "confirmed", v: 1 },
        { key: "hoa_termination_days", tier: "all", para: "36-11 A", label: "HOA 终止权天数", value: "3 天", page: 14, quote: "Buyer may terminate the contract within 3 days after Buyer receives the Subdivision Information", conf: 0.93, status: "confirmed", v: 1 },
        { key: "lender", tier: "all", para: "40-11", label: "贷款方", value: "Demo Mortgage（Kevin Park）", page: 12, quote: "Lender: Demo Mortgage", conf: 0.95, status: "confirmed", v: 1 },
        { key: "earnest_money_receipt_amount", tier: "all", para: "收据页", label: "Earnest money 收据金额", value: "$5,000", page: 23, quote: "EARNEST MONEY RECEIPT … $5,000 … received " + d(-3), conf: 0.93, status: "confirmed", v: 1 },
        { key: "option_fee_receipt", tier: "all", para: "收据页", label: "Option fee 收据", value: "已收 $500 · " + d(-3), page: 24, quote: "OPTION FEE RECEIPT … $500 … received", conf: 0.9, status: "confirmed", v: 1 },
      ],
    },
    // 每笔交易识别出的模板 @ 版本（documents.template_id / form_version → deals.template_version）；样例合同是 TREC 20-19 / 36-11 / 40-11
    fieldMeta: {
      d1: { template: "trec-20", version: "20-19", state: "registered", spec: "forms-spec 2026-09-21", note: "页脚 TREC NO. 20-19 → 别名表 → trec-20 @ 20-19 · 已登记 → 用它的模板抽" },
      d4: { template: "txr-2001", version: "2001", state: "registered", spec: "forms-spec 2026-09-21", note: "TXR-2001 Residential Lease · 已登记" },
    },
    explain: {
      d2: [
        { key: "list_price", zh: "挂牌价 $685,000；实际成交价以买家 offer 和您签的合同为准。", en: "Listing price is $685,000; the final price is set by the accepted offer." },
        { key: "listing_term", zh: "挂牌期 6 个月；期内经我们成交都按协议付佣金。", en: "6-month listing term; commission applies to sales during the term." },
        { key: "commission_pct", zh: "总佣金 6%：3% 给我们，3% 给买方经纪，过户时从房款里扣。", en: "Total 6%: 3% listing side, 3% buyer side, paid at closing from proceeds." },
        { key: "hoa_yes_no", zh: "强制 HOA：买家拿到 HOA 文件后有几天可以因文件内容退出，所以 resale certificate 要早点备好。", en: "Mandatory HOA: the buyer may terminate within a few days after receiving the HOA documents." },
      ],
      d1: [
        { key: "option_period_days", zh: "从生效日起 7 天内（到 " + d(+1) + " 下午 5 点，周末不顺延），您可以因任何理由终止合同，只损失 $500 的 option fee，earnest money 全退。过了这一天再终止，$5,000 可能拿不回来。", en: "Within 7 days of the effective date you may terminate for any reason and forfeit only the $500 option fee." },
        { key: "earnest_money", zh: "$5,000 交给产权公司 Sample Title 保管，不是给卖家。顺利过户时算进您的首付；在 option 期内终止可全额退回。", en: "Held by the title company; credited to you at closing." },
        { key: "closing_date", zh: "预计 " + d(+24) + " 过户。前一两天您要电汇首付和过户费——收款账户只以电话向 Maria（972-000-0100）核实，任何邮件里的账户信息都不要信。", en: "Wire only after phone-verifying the account with the title company." },
        { key: "survey_new_or_existing", zh: "买方要在 20 天内做一份新的地界测量图（约 $450–600），用来确认围栏、车道有没有越界。", en: "A new survey confirms boundaries and encroachments." },
        { key: "hoa_yes_no", zh: "这个小区有强制 HOA，每年约 $850。卖家负责付 resale certificate；HOA 文件送到您手上后，您有 3 天可以因 HOA 文件内容终止合同。", en: "Mandatory HOA; you may terminate within 3 days of receiving HOA documents." },
      ],
    },
    milestones: {
      d8: [], d10: [], d12: [], d11: [], d13: [],
      d5: [{ id: "m50", key: "offer_expires", label: "Offer counter 到期（8765 Pattern Pl）", kind: "deadline", date: d(+1), status: "pending", lane: 1, rule: "对方 counter 到期 17:00" }],
      d9: [
        // v1.5：续约提醒统一成到期前 90 / 60 / 30 天三次（D5）
        { id: "m91", key: "renewal_90", label: "续约提醒 · 到期前 90 天（周边租金对比已发房东）", kind: "deadline", date: d(-15), status: "done", lane: 4, rule: "到期 − 90 天" },
        { id: "m92", key: "renewal_60", label: "续约提醒 · 到期前 60 天（问租客续不续 · 给房东涨租建议）", kind: "deadline", date: d(+15), status: "pending", lane: 4, rule: "到期 − 60 天" },
        { id: "m93", key: "renewal_30", label: "续约提醒 · 到期前 30 天（不续就安排退租检查）", kind: "deadline", date: d(+45), status: "pending", lane: 4, rule: "到期 − 30 天" },
        { id: "m90", key: "lease_end", label: "租约到期", kind: "deadline", date: d(+75), status: "pending", lane: 1 },
      ],
      d2: [
        { id: "m1", key: "listing_signed", label: "上市协议签署", kind: "event", date: d(-25), status: "done", lane: 1 },
        { id: "m2", key: "listed", label: "MLS 上线（照片 · 文案）", kind: "event", date: d(-21), status: "done", lane: 1 },
        { id: "m3", key: "open_house", label: "Open House", kind: "event", date: d(-1), status: "done", lane: 2 },
        { id: "m4", key: "counter_expires", label: "买家 A counter 回复截止", kind: "deadline", date: d(+1), status: "pending", lane: 2, rule: "对方给的期限 17:00" },
        { id: "m5", key: "price_review", label: "价格复盘（挂牌 30 天）", kind: "deadline", date: d(+9), status: "pending", lane: 3, rule: "挂牌 + 30 天" },
        { id: "m6", key: "hoa_resale", label: "HOA resale certificate 到位", kind: "deadline", date: d(+6), status: "pending", lane: 3, rule: "合同前备齐" },
      ],
      d4: [
        { id: "m1", key: "lease_start", label: "租约开始", kind: "event", date: d(-60), status: "done", lane: 1 },
        { id: "m2", key: "rent_due", label: "下月租金应收", kind: "deadline", date: FIRST(1), status: "pending", lane: 1, rule: "每月 1 日" },
        { id: "m3", key: "renewal_90", label: "续约提醒 · 到期前 90 天", kind: "deadline", date: d(+215), status: "pending", lane: 4, rule: "到期 − 90 天" },
        { id: "m5", key: "renewal_60", label: "续约提醒 · 到期前 60 天", kind: "deadline", date: d(+245), status: "pending", lane: 4, rule: "到期 − 60 天" },
        { id: "m6", key: "renewal_30", label: "续约提醒 · 到期前 30 天", kind: "deadline", date: d(+275), status: "pending", lane: 4, rule: "到期 − 30 天" },
        { id: "m4", key: "lease_end", label: "租约到期", kind: "deadline", date: d(+305), status: "pending", lane: 4 },
      ],
      d7: [
        { id: "m1", key: "listed", label: "出租挂牌", kind: "event", date: d(-9), status: "done", lane: 1 },
        { id: "m2", key: "application", label: "申请提交（刘先生）", kind: "event", date: d(-2), status: "done", lane: 2 },
        { id: "m3", key: "docs_due", label: "收入证明截止", kind: "deadline", date: d(+1), status: "pending", lane: 2, rule: "申请后 3 天" },
        { id: "m4", key: "landlord_decision", label: "房东决定", kind: "deadline", date: d(+3), status: "pending", lane: 3, rule: "材料齐后 2 天" },
        { id: "m5", key: "lease_sign", label: "签租约 · 收押金", kind: "deadline", date: d(+5), status: "pending", lane: 4 },
        { id: "m6", key: "move_in", label: "入住 · 交钥匙", kind: "event", date: d(+12), status: "pending", lane: 4 },
      ],
      d1: [
        // v1.5：里程碑 key 和真实 Playbook 对齐（em_due · option_period_end · objection_deadline · hoa_termination_end · final_walkthrough …）；路线图节点靠节点定义上写的同名 key 找到自己的日期（roadmap.js 里的 ms）
        { id: "m1", key: "effective_date", label: "合同生效", kind: "event", date: d(-6), status: "done", lane: 1 },
        { id: "m2", key: "option_fee_due", label: "Option fee 递交", kind: "deadline", date: d(-3), status: "done", lane: 1, rule: "生效后 3 天 · 遇周末顺延", verified: { at: d(-3) + " 16:10", by: "Jason", evidence: "Contract.pdf p.24（Option Fee Receipt）· 金额 $500 = 合同 5B" } },
        { id: "m3", key: "em_due", label: "Earnest money 递交", kind: "deadline", date: d(-3), status: "done", lane: 1, rule: "生效后 3 天 · 遇周末顺延" },
        { id: "m4", key: "inspection", label: "验房", kind: "event", date: d(-3), status: "done", lane: 2 },
        { id: "m5", key: "option_period_end", label: "Option 期截止", kind: "deadline", date: d(+1), status: "pending", lane: 1, rule: "生效后 7 天 · 17:00 · 周末不顺延" },
        { id: "m6", key: "title_commitment", label: "Title commitment 收到", kind: "event", date: d(-2), status: "done", lane: 3, source: "邮件侦测" },
        { id: "m7", key: "objection_deadline", label: "Title 异议截止", kind: "deadline", date: d(+5), status: "pending", lane: 3, rule: "收到后 7 天（收到才起算）" },
        { id: "m8", key: "hoa_docs", label: "HOA 文件收到", kind: "event", date: d(0), status: "done", lane: 3, source: "邮件侦测 · T1 自动（可撤销）" },
        { id: "m17", key: "hoa_termination_end", label: "HOA 终止权截止", kind: "deadline", date: d(+3), status: "pending", lane: 3, rule: "收到 HOA 文件后 3 天", source: "派生（提议 pr1）" },
        { id: "m9", key: "survey_due", label: "Survey 完成", kind: "deadline", date: d(+14), status: "done", doneAt: d(0), lane: 3, rule: "生效后 20 天", source: "邮件侦测 · T1 自动（Survey.pdf 今天到了，可撤销）" },
        { id: "m10", key: "appraisal", label: "Appraisal（评估师上门）", kind: "event", date: d(-1), status: "done", lane: 2, source: "邮件侦测（Demo Mortgage）· 报告还在路上" },
        { id: "m11", key: "financing_deadline", label: "贷款批准截止", kind: "deadline", date: d(+15), status: "pending", lane: 2, rule: "生效后 21 天" },
        { id: "m12", key: "ctc", label: "Clear to close", kind: "event", date: d(+20), status: "pending", lane: 2 },
        { id: "m13", key: "cd", label: "Closing Disclosure 收到", kind: "deadline", date: d(+21), status: "pending", lane: 4, rule: "过户前 3 个工作日" },
        { id: "m14", key: "final_walkthrough", label: "Final walkthrough", kind: "event", date: d(+23), status: "pending", lane: 4 },
        { id: "m15", key: "closing", label: "过户", kind: "deadline", date: d(+24), status: "pending", lane: 4 },
        { id: "m16", key: "funding", label: "Funding · 交钥匙", kind: "event", date: d(+24), status: "pending", lane: 4 },
      ],
      d3: [
        { id: "m1", key: "effective_date", label: "合同生效", kind: "event", date: d(-80), status: "done", lane: 1 },
        { id: "m5", key: "option_period_end", label: "Option 期截止", kind: "deadline", date: d(-70), status: "done", lane: 1 },
        { id: "m10", key: "appraisal", label: "Appraisal", kind: "event", date: d(-62), status: "done", lane: 2 },
        { id: "m11", key: "financing_deadline", label: "贷款批准截止", kind: "deadline", date: d(-59), status: "done", lane: 2 },
        { id: "m13", key: "cd", label: "Closing Disclosure 收到", kind: "deadline", date: d(-48), status: "done", lane: 4 },
        { id: "m15", key: "closing", label: "过户", kind: "deadline", date: d(-45), status: "done", lane: 4 },
      ],
    },
    tasks: {
      d12: [{ id: "t_d12_1", name: "给林先生发 CMA + 上市方案", rule: "争取 Listing", due: d(+2), assignee: "Jason", status: "pending", clientVisible: false }], d11: [], d13: [],
      d8: [{ id: "t80", name: "约验房（option 期内）", rule: "新建交易 · 模板", due: d(+10), assignee: "Jason", status: "pending", clientVisible: false }],
      d9: [
        { id: "t91", name: "到期前 90 天：周边租金对比发王先生", rule: "到期 − 90 天", due: d(-15), assignee: "Jason", status: "done", doneAt: d(-15), doneBy: "Jason", clientVisible: true },
        { id: "t90", name: "到期前 60 天：问 Grace Lin 续不续 + 给王先生涨租建议", rule: "到期 − 60 天", due: d(+15), assignee: "Jason", status: "pending", clientVisible: true },
      ],
      d4: [
        { id: "t1", name: "下月租金到账核对（1 日应收）", rule: "每月 1 日", due: FIRST(1), assignee: "Jason", status: "pending", clientVisible: false, note: "本月的已到账（租金时间线里有回执）" },
        { id: "t2", name: "WO-118 车库插座：报价后推房东审批", rule: "工单报价超过门槛先批", due: d(0), assignee: "Jason", status: "done", doneAt: d(0), doneBy: "Jason", clientVisible: false, note: "报价 $340 已推给王先生（消息里的审批卡）" },
        { id: "t3", name: "租约到期前 90 天：周边租金对比 + 涨租建议", rule: "到期 − 90 天", due: d(+215), assignee: "Jason", status: "pending", clientVisible: true },
        { id: "t4", name: "年度 HVAC 保养提醒房东", rule: "每年 10 月", due: d(+10), assignee: "团队", status: "pending", clientVisible: false },
      ],
      d7: [
        { id: "t1", name: "收齐刘先生收入证明（工资单 × 2）", rule: "申请后 2 天", due: d(+1), assignee: "Jason", status: "pending", clientVisible: true },
        { id: "t2", name: "生成评分卡 + 摘要给房东（不含全文）", rule: "材料齐后当天", due: d(+2), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t3", name: "房东决定后 24 小时内通知申请人（拒绝给书面原因）", rule: "§92.3515", due: d(+3), assignee: "Jason", status: "pending", clientVisible: true },
        { id: "t4", name: "起草租约 + 宠物附加协议", rule: "批准后", due: d(+5), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t5", name: "钥匙交接 · 入住检查表", rule: "入住日", due: d(+12), assignee: "团队", status: "pending", clientVisible: true },
      ],
      d5: [
        { id: "t1", name: "落选后 24 小时内回访赵女士（下一步：继续看房）", rule: "落选后 1 天", due: d(-11), assignee: "Jason", status: "done", doneAt: d(-11), doneBy: "Jason", clientVisible: false },
        { id: "t2", name: "周末带看 3 套（路线已排）", rule: "看房预约", due: d(+1), assignee: "Jason", status: "pending", clientVisible: true },
      ],
      d1: [
        { id: "t1", name: "发欢迎信息给买家（中文 · 时间线）", rule: "生效当天", due: d(-6), assignee: "Jason", status: "done", doneAt: d(-6), doneBy: "Jason", clientVisible: false },
        { id: "t2", name: "Option fee / EM 收据交给 title", rule: "生效后 1 天", due: d(-5), assignee: "团队", status: "done", doneAt: d(-5), doneBy: "Lisa", clientVisible: false, note: "派给团队，Lisa 先做了 → 记在 Lisa 名下" },
        { id: "t3", name: "预约验房（Tom Reyes）", rule: "生效后 3 天内", due: d(-3), assignee: "Jason", status: "done", doneAt: d(-4), doneBy: "Jason", clientVisible: true, note: "周三 9:00，客户到场" },
        { id: "t4", name: "验房报告中文摘要发客户", rule: "验房后 1 天", due: d(-2), assignee: "AI → Jason", status: "done", doneAt: d(-2), doneBy: "Jason", clientVisible: true, note: "AI 起草，Jason 改了 3 处后放行" },
        { id: "t5", name: "修理谈判 → Amendment", rule: "Option 到期前 2 天", due: d(-1), assignee: "Jason", status: "done", doneAt: d(-1), doneBy: "Jason", clientVisible: false, note: "减价 $5,000 代替修屋顶" },
        { id: "t6", name: "客户：确认是否继续（option 到期前）", rule: "Option 到期前 1 天", due: d(0), assignee: "客户", status: "pending", clientVisible: true },
        { id: "t7", name: "跟 Kevin 要 appraisal 报告（估值够不够成交价）", rule: "评估师上门后 3 天", due: d(+2), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t8", name: "追 HOA 文件（Amy Smith）", rule: "生效后 9 天", due: d(+3), assignee: "团队", status: "done", doneAt: d(0), doneBy: "Jason", clientVisible: false, note: "HOA Resale Certificate 今天到了（邮件侦测）" },
        { id: "t9", name: "Title commitment 核对 · 异议", rule: "收到后 5 天", due: d(+3), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t10", name: "客户：选择 home warranty 方案", rule: "过户前 14 天", due: d(+10), assignee: "客户", status: "pending", clientVisible: true },
        { id: "t11", name: "Survey 收到后核对围栏 / 车道", rule: "收到后 2 天", due: d(+2), assignee: "Jason", status: "pending", clientVisible: false, note: "Survey 今天到了（邮件侦测 · T1 自动改的日期，可撤销）" },
        { id: "t12", name: "CD 收到后核对（3 个工作日）", rule: "过户前 3 天", due: d(+21), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t13", name: "客户：电汇前电话核实账户（只打 972-000-0100）", rule: "过户前 2 天", due: d(+22), assignee: "客户", status: "pending", clientVisible: true },
        { id: "t14", name: "预约 final walkthrough", rule: "过户前 2 天", due: d(+22), assignee: "Mary Liu", status: "pending", clientVisible: true },
        { id: "t15", name: "过户后：确认产权人写入 · 发钥匙卡", rule: "过户当天", due: d(+24), assignee: "AI → Jason", status: "pending", clientVisible: false },
        { id: "t16", name: "推荐人周先生致谢（礼物，非现金）", rule: "生效后 2 天", due: d(-4), assignee: "Jason", status: "done", doneAt: d(-4), doneBy: "Jason", clientVisible: false, note: "TREC：无牌人不能收推荐费" },
        { id: "t17", name: "Buyer Rep 协议到期前提醒", rule: "到期前 7 天", due: d(+143), assignee: "系统", status: "pending", clientVisible: false },
        { id: "t18", name: "Leaseback 协议", rule: "如有", due: null, assignee: "Jason", status: "na", clientVisible: false, note: "本合同无 leaseback" },
        { id: "t19", name: "把验房报告转给贷款员 Kevin（appraisal 前）", rule: "验房后 2 天", due: d(-1), assignee: "Jason", status: "pending", clientVisible: false, note: "逾期 1 天 · L1 标红" },
      ],
      d2: [
        { id: "t1", name: "回复 counter（买家 A · 17:00 到期）", rule: "counter 到期前", due: d(+1), assignee: "Jason", status: "pending", clientVisible: false },
        { id: "t2", name: "Open House 准备（昨天 1–3 pm 已办）", rule: "活动前 1 天", due: d(-2), assignee: "团队", status: "done", doneAt: d(-2), doneBy: "Lisa", clientVisible: false },
        { id: "t3", name: "客户：看 showings 反馈周报", rule: "每周一", due: d(+2), assignee: "客户", status: "pending", clientVisible: true },
        { id: "t4", name: "催 HOA 管理公司出 resale certificate", rule: "挂牌后 14 天", due: d(-5), assignee: "团队", status: "pending", clientVisible: false, note: "逾期 5 天 · 已升级 L3 推送催办" },
      ],
      d3: [
        { id: "t1", name: "提醒客户申请 homestead exemption", rule: "过户后 30 天", due: d(-15), assignee: "Jason", status: "done", doneAt: d(-14), doneBy: "Jason", clientVisible: true },
        { id: "t2", name: "过户周年问候 + 估值", rule: "过户后 1 年", due: d(+320), assignee: "系统", status: "pending", clientVisible: false },
      ],
    },
    money: {
      d8: [],
      d9: [], d12: [], d11: [], d13: [],
      d2: [
        { id: "mo1", label: "HOA resale certificate 费", amount: 375, to: "HOA 管理公司", due: d(+2), status: "due", how: "信用卡 · 卖方付" },
        { id: "mo2", label: "预估 net to seller（按 counter $668,000）", amount: 627920, to: "卖方（过户时）", due: d(+31), status: "upcoming", how: "价格 − 卖方付的费用 − 佣金 6%（还没扣房贷余额和税费分摊）· 过户后电汇 · 只以电话核实账户", wire: true },
      ],
      d4: [
        { id: "mo1", label: "上月租金", amount: 2650, to: "房东（经物业账户）", due: FIRST(-1), status: "paid", how: "ACH · 3 日到账" },
        { id: "mo2", label: "本月租金", amount: 2650, to: "房东（经物业账户）", due: FIRST(0), status: "paid", how: "ACH · 已到账（回执已关联）" },
        { id: "mo4", label: "下月租金", amount: 2650, to: "房东（经物业账户）", due: FIRST(1), status: "upcoming", how: "ACH" },
        { id: "mo3", label: "WO-118 维修（报价）", amount: 340, to: "Vendor（房东承担）", due: d(+7), status: "upcoming", how: "房东批准后结算" },
      ],
      d7: [
        { id: "mo1", label: "申请费", amount: 50, to: "经纪公司", due: d(-2), status: "paid", how: "信用卡" },
        { id: "mo2", label: "押金（1 个月）", amount: 2400, to: "房东（托管）", due: d(+5), status: "upcoming", how: "签约时 · 只以电话核实账户", wire: true },
        { id: "mo3", label: "首月租金", amount: 2400, to: "房东", due: d(+12), status: "upcoming", how: "入住前" },
      ],
      d1: [
        // v1.5：每笔钱带两句人话——refund 可退吗 · refundWho 退找谁（客户端和钱 tab 都用）；买方过户费不估，以 Closing Disclosure 为准（D34）
        { id: "mo1", label: "Option fee", amount: 500, to: "卖方（经 title）", due: d(-3), status: "paid", how: "支票", refund: "不退：换来 Option 期内无条件退出的权利", refundWho: "—" },
        { id: "mo2", label: "Earnest money", amount: 5000, to: "Sample Title Co", due: d(-3), status: "paid", how: "电汇（已电话核实）", refund: "Option 期内退出可全退；过了按合同条款", refundWho: "Sample Title（双方签退款文件）" },
        { id: "mo3", label: "验房费", amount: 550, to: "Demo Home Inspections", due: d(-3), status: "paid", how: "信用卡", refund: "不退", refundWho: "—" },
        { id: "mo4", label: "Appraisal 费", amount: 650, to: "Demo Mortgage", due: d(-4), status: "paid", how: "信用卡（下单时付）", refund: "不退", refundWho: "—" },
        { id: "mo5", label: "首付（过户费以 CD 为准）", amount: 98000, to: "Sample Title Co", due: d(+23), status: "upcoming", how: "现金部分 $103,000 − 已交 EM $5,000 · 电汇 · 只以电话核实账户", wire: true, refund: "没过户就按合同处理", refundWho: "Sample Title（Closing Agent）" },
      ],
    },
    offers: {
      // v1.3：买方交易的 Offer 各自挂在一套房上（property）；卖方交易的 Offer 来自不同买家。status 七种（和 offers.js OFFER_ST 一致）：negotiating 谈判中 · on_hold 挂起 · withdrawn 已撤回（可再激活）· lost 落选（可再激活）· accepted 已接受（→ 合同）· rejected 已拒 · backup 备选
      // v1.5：客户点「同意」只记 clientAgreedAt / clientAgreedBy / clientAgreedV（同意的是哪一版），不改 status；出了新版本，旧的同意挪进 consents[]
      d1: [
        { id: "o0", side: "ours", property: "p1", buyer: "我方（陈先生）", status: "accepted", received: d(-9), acceptedAt: d(-6), doc: { name: "Offer-1234-Sample-v3-买方已签.pdf", pages: 11, signedBy: "我方", at: d(-7) }, versions: [
          { v: 1, at: d(-9), by: "我方", who: "ours", price: 505000, em: 5000, optionDays: 10, optionFee: 500, option: "10 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 4000, titlePolicy: "卖方付", warranty: 600, appraisalGap: "无", leaseback: "无" },
          { v: 2, at: d(-8), by: "对方 counter", who: "theirs", price: 525000, em: 5000, optionDays: 7, optionFee: 500, option: "7 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "无", leaseback: "无" },
          { v: 3, at: d(-7), by: "我方 counter", who: "ours", price: 520000, em: 5000, optionDays: 7, optionFee: 500, option: "7 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 600, appraisalGap: "无", leaseback: "无" },
        ], note: "v3（$520,000 · Option 7 天 / $500）对方签字 → 合同生效，合同字段从 v3 带过去；验房后 Amendment 把成交价改成 $515,000" },
      ],
      d2: [
        { id: "o1", side: "theirs", buyer: "买家 A（Bob Lee 代理）", status: "negotiating", received: d(-2), expires: d(+1) + " 17:00", doc: { name: "Offer-5678-Demo-买家A-v1-买方已签.pdf", pages: 11, signedBy: "对方", at: d(-2) }, versions: [
          { v: 1, at: d(-2), by: "买方", who: "theirs", price: 660000, em: 6600, optionDays: 7, optionFee: 500, option: "7 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 5000, titlePolicy: "卖方付", warranty: 600, appraisalGap: "无", leaseback: "无" },
          { v: 2, at: d(-1), by: "我方 counter", who: "ours", price: 675000, em: 6750, optionDays: 5, optionFee: 500, option: "5 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "无", leaseback: "无" },
          { v: 3, at: d(0), by: "对方 counter（邮件）", who: "theirs", price: 668000, em: 6750, optionDays: 5, optionFee: 500, option: "5 天 / $500", close: "30 天", financing: "Conventional 20%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "无", leaseback: "无" },
        ], consents: [{ v: 2, at: d(-1) + " 20:14", by: "c5" }] },
        { id: "o2", side: "theirs", buyer: "买家 B（现金）", status: "rejected", received: d(-3), doc: { name: "Offer-5678-Demo-买家B-v1.pdf", pages: 9, signedBy: "对方", at: d(-3) }, versions: [
          { v: 1, at: d(-3), by: "买方", who: "theirs", price: 650000, em: 6500, optionDays: 10, optionFee: 300, option: "10 天 / $300", close: "14 天", financing: "现金", sellerPaid: 0, titlePolicy: "买方付", warranty: 0, appraisalGap: "—", leaseback: "无" },
        ] },
      ],
      d5: [
        { id: "o4", side: "ours", property: "p9", buyer: "我方（赵女士）", status: "negotiating", received: d(-2), expires: d(+1) + " 17:00", doc: { name: "Offer-8765-Pattern-v1-买方已签.pdf", pages: 11, signedBy: "我方", at: d(-2) }, versions: [
          { v: 1, at: d(-2), by: "我方", who: "ours", price: 585000, em: 5850, optionDays: 10, optionFee: 500, option: "10 天 / $500", close: "35 天", financing: "Conventional 25%", sellerPaid: 3000, titlePolicy: "卖方付", warranty: 600, appraisalGap: "无", leaseback: "无" },
          { v: 2, at: d(-1), by: "对方 counter", who: "theirs", price: 598000, em: 5850, optionDays: 7, optionFee: 500, option: "7 天 / $500", close: "30 天", financing: "Conventional 25%", sellerPaid: 0, titlePolicy: "买方付", warranty: 600, appraisalGap: "无", leaseback: "无" },
        ] },
        { id: "o3", side: "ours", property: "p5", buyer: "我方（赵女士）", status: "lost", received: d(-14), lostAt: d(-12), outcome: 628000, reason: "卖方接了别的 Offer（$628,000 · 无 appraisal 条件）· 对方若贷款失败可再激活", doc: { name: "Offer-1357-Prototype-v2-买方已签.pdf", pages: 11, signedBy: "我方", at: d(-13) }, versions: [
          { v: 1, at: d(-14), by: "我方", who: "ours", price: 610000, em: 6100, optionDays: 7, optionFee: 500, option: "7 天 / $500", close: "30 天", financing: "Conventional 25%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "无", leaseback: "无" },
          { v: 2, at: d(-13), by: "我方（加价）", who: "ours", price: 620000, em: 6200, optionDays: 5, optionFee: 500, option: "5 天 / $500", close: "30 天", financing: "Conventional 25%", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "$10,000", leaseback: "无" },
        ] },
      ],
      d8: [
        { id: "o5", side: "ours", property: "p10", buyer: "我方（王先生）", status: "negotiating", received: d(-1), expires: d(+2) + " 17:00", doc: { name: "Offer-2222-Mockup-v1-买方已签.pdf", pages: 10, signedBy: "我方", at: d(-1) }, versions: [
          { v: 1, at: d(-1), by: "我方", who: "ours", price: 560000, em: 5600, optionDays: 7, optionFee: 300, option: "7 天 / $300", close: "21 天", financing: "现金", sellerPaid: 0, titlePolicy: "卖方付", warranty: 0, appraisalGap: "—", leaseback: "无" },
        ] },
      ],
    },
    compliance: {
      // v1.5（D30）：合规清单分四段 phase：pre 签约前 · contract 合同期 · close 过户前 · post 过户后。签约前 + 合同期 + 过户前都齐了，经纪人提交一次「合规 + CDA」（T3），Broker 批了才开过户的门；过户后那一段成交后再收。na = 不适用（算齐）。算法在 work.js NBComp。
      d2: [
        { phase: "pre", item: "IABS 已交付", ok: true, evidence: "签上市协议时 " + d(-25) },
        { phase: "pre", item: "Listing Agreement 签署", ok: true, evidence: "doc6 · 6 个月" },
        { phase: "pre", item: "Seller's Disclosure 完成", ok: true, evidence: "doc7 · 卖方签署 " + d(-24) },
        { phase: "pre", item: "Lead-based paint（1978 前）", ok: true, na: true, evidence: "不适用：2004 年建" },
        { phase: "pre", item: "HOA 附录 + resale certificate", ok: false, evidence: "已催 HOA 管理公司（任务 t4）" },
        { phase: "pre", item: "MUD / PID 通知", ok: false, evidence: "待确认是否在 PID 内" },
      ],
      d1: [
        { phase: "pre", item: "IABS 已交付", ok: true, evidence: "客户视图首次打开 " + d(-6) + " 21:03 · IP 记录" },
        { phase: "pre", item: "Consumer Protection Notice", ok: true, evidence: "同上" },
        { phase: "pre", item: "Buyer Representation 协议", ok: true, evidence: "签署 " + d(-30) + " · 到期 " + d(+150) },
        { phase: "contract", item: "合同（20-19）", ok: true, evidence: "Contract.pdf p.1–11" },
        { phase: "contract", item: "Earnest money 收据", ok: true, evidence: "Contract.pdf p.23" },
        { phase: "contract", item: "Option fee 收据", ok: true, evidence: "Contract.pdf p.24" },
        { phase: "contract", item: "Seller's Disclosure（买方签收）", ok: true, evidence: "Contract.pdf p.16–22" },
        { phase: "contract", item: "Third Party Financing Addendum（40-11）", ok: true, evidence: "p.12–13" },
        { phase: "contract", item: "HOA Addendum（36-11）", ok: true, evidence: "p.14–15" },
        { phase: "close", item: "Amendment", ok: true, evidence: "Amendment.pdf（双方已签）" },
        { phase: "close", item: "Title Commitment", ok: true, evidence: "Title Commitment.pdf · 14 页" },
        { phase: "post", item: "Closing Statement / CD", ok: false, evidence: "过户后收" },
      ],
    },
    // 合规 + CDA 的提交 / 批准状态（一笔交易一条）：submittedAt · proposal（那条 T3 提议）· approvedAt · by。CDA 最晚在过户前 3 个工作日提交。
    complianceState: {
      d1: { submittedAt: d(0) + " 09:05", proposal: "pr10" },
      d3: { submittedAt: d(-52) + " 10:00", proposal: "pr5", approvedAt: d(-50) + " 14:20", by: "Ann（Broker）" },
    },
    proposals: [
      // v1.5（D14–D17）：四档 T0 只记录 · T1 自动执行 + 事后通知（可撤销）· T2 我点了才写 · T3 Broker 批。T1 从来不是等你批的卡（status = auto）；T3 经纪人批不了，只显示「已发给 Broker · 等批」。
      // 真实版（P0 · 步骤 23）：proposals.status 只有 pending / auto / approved / rejected / undone / pending_second——影子里 T0 的 logged 在真实版也是 auto；影子的 snoozed + snoozeUntil 在真实版是 status 不变 + proposals.snoozed_until（到期自动回来）。
      // created = 这条提议建出来的记录，undo = 它改掉之前的值——撤销时一起删掉 / 还原（work.js NBProp.undo）。
      { id: "pr1", type: "derive", tier: 1, deal: "d1", title: "HOA 文件收到 → 里程碑标完成 + 派生 HOA 终止权截止 " + d(+3), evidence: "邮件《HOA Resale Certificate ready》· Amy Smith · " + d(0) + " 09:12 · 发件人是这笔交易的已知一方 · 只对上这一笔 · 日期不在将来", status: "auto", at: d(0) + " 09:13", cost: 0.004, undoUntil: d(+1), created: [{ coll: "milestones", deal: "d1", id: "m17" }], undo: [{ coll: "milestones", deal: "d1", id: "m8", set: { status: "pending", date: null, source: "邮件侦测：待确认" } }, { coll: "tasks", deal: "d1", id: "t8", set: { status: "pending", doneAt: null, doneBy: null } }, { coll: "deals", id: "d1", path: "rm.lines.C", value: 1 }] },
      { id: "pr2", type: "note", tier: 2, deal: "d1", title: "新建任务：提醒 Kevin 锁 rate（截止 " + d(+1) + "）", evidence: "你在车里说：“帮我记一下明天提醒 Kevin 锁 rate”", status: "pending", at: d(0) + " 08:41", cost: 0.006, payload: { task: "提醒 Kevin 锁 rate", due: d(+1), assignee: "Jason" } },
      { id: "pr3", type: "note", tier: 2, deal: "d1", title: "人生节点：陈先生父母 10 月来美（建议记到联系人 + 加一条提醒）", evidence: "微信摘要 · 陈太太 " + d(-1) + "：“我爸妈 10 月中旬过来住三个月”", status: "pending", at: d(-1) + " 22:30", cost: 0.02, payload: { contactNote: { contact: "c1", text: "人生节点：父母 10 月中旬来美住三个月" }, task: "陈先生父母来美：准备一份欢迎礼", due: d(+7), assignee: "Jason" } },
      { id: "pr4", type: "offer_version", tier: 2, deal: "d2", title: "邮件里的 counter → 新建 offer 版本 v3（$668,000）", evidence: "邮件《Re: 5678 Demo Ln – counter》· Bob Lee · " + d(0) + " 10:05 · 附件 Counter v3", status: "approved", at: d(0) + " 10:06", by: "Jason", approvedAt: d(0) + " 10:08", cost: 0.008, payload: { offer: "o1", who: "theirs", patch: { price: 668000, optionDays: 5, optionFee: 500 }, by: "对方 counter（邮件）" }, created: [{ coll: "offerVersions", deal: "d2", offer: "o1", v: 3 }] },
      { id: "pr5", type: "cda", tier: 3, deal: "d3", title: "合规 + CDA 申请 · 910 Example Ct · 佣金 $13,350", evidence: "过户 " + d(-45) + " · 过户前清单 11 / 11（提交时）", status: "approved", at: d(-52) + " 10:00", by: "Ann（Broker）", approvedAt: d(-50) + " 14:20", cost: 0 },
      { id: "pr6", type: "owners", tier: 1, deal: "d3", title: "写入产权：张先生 50% · 张太太 50% · 夫妻共有", evidence: "合同各方 + 过户", status: "auto", at: d(-45) + " 17:02", cost: 0.003, undoUntil: d(-44) },
      { id: "pr7", type: "derive", tier: 1, deal: "d1", title: "Survey 收到（邮件）→ 里程碑标完成 · 文件归档 ·「核对围栏 / 车道」改到 " + d(+2), evidence: "邮件《Survey ready – 1234 Sample Dr》· Sample Title · " + d(0) + " 08:40 · 置信 0.98 · 发件人是这笔交易的已知一方", status: "auto", at: d(0) + " 08:41", cost: 0.004, undoUntil: d(+1), created: [{ coll: "documents", id: "doc14" }], undo: [{ coll: "milestones", deal: "d1", id: "m9", set: { status: "pending", doneAt: null, source: null } }, { coll: "tasks", deal: "d1", id: "t11", set: { due: d(+14), rule: "生效后 20 天", note: null } }, { coll: "deals", id: "d1", path: "rm.lines.B", value: 1 }] },
      { id: "pr9", type: "outbound", tier: 3, deal: "d1", title: "发给 Sample Title：过户文件包（客户 SSN 已遮盖）", evidence: "文件 tab · 3 份 · 收件人 escrow@sample-title.example", status: "pending", at: d(0) + " 08:20", cost: 0.002 },
      { id: "pr10", type: "cda", tier: 3, deal: "d1", title: "合规 + CDA 申请 · 1234 Sample Dr · 佣金 $15,450", evidence: "预计过户 " + d(+24) + " · 过户前清单 11 / 11（过户后 1 项另收）", status: "pending", at: d(0) + " 09:05", cost: 0 },
      { id: "pr11", type: "conflict", tier: 2, deal: "d1", title: "贷款员说「明天能 Clear to Close」（" + fdISO(d(+1)) + "），系统里的 CTC 是 " + fdISO(d(+20)) + " —— 以哪个为准？", evidence: "邮件 vs 里程碑：两边并列，你点一下选哪个算数，选了才改数据", status: "pending", at: d(0) + " 09:42", cost: 0.006, payload: { field: "ctc", apply: { kind: "milestone", deal: "d1", ms: "m12" }, a: { src: "邮件 · Kevin Park（Demo Mortgage）", at: d(0) + " 09:40", quote: "We should be clear to close by tomorrow.", value: d(+1), label: fdISO(d(+1)) + "（邮件说 tomorrow）" }, b: { src: "里程碑 m12 · 从「贷款批准截止」派生", at: d(-6) + " 18:00", quote: "贷款批准截止 + 5 天", value: d(+20), label: fdISO(d(+20)) } } },
      { id: "pr12", type: "conflict", tier: 2, deal: "d2", title: "Bob Lee 邮件正文说 Option 期 7 天，附件里的 counter（Offer v3）写的是 5 天 —— 以哪个为准？", evidence: "邮件正文 vs Offer v3：选了才改 Offer 条款（记成新版本）", status: "pending", at: d(0) + " 10:08", cost: 0.006, payload: { field: "optionDays", apply: { kind: "offer", deal: "d2", offer: "o1", key: "optionDays" }, a: { src: "邮件正文 · Bob Lee（买方经纪）", at: d(0) + " 10:05", quote: "Our option period is 7 days as discussed.", value: 7, label: "7 天" }, b: { src: "Offer o1 v3（对方 counter · 邮件附件）", at: d(0) + " 10:05", quote: "Option: 5 天 / $500", value: 5, label: "5 天" } } },
      { id: "pr13", type: "commitment", tier: 2, deal: "d2", title: "Bob Lee 说「下午发回买家签收的 Seller's Disclosure」—— 记成一条承诺（今天 17:00 前）？", evidence: "邮件《Re: Seller's Disclosure – 5678 Demo Ln》· 原文没写具体几点 → 需要你确认时间", status: "pending", at: d(0) + " 10:20", cost: 0.004, payload: { who: "c18", whoName: "Bob Lee（买方经纪）", what: "发回买家签收的 Seller's Disclosure", due: d(0) + " 17:00", source: { kind: "email", ref: "e8", at: d(0) + " 10:18", quote: "I'll get the signed Seller's Disclosure back to you this afternoon." } } },
      { id: "pr14", type: "commitment", tier: 1, deal: "d1", title: "Kevin（Demo Mortgage）答应明天中午前发 appraisal 报告 → 已记成承诺（T1 自动 · 可撤销）", evidence: "邮件原文时间明确「tomorrow before noon」· 置信 0.96", status: "auto", at: d(0) + " 09:41", cost: 0.003, undoUntil: d(+1), payload: { commitment: "cm1" }, created: [{ coll: "commitments", id: "cm1" }] },
      { id: "pr8", type: "note", tier: 2, deal: "d2", title: "Open House 登记 4 条 → 2 位没有经纪：建线索联系人 + 各一条跟进任务（今天）", evidence: "昨天的登记表 · 2 条无经纪 · 规则：开放日后 1 天跟进 · 建联系人要你点", status: "pending", at: d(0) + " 07:55", cost: 0.003, payload: { openHouse: { signins: [0, 2] }, due: d(0), assignee: "Jason" } },
    ],
    aiCalls: [
      { at: d(0) + " 10:06", kind: "邮件分诊", model: "haiku", cost: 0.008, deal: "d2", reviewer: "—", flag: false },
      { at: d(0) + " 09:13", kind: "邮件分诊", model: "haiku", cost: 0.004, deal: "d1", reviewer: "—", flag: false },
      { at: d(0) + " 08:41", kind: "助手（语音 → 任务）", model: "haiku + ASR", cost: 0.012, deal: "d1", reviewer: "—", flag: false },
      { at: d(-1) + " 22:30", kind: "微信摘要", model: "haiku", cost: 0.02, deal: "d1", reviewer: "—", flag: false },
      { at: d(-1) + " 15:10", kind: "合同抽取（Amendment）", model: "sonnet", cost: 0.04, deal: "d1", reviewer: "Jason", flag: false },
      { at: d(-2) + " 11:00", kind: "验房报告中文摘要", model: "sonnet", cost: 0.09, deal: "d1", reviewer: "Jason", flag: true, flagNote: "Mike 的同类输出直接发给了客户，未经放行" },
      { at: d(-3) + " 09:30", kind: "CMA 文字", model: "sonnet", cost: 0.06, deal: "d2", reviewer: "Jason", flag: false },
      { at: d(-7) + " 20:15", kind: "合同抽取（26 页）", model: "sonnet", cost: 0.11, deal: "d1", reviewer: "Jason", flag: false },
      { at: d(-7) + " 20:14", kind: "文件分类", model: "haiku", cost: 0.05, deal: "d1", reviewer: "—", flag: false },
    ],
    audit: [
      { at: d(-1) + " 20:20", actor: "human", who: "Jason", what: "offers.o1 v2 counter $675,000 发出（李女士 " + d(-1) + " 20:14 在客户 App 点了同意：只记同意，不改 Offer 状态）", deal: "d2" },
      { at: d(0) + " 10:08", actor: "human", who: "Jason", what: "proposal pr4 批准：邮件里的 counter 记成 offers.o1 v3（对方 $668,000 · 5 天 / $500）", deal: "d2" },
      { at: d(-1) + " 19:30", actor: "human", who: "Jason", what: "看房反馈给卖家看：" + d(-1) + " 14:00 ·「买家喜欢厨房，觉得价格偏高 2%」（你点的放行；看了几场是自动同步的）", deal: "d2" },
      { at: d(-21) + " 09:00", actor: "human", who: "Jason", what: "deals.d2 挂牌 $685,000 · 照片 32 张 · MLS 上线", deal: "d2" },
      { at: d(-20) + " 09:30", actor: "human", who: "Jason", what: "deals.d13 挂牌 $489,000 · MLS 上线 · 约看设成「自动确认」（挂牌时选一次）", deal: "d13" },
      { at: d(-25) + " 15:10", actor: "human", who: "Jason", what: "documents.doc6 Listing Agreement 签署（6 个月）", deal: "d2" },
      { at: d(0) + " 09:13", actor: "ai", who: "邮件侦测", what: "milestones.hoa_docs 标完成 + milestones.hoa_termination_end 新增（HOA 终止权截止 " + d(+3) + "）· T1 自动 · 可撤销", deal: "d1" },
      { at: d(0) + " 08:41", actor: "ai", who: "邮件侦测", what: "milestones.survey_due 标完成 + Survey.pdf 归档 + tasks.t11 改到 " + d(+2) + " · T1 自动 · 可撤销", deal: "d1" },
      { at: d(-1) + " 15:12", actor: "human", who: "Jason", what: "deal_fields.sales_price v1 → v2：$520,000 → $515,000（Amendment.pdf p.1）", deal: "d1" },
      { at: d(-1) + " 15:13", actor: "system", who: "core", what: "重派生：贷款额不变，佣金预览 $15,600 → $15,450（血缘 sales_price v2）", deal: "d1" },
      { at: d(-2) + " 16:40", actor: "human", who: "Jason", what: "milestones.title_commitment 标记完成（邮件侦测提议 · 确认）", deal: "d1" },
      { at: d(-4) + " 11:20", actor: "human", who: "Jason", what: "tasks.t3 完成：预约验房（Tom Reyes）", deal: "d1" },
      { at: d(-5) + " 10:02", actor: "human", who: "Lisa", what: "tasks.t2 完成：Option fee / EM 收据交给 title（派给团队，Lisa 先做了）", deal: "d1" },
      { at: d(-6) + " 21:03", actor: "system", who: "portal", what: "IABS + CPN 交付：陈先生 · IP 记录 · 版本 2026-01", deal: "d1" },
      { at: d(-6) + " 20:31", actor: "human", who: "Jason", what: "deal_fields × 19 确认（Contract.pdf · 电子版：≥ 0.9 的「确认全部」一次收下，手写的生效日和低于 0.9 的逐条看）", deal: "d1" },
    ],
    emails: [
      // v1.5（步骤 E1a / E1b）：matchBy = 这封是怎么归到交易上的（sender 发件人是这笔交易的已知一方 · address 主题 / 正文里的地址 · mls MLS 号 · template 预约网站的固定模板 · manual 手动归档 · null 没归上）；
      // status：auto T1 已自动执行 · pending 等你点 · confirmed 已确认 · ignored 忽略 · unfiled 待归档（deal = null，why = 为什么没归上，candidates = 可能是哪几笔）；noReply = 系统通知类，不算「对方在等我回」
      // 收到日自动写（T1）要同时满足三条（D21）：发件人是这笔交易的已知一方 · 只对上一笔交易 · 日期不在将来；否则 T2 等你点
      // v1.7：约看申请 / 拒绝 / 过期三种邮件都是预约网站的固定模板（matchBy template）。申请：这套挂牌「我批」→ 等你批（按钮打开邮件里的链接，批准由你自己在 BrokerBay 点）；「卖家 / 租客批」→ 先不打扰，1 小时没人批或离看房不到 3 小时才升级给你。系统不登录 BrokerBay、不代批、不代回
      { id: "e20", at: ago(20), from: "BrokerBay <noreply@example.com>", subject: "Showing request – 5678 Demo Ln", deal: "d2", matchBy: "template", detected: "约看申请：今天 " + winAt(2) + " · Dana Fox（Example Realty）", action: "等你批（打开邮件里的链接，在 BrokerBay 里点批准）", tier: 2, status: "pending", noReply: true, showing: "request" },
      { id: "e21", at: ago(90), from: "BrokerBay <noreply@example.com>", subject: "Showing request – 3690 Placeholder Ct", deal: "d7", matchBy: "template", detected: "约看申请：今天 " + winAt(4) + " · Mia Chen（Example Leasing）", action: "等租客批；1 小时没人批 → 升级给你", tier: 2, status: "pending", noReply: true, showing: "request" },
      { id: "e22", at: d(-1) + " 08:40", from: "BrokerBay <noreply@example.com>", subject: "Showing declined – 3690 Placeholder Ct", deal: "d7", matchBy: "template", detected: "约看被拒：" + d(-1) + " 09:00 · Joe Park（Sample Leasing）· 租客拒了（那天家里有人）", action: "那一场标「被拒」（只记，第 2 级攒一小时）", tier: 1, status: "auto", noReply: true, showing: "declined" },
      { id: "e1", at: d(0) + " 10:05", from: "Bob Lee <bob@otherrealty.example>", subject: "Re: 5678 Demo Ln – counter", deal: "d2", matchBy: "sender", detected: "对方 counter $668,000 · 附件写 option 5 天 / $500（正文说 7 天 → 冲突卡）· 答应 3pm 前发更新的 pre-approval", action: "已记成 offer 版本 v3", tier: 2, status: "confirmed", attachments: [{ name: "Counter-5678-Demo-买家A-v3.pdf", pages: 11, kind: "offer" }] },
      { id: "e8", at: d(0) + " 10:18", from: "Bob Lee <bob@otherrealty.example>", subject: "Re: Seller's Disclosure – 5678 Demo Ln", deal: "d2", matchBy: "sender", detected: "承诺：下午发回买家签收的 Seller's Disclosure（没写几点）", action: "记成承诺（要你定时间）", tier: 2, status: "pending" },
      { id: "e7", at: d(0) + " 09:40", from: "Kevin Park <kevin@demomortgage.example>", subject: "Re: 1234 Sample Dr – appraisal / CTC", deal: "d1", matchBy: "sender", detected: "承诺：明天中午前发 appraisal 报告 · 又说明天能 Clear to Close（和里程碑不一致）", action: "承诺已自动记（T1）· CTC 日期出冲突卡", tier: 2, status: "pending" },
      { id: "e2", at: d(0) + " 09:12", from: "Amy Smith <amy@otherrealty.example>", subject: "HOA Resale Certificate ready – 1234 Sample Dr", deal: "d1", matchBy: "address", detected: "HOA 文件收到日 = " + d(0), action: "里程碑标完成 + 派生 HOA 终止权截止 " + d(+3), tier: 1, status: "auto" },
      { id: "e10", at: d(0) + " 08:40", from: "Maria Lopez <maria@sampletitle.example>", subject: "Survey ready – 1234 Sample Dr", deal: "d1", matchBy: "address", detected: "Survey 收到日 = " + d(0) + "（附件 3 页）", action: "里程碑标完成 + 文件归档 + 核对任务改到 " + d(+2), tier: 1, status: "auto", attachments: [{ name: "Survey.pdf", pages: 3, kind: "survey" }] },
      { id: "e12", at: d(0) + " 08:10", from: "Pat Doe <pat.doe@mailbox.example>", subject: "Question about 3690 Placeholder Ct", deal: null, matchBy: null, detected: "问宠物政策和最早哪天能入住", action: "归到一笔交易", tier: 2, status: "unfiled", why: "发件人不在联系人里；主题里的地址同时对上两笔交易（王先生的出租 · Kevin Liu 的寻租目标房）", candidates: ["d7", "d10"] },
      { id: "e15", at: d(0) + " 06:30", from: "MLS Weekly <news@mlsweekly.example>", subject: "This week's market update", deal: null, matchBy: null, detected: "—", action: "忽略 / 以后都忽略这个发件人", tier: 0, status: "unfiled", why: "群发通讯：不属于任何一笔交易", candidates: [], noReply: true },
      { id: "e9", at: d(-1) + " 18:45", from: "ShowingTime <noreply@showingtime.example>", subject: "Your showing has been confirmed – 1010 Draft Ln", deal: "d10", matchBy: "template", detected: "我约的看房确认了：" + d(+1) + " 16:45–17:15 · 门口见 · Supra", action: "看房站标「已确认」+ 写入日历", tier: 1, status: "auto", noReply: true, showing: "mine" },
      { id: "e13", at: d(-1) + " 17:32", from: "Dana Wu <dana.wu@demomortgage.example>", subject: "Conditions list – Chen file", deal: null, matchBy: null, detected: "贷款条件清单（附件 2 页）", action: "归到一笔交易", tier: 2, status: "unfiled", why: "发件人是贷款方的助理，不在联系人里；主题里没有地址", candidates: ["d1"], attachments: [{ name: "Conditions-list.pdf", pages: 2, kind: "lender_conditions" }] },
      { id: "e3", at: d(-4) + " 16:20", from: "Kevin Park <kevin@demomortgage.example>", subject: "Appraisal scheduled – 1234 Sample Dr", deal: "d1", matchBy: "address", detected: "Appraisal 上门日期 " + d(-1) + "（当时是将来的日期 → 要你点）", action: "里程碑 appraisal 设日期", tier: 2, status: "confirmed" },
      { id: "e14", at: d(-1) + " 15:05", from: "Amy Smith <amy@otherrealty.example>", subject: "Executed contract", deal: null, matchBy: null, detected: "附件像一份双方签好的合同（11 页）", action: "归到一笔交易 → 进件", tier: 2, status: "unfiled", why: "发件人是已知的对方经纪，但她同时在两笔交易里（1234 Sample Dr · 8765 Pattern Pl），主题和正文都没写地址", candidates: ["d1", "d5"], attachments: [{ name: "Executed contract.pdf", pages: 11, kind: "contract" }] },
      { id: "e4", at: d(-1) + " 12:03", from: "ShowingTime <noreply@showingtime.example>", subject: "The following showing has been confirmed – 5678 Demo Ln", deal: "d2", matchBy: "template", detected: "别的经纪带客户看我的挂牌：" + d(+1) + " 14:00", action: "进这套挂牌的看房反馈列表（不进我的日历）", tier: 1, status: "auto", noReply: true, showing: "listing" },
      { id: "e5", at: d(-2) + " 15:44", from: "Maria Lopez <maria@sampletitle.example>", subject: "Title Commitment – 1234 Sample Dr", deal: "d1", matchBy: "address", detected: "Title commitment 收到 " + d(-2) + "（附件 14 页）", action: "里程碑完成 + 派生异议截止 " + d(+5), tier: 2, status: "confirmed", attachments: [{ name: "Title Commitment.pdf", pages: 14, kind: "title_commitment" }] },
      { id: "e6", at: d(-2) + " 08:00", from: "MLS Weekly <news@mlsweekly.example>", subject: "Market update", deal: null, matchBy: null, detected: "—", action: "忽略", tier: 0, status: "ignored", noReply: true },
    ],
    ignoredSenders: [], // 「以后都忽略这个发件人」：[{ addr, at, by }]
    // 别的经纪带客户看「我的挂牌」：来自 "The following showing has been confirmed" 邮件。卖方客户自动看到的只有「看了几场」；
    // 反馈的文字要经纪人在那一行点「给卖家看」才放行（released），进 5 分钟延迟队列（队列那一行不带文字）；发出那一刻才 shown，卖家才看得到（R-3 · tours.js showToSeller · work.js NBAuto.deliver）
    // v1.7 起一行的形状：{ id, deal, at "YYYY-MM-DD HH:MM", window "14:00–15:00", agent, agentPhone, agentEmail（只经纪人看得到）, status requested 等批 | confirmed 约好了 | done 看完了 | declined 被拒 | expired 过期（影子里取消也标 expired）,
    //   approver auto | me | seller（建这一场时从交易拷过来）, requestedAt, escalated, escalatedAt, source 邮件 id | "邮件侦测" | "手记", feedback, feedbackAt, released, releasedAt, shown, shownAt, askedAt（去要过反馈的时间：要过一次就不再提醒）}
    //   申请 / 确认 / 拒绝 / 过期都是从邮件认的（comms.js applyShowingMail → lshow.js NBLShow）；影子里用卡上的「模拟：…邮件到了」按钮代替真的邮件
    listingShowings: [
      // —— d2 · 5678 Demo Ln（我批）——
      { id: "ls5", deal: "d2", at: hmAt(2), window: winAt(2), agent: "Dana Fox（Example Realty）", agentPhone: "214-000-0040", agentEmail: "dana@example.com", status: "requested", approver: "me", requestedAt: ago(20), escalated: false, escalatedAt: null, source: "e20", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls6", deal: "d2", at: d(+1) + " 10:00", window: "10:00–11:00", agent: "李经纪（微信约的）", agentPhone: "469-000-0041", agentEmail: "", status: "confirmed", approver: "me", requestedAt: d(-1) + " 20:10", escalated: false, escalatedAt: null, source: "手记", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls4", deal: "d2", at: d(+1) + " 14:00", window: "14:00–15:00", agent: "Dana Fox（Example Realty）", agentPhone: "214-000-0040", agentEmail: "dana@example.com", status: "confirmed", approver: "me", requestedAt: d(-1) + " 11:50", escalated: false, escalatedAt: null, source: "e4", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls12", deal: "d2", at: `${d(-1)} ${pad2(Y_HOUR)}:00`, window: `${pad2(Y_HOUR)}:00–${pad2(Y_HOUR + 1)}:00`, agent: "Sam Oak（Other Realty）", agentPhone: "214-000-0042", agentEmail: "sam@example.com", status: "done", approver: "me", requestedAt: d(-2) + " 15:20", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 看完超过 24 小时还没反馈 → 今天页「在等对方」出「去要反馈」
      { id: "ls3", deal: "d2", at: d(-1) + " 14:00", window: "14:00–15:00", agent: "买方经纪（未留名）", agentPhone: "", agentEmail: "", status: "done", approver: "me", requestedAt: d(-2) + " 09:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "买家喜欢厨房，觉得价格偏高 2%", feedbackAt: d(-1) + " 17:40", released: true, releasedAt: d(-1) + " 19:25", shown: true, shownAt: d(-1) + " 19:30", askedAt: null },
      { id: "ls2", deal: "d2", at: d(-2) + " 11:00", window: "11:00–12:00", agent: "Keller 经纪", agentPhone: "972-000-0044", agentEmail: "", status: "done", approver: "me", requestedAt: d(-3) + " 10:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "问了学区和 HOA 费；可能二看", feedbackAt: d(-2) + " 16:00", released: true, releasedAt: d(0) + " 08:30", shown: false, shownAt: null, askedAt: null }, // 放行了，还在延迟队列（q3）里等发出：卖家还看不到文字
      { id: "ls1", deal: "d2", at: d(-3) + " 16:30", window: "16:30–17:30", agent: "投资人自带经纪", agentPhone: "", agentEmail: "", status: "done", approver: "me", requestedAt: d(-4) + " 12:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "投资人，问租金；没有后续", feedbackAt: d(-3) + " 19:00", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls11", deal: "d2", at: d(-2) + " 15:00", window: "15:00–16:00", agent: "Ray Lin（Demo Brokers）", agentPhone: "469-000-0045", agentEmail: "", status: "expired", approver: "me", requestedAt: d(-3) + " 18:00", escalated: false, escalatedAt: null, expiredAt: d(-2) + " 15:00", source: "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 申请没人批，到点过期（从邮件认的）
      // —— d7 · 3690 Placeholder Ct（出租 · 租客批）——
      { id: "ls7", deal: "d7", at: hmAt(4), window: winAt(4), agent: "Mia Chen（Example Leasing）", agentPhone: "469-000-0043", agentEmail: "mia@example.com", status: "requested", approver: "seller", requestedAt: ago(90), escalated: false, escalatedAt: null, source: "e21", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 超过 1 小时没人批 → 页面一渲染就升级给你（NBLShow.escalateCheck）
      { id: "ls8", deal: "d7", at: d(+1) + " 13:00", window: "13:00–14:00", agent: "Tom Reyes（Other Realty）", agentPhone: "214-000-0046", agentEmail: "", status: "confirmed", approver: "seller", requestedAt: d(-1) + " 16:30", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls9", deal: "d7", at: d(-2) + " 11:00", window: "11:00–12:00", agent: "Ana Ruiz（Demo Realty）", agentPhone: "972-000-0047", agentEmail: "ana@example.com", status: "done", approver: "seller", requestedAt: d(-3) + " 14:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "租客喜欢位置，嫌没有车库", feedbackAt: d(-2) + " 15:30", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls10", deal: "d7", at: d(-1) + " 09:00", window: "09:00–10:00", agent: "Joe Park（Sample Leasing）", agentPhone: "469-000-0048", agentEmail: "", status: "declined", approver: "seller", requestedAt: d(-2) + " 17:00", escalated: false, escalatedAt: null, declinedAt: d(-1) + " 08:40", source: "e22", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 租客拒了：那天家里有人
      // —— d13 · 7575 Showcase Ln（自动确认 · 看房 7 场没有 Offer）——
      { id: "ls20", deal: "d13", at: d(+2) + " 14:00", window: "14:00–15:00", agent: "Pat Lee（Example Realty）", agentPhone: "214-000-0050", agentEmail: "", status: "confirmed", approver: "auto", requestedAt: d(0) + " 08:05", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 自动确认来的，只进列表不推
      { id: "ls27", deal: "d13", at: d(-2) + " 15:00", window: "15:00–16:00", agent: "Kim Wu（Other Realty）", agentPhone: "972-000-0057", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-3) + " 10:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: null, feedbackAt: null, released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null }, // 看完超过 24 小时没反馈
      { id: "ls26", deal: "d13", at: d(-4) + " 11:00", window: "11:00–12:00", agent: "Eli Ross（Demo Realty）", agentPhone: "469-000-0056", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-5) + " 09:30", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "喜欢房子，价格再看看", feedbackAt: d(-4) + " 14:00", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls25", deal: "d13", at: d(-6) + " 13:00", window: "13:00–14:00", agent: "Nia Cole（Sample Realty）", agentPhone: "214-000-0055", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-7) + " 16:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "位置不错，离学校近；再比两套", feedbackAt: d(-6) + " 17:10", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls24", deal: "d13", at: d(-9) + " 16:00", window: "16:00–17:00", agent: "Ben Hart（Example Realty）", agentPhone: "972-000-0054", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-10) + " 11:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "户型不喜欢：客厅太小", feedbackAt: d(-9) + " 19:00", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls23", deal: "d13", at: d(-12) + " 10:00", window: "10:00–11:00", agent: "Zoe Lin（Other Realty）", agentPhone: "469-000-0053", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-13) + " 09:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "价格偏高，等降价", feedbackAt: d(-12) + " 12:30", released: false, releasedAt: null, shown: false, shownAt: null, askedAt: null },
      { id: "ls22", deal: "d13", at: d(-15) + " 14:00", window: "14:00–15:00", agent: "Max Day（Demo Brokers）", agentPhone: "214-000-0052", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-16) + " 15:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "地毯旧，要换", feedbackAt: d(-15) + " 16:20", released: true, releasedAt: d(-14) + " 09:00", shown: true, shownAt: d(-14) + " 09:05", askedAt: null },
      { id: "ls21", deal: "d13", at: d(-18) + " 11:00", window: "11:00–12:00", agent: "Ivy Chan（Sample Realty）", agentPhone: "972-000-0051", agentEmail: "", status: "done", approver: "auto", requestedAt: d(-19) + " 10:00", escalated: false, escalatedAt: null, source: "邮件侦测", feedback: "觉得比同小区贵", feedbackAt: d(-18) + " 13:00", released: true, releasedAt: d(-17) + " 08:30", shown: true, shownAt: d(-17) + " 08:35", askedAt: null },
    ],
    // 我的日历里和交易有关的事件（真实版 = Google 日历同步）：我自己约的看房确认后才写进来
    calendar: [
      { id: "cal1", deal: "d10", at: d(+1) + " 16:45", title: "看房 · 1010 Draft Ln（Kevin Liu）", source: "e9", tour: "tour3", home: "h7" },
      { id: "cal2", deal: "d1", at: d(+23) + " 10:00", title: "Final walkthrough · 1234 Sample Dr", source: "手动" },
    ],
    // 手工记的沟通（电话 / 微信 / 短信）、你自己发出去的邮件（Gmail 只读同步到的已发邮件）和你放行的回复：进交易「沟通」tab 的时间线（comms.js）。dir：in 对方来的 · out 我发的；awaiting = 发出去在等回信
    commLog: [
      { id: "cl1", deal: "d8", at: d(-2) + " 18:30", channel: "sms", dir: "in", who: "c4", whoName: "王先生", text: "对方有回音了吗？验房能不能约在下周二？", by: "Jason" },
      { id: "cl2", deal: "d7", at: d(0) + " 11:10", channel: "call", dir: "out", who: "c9", whoName: "刘先生", text: "问收入证明：他说明天下班前把两张工资单传上来", by: "Jason" },
      { id: "cl3", deal: "d2", at: d(-7) + " 10:15", channel: "email", dir: "out", who: null, whoName: "Demo Park HOA 管理处", text: "Resale certificate request – 5678 Demo Ln（请出具 resale certificate）", by: "Jason", awaiting: true },
      // v1.6：沟通记录可以带 property（挂在房源上；有卖方交易就同时挂交易）
      { id: "cl9", deal: "d12", property: "p17", at: d(-6) + " 15:30", channel: "meet", dir: "out", who: "c33", whoName: "林先生", text: "上门谈 Listing：明年春天想卖、先看 CMA；两周后再联系", by: "Jason" },
      { id: "cl10", deal: "d11", property: "p18", at: d(-50) + " 10:00", channel: "call", dir: "in", who: "c35", whoName: "何女士", text: "选了朋友的经纪挂牌；半年后到期再联系", by: "Jason" },
    ],
    // 客户在客户 App 里对看过的房收藏 / 打分 / 写一句话：homeFeedback[联系人][房源 id] —— 经纪人 App 和网站读同一份（tours.js NBTours.clientFb）
    homeFeedback: {
      c10: { p6: { fav: true, score: 4, text: "位置最好，就是厨房小", at: d(0) + " 10:50", tour: "tour1", home: "h1" }, p5: { fav: false, score: 5, text: "", at: d(-7) + " 11:00", tour: "tp1", home: "h8" } },
    },
    nudgeLog: [], // 客户「催一下」：每人每笔交易每天一次 [{ member, deal, day, at, thread, overdue }]
    wechat: [
      { id: "w1", file: "微信-陈先生-" + d(-1).slice(0, 7) + ".txt", imported: d(-1), messages: 38, deal: "d1", contact: "c1", digest: {
        promises: [{ t: "周五前给验房报告中文版", done: true }, { t: "问 Kevin 能不能 lock 30 天", done: false }],
        unanswered: [{ t: "陈太太：“HOA 一年多少钱？”", at: d(-1) + " 22:10" }, { t: "陈先生：“过户那天要带什么？”", at: d(-2) + " 19:40" }],
        dates: [{ t: "陈太太出差 " + d(+10) + "–" + d(+13) + "，不能签字", }],
        life: [{ t: "父母 10 月中旬来美住三个月", contact: "c1" }],
        sentiment: "整体正面；对屋顶修理结果满意；担心电汇安全（已解释）",
      } },
    ],
    // v1.3：目标房排队（每个客户自己的，可拖动）：status 七种（和 tours.js TARGET_ST 一致）：watching 关注 · offer Offer 中 · negotiating 谈判中 · on_hold 挂起 · passed 放弃 · lost 落选（可再激活）· won 已签约
    targets: {
      c10: [{ prop: "p9", kind: "buy", status: "negotiating", pos: 1, at: d(-2), offer: "o4", deal: "d5" }, { prop: "p6", kind: "buy", status: "watching", pos: 2, at: d(0), note: "厨房小但位置最好 · 等业主换房意愿" }, { prop: "p5", kind: "buy", status: "lost", pos: 3, at: d(-14), offer: "o3", deal: "d5", note: "卖方接了别人 · 可再激活" }],
      c4: [{ prop: "p10", kind: "buy", status: "offer", pos: 1, at: d(-1), offer: "o5", deal: "d8" }],
      c11: [{ prop: "p2", kind: "buy", status: "watching", pos: 1, at: d(-1), note: "喜欢后院 · 嫌贵" }],
      c31: [{ prop: "p8", kind: "rent", status: "watching", pos: 1, at: d(-2), deal: "d10" }, { prop: "p14", kind: "rent", status: "watching", pos: 2, at: d(-2), deal: "d10" }],
    },
    portalMembers: {
      d1: [
        { id: "pm1", name: "陈先生", role: "decision", visibility: "all", opens: 5, lastOpen: d(0) + " 07:55", contactId: "c1", iabsAt: d(-6) + " 21:03" },
        { id: "pm2", name: "陈太太", role: "decision", visibility: "all", opens: 3, lastOpen: d(-1) + " 22:08", contactId: "c2", iabsAt: d(-5) + " 09:10" },
        { id: "pm3", name: "陈父", role: "advisor", visibility: "progress", opens: 1, lastOpen: d(-2) + " 06:30", contactId: null, expires: d(+4) },
      ],
    },
    glossary: [
      { term: "Option period", zh: "Option 期：付一笔小额 option fee，换来一段时间（通常 5–10 天）可以因任何理由退出合同，只损失 option fee。" },
      { term: "Earnest money", zh: "定金：交给产权公司保管的诚意金，过户时算进首付；在 option 期内退出可退回。" },
      { term: "Title commitment", zh: "产权承诺书：产权公司出具的“这套房产权干净、我们愿意保险”的文件，收到后有几天可以提异议。" },
      { term: "Survey", zh: "地界测量图：确认围栏、车道、房子是否在自家地界内。" },
      { term: "Appraisal gap", zh: "估价差额：如果银行估价低于成交价，买方愿意自掏腰包补的最高金额。" },
      { term: "HOA addendum", zh: "业主协会附录：规定谁付 resale certificate、收到 HOA 文件后几天内可以退出。" },
      { term: "Closing Disclosure (CD)", zh: "过户结算单：过户前至少 3 个工作日收到，列出每一分钱的去向。报税时也要用。" },
      { term: "Seller concession", zh: "卖方让步：卖方帮买方付一部分过户费。" },
      { term: "Leaseback", zh: "回租：过户后卖方再租住一段时间。" },
      { term: "Homestead exemption", zh: "自住房免税额：过户后即可向县里申请，每年省几百到一千多美元的房产税。" },
    ],
    homeowner: {
      d3: [
        { label: "申请 homestead exemption", due: `${YEAR + 1}-04-30`, status: "open", zh: "过户后随时可以申请（截止明年 4/30），每年省约 $1,000+。需要驾照地址改到新家。", ask: true },
        { label: "第一张税单", due: `${YEAR + 1}-01-31`, status: "upcoming", zh: "县税务局寄来；1/31 前付清，否则罚息。贷款有 escrow 的话银行代付，核对一下。" },
        { label: "评估通知（appraisal notice）", due: `${YEAR + 1}-04-15`, status: "upcoming", zh: "县评估局 4 月寄出，写着他们认为你的房子值多少——决定你交多少税。" },
        { label: "评估抗辩截止", due: `${YEAR + 1}-05-15`, status: "upcoming", zh: "觉得估高了可以抗辩。我可以帮你准备 comps 证据包（AI 起草，我审）。", ask: true, ai: true },
        { label: "Home warranty 到期", due: d(+320), status: "upcoming", zh: "到期前决定续不续；我会提前 30 天提醒。" },
        { label: "报税要用 CD", due: `${YEAR + 1}-02-15`, status: "upcoming", zh: "报税时会计要 Closing Disclosure，这里随时能下载。" },
        { label: "过户一周年 · 估值", due: d(+320), status: "upcoming", zh: "我给你一份周年估值：涨了多少、周边成交。" },
        { label: "5–7 年换房窗口", due: `${YEAR + 5}-`, status: "future", zh: "到时候再说，但档案一直在。" },
      ],
    },
    commission: {
      d1: { gci: 15450, rate: 3, split: "80 / 20", agent: 12360, company: 3090, referralOut: 0, source: "合同 Broker Information 页", note: "推荐人周先生无牌照——TREC 禁止付推荐费，只送礼。" },
      d3: { gci: 13350, rate: 3, split: "80 / 20", agent: 10680, company: 2670, referralOut: 0, cda: [{ st: "申请", at: d(-52) }, { st: "Broker 批准", at: d(-50) }, { st: "PDF 发 title", at: d(-49) }, { st: "Funded", at: d(-45) }, { st: "Paid", at: d(-43) }] },
      ytd: { closed: 7, gci: 58900, agent: 47120, cap: 18000, capUsed: 12400, pipeline: 15450 },
    },
    cma: { p2: { comps: [
      { addr: "5601 Demo Ln", sqft: 3290, price: 679000, psf: 206, dom: 12, status: "已成交", close: d(-30) },
      { addr: "5712 Demo Ln", sqft: 3410, price: 695000, psf: 204, dom: 21, status: "已成交", close: d(-52) },
      { addr: "1801 Sample Ct", sqft: 3200, price: 662000, psf: 207, dom: 9, status: "已成交", close: d(-18) },
      { addr: "1905 Sample Ct", sqft: 3550, price: 712000, psf: 201, dom: 35, status: "Pending", close: "—" },
      { addr: "5820 Demo Ln", sqft: 3180, price: 689000, psf: 217, dom: 44, status: "在售", close: "—" },
      { addr: "1750 Sample Ct", sqft: 3330, price: 674900, psf: 203, dom: 6, status: "在售", close: "—" },
    ], range: [668000, 692000], suggest: 679000, summary: "近 60 天同小区 3 套成交，$201–207/sqf；在售 2 套定价偏高（$217）已挂 44 天。您这套 3,320 sqf、2021 年新屋顶，建议 $679,000 挂牌，7 天内没有 offer 则降到 $669,000。" } },
    marketing: {
      openHouse: { deal: "d2", when: d(-1) + " 13:00–15:00", signins: [
        { name: "Helen T.", phone: "214-***-1188", agent: "无", source: "路过", at: "13:12", followup: "pending" }, // v1.5：原来叫 Grace L.，和租客 Grace Lin（c30）撞名，换一个
        { name: "David & Mia", phone: "469-***-2201", agent: "有（Keller）", source: "网上看到", at: "13:40", followup: "na" },
        { name: "周太太", phone: "972-***-9080", agent: "无", source: "微信群", at: "14:05", followup: "pending", wechat: true },
        { name: "R. Patel", phone: "214-***-3300", agent: "无", source: "路过", at: "14:50", followup: "done" },
      ] },
      postcards: [{ name: "Just Sold · 910 Example Ct", audience: "Allen 75013 · 300 户", status: "已寄出 " + d(-30) }, { name: "Price Reduced · 5678 Demo Ln", audience: "微信长图", status: "草稿" }],
    },
    importer: { files: [{ name: "wise-agent-contacts.csv", rows: 2143 }, { name: "closed-2019-2025.zip", rows: 31, note: "31 份成交合同 PDF" }], result: { deals: 31, properties: 28, contacts: 47, merges: 19, anniversaries: 31, cost: 3.1 } },
    vjobs: [
      { id: "j0", contact: "c23", deal: "d7", cats: ["photographer"], date: d(-10), what: "出租房照片 18 张 + 平面图", cost: 180, rating: 5, review: "半天出片", by: "me" },
      { id: "j1", contact: "c17", deal: "d1", cats: ["inspector"], date: d(-3), what: "买方验房 · 48 页报告", cost: 450, rating: 5, review: "当天出报告，屋顶和电箱拍得很细", by: "me" },
      { id: "j2", contact: "c15", deal: "d1", cats: ["title"], date: d(-6), what: "开 escrow · title commitment", cost: null, rating: 5, review: "回复快，commitment 提前两天出", by: "me" },
      { id: "j3", contact: "c16", deal: "d1", cats: ["lender"], date: d(-6), what: "贷款 · appraisal 已下单", cost: null, rating: 4, review: "利率有竞争力，催文件有点紧", by: "me" },
      { id: "j4", contact: "c15", deal: "d3", cats: ["title"], date: d(-45), what: "过户", cost: null, rating: 5, review: "closing 顺利，客户说解释得很清楚", by: "client", byName: "张先生" },
      { id: "j5", contact: "c21", deal: "d3", cats: ["plumber"], date: d(-60), what: "option 期修漏水（卖方付）", cost: 380, rating: 4, review: "当天上门，价格公道", by: "me" },
      { id: "j6", contact: "c22", deal: "d3", cats: ["warranty"], date: d(-45), what: "买方一年保修（卖方付）", cost: 550, rating: null, review: "", by: "me" },
      { id: "j7", contact: "c23", deal: "d2", cats: ["stager", "photographer"], date: d(-24), what: "挂牌前软装 + 拍照", cost: 1800, rating: 5, review: "照片效果好，第一周 9 次看房", by: "me" },
      { id: "j8", contact: "c25", deal: "d2", cats: ["cleaner"], date: d(-25), what: "上市前深度清洁", cost: 320, rating: 4, review: "干净，窗户没擦到", by: "me" },
      { id: "j9", contact: "c24", deal: "d4", cats: ["electrician"], date: d(-30), what: "租客报修：厨房插座", cost: 150, rating: 3, review: "修好了，但迟到两小时", by: "other", byName: "租客 Ben Carter" },
      { id: "j10", contact: "c21", deal: "d4", cats: ["handyman"], date: d(-15), what: "换门锁 + 小修", cost: 120, rating: 5, review: "", by: "me" },
    ],
    // ===== v1.0 · 交易类型模板（先选类型，再让合同成为数据）=====
    // v1.4（决定 46）：阶段包——交易类型模板 + 当前阶段决定默认露出的 tab / 字段档 / 动作 / 提示；其余收进「更多」
    stagePacks: {
      buyer: {
        prospecting: { tabs: ["overview", "milestones", "parties", "comms"], tier: "minimal", actions: [["看房预约", "#/showings"], ["目标房排队", "contact"]], tip: "签代理协议 → 看房 → 把想买的标成目标房；出价从目标房上点" },
        offer: { tabs: ["overview", "offers", "milestones", "comms"], tier: "minimal", actions: [["Offer 逐条款", "tab:offers"], ["中英条款卡", "tab:offers"]], tip: "Offer 阶段就上传一方签字的文件；逐条款记谁提的；对方签字 → 自动变合同" },
        under_contract: { tabs: ["overview", "milestones", "fields", "docs", "money", "tasks"], tier: "standard", actions: [["Option 期 · 验房", "tab:milestones"], ["贷款 · 评估", "tab:milestones"], ["钱的时间线", "tab:money"]], tip: "四条线并行：验房 / 产权 / HOA / 贷款，各自截止；钱和截止节点做了还要「核实」" },
        clear_to_close: { tabs: ["overview", "milestones", "money", "docs", "compliance"], tier: "standard", actions: [["Closing Disclosure", "tab:docs"], ["电汇核实", "tab:money"], ["合规清单", "tab:compliance"]], tip: "过户前 3 天 CD；电汇只打已知电话核实；合规清单补齐才能发 CDA" },
        closed: { tabs: ["overview", "money", "docs", "client"], tier: "minimal", actions: [["成交后时间线", "tab:client"], ["推荐卡", "tab:client"]], tip: "第二条时间线：homestead · 保修 · 周年；文件保留 4 年" },
      },
      seller: {
        pre_listing: { tabs: ["overview", "milestones", "fields", "parties"], tier: "minimal", actions: [["CMA", "#/cma"], ["披露 · 照片", "tab:docs"]], tip: "委托协议 → 定价 → 披露 + 照片 → 上市" },
        listed: { tabs: ["overview", "offers", "milestones", "comms"], tier: "minimal", actions: [["看房反馈", "tab:comms"], ["收到的 Offer", "tab:offers"]], tip: "挂牌中看看房和反馈；收到 Offer 就并列比 net to seller" },
        offer: { tabs: ["overview", "offers", "milestones", "comms"], tier: "minimal", actions: [["Offer 对比", "tab:offers"], ["客户决定卡", "tab:comms"]], tip: "几个 Offer 并列，逐条款谈；客户在决定卡上拍板（夫妻都是决策人）" },
        under_contract: { tabs: ["overview", "milestones", "docs", "money", "tasks"], tier: "standard", actions: [["维修谈判", "tab:milestones"], ["产权 · 勘测", "tab:milestones"]], tip: "买方 Option 期内随时可退；维修谈成 → 继续" },
        clear_to_close: { tabs: ["overview", "money", "docs", "compliance"], tier: "standard", actions: [["结清房贷 · 结算单", "tab:money"]], tip: "payoff → 结算单 → 过户交房" },
        closed: { tabs: ["overview", "money", "docs"], tier: "minimal", actions: [["推荐卡", "tab:client"]], tip: "净收益到账；推荐链" },
      },
      lessor: {
        pre_listing: { tabs: ["overview", "milestones", "parties"], tier: "minimal", actions: [["定租金", "#/cma"]], tip: "委托 → 定租金 → 上市" },
        listed: { tabs: ["overview", "milestones", "comms"], tier: "minimal", actions: [["收申请", "lease"]], tip: "看房 · 收申请；书面筛选标准（§92.3515）" },
        applying: { tabs: ["overview", "milestones", "docs", "comms"], tier: "minimal", actions: [["审申请", "lease"]], tip: "按书面标准审；敏感信息先遮；批准 / 拒绝通知" },
        lease_pending: { tabs: ["overview", "milestones", "docs", "money"], tier: "standard", actions: [["起草租约", "lease"], ["押金 + 首月", "tab:money"]], tip: "租约线 + 钱与交房线并行" },
        active: { tabs: ["overview", "money", "tasks", "docs"], tier: "minimal", actions: [["租赁运营", "#/rentals"]], tip: "租金时间线 · 工单 · 续约提醒 90 / 60 / 30" },
        ended: { tabs: ["overview", "money", "docs"], tier: "minimal", actions: [], tip: "退押金 30 天内结算" },
      },
      lessee: {
        prospecting: { tabs: ["overview", "milestones", "comms"], tier: "minimal", actions: [["看房预约", "#/showings"], ["目标房排队", "contact"]], tip: "代理协议 → 看房 → 目标房 → 提交申请" },
        applying: { tabs: ["overview", "milestones", "docs", "comms"], tier: "minimal", actions: [["申请材料", "tab:docs"]], tip: "材料清单 · 申请费；房东审核中" },
        lease_pending: { tabs: ["overview", "milestones", "money", "docs"], tier: "standard", actions: [["押金 + 首月", "tab:money"], ["租客保险", "tab:tasks"]], tip: "钱 + 入住准备并行" },
        active: { tabs: ["overview", "money", "tasks"], tier: "minimal", actions: [], tip: "交租 · 报修 · 续约提醒" },
        ended: { tabs: ["overview", "money"], tier: "minimal", actions: [], tip: "退押金" },
      },
    },
    templates: [
      { id: "buyer", name: "买房", en: "BUYER", version: "v1.2", status: "published", flow: "Offer → Option → 贷款 → 过户", contracts: ["TREC 20（1–4 户买卖合同）", "40（第三方贷款附录）", "36（HOA 附录）", "39（Amendment）"], fields: [["买方", true], ["卖方", true], ["房产", true], ["生效日", true], ["成交价", true], ["Option 费 / 天数", true], ["定金", true], ["贷款条件", false], ["Title 公司", false], ["附件清单", false]], people: "买方（签约人，夫妻都是决策人）· 卖方 · 对方经纪 · Title · Lender · 验房师", dates: "生效日 → Option 截止 · 贷款批准 · Survey · 过户（相对日期，锚点一改全部重排）", milestones: "签约前 5 步 → 四条线并行（A 验房 · B 产权 · C HOA · D 贷款）→ 交割 3 步", checklist: "签约前：IABS · CPN · Buyer Rep ｜ 合同期：合同 · EM / Option 收据 · Seller's Disclosure 签收 · 贷款附录 · HOA 附录 ｜ 过户前：Amendment · Title Commitment →「合规 + CDA」一次提交 ｜ 过户后：Closing Statement / CD", commission: "从成交价 × 比例，按 membership 方案分成" },
      { id: "seller", name: "卖房", en: "SELLER", version: "v1.1", status: "published", flow: "上市 → 看房 → Offer → 交割", contracts: ["TREC 20", "Listing Agreement（TXR-1101）", "Seller's Disclosure（TXR-1406 / OP-H）", "39（Amendment）"], fields: [["卖方", true], ["挂牌价", true], ["挂牌期", true], ["佣金", true], ["房产", true], ["披露事项", false], ["Leaseback", false]], people: "卖方（夫妻都是决策人）· 买方 · 买方经纪 · Title · 摄影 / 软装", dates: "挂牌日 → 反馈周报 · Offer 截止 · 合同后同买房线", milestones: "准备 · 上市 · 反馈 · Offer · 合同执行 · 结算", checklist: "签约前：IABS · Listing 协议 · 披露 · 含铅漆 · HOA resale cert · MUD / PID ｜ 合同期：合同 · 收据 ｜ 过户前：Amendment · Title →「合规 + CDA」一次提交 ｜ 过户后：Closing Statement", commission: "挂牌方 + 买方经纪费（按合同 §12）" },
      { id: "lessor", name: "放租", en: "LESSOR · 房东侧", version: "v1.0", status: "published", flow: "资产 → 上市 → 筛选 → 租约运营", contracts: ["TXR-2003（租房申请）", "TXR-2001（住宅租约）", "宠物附录", "收入 / 信用材料（只留结论）"], fields: [["房东", true], ["房产", true], ["租金", true], ["可入住日", true], ["书面选择标准", true], ["押金", false], ["宠物政策", false]], people: "房东 · 申请人 → 租客 · 租客经纪 · 维修 Vendor", dates: "上市 → 申请 → 批准 → 签约 → 入住 → 每月 1 日租金 → 到期前 90 / 60 / 30 天", milestones: "上市 · 申请审核 · 批准 · 签约 · 入住检查 · 每月租金 · 续约窗口 · 押金退还", checklist: "选择标准（§92.3515）· 申请授权 · 评分卡 · 批准 / 拒绝通知 · 租约 · 入住清单", commission: "首月租金 / 按租约总额比例" },
      { id: "lessee", name: "寻租", en: "LESSEE · 租客侧", version: "v1.0", status: "published", flow: "需求 → 看房 → 申请 → 签约拿钥匙", contracts: ["TXR-2003（租房申请）", "TXR-2001（住宅租约）", "Buyer / Tenant Rep 协议"], fields: [["租客", true], ["预算 / 区域", true], ["入住日", true], ["申请房源", true], ["租约条款", false]], people: "租客 · 房东 · listing agent · 担保人（如有）", dates: "看房 → 申请截止 → 批准 → 签约 → 拿钥匙", milestones: "找房 · 看房 → 申请审核中 → 已批准 · 签约前 → 租赁中（客户端看同一张路线图的人话版）", checklist: "Tenant Rep · 申请授权 · 材料清单 · 租约 · 押金收据 · 钥匙交接", commission: "房东付租客经纪费（按 MLS 约定）" },
    ],
    templateNotes: { reserved: "Referral / Dual Agency 预留同级类型位；启用前要补齐角色冲突、佣金与合规规则。", broker: "Broker 可加字段、节点、责任人与提醒；法规锚点、审计与权限边界不可删。组织级改动生成新版本，已建交易保持原版本，明确迁移才更新。" },

    // ===== v1.0 · 看房预约（AI 预约 → 确认邮件解析 → 路线 → 同步到两个 App）=====
    tours: [
      // v1.3：一个 tour = 一个客户一次出行；同一天可以有几个客户各自的 tour；homes[].visit = 现场记录（到场 / 离开 / 评分 / 笔记 / 语音 / 照片）；tour.status 五种（和 tours.js TOUR_ST 一致）：planning 预约中（还没发请求）· requested 已发起 · confirmed 已确认 · in_progress 进行中 · done 完成（进看房历史）；homes[].status：booking 预约中 · confirmed 已确认 · reschedule 需改期；homes[].time = 约好的时段，win = 这套房允许看的时段
      { id: "tour1", client: "c10", deal: "d5", date: d(0), start: "10:00", status: "in_progress", homes: [
        { id: "h1", addr: "4321 Wishlist Ave, Frisco", prop: "p6", status: "confirmed", win: "09:00–12:00", time: "10:00–10:45", meet: "前门", lock: "Supra（到场推送）", how: "确认邮件已解析 · 置信 0.99", drive: "从起点 14 分钟", stay: 45, visit: { arrived: "10:02", left: "10:48", note: "厨房小；学区好；孩子喜欢后院", rating: 4, voice: "客户说这套的位置最好，就是厨房太小，问能不能打通；太太担心屋顶 2011 年的；要问 HOA 能不能停 RV。", photos: 3 } },
        { id: "h2", addr: "8765 Pattern Pl, Frisco", prop: "p9", status: "confirmed", win: "11:00–14:00", time: "11:00–11:45", meet: "车库侧门", lock: "密码盒 · 5678", how: "确认邮件已解析 · 置信 0.97", drive: "两房之间 12 分钟", stay: 45, visit: { arrived: "11:05", photos: 1 } },
        { id: "h3", addr: "2222 Mockup Ct, Frisco", prop: "p10", status: "reschedule", win: "12:30–15:00", time: "原 12:00 不可用", meet: "—", lock: "—", how: "对方经纪回复该时段有租客 · AI 不会自作主张接受替补", drive: "17 分钟", stay: 45, alts: ["12:30–13:15", "13:30–14:15"], impact: "整条路线 +30 分钟" },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
      { id: "tour2", client: "c11", deal: null, date: d(+1), start: "13:30", status: "requested", homes: [
        { id: "h4", addr: "3333 Sample St, Frisco", prop: "p12", status: "confirmed", win: "13:00–17:00", time: "13:30–14:15", meet: "前门", lock: "Supra（到场推送）", how: "确认邮件已解析 · 置信 0.98", drive: "从起点 20 分钟", stay: 45 },
        { id: "h5", addr: "6060 Placeholder Pkwy, Frisco", prop: "p13", status: "booking", win: "12:00–14:00", time: "14:30–15:15（建议）", meet: "—", lock: "—", how: "预约请求已备好 · 你点了发送（ShowingTime）· 等确认邮件", drive: "两房之间 9 分钟", stay: 45 },
      ], sync: { deal: false, calendar: false, agentApp: false, clientApp: false } },
      { id: "tour3", client: "c31", deal: "d10", date: d(+1), start: "16:00", status: "confirmed", homes: [
        { id: "h6", addr: "3690 Placeholder Ct, Frisco", prop: "p8", status: "confirmed", win: "15:00–18:00", time: "16:00–16:30", meet: "前门", lock: "密码盒 · 1234#", how: "我方房源 · 直接安排", drive: "从起点 10 分钟", stay: 30 },
        { id: "h7", addr: "1010 Draft Ln, Plano", prop: "p14", status: "confirmed", win: "16:00–19:00", time: "16:45–17:15", meet: "门口", lock: "Supra（到场推送）", how: "确认邮件已解析（Your showing has been confirmed）· 已写入日历 · 置信 0.96", calendar: true, drive: "两房之间 14 分钟", stay: 30 },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
      { id: "tp1", client: "c10", deal: "d5", date: d(-7), start: "10:00", status: "done", feedbackAt: d(-7), summary: "2 套：1357 Prototype 当天决定出价（后落选）· 7700 Mock 否", homes: [
        { id: "h8", addr: "1357 Prototype Blvd, Frisco", prop: "p5", status: "confirmed", time: "10:00–10:45", meet: "前门", lock: "Supra", how: "—", drive: "15 分钟", stay: 45, visit: { arrived: "10:01", left: "10:50", note: "客户很喜欢；当天决定出价", rating: 5, photos: 6 } },
        { id: "h9", addr: "7700 Mock Dr, Frisco", prop: "p15", status: "confirmed", time: "11:00–11:30", meet: "前门", lock: "Supra", how: "—", drive: "12 分钟", stay: 30, visit: { arrived: "11:02", left: "11:25", note: "太旧 · 屋顶 2005 · 客户直接否", rating: 2, photos: 2 } },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
      { id: "tp2", client: "c1", deal: "d1", date: d(-40), start: "14:00", status: "done", feedbackAt: d(-40), summary: "2 套：1234 Sample 就是它 · 5050 Blueprint 太贵", homes: [
        { id: "h10", addr: "1234 Sample Dr, Frisco", prop: "p1", status: "confirmed", time: "14:00–14:45", meet: "前门", lock: "Supra", how: "—", drive: "18 分钟", stay: 45, visit: { arrived: "14:00", left: "14:52", note: "就是它：动线和采光都对；验房要看地基", rating: 5, photos: 8 } },
        { id: "h11", addr: "5050 Blueprint Blvd, Frisco", prop: "p16", status: "confirmed", time: "15:00–15:30", meet: "前门", lock: "Supra", how: "—", drive: "9 分钟", stay: 30, visit: { arrived: "15:03", left: "15:28", note: "位置好但太贵", rating: 3, photos: 2 } },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
      { id: "tp3", client: "c11", deal: null, date: d(-1), start: "14:00", status: "done", feedbackAt: d(-1), summary: "1 套：5678 Demo 喜欢后院、嫌贵", homes: [
        { id: "h12", addr: "5678 Demo Ln, Plano", prop: "p2", status: "confirmed", time: "14:00–14:40", meet: "前门", lock: "Supra", how: "我方挂牌", drive: "22 分钟", stay: 40, visit: { arrived: "14:01", left: "14:38", note: "喜欢后院；觉得价格偏高，想看 $650k 左右的", rating: 3, photos: 4 } },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
      { id: "tp4", client: "c9", deal: "d7", date: d(-9), start: "14:00", status: "done", feedbackAt: d(-9), summary: "1 套：3690 Placeholder 满意，当场决定申请", homes: [
        { id: "h13", addr: "3690 Placeholder Ct, Frisco", prop: "p8", status: "confirmed", time: "14:00–14:30", meet: "前门", lock: "密码盒 · 1234#", how: "我方房源", drive: "10 分钟", stay: 30, visit: { arrived: "14:00", left: "14:33", note: "满意，当场决定申请；问了宠物政策", rating: 5, photos: 3 } },
      ], sync: { deal: true, calendar: true, agentApp: true, clientApp: true } },
    ],

    // ===== v1.0 · AI 自动化管控（延迟发送 · 总开关 · 成本 · 熔断）=====
    automation: {
      masterOn: true,
      // v1.5（R-3 · D14）：队列里只有两种——① 人已经点过的：你放行的 AI 草稿（撤回 = 回到草稿）· 你点了「给卖家看」的看房反馈 · 你点的催办 · Broker 批过的 T3；② 通知契约里的固定提醒（不是 AI 现写的）。
      // 都先等 5 分钟再发，之前随时撤回；没人点过的 AI 文字进不了队列。cat = 属于哪个开关（关了就不进队列）；总开关关了 = 整个队列暂停。微信不代发，邮件只读。
      queue: [
        { id: "q1", at: 258, title: "给陈太太的进度说明", d: "1234 Sample Dr · AI 起草 · 你已放行 · 5 分钟后发出（系统内消息）· 撤回 = 回到草稿", deal: "d1", cat: "client_out", status: "queued" },
        { id: "q2", at: 164, title: "提醒陈先生 / 陈太太：Option 期明天 17:00 截止", d: "1234 Sample Dr · 系统提醒 · 通知契约的固定句式（截止前 72 小时 + 当日；不是 AI 现写的）· 5 分钟后发出", deal: "d1", cat: "client_out", status: "queued" },
        { id: "q3", at: 69, title: "卖家看房反馈：" + d(-2) + " 11:00 那一场", d: "5678 Demo Ln · 你点了「给卖家看」· 已放行 · 5 分钟后出现在卖方客户视图", deal: "d2", cat: "seller_feedback", status: "queued", ls: "ls2" },
      ],
      switches: [
        { key: "client_out", name: "对客户外发", d: "你放行的草稿和话术 · 通知契约里的固定提醒", on: true },
        { key: "party_nudge", name: "催协作方", d: "你点的催办 · Broker 批过的对外发送（贷款、Title、Vendor）", on: true },
        { key: "seller_feedback", name: "卖家反馈同步", d: "看了几场自动同步；反馈的文字你点「给卖家看」才进队列", on: true },
        { key: "email_intake", name: "邮件解析（Email Intake）", d: "按交易授权，不是全局扫描", on: true },
      ],
      calls: 1842,
      budget: [
        { who: "Jason", pct: 62, note: "预算内" }, { who: "Mary Liu", pct: 91, note: "接近熔断" }, { who: "Mike", pct: 48, note: "预算内" },
      ],
      breaker: [["达到 100%", "暂停非关键 AI 生成；合同截止日、合规提醒继续跑", "自动熔断"], ["Broker 临时加额", "每次豁免写操作者、原因、上限和有效期", "需审计"]],
    },

    // ===== v1.0 · 租赁运营（房东资产 · 租金时间线 · 维修工单 · 租客评分卡）=====
    rentals: {
      threshold: 300, // 房东设的维修门槛：报价超过它，先推给房东批，没批不施工（工单自己也可以带 threshold）
      asset: { deal: "d4", property: "p4", lease: "已签 · 12 个月", occupancy: "100%", deposit: "$2,650 · 托管", hvac: "2019 · 档案已建", insurance: "房东险 · 待年度复核", hoa: "$720 / 年 · 规则已关联", renewal: "到期前 90 / 60 / 30 天三次提醒", expires: d(+305) },
      rent: [
        { m: "本期", due: "$2,650 · 1 日到期", got: "$2,650 · 已到账（回执已关联）", st: "ok" },
        { m: "上期", due: "$2,650", got: "$2,650 · 3 日到账", st: "ok" },
        { m: "上上期", due: "$2,650", got: "$2,650 · 逾期 4 天 · 已提醒租客 + 通知房东", st: "late" },
      ],
      // 工单 stage：0 请求 · 1 诊断 · 2 报价审批 · 3 派单 · 4 进度 · 5 结算。要不要房东批 = stage 2 且 cost > 门槛 且 还没 approved（work.js NBRent.needsApproval）
      orders: [
        { id: "WO-118", what: "车库插座异常（租客报修）", deal: "d4", stage: 2, stages: ["请求", "诊断", "报价审批", "派单", "进度", "结算"], vendor: "c24", cost: 340, threshold: 300, approved: false, rule: "报价超过房东设定的 $300 门槛 → 先推送房东审批；未批准前不施工", note: "租客 Ben Carter 昨晚报修，照片 2 张；诊断：线路老化，要换线 + 新插座" },
        { id: "WO-112", what: "换门锁 + 小修", deal: "d4", stage: 5, stages: ["请求", "诊断", "报价审批", "派单", "进度", "结算"], vendor: "c21", cost: 120, threshold: 300, approved: true, rule: "低于门槛，自动处理", note: "已结算 · 5 星" },
      ],
      // 评分卡只陈述「申请内容 vs 房东书面标准」：不看 Fair Housing 受保护类别，不写推荐 / 不推荐
      scorecard: { deal: "d7", applicant: "刘先生", verdict: "5 项对上房东的书面标准，1 项待核实（收入证明明天到）。", rows: [
        ["收入倍数", "申报 $8,200 / 月 → 3.4×（标准 3×）", "y", "申请表 p.2 · 工资单还没到（明天截止）"],
        ["信用", "分数满足门槛 · 无 collections", "g", "第三方报告 · 报告日期 14 天内"],
        ["工作稳定", "在职 2 年 3 个月", "g", "主管电话核实 · 任务已完成"],
        ["租房历史", "两处连续 · 前房东无投诉", "g", "前房东电话核实"],
        ["宠物", "小型犬 1 只 12 lb（标准：≤ 2 只 · 每只 ≤ 40 lb）", "g", "申请表 p.2 · 宠物押金 $300"],
        ["人数", "1 人（每卧室 ≤ 2 人）", "g", "申请表"],
      ], privacy: "房东只看评分卡和摘要；工资单、信用报告全文只有经纪人能看；申请人授权可撤回。保留期：申请材料 60 天后自动删，收入材料 30 天后删（只留核实后的数字）。" },
    },

    // ===== v1.0 · Broker：招募管线 · 佣金双视角 · append-only 审计 =====
    recruit: { stages: [["候选人", 12], ["面谈", 6], ["签约", 3], ["培训", 2], ["首单", 1]], next: ["候选人 Ken（示例）· 面谈 · 周四 10:00", "Mike · 培训 · 第 3 周 · 第一笔交易陪跑"] },
    commissionViews: { agent: { label: "经纪人视角", net: "$12,360（1234 Sample Dr · 预计）", pending: "3 项费用待核对（E&O · tech fee · franchise）" }, company: { label: "公司视角", net: "$3,090 company dollar（本笔）· 本月预计 $9,800", pending: "cap 进度：Jason 12,400 / 18,000" } },
    auditEvents: [
      { at: d(0) + " 09:12", who: "Broker · Ann", what: "权限策略已更新（规则版本 v4）", kind: "policy" },
      { at: d(0) + " 08:40", who: "系统", what: "佣金视角已读取（只读查询）", kind: "read" },
      { at: d(-1) + " 21:03", who: "Jason", what: "deal_fields.sales_price v1 → v2（Amendment）", kind: "write" },
      { at: d(-1) + " 20:55", who: "AI", what: "proposal pr4 生成：新 offer 版本 v3（邮件解析）", kind: "ai" },
    ],

    // ===== v1.0 · 会面记录 → 转跟进 =====
    meetings: [
      // v1.5：deal = 这次会面说的是哪笔交易（进那笔交易的沟通时间线）；一个人可以有很多条会面记录
      { id: "mt2", contact: "c1", deal: "d1", at: d(-5) + " 19:00", where: "验房后 · 电话", text: "陈先生最在意热水器和屋顶；父母 10 月来住，想 10 月中前搬进。太太问定金可退性。", todos: ["整理验房报告中文摘要（重要 3 项）", "问卖方经纪：热水器换新是否可谈", "把定金可退条款页码发给陈太太"], next: d(0) + " 18:00" },
      { id: "mt3", contact: "c5", deal: "d2", at: d(-2) + " 10:30", where: "Open House 前 · 见面", text: "李女士能接受 $625k 以上的 net to seller；不想给 leaseback；希望 30 天内过户。", todos: ["算买家 A counter 的 net to seller", "准备两条方案（同意 / 回 $672k）"], next: d(0) + " 12:00" },
      { id: "mt4", contact: "c4", deal: "d9", at: d(-1) + " 16:00", where: "微信语音", text: "王先生同意维修门槛 $300；4444 Template Trl 还有 75 天到期，60 天那次提醒前想看周边租金再定涨幅。", todos: ["工单 WO-118 报价后推审批", "到期前 60 天准备租金对比（4444 Template Trl）"], next: d(+3) + " 10:00" },
      { id: "mt5", contact: "c9", deal: "d7", at: d(-9) + " 14:00", where: "看房 · 3690 Placeholder Ct", text: "刘先生想 " + d(+12) + " 入住，有一只小型犬（12 lb）；收入稳定，两个月工资单可提供。", todos: ["提交申请 + 宠物说明", "提醒上传工资单"], next: d(+1) + " 12:00" },
      { id: "mt1", contact: "c10", deal: "d5", at: d(-1) + " 15:30", where: "看房后 · 车上", text: "客户更喜欢采光和一楼动线；需核验后院排水和东南角地板。今晚整理三套对比，明天中午前跟进。太太担心 2011 年的屋顶。", todos: ["整理三套对比（今晚）", "跟进 4321 Wishlist 屋顶年份 + HOA 能否停 RV", "明天中午前回复赵女士"], next: d(+1) + " 12:00" },
    ],

    // ===== v1.1 · 消息（有针对性的沟通）：每条对话挂在一个对象上 =====
    threads: [
      { id: "th1", kind: "client", deal: "d1", contact: "c1", members: ["c1", "c2"], anchor: { type: "deal", id: "d1" }, subject: "1234 Sample Dr · 买房", status: "waiting_agent", pinned: true, lastAt: d(0) + " 09:40", lastText: "定金什么时候退？如果我们在 Option 期内取消。", created: d(-6) + " 18:05" },
      { id: "th2", kind: "client", deal: "d2", contact: "c5", members: ["c5", "c6"], anchor: { type: "deal", id: "d2" }, subject: "5678 Demo Ln · 卖房", status: "waiting_client", lastAt: d(0) + " 10:12", lastText: "请确认：买家 A 的 counter：$668,000 · option 5 天", created: d(-21) + " 09:00" },
      { id: "th3", kind: "client", deal: "d5", contact: "c10", members: ["c10"], anchor: { type: "tour", id: "tour1" }, subject: "周末看房路线 · 3 站", status: "waiting_agent", lastAt: d(0) + " 08:55", lastText: "4321 Wishlist Ave 的 HOA 一年多少？", created: d(-2) + " 20:30" },
      { id: "th4", kind: "client", deal: "d7", contact: "c9", members: ["c9"], anchor: { type: "deal", id: "d7" }, subject: "3690 Placeholder Ct · 租房申请", status: "waiting_client", lastAt: d(-1) + " 16:20", lastText: "请上传：最近两个月工资单（照片即可）", created: d(-9) + " 11:00" },
      { id: "th5", kind: "client", deal: "d4", contact: "c4", members: ["c4"], anchor: { type: "workorder", id: "WO-118" }, subject: "2468 Model Way · 维修审批", status: "waiting_client", lastAt: d(0) + " 07:50", lastText: "请审批：车库插座维修报价 $340（超过 $300 门槛）", created: d(-1) + " 21:10" },
      { id: "th6", kind: "broker", deal: "d1", contact: null, members: [], anchor: { type: "deal", id: "d1" }, subject: "合规 + CDA 审批 · 1234 Sample Dr", status: "waiting_broker", lastAt: d(0) + " 09:05", lastText: "请审批：合规 + CDA 申请 · 1234 Sample Dr · 佣金 $15,450（T3）", created: d(0) + " 09:05" },
      { id: "th7", kind: "broker", deal: "d1", contact: null, members: [], anchor: { type: "deal", id: "d1" }, subject: "合规问题：买方父母出资", status: "waiting_broker", lastAt: d(-1) + " 15:30", lastText: "买方父母赠与 $50k，赠与信已收到；还需要额外 disclosure 吗？", created: d(-1) + " 15:30" },
      { id: "th8", kind: "broker", deal: null, contact: null, members: [], anchor: { type: "org" }, subject: "公告：10 月起 CDA 提前 3 天提交", status: "open", broadcast: true, lastAt: d(-2) + " 09:00", lastText: "10 月 1 日起，CDA 请在过户前 3 个工作日提交…", created: d(-2) + " 09:00" },
      { id: "th9", kind: "team", deal: "d3", contact: null, members: ["u2"], anchor: { type: "deal", id: "d3" }, subject: "910 Example Ct · 成交后交接（TC Lisa）", status: "open", lastAt: d(-3) + " 11:40", lastText: "收到，谢谢。homestead 提醒我看到了。", created: d(-40) + " 10:00" },
    ],
    messages: [
      // v1.5（D28）：请求卡的每个选项自己带结果 outcome：done 同意 / 办了 · declined 不同意 · discuss 想先商量——不再靠选项文字里有没有「拒」「不」来猜
      // th1 · 买房 d1 · 陈先生一家
      { id: "ms1", thread: "th1", at: d(-6) + " 18:05", from: { role: "agent", id: "u1", name: "Jason" }, kind: "text", text: "合同今天生效了。Option 期 7 天，到 " + d(+1) + " 下午 5 点（周末不顺延），这几天先安排验房，我明天给您两个时间。", attach: [{ type: "milestone", id: "m5", label: "Option 期截止 " + d(+1) }], seen: { agent: true, client: true } },
      { id: "ms2", thread: "th1", at: d(-5) + " 21:12", from: { role: "client", id: "c1", name: "陈先生" }, kind: "text", text: "验房报告出来后能不能把大问题挑出来讲一下？我爸妈也想看。", seen: { agent: true, client: true } },
      { id: "ms3", thread: "th1", at: d(-5) + " 21:30", from: { role: "agent", id: "u1", name: "Jason" }, kind: "text", text: "可以，报告到了我先整理成中文人话，重要的 3 项单独讲。", seen: { agent: true, client: true } },
      { id: "ms4", thread: "th1", at: d(-1) + " 17:40", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "Amendment 双方签好了：卖方减价 $5,000（成交价 $515,000），屋顶我们自己修。Option 期明天 " + d(+1) + " 下午 5 点截止，之前请您确认：继续，还是退出（退出只损失 $500 option fee）。", request: { action: "confirm", to: "client", title: "Option 期截止前确认：继续，还是退出？", due: d(0), status: "pending", options: [{ label: "继续", outcome: "done" }, { label: "退出", outcome: "declined" }, { label: "先问经纪人", outcome: "discuss" }], effect: { type: "task", deal: "d1", task: "t6" } }, seen: { agent: true, client: true } },
      { id: "ms5", thread: "th1", at: d(0) + " 08:00", from: { role: "system", name: "系统" }, kind: "system", text: "提醒：Option 期明天（" + d(+1) + "）下午 5 点截止，周末不顺延。截止前要确认：继续，还是退出。", attach: [{ type: "milestone", id: "m5", label: "Option 期截止" }], seen: { agent: true } },
      { id: "ms6", thread: "th1", at: d(0) + " 09:30", from: { role: "ai", id: "ai", name: "AI 草稿" }, kind: "text", text: "陈先生您好，Amendment 已经双方签好：成交价改为 $515,000（减 $5,000 代替修屋顶）。剩下两项（热水器、车库门弹簧）卖方今天上午回了话，我把两边的说法并排发给您二位。Option 期明天下午 5 点截止，今晚前告诉我您的决定就来得及。", ai: { draft: true, tier: 2, why: "Amendment 已归档 + 卖方回应到了 → 按「进展 + 下一步 + 截止」模板起草；客户可见文字需经纪人放行（T2）" }, seen: { agent: false } },
      { id: "ms26", thread: "th1", at: d(0) + " 09:35", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "屋顶已经用减价解决了。剩下两项卖方今天回了话，两边的说法我并排放在下面，您二位各自点一下。", request: { action: "decide", to: "client", title: "剩下两项维修：接受卖方的回应，还是再谈？", due: d(+1), status: "pending", options: [{ label: "接受", outcome: "done" }, { label: "再 counter", outcome: "declined" }, { label: "给我打电话", outcome: "discuss" }], decision: { sides: [{ label: "我们要求（买方）", items: ["换热水器（约 14 年）", "修车库门弹簧"] }, { label: "卖方给", items: ["热水器不换 · 合同里卖方出的 $600 Home Warranty 可以覆盖", "同意修车库门弹簧（过户前修好）"] }], agentView: "屋顶已经用减价 $5,000 解决（Amendment 昨天签好）。剩下两项里卖方答应修车库门；热水器不换，但 $600 的 Home Warranty 能覆盖，实际差不多。我建议接受。Option 期明天下午 5 点截止，今晚前答复最稳。", deciders: ["c1", "c2"], reads: { c1: d(0) + " 09:50" }, answers: {} }, effect: { type: "decide", deal: "d1" } }, seen: { agent: true, client: false } },
      { id: "ms7", thread: "th1", at: d(0) + " 09:40", from: { role: "client", id: "c2", name: "陈太太" }, kind: "text", text: "定金什么时候退？如果我们在 Option 期内取消。", seen: { client: true } },
      // th2 · 卖房 d2 · 李女士
      { id: "ms8", thread: "th2", at: d(-1) + " 19:30", from: { role: "system", name: "系统" }, kind: "feedback", text: "今天有 2 组看房（看了几场是自动同步的）。反馈的文字要 Jason 点了「给卖家看」才会出现——他已放行 1 条：「买家喜欢厨房，觉得价格偏高 2%」。", seen: { agent: true, client: true } },
      { id: "ms9", thread: "th2", at: d(-1) + " 20:02", from: { role: "client", id: "c5", name: "李女士" }, kind: "text", text: "嫌贵的那组出价了吗？", seen: { agent: true, client: true } },
      { id: "ms10", thread: "th2", at: d(-1) + " 20:20", from: { role: "agent", id: "u1", name: "Jason" }, kind: "text", text: "还没有。您同意的 $675,000 counter 我刚发给买家 A，对方回了我明早整理好方案给您。", seen: { agent: true, client: true } },
      { id: "ms11", thread: "th2", at: d(0) + " 10:12", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "买家 A 的 counter：$668,000，option 5 天 / $500，30 天过户，Conventional 20%。按这个价您的 net to seller 约 $627,920（价格 − 卖方付的费用 − 佣金 6%；还没扣房贷余额和税费分摊）。两条路：同意 → 我今天回对方；再谈 → 我回 $672,000 试一次。", request: { action: "confirm", to: "client", title: "买家 A 的 counter：$668,000 · option 5 天", due: d(+1) + " 17:00", status: "pending", options: [{ label: "同意", outcome: "done" }, { label: "再谈", outcome: "declined" }, { label: "拒绝", outcome: "declined" }], effect: { type: "offer", deal: "d2", offer: "o1" } }, attach: [{ type: "offer", id: "o1", label: "Offer o1 · v3 $668,000" }], seen: { agent: true } },
      // th3 · 找房 c10 · 看房路线
      { id: "ms12", thread: "th3", at: d(-2) + " 20:30", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "周末带您看 3 套，路线我排好了（4321 Wishlist Ave → 8765 Pattern Pl → 2222 Mockup Ct）。", request: { action: "pick_time", to: "client", title: "周末看房几点出发？", due: d(0), status: "done", options: ["10:00", "13:00"], answer: "10:00", doneAt: d(-2) + " 21:05", by: "c10", effect: { type: "tour-start" } }, seen: { agent: true, client: true } },
      { id: "ms13", thread: "th3", at: d(-2) + " 21:05", from: { role: "system", name: "系统" }, kind: "system", text: "赵女士已选时间「10:00」· 路线出发时间已更新，已同步到日历和客户 App。", seen: { agent: true, client: true } },
      { id: "ms14", thread: "th3", at: d(-1) + " 12:10", from: { role: "system", name: "系统" }, kind: "system", text: "2222 Mockup Ct 原 12:00 不可用，对方给了 12:30 / 13:30 两个替补；经纪人确认后才改期。", seen: { agent: true, client: true } },
      { id: "ms15", thread: "th3", at: d(0) + " 08:55", from: { role: "client", id: "c10", name: "赵女士" }, kind: "text", text: "4321 Wishlist Ave 的 HOA 一年多少？孩子上学是走 Frisco ISD 的哪个高中？", attach: [{ type: "property", id: "p6", label: "4321 Wishlist Ave" }], seen: { client: true } },
      // th4 · 申请人 c9 · 租房申请
      { id: "ms16", thread: "th4", at: d(-2) + " 10:00", from: { role: "system", name: "系统" }, kind: "system", text: "申请已提交 · 房东审核中。房东只看评分卡 + 摘要；工资单全文只有经纪人能看；授权可随时撤回。", seen: { agent: true, client: true } },
      { id: "ms17", thread: "th4", at: d(-1) + " 16:20", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "房东要看最近两个月的收入证明，手机拍照就行，我这边先遮掉账号再给 AI 算收入倍数。", request: { action: "upload", to: "client", title: "最近两个月工资单（照片即可）", due: d(+1), status: "pending", effect: { type: "upload", deal: "d7", name: "工资单 × 2（客户上传）", docType: "income_docs" } }, seen: { agent: true } },
      // th5 · 房东 c4 · 工单
      { id: "ms18", thread: "th5", at: d(-1) + " 21:10", from: { role: "system", name: "系统" }, kind: "system", text: "租客 Ben Carter 报修：车库插座异常（照片 2 张）· 已派 Vendor 诊断。", attach: [{ type: "workorder", id: "WO-118", label: "WO-118 车库插座" }], seen: { agent: true, client: true } },
      { id: "ms19", thread: "th5", at: d(0) + " 07:50", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "诊断结果：插座线路老化，需换线 + 新插座。Vendor 报价 $340，超过您设的 $300 门槛，未批准前不施工。", request: { action: "approve", to: "client", title: "车库插座维修报价 $340（超过 $300 门槛）", due: d(0), status: "pending", options: [{ label: "批准施工", outcome: "done" }, { label: "再问一家报价", outcome: "declined" }], effect: { type: "wo-approve", wo: "WO-118" } }, seen: { agent: true } },
      // th6 · Broker · 合规 + CDA 审批（T3）
      { id: "ms20", thread: "th6", at: d(0) + " 09:05", from: { role: "agent", id: "u1", name: "Jason" }, kind: "request", text: "1234 Sample Dr 预计 " + d(+24) + " 过户。过户前清单 11 / 11 已齐（过户后的 Closing Statement / CD 另收），CDA 草稿按 3% 生成，一起提交。", request: { action: "approve", to: "broker", title: "合规 + CDA 申请 · 1234 Sample Dr · 佣金 $15,450（T3）", due: d(+2), status: "pending", options: [{ label: "批准", outcome: "done" }, { label: "退回", outcome: "declined" }], effect: { type: "proposal", proposal: "pr10" } }, attach: [{ type: "proposal", id: "pr10", label: "提议 pr10 · 合规 + CDA" }], seen: { agent: true } },
      // th7 · Broker · 合规问题
      { id: "ms21", thread: "th7", at: d(-1) + " 15:30", from: { role: "agent", id: "u1", name: "Jason" }, kind: "text", text: "买方父母赠与 $50,000 做首付，赠与信（gift letter）已收到并给了 lender。除了 lender 要的，我们这边还需要额外 disclosure 或留档吗？", seen: { agent: true } },
      // th8 · Broker 公告
      { id: "ms22", thread: "th8", at: d(-2) + " 09:00", from: { role: "broker", id: "u4", name: "Ann Broker" }, kind: "text", text: "10 月 1 日起，CDA 请在过户前 3 个工作日提交，合规清单不到 100% 的一律退回。系统里的「合规」tab 会自动提示缺项。", seen: { broker: true } },
      // th9 · 团队 · TC 交接
      { id: "ms23", thread: "th9", at: d(-3) + " 11:20", from: { role: "tc", id: "u2", name: "Lisa（TC）" }, kind: "text", text: "910 Example Ct 成交后档案已归档；homestead 提醒设在 1/2，保修到期设在过户 + 1 年。", seen: { agent: true, tc: true } },
      { id: "ms24", thread: "th9", at: d(-3) + " 11:40", from: { role: "agent", id: "u1", name: "Jason" }, kind: "text", text: "收到，谢谢。homestead 提醒我看到了。", seen: { agent: true, tc: true } },
      { id: "ms25", thread: "th9", at: d(-3) + " 11:41", from: { role: "agent", id: "u1", name: "Jason" }, kind: "note", internal: true, text: "内部备注：张先生说想 2 年后换大房，到时先看他的房子估值。", seen: { agent: true } },
    ],
    apps: { agent: {}, client: {} },
    // v1.2 · 重点关注（每个使用者自己的）：pins[user][kind][id] = { pos（可插值，越小越靠前）, at }；pinManual[user][kind] = 拖过一次之后为 true；opened[user]["kind:id"] = 上次打开时间（算「新动态」用）
    pins: {
      u1: { deal: { d1: { pos: 1, at: d(-1) + " 09:00" }, d3: { pos: 2, at: d(-3) + " 10:00" } }, contact: { c5: { pos: 1, at: d(-2) + " 08:30" } }, property: { p2: { pos: 1, at: d(-2) + " 08:31" } } },
      u4: { deal: { d2: { pos: 1, at: d(0) + " 08:00" } }, contact: {}, property: {} },
    },
    pinManual: { u1: { deal: false, contact: false, property: false }, u4: {} },
    opened: { u1: { "deal:d1": d(-1) + " 18:00", "deal:d2": d(0) + " 11:30", "deal:d4": d(-3) + " 09:00", "deal:d7": d(-1) + " 20:00", "contact:c1": d(-1) + " 18:00", "contact:c5": d(0) + " 11:30", "property:p2": d(0) + " 11:30" }, u4: { "deal:d1": d(-2) + " 09:00" } },

    // v1.4（决定 47）：「谁答应了谁」——谁 · 答应什么 · 几点 · 兑现没 · 催过几次；挡住哪一步（兑现后自动解开）
    commitments: [
      { id: "cm1", deal: "d1", who: "c16", whoName: "Kevin Park（Demo Mortgage）", what: "把 appraisal 报告发过来", due: d(+1) + " 12:00", status: "waiting", source: { kind: "email", ref: "e7", at: d(0) + " 09:40", quote: "Appraisal came back fine, I'll send the report tomorrow before noon." }, blocks: "appraisal", nudges: [], created: d(0) + " 09:41", by: "ai", tier: 1 },
      { id: "cm2", deal: "d1", who: "c1", whoName: "陈先生", what: "把房屋保险报价发给我", due: d(-1) + " 21:00", status: "overdue", source: { kind: "message", ref: "th1", at: d(-2) + " 20:15", quote: "今晚我把保险报价发您" }, blocks: null, nudges: [{ at: d(0) + " 08:30", how: "消息" }], created: d(-2) + " 20:16", by: "ai", tier: 1 },
      { id: "cm3", deal: "d1", who: "o2", whoName: "Sample Title（Maria Lopez）", what: "发 Title commitment", due: d(-2) + " 17:00", status: "fulfilled", fulfilledAt: d(-2) + " 15:20", evidence: "文件 doc2 · Title Commitment.pdf（邮件侦测）", source: { kind: "email", ref: "e-title", at: d(-3) + " 10:02", quote: "Commitment will go out by tomorrow EOD." }, blocks: "title_commitment", nudges: [], created: d(-3) + " 10:03", by: "ai", tier: 1 },
      { id: "cm4", deal: "d2", who: "c18", whoName: "Bob Lee（买方经纪）", what: "发买家 A 更新后的 pre-approval", due: d(0) + " 15:00", status: "waiting", source: { kind: "email", ref: "e1", at: d(0) + " 10:05", quote: "I'll send the updated pre-approval by 3pm today." }, blocks: null, nudges: [], created: d(0) + " 10:06", by: "ai", tier: 1 },
      { id: "cm5", deal: "d7", who: "c9", whoName: "刘先生（申请人）", what: "交最近两张工资单", due: d(+1) + " 18:00", status: "waiting", source: { kind: "call", ref: "cl2", at: d(0) + " 11:10", quote: "明天下班前传给你" }, blocks: null, nudges: [], created: d(0) + " 11:12", by: "human", tier: 2 },
    ],
    // v1.4（决定 41）：记一下——每条带唯一号 uid，没网先存手机（synced=false），有网再传；重试不记两遍
    captures: [
      { uid: "cap-seed1", at: d(-1) + " 16:40", mode: "voice", text: "赵女士说 8765 Pattern 的学区她最在意，价格能到 598 就签", deal: "d5", contact: "c10", synced: true, attributed: "auto" },
    ],
    // ===== 覆盖表：影子里的每个功能 vs 开工手册 v60 的步骤号 =====
    // ref = 真实的步骤号，多个用 " · " 连起来（「修 1」= 手册第一条小修）；status：done 只给已经做完并冻结的步骤（0 · 1 · 1b · 2 · 3 · 4 · F1-1），其余都是 plan。一个步骤号只出现在一行里。
    coverage: [
      { screen: "交易列表 / 详情的底子：手动建交易 · 字段手填与确认（类型判断在 core）· 设置里的语言 / 主题", status: "done", ref: "0 · 2", note: "真实版已有；路线图 · 阶段包 · 摘要 · 钱等见下面各行" },
      { screen: "里程碑：事件型 / 截止型 · 标完成 / N/A", status: "done", ref: "1 · 1b", note: "真实版已有；「已核实」三态在第 23 步" },
      { screen: "上传合同 → AI 抽取（第一份真实合同 · 电子版）", status: "done", ref: "3 · 4", note: "真实版已有；向导 · 交叉校验 · 扫描件见下面各行" },
      { screen: "表单工具 newbee-forms：模板 + 元素（另一个仓库）", status: "done", ref: "F1-1", note: "不在网站里；网站只读它导出的 forms-spec" },
      { screen: "Option 截止日周末不顺延（影子一直这么写；真实代码这一步改）", status: "plan", ref: "修 1", note: "同一步里：黄金集文件夹不进 git" },
      { screen: "路线图：买 / 卖 / 放租 / 寻租四张 · 阶段由进度算出 · 标为合同终止 / 落选 · 撤回", status: "plan", ref: "22", note: "节点显示同名里程碑的日期；没有里程碑才用规则估算（标「估」）" },
      { screen: "字段 tab：一张表 · 确认全部 · 交叉校验 4 项 ·「不对」", status: "plan", ref: "4b", note: "「确认全部」一次收下电子版里 ≥ 0.9、校验没问题的每一行（钱和日期也在内）；扫描 / 手写 / 拍照、低于 0.9、卡在校验上的逐条确认" },
      { screen: "截止日清单「改日期」：手改过的不被重新派生覆盖", status: "plan", ref: "9a", note: "" },
      { screen: "字段修改历史 · 版本", status: "plan", ref: "4c", note: "" },
      { screen: "默认排序 + ⭐ 重点关注 + 新动态（v1.2）", status: "plan", ref: "21", note: "三个列表 + 经纪人 App；阈值在 SCORE_CONFIG.thresholds 一处" },
      { screen: "机构骨架：org · 角色 · 名册 · 佣金归属 · audit_log", status: "plan", ref: "T1", note: "" },
      { screen: "修改记录 tab · Broker 审计页", status: "plan", ref: "T1b", note: "" },
      { screen: "AI 提议层：四档（T0–T3）· 可撤销 · 记账 · 拒绝写原因", status: "plan", ref: "P0", note: "T1 自动执行不出卡；T3 只有 Broker 能批" },
      { screen: "今天页五块 · 冲突卡 · 已核实 · 承诺表 · 记一下 · 阶段包 · 通知四级 · 打电话前一张卡（v1.4）", status: "plan", ref: "23", note: "网站和经纪人 App 同一套判断（work.js）" },
      { screen: "钱的时间线 · 标已付 · 改金额 · 可退吗 / 退找谁", status: "plan", ref: "M1", note: "买方过户费不估，以 Closing Disclosure 为准" },
      { screen: "房源的表 · 地址归一 · 产权人", status: "plan", ref: "15a-1", note: "" },
      { screen: "长图 PNG · 打印版 PDF · 机构品牌块", status: "plan", ref: "R1", note: "" },
      { screen: "扫描件 · 手写 · 拍照：先分类 · 预处理 · 裁图 · 低置信来源（v1.5）", status: "plan", ref: "4h", note: "影子里裁图是一张示意的小纸条" },
      { screen: "租房申请进件", status: "plan", ref: "4d", note: "SSN · 驾照号 · 出生年 · 账号不入库；申请 60 天后删" },
      { screen: "租客评估报告 + 房东批准（评分卡）", status: "plan", ref: "4e", note: "只对照书面标准，不写推荐 / 不推荐；收入材料 30 天后删" },
      { screen: "租约进件 + 放租 / 寻租路线图", status: "plan", ref: "4f", note: "" },
      { screen: "黄金集：3 电子 + 3 手写扫描 + 1 手机拍照（设置 → 表单库里一行）", status: "plan", ref: "5", note: "" },
      { screen: "合同包识别 + 抽取进度（文件 tab 的子文件）", status: "plan", ref: "5b", note: "" },
      { screen: "合同进件向导（五步）+ 三种新建入口", status: "plan", ref: "4g", note: "网站向导和经纪人 App 快速建档走同一个函数 · 手动 → 卖房 / 放租可以当场新建房子和联系人" },
      { screen: "合同包逐份抽取：每份子文件各抽各的字段（经纪信息页 · Seller's Disclosure · 收据页）", status: "plan", ref: "5c", note: "要先在表单工具里登记这几份的字段" },
      { screen: "各方：抽取后自动挂上", status: "plan", ref: "6", note: "" },
      { screen: "佣金：抽取后自动预填", status: "plan", ref: "7", note: "" },
      { screen: "字段三档 + 模板版本徽章 + 本版无此项", status: "plan", ref: "F3", note: "" },
      { screen: "摘要语句 v0：交易概览「摘要」卡 · 设置 → 摘要语句（v1.5）", status: "plan", ref: "S1", note: "56 句 + 10 组；客户不可见的句子进不了客户 App 分组" },
      { screen: "表单工具：字段注册表 · 映射 · 导出（另一个仓库）", status: "plan", ref: "F1-2 · F1-M · F1-4", note: "不在网站里" },
      { screen: "数据基石：接收 forms-spec（设置 → 后台工具）", status: "plan", ref: "F2", note: "抽取结果给每个字段留三个可选键" },
      { screen: "AI 助手：语音 / 文字 · 查数据 · 能写（走提议）· 服务端转写", status: "plan", ref: "8 · 8c · 8b · 8d", note: "" },
      { screen: "侧栏分三组 + 手机「更多」", status: "plan", ref: "N1", note: "" },
      { screen: "微信聊天导入（沟通记录页）", status: "plan", ref: "16", note: "不自动发微信" },
      { screen: "沟通时间线 · 会面记录 · 联系人动作条（v1.5）", status: "plan", ref: "16b", note: "邮件 · 电话 · 微信 · 短信 · 记一下 · 会面 · 日历 · 看房 · 消息合成一条线" },
      { screen: "买方路线（buyer Playbook）", status: "plan", ref: "9", note: "" },
      { screen: "任务行一行布局 · 一键重排逾期", status: "plan", ref: "9b", note: "" },
      { screen: "房源页：列表 + 详情", status: "plan", ref: "15a-2", note: "影子 v1.6：＋ 房源（同地址提示已有）· ＋ 产权人（前任灰显）· 历史时间线" },
      { screen: "从 Matrix PDF 建档", status: "plan", ref: "15a-3", note: "影子 v1.6：三种文件（房源单 · History 报表 · 税务记录）各出一张待确认表；税务记录显示哪些项等样例分析后定" },
      { screen: "⌘K 全局搜索：交易 · 联系人 · 房源 · 页面（顶栏搜索框）", status: "plan", ref: "N2", note: "" },
      { screen: "迁移模式", status: "plan", ref: "6b", note: "" },
      { screen: "客户视图 v0：只读投影 · IABS 交付", status: "plan", ref: "C0", note: "" },
      { screen: "房源档案 · 目标房排队 · 人生节点 · 看房记录", status: "plan", ref: "15b", note: "影子 v1.6：「标为目标房源」（原因 · 预计动的时间 · 节奏）和「某位客户的目标房」分开；到点今天页出「该联系」" },
      { screen: "Offer：多 Offer 并列 · 逐条款 · 挂起 / 再激活 · 对方签字变合同 · net to seller", status: "plan", ref: "12", note: "客户点同意只记时间；对方签字才成合同" },
      { screen: "AI 自动化：延迟 5 分钟 · 可撤回 · 总开关 · 预算", status: "plan", ref: "P1", note: "" },
      { screen: "邮件接入：连接 · 同步 · 归档 · 待归档（v1.5）", status: "plan", ref: "E1a", note: "Gmail 只读" },
      { screen: "邮件侦测：收到日 · 派生截止 · 附件进件 · counter · 看房确认 → 日历", status: "plan", ref: "E1b", note: "自己约的看房进日历；别人看我挂牌的进看房反馈 · v1.7：约看申请 / 拒绝 / 过期三种邮件" },
      { screen: "代理协议：Buyer / Tenant Rep（没有就挡住看房模式）", status: "plan", ref: "K2", note: "" },
      { screen: "看房：预约页 · 路线 · 看房模式 · 说 30 秒 + 当天报告 · 客户「我的看房」· 确认邮件接管", status: "plan", ref: "13a · 13b · 13c · 13d · 13e", note: "系统备好预约请求，你点发送；不自动登录预约网站" },
      { screen: "看房 · 别人看我的挂牌（Listing 端）：申请 → 谁批 → 约好 → 看完 → 反馈 → 给卖家看 → 定价信号", status: "plan", ref: "13f", note: "影子 v1.7：看房一个入口两个 tab · 出租卡 · 谁批三种 · 申请 / 拒绝 / 过期 · 记一场 · 对方经纪电话邮箱 · 去要反馈 · 定价信号两条 + T2 提议" },
      { screen: "CMA：数据 + 页面 · AI 文字 + 品牌报告", status: "plan", ref: "14a · 14b · 14c", note: "14c 等签约，不做" },
      { screen: "来源与推荐链", status: "plan", ref: "17", note: "" },
      { screen: "Open House 登记 + Price Reduced 长图", status: "plan", ref: "18", note: "不做 flyer 生成器" },
      { screen: "邀请成员进机构", status: "plan", ref: "19a", note: "" },
      { screen: "团队协作：交易成员 · 任务派给团队", status: "plan", ref: "19", note: "" },
      { screen: "Vendor 库 · Vendor List 导入", status: "plan", ref: "20a · 20b", note: "" },
      { screen: "客户视图：家庭角色", status: "plan", ref: "C1", note: "签约人（含配偶）都是决策人" },
      { screen: "家人意见 + 客户视图透明度", status: "plan", ref: "C1b", note: "" },
      { screen: "合同人话", status: "plan", ref: "C2", note: "" },
      { screen: "客户视图：文件 · 客户自己确认 · 大字", status: "plan", ref: "C6", note: "" },
      { screen: "微信卡片 + 长图", status: "plan", ref: "C3", note: "" },
      { screen: "经纪人为我做了什么", status: "plan", ref: "C4", note: "" },
      { screen: "通知契约（客户）", status: "plan", ref: "C5", note: "" },
      { screen: "催一下 + 经纪人下一步", status: "plan", ref: "C8", note: "每人每笔交易每天一次；真逾期才转给经纪人" },
      { screen: "消息：对话 · 请求卡 + 决定卡 + AI 起草放行 · Broker「审批与消息」（v1.1）", status: "plan", ref: "W1 · W2 · W3", note: "" },
      { screen: "客户 App 外壳 + 五种身份", status: "plan", ref: "C7", note: "v1.7：卖家 / 房东看得到时段、要卖家批的提示" },
      { screen: "经纪人 App 外壳", status: "plan", ref: "A1", note: "影子 v1.6：经纪人 App 有房源页（全部 → 房源 · 搜索直达 · 四个现场动作） · v1.7 看房 tab 两段" },
      { screen: "成交后第二条时间线", status: "plan", ref: "L3", note: "" },
      { screen: "合规清单（自检 · 分四段）", status: "plan", ref: "K1", note: "签约前 · 合同期 · 过户前 · 过户后" },
      { screen: "Broker 审核 + CDA（一次提交）", status: "plan", ref: "K1b", note: "CDA 最晚过户前 3 个工作日" },
      { screen: "Broker 看板", status: "plan", ref: "K3", note: "" },
      { screen: "CDA 之后 + 新人双签", status: "plan", ref: "K4", note: "" },
      { screen: "Broker 报表：佣金双视角 + 全机构导出", status: "plan", ref: "K7", note: "" },
      { screen: "席位与账单", status: "plan", ref: "K5", note: "底价含 Broker 席位 + 活跃席 + 闲置席 + AI 实际用量" },
      { screen: "机构管理：离职 · AI 档位设置", status: "plan", ref: "K9", note: "" },
      { screen: "新人入职", status: "plan", ref: "K4b", note: "" },
      { screen: "租赁运营：租金时间线 · 维修工单 · 房东仪表盘 · 评分卡", status: "plan", ref: "Z1", note: "续约提醒到期前 90 / 60 / 30 天" },
      { screen: "招募管线", status: "plan", ref: "K8", note: "" },
      { screen: "Playbook 与交易类型模板（机构级）", status: "plan", ref: "K10", note: "" },
      { screen: "工程与内测（不在影子里）：lint 清零 · 收工汇报 · 内测种子 · /qa · 种子补全", status: "plan", ref: "10 · 11 · Q1 · Q2 · Q1b", note: "" },
    ],
    // ===== 演示简化（影子说明页列出来）：影子里是假的 / 写死的地方，真实版怎么做 =====
    demoNotes: [
      "影子不做权限校验和数据校验；真实版每个动作都按角色和机构检查。",
      "AI 的结果是写好的样例；真实版走服务端模型，结果先成为提议。",
      "邮件、日历、预约都是示例数据；真实版连 Gmail（只读）和 Google 日历，不自动登录 BrokerBay / ShowingTime。",
      "裁图是示意的纸条；真实版是从页面图片上裁下来的那一块。",
      "自动化队列没有真的倒计时和发送；真实版 5 分钟后发出，之前可撤回。",
      "预算、账单、评分卡的数字是固定的样例。",
      "「先不改」的冲突卡明天才回来；影子里的「今天」不会走，所以演示里看不到它回来（规则在 work.js NBProp.pending）。",
      "对话的置顶是所有人共用的一个标记，对话结束后再发一条会自动重新打开；真实版置顶按人存、归档要手动。",
      "合同进件的样例固定是 777 Draft St 一笔（电子版 / 手写扫描 / 手机拍照三种样例 × 四种交易类型）；真实版每次上传建一笔新的。",
      "摘要语句里「预审批信」「资金证明」只看这笔交易有没有那份文件；真实版从文件类型和贷款方回信里读。",
      "邮件附件的「进件」提议点了以后，影子只把文件归到这笔交易；真实版在这一步跑分类和抽取，出一批待确认的字段。",
      "每笔交易的修改记录和 Broker 的审计卡在影子里是两份数据；真实版只有一张审计表，Broker 那一页是它的筛选视图。",
      "丢弃一条 AI 草稿，在另一个开着的标签页里可能还看得到（影子里消息按 id 合并，不同步删除）；真实版删了就是删了。",
      "延迟队列没有真的倒计时：在 AI 自动化页点「模拟：5 分钟到了」才算发出。给卖家看的看房反馈照这个规矩——放行后卖家还看不到文字，发出了才看到；放行的 AI 草稿 / 话术 / 催办在影子里对方立刻能看到，队列那一行只是示意。撤回 = 回到放行之前（AI 草稿回到草稿卡，反馈回到没放行）。微信不代发、邮件只读：没有能送达的渠道时只记一笔，由你自己发。",
      "客户 App 只有五个示例身份，都是决策人或申请人本人；家人 / 参谋看到的投影只在网站的客户视图里演示，规则一样——只有决策人能点「同意」（NBOffers.isDecider），家人 / 参谋只能看。",
      "开锁信息「20 秒后隐藏」只是界面上的倒计时，开锁方式一直在示例数据里；真实版到场签到后才由服务器下发，到点后客户端也拿不到。",
      "手机上的电话 / 短信 / 邮件 / 导航 / 拍照 / 录音按钮只弹提示，不调用设备；推送不会真的发（通知四级只算出「今天会怎么通知你」）。",
      "客户 App 的决定卡在同一部手机上给两位决策人各画一行；真实版每人只看到自己的按钮。",
      "客户 App 首页的「房子档案」一句话和证据格子是按房子写好的样例，不是从字段算的；「家人各自打分」「租房 DNA」「多套房组合分析」是 P2 的占位卡。",
      "客户 App 里家人意见只存在这台手机的界面状态里（按交易分开），经纪人侧读不到——这就是规则（家人意见只在家庭圈可见）；陈家那笔带两条写好的样例意见。",
      "Matrix 三种文件的「上传」是模拟的：点一下用写好的样例出待确认表；真实版读 PDF 文字层、删掉私人段落再发模型（15a-3）。税务记录到底显示哪些项等样例分析后定——影子只画「业主姓名 + 转手日期」两行和一个占位说明，不自己编字段。",
      "只挂房源的文件在影子里是单独一份 propDocs；真实版是同一张 documents 表加 property_id。经纪人 App 的房源页和网站同一份数据；手机拍的照片只存成这套房的文件，不抽取。",
      "约看申请 / 确认 / 拒绝 / 过期都是从邮件认的；影子里用卡上的「模拟：…邮件到了」按钮代替真的邮件；「打开 BrokerBay 那一场」只弹提示——真实版打开邮件里的链接，批准永远是 Jason 自己点。",
      "升级（1 小时 / 3 小时）在影子里按 DB.today + 当前时间算一次；真实版是 P1 的定时 tick。",
    ],
    // ===== 手册里有、影子没画的（影子说明页列出来；手册照做，不删）=====
    handbookOnly: [
      { what: "客户信息分组和按次删除导入", ref: "16" },
      { what: "任务补填完成日期", ref: "9b" },
      { what: "跨交易相关人 / 文件复用提示 / 搜索框", ref: "15a-2" },
      { what: "推荐人 tab、固定来源列表、推荐登记页", ref: "17" },
      { what: "Open House 登记页的微信 / 邮箱输入和二维码", ref: "18" },
      { what: "团队管理和可用的成员邀请", ref: "19a · 19" },
      { what: "邮件侦测的「现在同步」和按交易开关", ref: "E1a" },
      { what: "CMA 的 CSV 上传与列映射", ref: "14a" },
      { what: "内测种子和 /qa", ref: "Q1 · Q2" },
      { what: "账单与席位的真实计费", ref: "K5" },
      { what: "「修改记录」按来源文件分组 + 每组影响了哪些里程碑", ref: "4c" },
      { what: "Option 期截止日周末不顺延（真实代码的规则改回合同原文）", ref: "修 1" },
    ],
    // ===== v1.5 · 摘要语句（步骤 S1）：系统自带 56 句 + 10 组（答疑窗口 09-24 的默认库，文字照原库；占位符换成真实字段 key）=====
    phrases: [
      // A 价格与融资（买 / 卖）
      PH("A1", "总价与融资", "both", "any", "总价 {{sales_price}}，{{#if loan_type == cash}}全现金{{else}}贷款 {{loan_amount}}（{{loan_pct}}），首付 {{cash_portion}}（{{down_payment_pct}}），{{loan_type_label}}{{/if}}", "Price {{sales_price}}; {{#if loan_type == cash}}all cash{{else}}loan {{loan_amount}} ({{loan_pct}}), down payment {{cash_portion}} ({{down_payment_pct}}), {{loan_type_label}}{{/if}}"),
      PH("A2", "预审批信", "both", "any", "{{#if has_preapproval}}已收到预审批信（{{preapproval_lender}}，{{preapproval_date}}）{{else}}尚未收到预审批信{{/if}}", "{{#if has_preapproval}}Pre-approval letter received ({{preapproval_lender}}, {{preapproval_date}}){{else}}Pre-approval letter not yet received{{/if}}", "loan_type != cash"),
      PH("A3", "资金证明", "both", "any", "{{#if has_proof_of_funds}}已收到资金证明{{else}}待收资金证明{{/if}}", "{{#if has_proof_of_funds}}Proof of funds received{{else}}Proof of funds pending{{/if}}", "loan_type == cash"),
      PH("A4", "贷款审批与估价", "both", "any", "贷款审批期 {{buyer_approval_days}} 天，截止 {{financing_deadline}}；{{#if appraisal_waiver}}买方放弃估价条件{{#if appraisal_gap_amount}}（估价缺口最多补 {{appraisal_gap_amount}}）{{/if}}{{else}}估价条件保留{{/if}}", "Financing approval period {{buyer_approval_days}} days, deadline {{financing_deadline}}; {{#if appraisal_waiver}}buyer waives appraisal contingency{{#if appraisal_gap_amount}} (gap covered up to {{appraisal_gap_amount}}){{/if}}{{else}}appraisal contingency in place{{/if}}", "loan_type != cash"),
      PH("A5", "卖方让步", "both", "any", "卖方支付买方费用最多 {{seller_concessions}}", "Seller pays buyer's expenses up to {{seller_concessions}}", "seller_concessions > 0"),
      // B 定金与 Option（买 / 卖）
      PH("B1", "Earnest Money", "both", "any", "Earnest Money {{earnest_money}}，须在生效后 {{earnest_money_due_days}} 天内（{{em_due}}）送达 {{title_company}}；{{#if em_received}}已收到（{{em_received_date}}）{{else}}尚未收到{{/if}}", "Earnest money {{earnest_money}}, due to {{title_company}} within {{earnest_money_due_days}} days of effective date ({{em_due}}); {{#if em_received}}received {{em_received_date}}{{else}}not yet received{{/if}}"),
      PH("B2", "Option 期", "both", "any", "Option 期 {{option_period_days}} 天，费用 {{option_fee}}，截止 {{option_period_end}} 下午 5 点；{{#if option_fee_received}}option fee 已送达{{else}}option fee 待送达{{/if}}", "Option period {{option_period_days}} days, fee {{option_fee}}, ends {{option_period_end}} 5:00 PM; {{#if option_fee_received}}option fee delivered{{else}}option fee pending{{/if}}"),
      PH("B3", "追加 EM", "both", "any", "追加 Earnest Money {{additional_earnest_money}}，{{additional_em_deadline}} 前送达", "Additional earnest money {{additional_earnest_money}} due by {{additional_em_deadline}}", "additional_earnest_money > 0"),
      PH("B4", "Option 期内终止的后果", "both", "any", "Option 期内终止：Earnest Money 全额退还买方，option fee 归卖方{{#if option_fee_credited}}（过户时抵扣房款）{{/if}}", "If terminated within the option period, earnest money is refunded to buyer; option fee goes to seller{{#if option_fee_credited}} (credited at closing){{/if}}"),
      // C 关键日期（买 / 卖）
      PH("C1", "生效日", "both", "any", "合同生效日 {{effective_date}}", "Effective date {{effective_date}}"),
      PH("C2", "三个截止", "both", "any", "Option 截止 {{option_period_end}} · 贷款审批截止 {{financing_deadline}} · 过户 {{closing_date}}", "Option ends {{option_period_end}} · financing approval {{financing_deadline}} · closing {{closing_date}}"),
      PH("C3", "距过户与下一节点", "both", "any", "距过户还有 {{days_to_closing}} 天；下一个节点：{{next_milestone_name}}（{{next_milestone_date}}）", "{{days_to_closing}} days to closing; next: {{next_milestone_name}} ({{next_milestone_date}})"),
      PH("C4", "卖方披露", "both", "any", "{{#if sd_received}}买方已收到 Seller's Disclosure（{{sd_received_date}}）{{else}}Seller's Disclosure 须在 {{sd_deadline}} 前交付，逾期买方可终止{{/if}}", "{{#if sd_received}}Seller's Disclosure received {{sd_received_date}}{{else}}Seller's Disclosure due by {{sd_deadline}}; buyer may terminate if late{{/if}}"),
      PH("C5", "HOA 文件", "both", "any", "HOA 文件（Subdivision Information）由{{hoa_docs_provider}}在 {{hoa_docs_delivery_days}} 天内提供{{#if hoa_docs_received}}，已收到{{/if}}", "Subdivision information to be provided by {{hoa_docs_provider}} within {{hoa_docs_delivery_days}} days{{#if hoa_docs_received}}; received{{/if}}", "hoa_yes_no"),
      // D 费用与分摊（买 / 卖）
      PH("D1", "Title policy", "both", "any", "Title policy 由{{title_policy_payer}}支付（{{title_company}}）", "Owner's title policy paid by {{title_policy_payer}} ({{title_company}})"),
      PH("D2", "Survey", "both", "any", "{{#if survey_new_or_existing == existing}}使用卖方现有 survey + T-47，{{survey_days}} 天内提供{{/if}}{{#if survey_new_or_existing == new_buyer}}新 survey，买方付费{{/if}}{{#if survey_new_or_existing == new_seller}}新 survey，卖方付费，{{survey_days}} 天内提供{{/if}}", "{{#if survey_new_or_existing == existing}}Existing survey + T-47, within {{survey_days}} days{{/if}}{{#if survey_new_or_existing == new_buyer}}New survey at buyer's expense{{/if}}{{#if survey_new_or_existing == new_seller}}New survey at seller's expense, within {{survey_days}} days{{/if}}", "survey_new_or_existing"),
      PH("D3", "HOA 转让费", "both", "any", "HOA 转让 / 过户费：买方付最多 {{hoa_buyer_pays}}，其余卖方付", "HOA transfer fees: buyer pays up to {{hoa_buyer_pays}}, seller pays the balance", "hoa_yes_no"),
      PH("D4", "Home warranty", "both", "any", "Residential service contract 由卖方补贴最多 {{residential_service_contract}}", "Seller contributes up to {{residential_service_contract}} toward a residential service contract", "residential_service_contract > 0"),
      PH("D5", "佣金", "agent", "any", "买方经纪佣金 {{buyer_broker_comp}}（来源：{{comp_source}}）；本方分成 {{my_split}}", "Buyer broker compensation {{buyer_broker_comp}} (source: {{comp_source}}); my split {{my_split}}", "", { clientSafe: false }),
      // E 条款与附件（买 / 卖）
      PH("E1", "现状 / 维修", "both", "any", "房屋按{{#if as_is}}现状（as-is）{{else}}现状 + 卖方完成：{{seller_repairs}}{{/if}}出售", "Property sold {{#if as_is}}as-is{{else}}as-is plus seller repairs: {{seller_repairs}}{{/if}}"),
      PH("E2", "交房", "both", "any", "交房：{{#if possession == closing}}过户并 fund 后{{else}}按临时租约，{{possession_date}}{{/if}}", "Possession {{#if possession == closing}}at closing and funding{{else}}per temporary lease, {{possession_date}}{{/if}}"),
      PH("E3", "附件清单", "both", "any", "附件：{{addenda}}{{#if missing_attachments}}；缺：{{missing_attachments}}{{/if}}", "Addenda: {{addenda}}{{#if missing_attachments}}; missing: {{missing_attachments}}{{/if}}"),
      PH("E4", "随房转让", "both", "any", "随房转让：{{non_realty_items}}", "Conveyed with the property: {{non_realty_items}}", "non_realty_items"),
      PH("E5", "特别条款", "agent", "any", "特别条款：{{special_provisions}}", "Special provisions: {{special_provisions}}", "special_provisions", { clientSafe: false }),
      // F 买方客户首页（买 · 全部客户可见）
      PH("F1", "您的 offer", "client", "buyer", "您的 offer：总价 {{sales_price}}，{{#if loan_type == cash}}全现金{{else}}贷款 {{loan_amount}}，首付 {{cash_portion}}（{{down_payment_pct}}）{{/if}}", "Your offer: {{sales_price}}, {{#if loan_type == cash}}all cash{{else}}loan {{loan_amount}}, down payment {{cash_portion}} ({{down_payment_pct}}){{/if}}"),
      PH("F2", "您要送的钱", "client", "buyer", "请在 {{em_due}} 前把 Earnest Money {{earnest_money}} 送到 {{title_company}}，option fee {{option_fee}} 同时送达", "Please deliver earnest money {{earnest_money}} to {{title_company}} and the option fee {{option_fee}} by {{em_due}}", "em_pending"),
      PH("F3", "您的 Option 期", "client", "buyer", "您的 option 期到 {{option_period_end}} 下午 5 点；这期间可以做检查、谈维修，也可以无条件退出（只损失 option fee）", "Your option period ends {{option_period_end}} at 5:00 PM; inspections and repair negotiation happen now, and you may walk away for any reason (forfeiting only the option fee)", "option_open"),
      PH("F4", "过户", "client", "buyer", "预计过户 {{closing_date}}，距今 {{days_to_closing}} 天", "Closing is set for {{closing_date}}, {{days_to_closing}} days away"),
      PH("F5", "下一步", "client", "buyer", "下一步：{{next_client_action}}（{{next_client_action_date}}）", "Next step: {{next_client_action}} ({{next_client_action_date}})"),
      PH("F6", "谁付什么", "client", "buyer", "Title policy 由{{title_policy_payer}}付；survey：{{survey_label}}{{#if seller_concessions}}；卖方帮您付费用最多 {{seller_concessions}}{{/if}}", "Title policy paid by {{title_policy_payer}}; survey: {{survey_label}}{{#if seller_concessions}}; seller credits up to {{seller_concessions}} toward your costs{{/if}}"),
      // G 卖方客户 · offer 摘要（卖 · 全部客户可见）
      PH("G1", "收到的 offer", "client", "seller", "收到 offer：总价 {{sales_price}}，{{loan_type_label}}，Earnest Money {{earnest_money}}，option {{option_period_days}} 天 / {{option_fee}}，过户 {{closing_date}}", "Offer received: {{sales_price}}, {{loan_type_label}}, earnest money {{earnest_money}}, option {{option_period_days}} days / {{option_fee}}, closing {{closing_date}}"),
      PH("G2", "买方要求您承担", "client", "seller", "买方要求您承担：{{#if seller_concessions}}买方费用 {{seller_concessions}}；{{/if}}{{#if title_policy_payer == seller}}title policy；{{/if}}{{#if survey_new_or_existing == new_seller}}新 survey；{{/if}}{{#if residential_service_contract}}home warranty {{residential_service_contract}}{{/if}}", "Buyer asks you to cover: {{#if seller_concessions}}{{seller_concessions}} in buyer costs; {{/if}}{{#if title_policy_payer == seller}}title policy; {{/if}}{{#if survey_new_or_existing == new_seller}}new survey; {{/if}}{{#if residential_service_contract}}home warranty {{residential_service_contract}}{{/if}}", "seller_covers"),
      PH("G3", "估价与贷款风险", "client", "seller", "{{#if loan_type == cash}}全现金，无贷款风险{{else}}{{#if appraisal_waiver}}买方放弃估价条件，估价低也不能压价{{else}}买方保留估价条件：估价低于 {{sales_price}} 时可能要求降价{{/if}}{{/if}}", "{{#if loan_type == cash}}All cash, no financing risk{{else}}{{#if appraisal_waiver}}Buyer waives appraisal; a low appraisal cannot be used to renegotiate{{else}}Buyer keeps the appraisal contingency; a low appraisal may lead to a price reduction request{{/if}}{{/if}}", "loan_type"),
      PH("G4", "回租", "client", "seller", "买方同意您过户后回租 {{leaseback_days}} 天{{#if leaseback_rent}}，租金 {{leaseback_rent}}{{/if}}", "Buyer agrees to a {{leaseback_days}}-day leaseback after closing{{#if leaseback_rent}} at {{leaseback_rent}}{{/if}}", "leaseback_days > 0"),
      PH("G5", "预计净收益", "client", "seller", "按这份 offer，预计过户净收益约 {{net_proceeds}}（已扣佣金和您承担的费用；税费分摊、房贷余额以结算单为准）", "Estimated net proceeds at closing about {{net_proceeds}} (after commissions and costs you cover; prorations and loan payoff per the settlement statement)", "net_proceeds"),
      // H 对方经纪人 · offer 要点（买 · 默认英文）
      PH("H1", "Offer summary", "agent", "buyer", "Offer 要点：{{sales_price}}，{{loan_type_label}}，EM {{earnest_money}}，option {{option_period_days}} 天 / {{option_fee}}，过户 {{closing_date}}{{#if appraisal_waiver}}，放弃估价条件{{/if}}{{#if seller_concessions}}，卖方让步 {{seller_concessions}}{{/if}}", "Offer summary: {{sales_price}}, {{loan_type_label}}, EM {{earnest_money}}, option {{option_period_days}} days / {{option_fee}}, closing {{closing_date}}{{#if appraisal_waiver}}, appraisal waived{{/if}}{{#if seller_concessions}}, seller concessions {{seller_concessions}}{{/if}}"),
      PH("H2", "Buyer strength", "agent", "buyer", "买方{{#if loan_type == cash}}全现金，资金证明已附{{else}}已获 {{preapproval_lender}} 预审批，信已附{{/if}}", "Buyer is {{#if loan_type == cash}}paying cash; proof of funds attached{{else}}pre-approved with {{preapproval_lender}}; letter attached{{/if}}"),
      PH("H3", "Title & survey", "agent", "buyer", "Title 公司 {{title_company}}；title policy 由{{title_policy_payer}}付；survey：{{survey_label}}", "Title with {{title_company}}; owner's policy paid by {{title_policy_payer}}; survey: {{survey_label}}"),
      PH("H4", "Our counter", "agent", "buyer", "我方 counter：{{counter_terms}}", "Our counter: {{counter_terms}}", "counter_terms", { clientSafe: false }),
      // I Title 公司 · 开 escrow（买 / 卖）
      PH("I1", "交易概况", "agent", "any", "{{property_address}}，买方 {{buyer_names}}，卖方 {{seller_names}}，生效日 {{effective_date}}，合同价 {{sales_price}}", "{{property_address}}; buyer {{buyer_names}}; seller {{seller_names}}; effective {{effective_date}}; price {{sales_price}}"),
      PH("I2", "EM 与 option fee", "agent", "any", "Earnest Money {{earnest_money}} 由买方在 {{em_due}} 前送达；option fee {{option_fee}} {{#if option_fee_to_title}}一并送 title{{else}}直付卖方{{/if}}", "Earnest money {{earnest_money}} due from buyer by {{em_due}}; option fee {{option_fee}} {{#if option_fee_to_title}}delivered with EM{{else}}paid directly to seller{{/if}}"),
      PH("I3", "过户与费用", "agent", "any", "过户 {{closing_date}}；title policy 由{{title_policy_payer}}付；survey：{{survey_label}}{{#if residential_service_contract}}；home warranty 卖方补贴 {{residential_service_contract}}{{/if}}", "Closing {{closing_date}}; owner's policy paid by {{title_policy_payer}}; survey: {{survey_label}}{{#if residential_service_contract}}; seller credit {{residential_service_contract}} toward home warranty{{/if}}"),
      PH("I4", "贷款方", "agent", "any", "{{#if loan_type == cash}}全现金，无贷款{{else}}贷款方 {{lender}}，{{loan_officer_contact}}{{/if}}", "{{#if loan_type == cash}}All cash, no lender{{else}}Lender {{lender}}, {{loan_officer_contact}}{{/if}}", "loan_type"),
      PH("I5", "HOA", "agent", "any", "{{#if hoa_yes_no}}HOA：{{hoa_name}}，转让费买方最多 {{hoa_buyer_pays}}{{else}}无 HOA{{/if}}", "{{#if hoa_yes_no}}HOA: {{hoa_name}}; transfer fees buyer pays up to {{hoa_buyer_pays}}{{else}}No HOA{{/if}}", "hoa_known"),
      // J 贷款方（买 · 非现金）
      PH("J1", "合同要点", "agent", "buyer", "合同价 {{sales_price}}，贷款 {{loan_amount}}，{{loan_type_label}}，贷款审批截止 {{financing_deadline}}，过户 {{closing_date}}", "Contract price {{sales_price}}, loan {{loan_amount}}, {{loan_type_label}}, financing approval deadline {{financing_deadline}}, closing {{closing_date}}", "loan_type != cash"),
      PH("J2", "估价与让步", "agent", "buyer", "{{#if appraisal_waiver}}买方放弃估价条件{{else}}估价条件保留{{/if}}{{#if seller_concessions}}；卖方让步 {{seller_concessions}}{{/if}}；title 公司 {{title_company}}", "{{#if appraisal_waiver}}Appraisal waived{{else}}Appraisal contingency in place{{/if}}{{#if seller_concessions}}; seller concessions {{seller_concessions}}{{/if}}; title company {{title_company}}", "loan_type != cash"),
      // K 租房申请 · 给房东（申 · Fair Housing 安全：只陈述申请内容和核实结果，不写受保护类别，不写推荐 / 不推荐）
      PH("K1", "申请概况", "client", "lessor", "申请人 {{applicant_count}} 位，申请入住 {{requested_move_in}}，租期 {{requested_term}} 个月，出价租金 {{offered_rent}}/月", "{{applicant_count}} applicant(s); requested move-in {{requested_move_in}}; term {{requested_term}} months; offered rent {{offered_rent}}/mo", "", { application: true }),
      PH("K2", "收入核实", "client", "lessor", "已核实家庭月收入 {{verified_monthly_income}}，为租金的 {{income_to_rent_ratio}} 倍（您的书面标准：{{income_standard}} 倍）", "Verified household monthly income {{verified_monthly_income}}, {{income_to_rent_ratio}}x rent (your written standard: {{income_standard}}x)", "", { application: true }),
      PH("K3", "材料与费用", "client", "lessor", "{{#if has_income_docs}}收入材料已收{{else}}收入材料待收{{/if}}；申请费 {{application_fee}} {{#if fee_received}}已收{{else}}待收{{/if}}", "Income documents {{#if has_income_docs}}received{{else}}pending{{/if}}; application fee {{application_fee}} {{#if fee_received}}received{{else}}pending{{/if}}", "", { application: true }),
      PH("K4", "宠物与车辆", "client", "lessor", "{{#if has_pets}}宠物：{{pet_summary}}{{else}}无宠物{{/if}}；车辆 {{vehicle_count}} 辆", "{{#if has_pets}}Pets: {{pet_summary}}{{else}}No pets{{/if}}; {{vehicle_count}} vehicle(s)", "pets_known", { application: true }),
      PH("K5", "申请人经纪", "client", "lessor", "申请人经纪：{{applicant_agent}}（{{applicant_brokerage}}）", "Applicant's agent: {{applicant_agent}} ({{applicant_brokerage}})", "", { application: true }),
      // L 租赁合同（租）
      PH("L1", "租金与押金", "both", "any", "租金 {{rent}}/月，租期 {{lease_start}} 至 {{lease_end}}，押金 {{deposit}}{{#if pet_deposit}}，宠物押金 {{pet_deposit}}{{/if}}", "Rent {{rent}}/mo, term {{lease_start}}–{{lease_end}}, security deposit {{deposit}}{{#if pet_deposit}}, pet deposit {{pet_deposit}}{{/if}}"),
      PH("L2", "付租规则", "both", "any", "租金每月 {{rent_due_day}} 日到期，{{late_fee_start_day}} 日起计滞纳金 {{late_fee}}", "Rent due on the {{rent_due_day}} of each month; late fee {{late_fee}} starting the {{late_fee_start_day}}"),
      PH("L3", "水电", "both", "any", "租客付：{{utilities_tenant}}；房东付：{{utilities_landlord}}", "Tenant pays: {{utilities_tenant}}; landlord pays: {{utilities_landlord}}"),
      PH("L4", "各方", "both", "any", "租客 {{tenant_names}}，占用人 {{occupant_count}} 人；房东 {{landlord_entity}}", "Tenant {{tenant_names}}, {{occupant_count}} occupant(s); landlord {{landlord_entity}}"),
      PH("L5", "通知期", "both", "any", "续约或退租须至少提前 {{notice_days}} 天书面通知", "At least {{notice_days}} days' written notice to renew or vacate"),
    ],
    // placement：deal_home 交易首页 · client_app 客户 App · email 邮件 · milestones 里程碑页；types = 哪几种交易默认用这一组
    phraseGroups: [
      { id: "g_home_buyer", name: "交易首页 · 买方交易", desc: "打开买方交易先看到的十句：价格 · 定金 · 截止 · 费用 · 附件", placement: "deal_home", items: ["A1", "A2", "B1", "B2", "C2", "C3", "D1", "D2", "E1", "E3"], owner: "system", types: ["buyer"] },
      { id: "g_home_seller", name: "交易首页 · 卖方交易", desc: "卖方交易：收到的 offer、要承担什么、截止和附件", placement: "deal_home", items: ["G1", "G2", "B1", "B2", "C2", "C4", "D1", "D2", "E1", "E3"], owner: "system", types: ["seller"] },
      { id: "g_home_lease", name: "交易首页 · 租赁", desc: "租约的五句：租金押金 · 付租规则 · 水电 · 各方 · 通知期", placement: "deal_home", items: ["L1", "L2", "L3", "L4", "L5"], owner: "system", types: ["lessor", "lessee"] },
      { id: "g_app_buyer", name: "客户 App · 买方", desc: "买方客户在 App 首页看到的六句", placement: "client_app", items: ["F1", "F2", "F3", "F4", "F5", "F6"], owner: "system", types: ["buyer"] },
      { id: "g_app_seller", name: "客户 App · 卖方", desc: "卖方客户看 offer 的五句", placement: "client_app", items: ["G1", "G2", "G3", "G4", "G5"], owner: "system", types: ["seller"] },
      { id: "g_app_lease", name: "客户 App · 租客 / 房东", desc: "租约四句（不含各方）", placement: "client_app", items: ["L1", "L2", "L3", "L5"], owner: "system", types: ["lessor", "lessee"] },
      { id: "g_mail_offer", name: "发给对方经纪 · offer 要点", desc: "出 offer 时附在邮件里的三句", placement: "email", items: ["H1", "H2", "H3"], owner: "system", types: ["buyer"] },
      { id: "g_mail_title", name: "发给 Title · 开 escrow", desc: "开 escrow 邮件的五句", placement: "email", items: ["I1", "I2", "I3", "I4", "I5"], owner: "system", types: ["buyer", "seller"] },
      { id: "g_mail_lender", name: "发给贷款方", desc: "合同要点两句", placement: "email", items: ["J1", "J2"], owner: "system", types: ["buyer"] },
      { id: "g_app_landlord", name: "租房申请 · 给房东", desc: "只陈述申请内容和核实结果；也可以放进邮件", placement: "client_app", items: ["K1", "K2", "K3", "K4", "K5"], owner: "system", types: ["lessor"], alsoEmail: true, application: true },
    ],
    // 每笔交易自己的改动（不改分组本身）：groups 叠加哪几组 · hidden 隐藏哪几句 · edited 这笔交易里改过文字的句子 · extra 临时加的句子
    phraseOverrides: {
      d1: { groups: ["g_home_buyer"], hidden: [], edited: { C3: { zh: "离过户还有 {{days_to_closing}} 天；接下来：{{next_milestone_name}}（{{next_milestone_date}}）", en: "{{days_to_closing}} days to closing; coming up: {{next_milestone_name}} ({{next_milestone_date}})" } }, extra: [{ id: "x1", zh: "陈太太 " + d(+10) + " 到 " + d(+13) + " 出差，这几天不能签字（来自微信摘要）", en: "Mrs. Chen is travelling " + d(+10) + " to " + d(+13) + " and cannot sign on those days (from the WeChat digest)" }] },
      d7: { groups: ["g_app_landlord"], hidden: [], edited: {}, extra: [] },
    },
    syncLog: [
      { at: "2026-10-20", v: "v1.7", what: "Listing 端的看房做完整（答疑 10-19 · Jason 定）：① 「看房」一个入口两个 tab——我带客户看｜别人看我的挂牌（卖方 + 出租一张表：今天 / 这周 · 等批 · 待反馈 · 没放行，每行点开到那笔交易的卡）；经纪人 App 看房 tab 同样两段，手机上能看谁约了、能放行反馈；② 出租挂牌也挂「看房反馈 · 这套挂牌」卡，「给卖家看」在出租里叫「给房东看」；③ 约看申请按这套挂牌「谁批」分三种（自动确认 / 我批 / 卖家或租客批，挂牌时选一次）：自动确认只记不推；我批——今天页「需要你」+ 第 1 级推送，按钮打开邮件里 BrokerBay 那一场、Jason 自己点批准；卖家或租客批——先标「等卖家批」不打扰，1 小时没人批或离看房不到 3 小时才升级给 Jason（可替批），客户 App 给卖家一行中文提示；批了 / 拒了 / 过期都从邮件认（状态多 requested · declined · expired）；④ 「＋ 记一场」手记微信 / 电话约的；⑤ 对方经纪存电话和邮箱（只经纪人看得到），看完 24 小时没反馈今天页提醒「去要反馈」，AI 起草一句短信、Jason 自己发；⑥ 卖家 / 房东在客户 App 和客户视图看得到约好的日期和时段，不带对方经纪；⑦ 定价信号加「看房不少、没有 Offer」（满 14 天 · 看完 ≥ 6 场 · 0 个在谈 Offer），反馈理由汇总成一条 T2 提议，系统不对卖家说话；示例加了 7575 Showcase Ln（看房 7 场没有 Offer）。红线不变：只读邮件、不登录 BrokerBay / ShowingTime、不代批不代回不代取消、不自动发短信微信邮件、给卖家看的反馈走 5 分钟延迟队列。" },
      { at: "2026-10-06", v: "v1.6", what: "把「业主想卖、我在争取 Listing」这条路做成能点通的（答疑 10-06 · Jason 定）：① 房源页「＋ 房源」（一行地址 + 可选 MLS#；同一个地址再加提示已有并跳过去）、「从 Matrix PDF 建档」和房源详情「上传 Matrix PDF」能点了——三种文件（房源单 · History 报表 · 税务记录）各出一张待确认表，确认后属性卡 / 历史时间线 / 产权人（前几任）有内容，同一套房传第二份不会多出一套；税务记录只演示「业主姓名 + 转手日期 → 产权人」，别的字段等样例分析后定；② 房源详情加「历史时间线」（挂牌 → 调价 → 进合同 → 成交 → 转手 + 产权人起止 + 交易）、「＋ 产权人」手填（前任灰显）、「＋ 联系人」能点；③「标为目标房源」（原因 · 业主预计什么时候动 · 多久联系一次，到点今天页出「该联系」）和「标为某位客户的目标房」分开；④「＋ 创建交易 → 手动 → 卖房」可以当场新建房子和联系人，房源详情也能直接「建卖方交易」，建完落在「上市前」、第一步「上市委托协议」没完成 = 还在争取；没拿到就标「落选 · 撤回」，房源 / 业主 / 联系记录都留着；⑤ 经纪人 App 有房源页：全部 → 房源、搜索地址直达，手机上能加房源、看房源，现场四个动作（记业主 · 标目标房源 · 建卖方交易 · 拍照 / 上传）；示例数据加了一套争取中的 9090 Pursuit Ct（林先生）和一套落选的 2020 Bygone Dr（何女士）。" },
      { at: "2026-10-05", v: "v1.5", what: "一个标准 + 三个新功能（Jason 10-03：「架构和流程按影子来，以影子为准」）。一个标准：影子里互相打架的地方统一成一种说法——「几天算快到了」和低置信线（0.9）只在一处；合同字段用真实的字段名；1234 Sample 的故事前后一致（Option 7 天 / $500 明天截止 · Offer v3 $520,000 → Amendment 改成 $515,000）；路线图节点显示同名里程碑的日期，没有才估算并标「估」；T1 提议自动执行不出卡，T3 只有 Broker 能批，拒绝要写原因，撤销连它建的记录一起撤；客户点「同意」只记时间，对方签字才成合同；合规清单分四段，一次提交「合规 + CDA」；续约提醒 90 / 60 / 30；d7 的申请人只有刘先生一位。三个新功能：① 摘要语句 v0——交易概览顶上一张「摘要」卡，56 句 + 10 组，可隐藏 / 改字 / 临时加一句 / 两句合并，客户不可见的句子进不了客户 App；② 邮件「待归档」+ 交易沟通时间线——没归上交易的邮件单独一块（归到… / 忽略 / 以后都忽略这个发件人），沟通 tab 把邮件 · 电话 · 微信 · 短信 · 记一下 · 会面 · 日历 · 看房 · 消息合成一条线，超过 24 小时没回的标「待回复」；自己约的看房确认后进日历，别人看我挂牌的进看房反馈；③ 扫描件 · 手写 · 拍照——文件分电子 / 扫描 / 拍照，字段带来源（打印 / 手写 / 勾选）和裁图，交叉校验 4 项，「确认全部」一次收下电子版里 ≥ 0.9、校验没问题的每一行（钱和日期也在内），扫描 / 手写 / 拍照、低于 0.9、卡在校验上的逐条确认，其中钱和日期先看裁图；系统自己从不确认任何一格。影子说明页加「演示简化」和「手册里有、影子没画的」两张单子；覆盖表改成开工手册 v60 的步骤号。" },
      { at: "2026-10-01", v: "v1.4", what: "决定清单第 2 轮 38–48（Jason 09-30 全部同意）：① 今天页分五块（需要你 / 有风险 / 在等对方 / 人情节点 / AI 已处理）+ 顶部一句话，网站 + 经纪人 App 同一套判断（work.js NBToday）；② 冲突卡：消息里的说法和已确认数据打架 → 提议类型 conflict，两边并列、点一下选哪个算数，选了才改数据并写审计；③ 已核实：钱和截止节点三态（待做 · 已做 · 已核实），核实要有证据（哪份文件 · 哪个字段 · 谁 · 什么时候）；④ 记一下：经纪人 App 一个大按钮（说 / 拍 / 写），AI 归属 + 确认卡，每条带唯一号，没网先存手机有网再传；⑤ 看房日：当前站大卡 + 下一站 · 我到了 · 开锁信息只显 20 秒 · 走了自动跳下一站并弹速记；客户端同一天 现在 / 下一套 / 几点到 / 导航 / 全天路线；⑥ 路线按开车时间算预计到达，和每套房的可看时段对不上就标红、一键按时间窗重排（不自动改约）；⑦ 打电话前一张卡：最近往来 · 交易下一步 · 未答的问题 · 在等他的 · 生日节点；打完一键记联系 + 下次联系日；⑧ 经纪人通知分四级（立刻打断 · 攒一小时 · 每天汇总 · 只进列表），设置页可调，铃铛按级分组；⑨ 阶段包：交易详情按 类型 + 阶段 默认露出该看的 tab / 字段档 / 动作，其余收进「更多」；⑩ 谁答应了谁：承诺表（谁 · 什么 · 几点 · 兑现没 · 催过几次 · 挡住哪一步），AI 从邮件 / 消息里认出来（证据明确 T1 自动建，不明确出确认卡），到点没兑现进「在等对方」并建议催，兑现了自动关掉并解开它挡住的路线图节点；⑪ 客户决定卡：两边条件并排 + 经纪人的看法 + 选项，夫妻两个决策人各自已读 / 已答，答得不一样标「需要商量」转给经纪人。真实版：一次只增的迁移（编号轮到几号用几号）—— commitments · captures · milestones.verified_* · proposals.type 加 conflict / commitment · messages.request.decision；阶段包跟着交易类型模板走；通知级别存在 notify_policy（机构默认）+ user_notify_levels（每人改过的），不是 agents.settings 里的一个 json（步骤 23）。" },
      { at: "2026-10-01", v: "v1.3", what: "路线图与里程碑 + Tour + 多 Offer（Jason 09-30 的 4 条 comment）：① 阶段统一成一套（找房 · 看房 / 上市前 / 挂牌中 / Offer 中 / 合同期 / 交割就绪 / 已成交 / 申请审核中 / 已批准 · 签约前 / 租赁中 / 已到期）并由路线图进度算出；② 四张路线图进三端：交易详情「路线图」tab（网站横版 · App 竖版 · 客户 App 人话版），已完成 / 当前（绿点）/ 灰显 / 分支；③ Tour：一天多个客户各自的路线、看房历史挂在客户和房源上、看过的房标目标房并排队（拖动 / … 菜单）、目标房转 Offer；④ Offer：买卖两边多个并列，Offer 阶段就上传一方签字的文件，逐条款看谁提的 / 对方 counter / 已同意，挂起 / 撤回 / 再激活，对方签字 → 自动变合同（字段从 Offer 带过去）→ 合同期" },
      { at: "2026-09-30", v: "v1.2", what: "默认排序 + 重点关注（Jason 09-30 的需求，参照客户和项目看板那套打分）：① 交易 / 联系人 / 房源三个列表按「基础分 + 加减分」自动排序，同分看最近动静，卡片最多 2 个理由标签，点分数看怎么算的；分组 交易 = 需要动作 / 进行中 / 租赁中 / 已结束，联系人 = 今天要跟进 / 进行中 / 该问候了 / 其他 / 资料待补 / 不再是（非客户按最近往来），房源 = 需要动作 / 进行中 / 在管出租 / 关注中 / 其他 / 已结束；无搜索无筛选才分组，「其他」超 8 条折叠、「该问候了」超 5 条折叠；② ⭐ 重点关注：星标在卡片和详情页头部；重点区置顶不重复；默认按分，拖过一次（电脑拖 ⋮⋮）就按手动顺序保存，… 菜单上移 / 下移 / 移到最前，新加星排最前，「恢复自动排序」；按人存（切到 Broker 看到的是 Ann 自己的）；已结束的灰显并提示取消；搜索筛选时星标仍置顶；③ 新动态 = 上次打开之后的新文件 / 新 AI 提议 / 新沟通 / stage 变化，自己的操作不算；④ 数据：联系人加 阶段（客户 / 潜在 / 未来 / 不再是）· 联系节奏（手动优先，自动 2 / 3 / 30 天）· 最近联系（记一次联系）；房源加 关系（目标房 / 客户关注 / 在管出租 / 已成交 / 其他）；交易加 terminated（合同终止）；权重集中在 data.js 顶部 SCORE_CONFIG；⑤ 经纪人 App 的交易列表和「全部 → 客户」复用同一打分和星标（手机用 … 菜单调顺序，长按拖动是第二版）；客户 App 不变。第二版（标在页面上）：房源全套打分、手机长按拖动、设置页调权重。示例数据里「今天」的时间戳不再晚于现在（修了上午发消息排在示例消息上面的问题）。" },
      { at: "2026-09-29", v: "v1.1", what: "三端合一 · 一个数据库：网站 / 经纪人 App / 客户 App 共用一份数据，同一浏览器的标签页之间实时同步，在 claude.ai 上还能跨设备同步；新增「消息」——每条对话挂在一笔交易 / 一条看房路线 / 一张工单 / 公告上（客户 ↔ 经纪人 · 经纪人 ↔ Broker · 团队），请求卡（请确认 / 请上传 / 选时间 / 请回答 / 请审批）点一下就完成，内部备注客户看不到，AI 起草的客户可见文字放行才发出，客户「催一下」先核实是否真逾期；示例数据补全到每条流程都能走通。" },
      { at: "2026-09-29", v: "v1.0", what: "融合 Muse v4 设计包（蓝图 v4 + 三个影子）：① 视觉换成深绿 + 暖白（IBM Plex / Noto Sans SC 不变），左栏分成 核心业务 / 业务工作台 / 机构与系统 三组 + 线性图标，顶栏加 面包屑 · ⌘K 搜索 · 通知 · 版本菜单；② 今天页重做（先处理这几件 · 快捷入口 · 四个数 · 48 小时内的风险 · 待你确认 · 逾期升级 · 团队待办 · 家庭动态 · 明天看房）；③ 新页面：看房预约 · 合同进件（四步向导，替代旧的上传模拟）· 交易类型模板 · 租赁运营 · AI 自动化；④ Broker 后台加 招募 / 佣金报表 / 审计 三个 tab；联系人详情加常驻动作栏 + 会面记录转跟进；房源详情加档案证据分层 + CMA 故事；交易详情头部加 健康度 / 下一步 / 模板版本 / 引导提示；客户视图 tab 加透明度开关；⑤ 用词落地：指挥台 → 今天 · 运营中枢 → 工作台 · 交易事实层 → 交易 · 房子情报 → 房源档案 · 看房 Agent → 看房预约 · 进件中心 → 合同进件 · 自动化控制中心 → AI 自动化 · 三级逾期 → 逾期升级 · 双驾驶舱 → 引导模式 / 熟手模式 · 会面速记 → 会面记录 · 房屋护照 → 成交后档案；⑥ 版本菜单：v0.7 原样存档在 v0.7/，以后每版都这样。" },
      { at: "2026-09-29", v: "v0.7", what: "09-29 决定清单落地：① 决定 4 · 配偶是签约人 → 陈太太改成决策人（联系人加“决策人”标签；家人 = 不签字的亲属，邀请框和客户视图 tab 写明）；② 影子说明覆盖表里 T1 / 客户视图的“待决定”改成“09-29 已定”；③ F2 · 交易详情 → 字段 tab：档位切换 极简 / 标准 / 全部（默认极简；设置 → 常规可改默认档），标题旁模板 @ 版本徽章（当时是 trec-20 @ 20-17；v1.5 起样例合同统一成 20-19），每个字段标段号，切到全部时列出没放进任何 tab 的字段 + 一条“本版无此项”示例；文件 tab 合同包子文件带 模板 @ 版本。" },
      { at: "2026-09-27", v: "v0.6", what: "Vendor 库（手册第 20 步，从看板搬过来）：侧栏加 Vendor；按分组列出有人的类别（短名 chip）多选 + OR / AND；卡片 = 类别 + 公司 / 名字 / 手机（点击复制）· 合作 N 次 · N 笔交易 / 最近评价；右上 复制推荐 → 卡片出现勾选 → 复制已选。联系人详情加 Vendor 卡（类别、平均星、合作记录）；交易详情在 各方 后面加 Vendor tab（关联 Vendor、记一次：多选类别、日期、费用、1–5 星、评价）；迁移页加 Wise Agent Vendor List 导入。" },
      { at: "≤ 2026-09-27", v: "v0.5", what: "团队协作（手册第 19 步）：机构里加团队 Jason & Mary Team；交易详情 → 各方 tab 顶部加“交易成员”（主办 / 协办 / TC，可加成员）；任务负责人可选 团队，派给团队的行带“团队”标记；完成时记完成人（谁先做算谁的）；今天页加“团队待办”卡。内测（Q1 / Q2）不在网站里，只在说明页覆盖表登记。" },
      { at: "≤ 2026-09-27", v: "v0.4", what: "表单挖掘改为独立工具（不在网站里）：移除后台页面；设置 → 后台工具 改成只读的“数据基石 · forms-spec”状态（版本、模板数、字段数、关系数、生成了什么）。" },
      { at: "≤ 2026-09-27", v: "v0.3", what: "加后台 · 表单挖掘：模板列表（20-19 / 39-11 / 40-11 / 36-11 / TXR-1406）、元素审核表（类型 · 字段 key · 入库开关）、关系页（点左点右建关系、已定义关系列表）、发布。入口：设置 → 后台工具。" },
      { at: "≤ 2026-09-27", v: "v0.2", what: "加租房申请进件：上传申请表 → 抽取申请人 / 同住人 / 宠物 / 车辆 / 住址 / 工作 / 经纪 → 一键创建联系人、关系、各方并挂到房源；收入文件 → 对照房东书面标准的评估报告 → 发房东；拒绝通知模板。" },
      { at: "≤ 2026-09-27", v: "v0.1", what: "影子网站初版：按《现状体检》+《改进方案 v3》搭出经纪人端、客户视图、Broker 后台全部页面；数据全部为示例。" },
    ],
  };

  // v1.2 · 示例数据里「今天」的时间戳不能晚于现在（否则上午打开时，新发的消息会排在示例消息上面、「新动态」也算不准）：
  // 把所有晚于现在的「今天 HH:MM」按原顺序压到现在之前的几分钟里。
  (function clampToday() {
    const now = new Date(); const pad = (n) => String(n).padStart(2, "0");
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const cur = `${TODAY} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const found = new Set();
    // v1.4：截止 / 到期（due · expires · undoUntil）是「将来」的时间，不压；只压「发生过」的时间戳
    const KEEP = new Set(["due", "expires", "undoUntil", "deadline"]);
    const KEEP_COLL = new Set(["listingShowings"]); // v1.7：约好 / 申请中的看房时间是「将来」，整个集合不压（它的 requestedAt 本来就在现在之前）
    const walk = (o) => { if (!o || typeof o !== "object") return; (Array.isArray(o) ? o.map((v) => [null, v]) : Object.entries(o)).forEach(([k, v]) => { if (KEEP.has(k) || KEEP_COLL.has(k)) return; if (typeof v === "string") { if (v.startsWith(TODAY + " ") && v.length >= 16 && v.slice(0, 16) > cur) found.add(v.slice(0, 16)); } else walk(v); }); };
    walk(SEED);
    const list = [...found].sort(); const map = {};
    list.forEach((v, i) => { const m = Math.max(0, nowMin - (list.length - i)); map[v] = `${TODAY} ${pad(Math.floor(m / 60))}:${pad(m % 60)}`; });
    const fix = (o) => { if (!o || typeof o !== "object") return; (Array.isArray(o) ? o.map((_, i) => i) : Object.keys(o)).forEach((k) => { if (KEEP.has(k) || KEEP_COLL.has(k)) return; const v = o[k]; if (typeof v === "string") { const h = v.slice(0, 16); if (map[h]) o[k] = map[h] + v.slice(16); } else fix(v); }); };
    if (list.length) fix(SEED);
  })();

  // v1.5：字段行补默认值——src 缺省 typed、docKind 缺省 text；钱和日期的行带裁图（页码 + 原文，影子里画成小纸条）
  (function fieldDefaults() {
    const TYPE = {}; window.NB_FIELDS.forEach((f) => { TYPE[f.key] = f.type; });
    Object.values(SEED.fields).forEach((rows) => rows.forEach((f) => {
      if (f.absent) return;
      f.src = f.src || "typed"; f.docKind = f.docKind || "text";
      if (["money", "date"].includes(TYPE[f.key]) && !f.crop) f.crop = { page: f.page, text: f.quote };
    }));
  })();

  window.SEED = SEED;
  window.__d = d;
})();
