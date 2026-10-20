/* NewBee OS 影子网站 · 核心：状态、路由、外壳、通用组件 */
(function () {
  // 版本表：当前版本在根目录（三端合一的壳），历史版本在 web/v1.0/ 这样的子目录里原样保留
  const VERSIONS = [
    { v: "v1.7", at: "2026-10-20", path: "./", note: "Listing 端的看房做完整（答疑 10-19）：「看房」一个入口两个 tab——我带客户看｜别人看我的挂牌（卖方 + 出租一张表：今天 / 这周 · 等批 · 待反馈 · 没放行）· 出租挂牌也挂「看房反馈 · 这套挂牌」卡（给房东看）· 约看申请按「谁批」分三种（自动确认 / 我批 / 卖家或租客批；我批进今天页「需要你」+ 第 1 级推送，按钮打开邮件里 BrokerBay 那一场、你自己点；等卖家批 1 小时没人批或离看房不到 3 小时才升级）· 批 / 拒 / 过期从邮件认 ·「＋ 记一场」手记 · 对方经纪电话邮箱只经纪人看 · 看完 24 小时没反馈「去要反馈」（AI 起草、你自己发）· 卖家 / 房东看得到约好的时段 · 定价信号加「看房不少、没有 Offer」+ 反馈理由汇总成 T2 提议；示例加 7575 Showcase Ln" },
    { v: "v1.6", at: "2026-10-06", path: "./v1.6/index.html#web", note: "争取 Listing 这条路做通（答疑 10-06）：「＋ 房源」（同地址提示已有）· 「从 Matrix PDF 建档」/「上传 Matrix PDF」三种文件（房源单 · History 报表 · 税务记录）各出一张待确认表，确认后属性卡 / 历史时间线 / 产权人有内容 · 房源详情加历史时间线、「＋ 产权人」（前任灰显）、「＋ 联系人」· 「标为目标房源」和「某位客户的目标房」分开，到点今天页出「该联系」· 手动建卖方交易可当场新建房子 / 联系人，落在上市前；落选留资料 · 示例加争取中的 9090 Pursuit Ct 和落选的 2020 Bygone Dr" },
    { v: "v1.5", at: "2026-10-05", path: "./v1.5/index.html#web", note: "一个标准 + 三样新功能（10-03「以影子为准」）：规矩只定一次（置信线 0.9 · 一套截止日 · 在谈 Offer = 谈判中 · T3 只有 Broker 批 · 同意 ≠ 接受 · 合规分四段 · 续约 90 / 60 / 30）· 摘要语句（概览摘要卡 + 设置 → 摘要语句）· 邮件「待归档」+ 交易「沟通」时间线 · 扫描件来源标记 / 裁图 / 交叉校验（「确认全部」的规矩）· 钱 tab 修好、今天页按钮全通 · 影子说明按手册 v60 步骤号" },
    { v: "v1.4", at: "2026-10-01", path: "./v1.4/index.html#web", note: "决定清单第 2 轮 38–48（全部同意）：今天页按「谁该动」分五块 + 顶部一句话 · 冲突卡（说法 ≠ 数据，点一下选哪个算数）· 已核实（钱 / 截止节点三态）· 记一下（App，离线不丢不重）· 看房日 NOW / NEXT · 路线预计到达 vs 可看时段 · 打电话前一张卡 · 通知四级 · 按阶段显示（阶段包）· 谁答应了谁（承诺表）· 客户决定卡（二位决策人各自答）" },
    { v: "v1.3", at: "2026-10-01", path: "./v1.3/index.html#web", note: "路线图与里程碑（买 / 卖 / 放租 / 寻租四张，阶段由进度算出，网站横版 · App 竖版）· Tour（一天多个客户 · 看房历史 · 目标房排队 · 转 Offer）· 多 Offer（买卖两边并列 · 逐条款谁提的 / 已同意 · 挂起 / 撤回 / 再激活 · 对方签字变合同）" },
    { v: "v1.2", at: "2026-09-30", path: "./v1.2/index.html#web", note: "默认排序（自动打分：交易 / 联系人 / 房源三个列表，理由标签 + 分组）+ ⭐ 重点关注（星标 · 拖动或 … 菜单手动顺序 · 按人存）+ 新动态（上次打开之后）；联系人加阶段 / 联系节奏 / 最近联系；房源加关系" },
    { v: "v1.1", at: "2026-09-29", path: "./v1.1/index.html#web", note: "三端合一 · 一个数据库：网站 / 经纪人 App / 客户 App 共用一份数据，跨标签页实时同步；新增「消息」——挂在交易 / 看房 / 工单上的有针对性沟通（客户 ↔ 经纪人 · 经纪人 ↔ Broker · 团队）；示例数据补全到每条流程都能走通" },
    { v: "v1.0", at: "2026-09-29", path: "./web/v1.0/index.html", note: "融合 Muse v4：深绿视觉 · 今天页重做 · 看房预约 · 合同进件向导 · 交易类型模板 · AI 自动化管控 · 租赁运营 · Broker 招募 / 佣金 / 审计" },
    { v: "v0.7", at: "2026-09-29", path: "./web/v0.7/index.html", note: "09-29 决定落地：夫妻都是决策人 · 字段三档 + 模板版本徽章" },
    { v: "v0.6", at: "2026-09-27", path: null, note: "Vendor 库（只在同步记录里，没有单独存档）" },
  ];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let DB = NBSync.load(SEED);   // 三端一个数据库（见 shared.js）
  window.DB = DB;
  function save() { NBSync.save(); }
  function resetAll() { DB = NBSync.replaceAll(clone(SEED)); window.DB = DB; location.hash = "#/today"; render(); toast("演示数据已重置（三端同步）"); }
  NBSync.onRemote((ev) => { if (ev.status) { const n = document.querySelector(".syncpill"); if (n) n.outerHTML = syncPill(); return; } render(); if (ev.msg && route().name !== "messages") toast("有新消息"); });

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null || n === "") ? "—" : "$" + Number(n).toLocaleString("en-US");
  const TODAY = () => DB.today;
  function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
  function rel(iso) {
    if (!iso) return "未定";
    const n = daysBetween(TODAY(), iso.slice(0, 10));
    if (n === 0) return "今天"; if (n === 1) return "明天"; if (n === -1) return "昨天";
    return n > 0 ? `${n} 天后` : `${-n} 天前`;
  }
  const WD = ["日", "一", "二", "三", "四", "五", "六"];
  function fd(iso) { if (!iso) return "—"; const x = new Date(iso.slice(0, 10) + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}（周${WD[x.getDay()]}）`; }
  function fdRel(iso) { return iso ? `${fd(iso)} · ${rel(iso)}` : "未定"; }
  const urgency = (iso) => NBScore.urgency(iso); // 红 / 黄 / 平常：阈值只在 SCORE_CONFIG.thresholds（score.js）
  const contact = (id) => DB.contacts.find((c) => c.id === id);
  const org = (id) => DB.orgs.find((o) => o.id === id);
  const prop = (id) => DB.properties.find((p) => p.id === id);
  const deal = (id) => DB.deals.find((x) => x.id === id);
  const addr = (p) => p ? `${p.addr}, ${p.city} ${p.zip}` : "—";
  const initials = (name) => name ? name.slice(0, name.match(/^[A-Za-z]/) ? 2 : 1).toUpperCase() : "?";
  const STAGE = { prospecting: ["找房 · 看房", "warn"], pre_listing: ["上市前", "warn"], listed: ["挂牌中", "ai"], offer: ["Offer 中", "acc"], under_contract: ["合同期", "acc"], clear_to_close: ["交割就绪", "ok"], closed: ["已成交", "ok"], applying: ["申请审核中", "warn"], lease_pending: ["已批准 · 签约前", "warn"], active: ["租赁中", "ok"], ended: ["已到期 · 退租", "mute"], terminated: ["合同终止", "mute"], lost: ["落选 · 撤回", "mute"] }; // 十三个阶段（roadmap.js NBRoadmap.STAGES）；「待确认」是徽章，不是阶段。买 / 卖 / 租的说法走 NBRoadmap.sideLabel(d)
  const stageBadge = (s) => { const [l, c] = STAGE[s] || [s, "mute"]; return `<span class="badge ${c}">${l}</span>`; };
  const ROLE = { decision: "决策人", family: "家人", advisor: "参谋" };
  const TIER_ZH = { minimal: "极简", standard: "标准", all: "全部" };
  const TIER_ORD = { minimal: 0, standard: 1, all: 2 };
  const KIND = { client: "客户", family: "家人", lead: "线索", applicant: "租客申请人", agent: "经纪", tc: "TC", title_lending: "Title / 贷款", vendor: "服务商" };
  const ORGKIND = { llc: "LLC", trust: "Trust", estate: "Estate", brokerage: "经纪公司", title: "产权公司", lender: "贷款机构", vendor: "服务商", hoa: "HOA" };
  const LINK = { spouse: "配偶", partner: "伴侣", child: "子女", parent: "父母", sibling: "兄弟姐妹", friend: "朋友", business_partner: "生意伙伴", manager: "经理", member: "成员", trustee: "受托人" };
  const FAMILY = ["spouse", "partner", "child", "parent"];

  // 页面上的小徽章：ref = 开工手册 v60 的一个步骤号（覆盖表每行的 ref 用 " · " 连起来，只按这个分隔符拆）
  function coverBadge(ref) {
    const c = DB.coverage.find((x) => (x.ref || "").split(" · ").includes(ref));
    if (!c) return "";
    const lab = { done: "已实现", wip: "开发中", plan: "规划中" }[c.status];
    return `<span class="cover ${c.status}" title="${esc(c.note)}"><b>${lab}</b> ${esc(c.ref)}</span>`;
  }
  function pageHeader(title, sub, acts, ref, kicker) {
    return `<div class="ph"><div>${kicker ? `<div class="kicker">${kicker}</div>` : ""}<h1>${title} ${ref ? coverBadge(ref) : ""}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div><div class="acts">${acts || ""}</div></div>`;
  }

  // ---------- i18n (nav + common) ----------
  const T = {
    zh: { today: "今天", deals: "交易", messages: "消息", contacts: "联系人", vendors: "Vendor", properties: "房源", showing: "看房模式", showings: "看房", intake: "合同进件", templates: "交易类型模板", rentals: "租赁运营", automation: "AI 自动化", offers: "Offer", cma: "CMA", inbox: "邮件侦测", wechat: "沟通记录", marketing: "营销", importer: "迁移", commission: "佣金", broker: "Broker 后台", settings: "设置", about: "影子说明", portal: "客户视图", more: "更多", work: "核心业务", tools: "业务工作台", orgsec: "机构与系统", shadow: "影子", newDeal: "新建交易", reset: "重置演示", hub: "工作台" },
    en: { today: "Today", deals: "Deals", messages: "Messages", contacts: "Contacts", vendors: "Vendors", properties: "Properties", showing: "Showing mode", showings: "Showings", intake: "Contract intake", templates: "Deal templates", rentals: "Rental ops", automation: "AI automation", offers: "Offers", cma: "CMA", inbox: "Inbox watcher", wechat: "Conversations", marketing: "Marketing", importer: "Import", commission: "Commission", broker: "Broker", settings: "Settings", about: "Shadow notes", portal: "Client view", more: "More", work: "Core", tools: "Workbench", orgsec: "Organization", shadow: "Shadow", newDeal: "New deal", reset: "Reset demo", hub: "Workspace" },
  };
  const t = (k) => (T[DB.ui.lang] || T.zh)[k] || k;

  // ---------- routing ----------
  const SCREENS = {};
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const segs = h.split("/").filter(Boolean);
    return { name: segs[0] || "today", segs };
  }
  function nav(path) { location.hash = "#/" + path; }

  // ---------- shell ----------
  const ICONS = {
    today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
    deals: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    messages: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    contacts: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M16 7h5M18.5 4.5v5"/></svg>',
    properties: '<svg viewBox="0 0 24 24"><path d="m3 11 9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>',
    showings: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    showing: '<svg viewBox="0 0 24 24"><path d="M4 19V9l8-5 8 5v10z"/><path d="M12 22v-8"/></svg>',
    intake: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>',
    templates: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    vendors: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-2.6z"/></svg>',
    rentals: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12 20 3M16 7l2 2M13 10l2 2"/></svg>',
    cma: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg>',
    wechat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    marketing: '<svg viewBox="0 0 24 24"><path d="M3 11v2l11 4V7zM14 8a4 4 0 0 1 0 8M5 13v5h3v-3"/></svg>',
    importer: '<svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
    commission: '<svg viewBox="0 0 24 24"><path d="M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7"/></svg>',
    broker: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l4-5 4 3 5-7"/></svg>',
    automation: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
    portal: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  };
  const NAV = [
    { g: "work", items: [["today", "today", "today"], ["deals", "deals", "deals"], ["messages", "messages", "messages"], ["contacts", "contacts", "contacts"], ["properties", "properties", "properties"]] },
    { g: "tools", items: [["showings", "showings", "showings"], ["intake", "intake", "intake"], ["templates", "templates", "templates"], ["vendors", "vendors", "vendors"], ["rentals", "rentals", "rentals"], ["cma", "cma", "cma"], ["inbox", "inbox", "inbox"], ["wechat", "wechat", "wechat"], ["marketing", "marketing", "marketing"], ["importer", "importer", "importer"], ["commission", "commission", "commission"]] },
    { g: "orgsec", items: [["broker", "broker", "broker"], ["automation", "automation", "automation"], ["settings", "settings", "settings"]] },
    { g: "shadow", items: [["about", "about", "about"], ["portal/demo", "portal", "portal"]] },
  ];
  function counts() {
    const pend = NBProp.pending().length; // 等这个身份点的：经纪人 = T2，Broker = T3
    const due = NBScore.dueSoonCount();
    const tours = (DB.tours || []).filter((t) => t.status !== "done" && t.date >= TODAY()).reduce((n, t) => n + t.homes.filter((h) => h.status !== "confirmed").length, 0) + (window.NBLShow ? NBLShow.needsMe().length : 0); // v1.7：+ 别人约看我的挂牌、要我批的
    const msgs = window.NBMsg ? NBMsg.totalUnread(DB.ui.role === "broker" ? "broker" : "agent") + NBMsg.totalPending(DB.ui.role === "broker" ? "broker" : "agent") : 0;
    return { messages: msgs, today: pend + due, inbox: DB.emails.filter((e) => e.status === "pending" || e.status === "unfiled").length, deals: DB.deals.filter((x) => ["under_contract", "clear_to_close", "listed", "offer", "prospecting", "pre_listing", "applying", "lease_pending"].includes(x.stage)).length, showings: tours, intake: DB.deals.filter((d) => (DB.fields[d.id] || []).some((f) => f.status === "pending")).length, automation: NBAuto.queue().length };
  }
  function sidebar(cur) {
    const c = counts();
    return `<aside class="sidebar" id="sidebar"><div class="brand"><div class="logo">NB</div><div><b>NewBee OS</b><span class="sub">影子网站 · ${esc(DB.version)}</span></div></div>` +
      NAV.map((g) => `<div class="navgroup">${t(g.g)}</div><div class="nav">` + g.items.map(([p, ico, k]) => {
        const on = cur === p.split("/")[0];
        const n = c[k];
        const hot = k === "today" || k === "intake" || k === "messages";
        return `<a href="#/${p}" class="${on ? "on" : ""}"><span class="ico">${ICONS[ico] || ""}</span>${t(k)}${n ? `<span class="cnt ${hot ? "" : "soft"}">${n}</span>` : ""}</a>`;
      }).join("") + "</div>").join("") +
      `<div class="navgroup">&nbsp;</div><div class="nav"><a href="#/deals/new" class="${cur === "deals" && route().segs[1] === "new" ? "on" : ""}"><span class="ico">＋</span>${t("newDeal")}</a></div></aside>`;
  }
  function tabbar(cur) {
    const tabs = [["today", "☀", "today"], ["deals", "▤", "deals"], ["contacts", "☺", "contacts"], ["properties", "⌂", "properties"], ["more", "⋯", "more"]];
    return `<nav class="tabbar">` + tabs.map(([p, ico, k]) => `<a href="#/${p}" class="${cur === p ? "on" : ""}"><span class="ico">${ico}</span>${t(k)}</a>`).join("") + `</nav>`;
  }
  const CRUMB = { today: "today", deals: "deals", messages: "messages", contacts: "contacts", properties: "properties", showings: "showings", showing: "showing", intake: "intake", templates: "templates", vendors: "vendors", rentals: "rentals", cma: "cma", inbox: "inbox", wechat: "wechat", marketing: "marketing", importer: "importer", commission: "commission", broker: "broker", automation: "automation", settings: "settings", about: "about", lease: "rentals" };
  function topbar(cur) {
    const role = DB.ui.role;
    return `<div class="topbar"><a class="hubback" href="https://claude.ai/artifact/EUPZoyFXqRsFDDdsf6jxX6" target="_top" title="回到主界面">⌂<span> 主界面</span></a><button class="btn sm menu-btn" data-action="menu">☰</button><span class="crumbs">${t("hub")} / <b>${t(CRUMB[cur] || cur)}</b></span><span class="sp"></span><button class="search" data-action="search-open"><span>搜交易、联系人、地址、页面…</span><kbd>⌘K</kbd></button><button class="iconbtn only-phone" data-action="search-open" title="搜索"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></svg></button><button class="verbtn" data-action="versions" title="影子版本">${esc(DB.version)} ▾</button>${syncPill()}<button class="iconbtn" data-action="notif" title="通知"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/></svg>${counts().today ? '<span class="dot"></span>' : ""}</button>` +
      `<div class="seg"><button class="${role === "agent" ? "on" : ""}" data-action="role" data-arg="agent">经纪人</button><button class="${role === "broker" ? "on" : ""}" data-action="role" data-arg="broker">Broker</button></div>` +
      `<div class="seg"><button class="${DB.ui.lang === "zh" ? "on" : ""}" data-action="lang" data-arg="zh">中</button><button class="${DB.ui.lang === "en" ? "on" : ""}" data-action="lang" data-arg="en">EN</button></div>` +
      `<button class="btn sm" data-action="theme" title="切换明暗">◐</button></div>`;
  }
  function syncPill() { const st = NBSync.status; return `<span class="syncpill ${st}" title="${st === "cloud" ? "三端同一份数据：已连上云端，手机和电脑之间也同步" : st === "local" ? "三端同一份数据：本机同步（同一浏览器的标签页之间实时）" : "连接中"}">${st === "cloud" ? "云同步" : st === "local" ? "本机同步" : "连接中"}</span>`; }
  function fabs() {
    return `<div class="fabs"><button class="fab voice" data-action="ai-open" data-arg="voice" title="AI 语音">🎙</button><button class="fab text" data-action="ai-open" data-arg="text" title="AI 文字">✎</button></div>`;
  }
  function shell(content, cur) {
    const simbar = `<div class="simbar">网站 OS 影子 · 三端一个数据库 · 示例数据 · <a href="#/about">影子说明</a> · <a href="#" data-action="reset">重置演示</a></div>`;
    return `<div class="app">${sidebar(cur)}<div class="main">${simbar}${topbar(cur)}<div class="page">${content}</div>${tabbar(cur)}</div></div>${fabs()}<div id="ai-root">${window.AI ? AI.sheet() : ""}</div><div id="modal-root"></div><div id="toast-root"></div>`;
  }

  // ---------- render ----------
  function render() {
    const r = route();
    document.documentElement.setAttribute("data-theme", DB.ui.theme === "system" ? "" : DB.ui.theme);
    if (DB.ui.theme === "system") document.documentElement.removeAttribute("data-theme");
    NBSet.applyBigFont(); // 大字按人存：切到 Broker 身份就是 Broker 自己的设置
    const root = document.getElementById("root");
    const fn = SCREENS[r.name] || SCREENS.notfound;
    let html;
    try { html = fn(r.segs.slice(1), r); } catch (e) { console.error(e); html = `<div class="page"><div class="note bad">这一页出错了：${esc(e.message)}</div></div>`; }
    if (r.name === "portal" || r.name === "login" || r.name === "openhouse") { root.innerHTML = html + `<div id="modal-root"></div><div id="toast-root"></div>`; }
    else root.innerHTML = shell(html, r.name);
    if (toastState && Date.now() < toastState.until) { const tr = document.getElementById("toast-root"); if (tr) tr.innerHTML = `<div class="toast">${esc(toastState.msg)}</div>`; } // v1.6：跳页（hashchange 重画）不把刚弹的 toast 冲掉
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  // ---------- actions ----------
  const ACTIONS = {
    menu() { document.getElementById("sidebar").classList.toggle("open"); },
    role(el, arg) { DB.ui.role = arg; save(); if (arg === "broker") nav("broker"); else nav("today"); render(); },
    lang(el, arg) { DB.ui.lang = arg; save(); render(); },
    theme() { DB.ui.theme = DB.ui.theme === "dark" ? "light" : "dark"; save(); render(); },
    reset() { if (confirm("把影子网站的数据重置成初始示例？")) resetAll(); },
    "modal-close"() { closeModal(); },
    "nav"(el, arg) { closeModal(); nav(arg); },
    "toast"(el, arg) { toast(arg); },
    "todo"(el, arg) { toast((arg || "这个按钮") + "：影子网站里只演示到这里（真实版会执行）"); },
    "versions"() {
      openModal(`<h2>影子版本</h2><p class="small muted">每次改版不覆盖旧版：当前版在根目录，历史版本原样存档，点开就是当时的样子。三份文档（影子 · 手册 · 架构与流程）的版本号在影子说明页的同步记录里对应。</p><div class="vlist">${VERSIONS.map((v) => v.path ? `<button class="${v.v === DB.version ? "on" : ""}" data-action="ver-go" data-arg="${v.path}"><span class="vv">${v.v}</span><span><b>${v.v === DB.version ? "当前 · " : ""}${v.at}</b><div class="vd">${esc(v.note)}</div></span></button>` : `<button disabled><span class="vv">${v.v}</span><span><b>${v.at}</b><div class="vd">${esc(v.note)}</div></span></button>`).join("")}</div><div class="acts"><button class="btn" data-action="modal-close">关闭</button></div>`);
    },
    "ver-go"(el, path) { if (path === "./") { closeModal(); return; } location.href = path; },
    "notif"() { const dg = NBNotify.digest(); const LV = NBNotify.LEVELS; openModal(`<h2>通知 · 按级分组</h2><p class="small muted">${[1, 2, 3, 4].map((l) => `${LV[l][0]} ${dg.filter((x) => x.level === l).length}`).join(" · ")} · <a href="#/settings/notify" data-action="modal-close">改级别</a></p>${[1, 2, 3].map((l) => { const items = dg.filter((x) => x.level === l); return items.length ? `<div class="nl"><span class="badge ${LV[l][1]}">${l} · ${LV[l][0]}</span><div class="list">${items.slice(0, 5).map((x) => `<div class="li"><div class="body"><div class="t small">${x.href ? `<a href="${x.href}" data-action="modal-close">${esc(x.text)}</a>` : esc(x.text)}</div></div></div>`).join("")}${items.length > 5 ? `<div class="tiny muted">还有 ${items.length - 5} 条</div>` : ""}</div></div>` : ""; }).join("")}<div class="acts"><button class="btn" data-action="modal-close">关闭</button></div>`); },
    "search-open"() {
      const pages = [["today", "今天"], ["deals", "交易"], ["messages", "消息"], ["contacts", "联系人"], ["properties", "房源"], ["showings", "看房 · 我带客户看"], ["showings/listings", "看房 · 别人看我的挂牌"], ["showing", "看房模式"], ["intake", "合同进件"], ["templates", "交易类型模板"], ["vendors", "Vendor"], ["rentals", "租赁运营"], ["cma", "CMA"], ["inbox", "邮件侦测"], ["wechat", "沟通记录"], ["marketing", "营销"], ["importer", "迁移"], ["commission", "佣金"], ["broker", "Broker 后台"], ["automation", "AI 自动化"], ["settings", "设置"], ["settings/phrases", "摘要语句"], ["settings/notify", "通知契约"], ["portal/d1", "客户视图"], ["about", "影子说明"]];
      openModal(`<h2>找功能 / 找交易</h2><input id="sq" placeholder="输地址、名字或页面名…" style="width:100%" autofocus data-enter="search-go"><div class="search-list" id="sres" style="margin-top:8px">${pages.map(([k, l]) => `<button data-action="nav" data-arg="${k}"><span class="k">页面</span>${l}</button>`).join("")}</div><div class="acts"><button class="btn" data-action="modal-close">关闭</button></div>`);
      const inp = document.getElementById("sq"); if (inp) { inp.focus(); inp.addEventListener("input", () => {
        const q = inp.value.trim().toLowerCase(); const res = document.getElementById("sres"); if (!res) return;
        const hits = [];
        pages.forEach(([k, l]) => { if (!q || l.toLowerCase().includes(q) || k.includes(q)) hits.push(`<button data-action="nav" data-arg="${k}"><span class="k">页面</span>${l}</button>`); });
        if (q) {
          DB.deals.forEach((d) => { if (d.title.toLowerCase().includes(q)) hits.push(`<button data-action="nav" data-arg="deals/${d.id}"><span class="k">交易</span>${esc(d.title)}</button>`); });
          DB.contacts.forEach((c) => { if ((c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q)) hits.push(`<button data-action="nav" data-arg="contacts/${c.id}"><span class="k">联系人</span>${esc(c.name)}</button>`); });
          DB.properties.forEach((p) => { if (p.addr.toLowerCase().includes(q)) hits.push(`<button data-action="nav" data-arg="properties/${p.id}"><span class="k">房源</span>${esc(p.addr)}</button>`); });
        }
        res.innerHTML = hits.slice(0, 14).join("") || `<div class="empty small">没找到「${esc(inp.value)}」</div>`;
      }); }
    },
    "search-go"() { const first = document.querySelector("#sres button"); if (first) { closeModal(); nav(first.getAttribute("data-arg")); } },
  };
  window.ACTIONS = ACTIONS;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) {
      if (!e.target.closest(".dp")) closeDP();
      const sb = document.getElementById("sidebar");
      if (sb && sb.classList.contains("open") && !e.target.closest("#sidebar") ) sb.classList.remove("open");
      return;
    }
    const name = el.getAttribute("data-action");
    const fn = ACTIONS[name];
    if (!fn) return;
    if (el.tagName === "A") e.preventDefault();
    fn(el, el.getAttribute("data-arg"), e);
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]");
    if (!el) return;
    const fn = ACTIONS[el.getAttribute("data-change")];
    if (fn) fn(el, el.getAttribute("data-arg"), e);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const el = e.target.closest("[data-enter]"); if (el) { const fn = ACTIONS[el.getAttribute("data-enter")]; if (fn) fn(el, el.getAttribute("data-arg"), e); } }
    if (e.key === "Escape") { closeModal(); if (window.AI) AI.close(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ACTIONS["search-open"](); }
  });
  document.addEventListener("submit", (e) => { e.preventDefault(); });

  // ---------- modal / toast ----------
  function openModal(html) {
    const r = document.getElementById("modal-root");
    if (!r) return;
    r.innerHTML = `<div class="modal-bg" data-action="modal-bg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  }
  ACTIONS["modal-bg"] = (el, arg, e) => { if (e.target === el) closeModal(); };
  function closeModal() { const r = document.getElementById("modal-root"); if (r) r.innerHTML = ""; }
  let toastTimer, toastState = null;
  function toast(msg) {
    const r = document.getElementById("toast-root");
    if (!r) return;
    r.innerHTML = `<div class="toast">${esc(msg)}</div>`; toastState = { msg, until: Date.now() + 2600 };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastState = null; const n = document.getElementById("toast-root"); if (n) n.innerHTML = ""; }, 2600);
  }

  // ---------- date picker (self-drawn, with Clear) ----------
  let dpState = null; // {id, y, m, value, onPick}
  function datePicker(id, value, pickAction, arg) {
    const open = dpState && dpState.id === id;
    return `<div class="dp" data-dp="${id}"><button type="button" class="val ${value ? "" : "empty"}" data-action="dp-open" data-arg="${id}|${value || ""}|${pickAction}|${arg || ""}">${value ? esc(value) : "选日期"} <span class="muted">▾</span></button>${open ? dpPop() : ""}</div>`;
  }
  function dpPop() {
    const { y, m, value } = dpState;
    const first = new Date(y, m, 1); const startDow = first.getDay(); const days = new Date(y, m + 1, 0).getDate();
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += "<span></span>";
    for (let dd = 1; dd <= days; dd++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      cells += `<button type="button" class="${iso === value ? "sel" : ""} ${iso === TODAY() ? "today" : ""}" data-action="dp-pick" data-arg="${iso}">${dd}</button>`;
    }
    return `<div class="pop"><div class="hd"><button type="button" class="btn xs" data-action="dp-nav" data-arg="-1">‹</button><b>${y} 年 ${m + 1} 月</b><button type="button" class="btn xs" data-action="dp-nav" data-arg="1">›</button></div><div class="calendar">${WD.map((w) => `<span class="h">${w}</span>`).join("")}${cells}</div><div class="ft"><button type="button" class="btn xs" data-action="dp-pick" data-arg="">Clear（清空）</button><button type="button" class="btn xs" data-action="dp-pick" data-arg="${TODAY()}">今天</button><button type="button" class="btn xs" data-action="dp-close">关闭</button></div></div>`;
  }
  function closeDP() { if (dpState) { dpState = null; render(); } }
  ACTIONS["dp-open"] = (el, arg) => {
    const [id, value, action, a2] = arg.split("|");
    const base = value ? new Date(value + "T00:00:00") : new Date(TODAY() + "T00:00:00");
    dpState = { id, y: base.getFullYear(), m: base.getMonth(), value, action, arg: a2 };
    render();
  };
  ACTIONS["dp-nav"] = (el, arg) => { const n = Number(arg); const x = new Date(dpState.y, dpState.m + n, 1); dpState.y = x.getFullYear(); dpState.m = x.getMonth(); render(); };
  ACTIONS["dp-close"] = () => closeDP();
  ACTIONS["dp-pick"] = (el, arg) => { const s = dpState; dpState = null; const fn = ACTIONS[s.action]; if (fn) fn(el, s.arg + "|" + arg); else render(); };

  // ---------- audit / proposals helpers shared ----------
  function audit(deal, what, actor = "human", who = DB.me.name) {
    DB.audit.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), actor, who, what, deal });
  }
  // 新建一条 AI 提议：只走 NBProp.add（最低档、key 相同还在等的不重复建）；返回 id
  function addProposal(p) { return NBProp.add(Object.assign({ cost: 0.006 }, p)).id; }
  function personLine(cid, extra) {
    const c = contact(cid); if (!c) return "";
    return `<div class="persona"><div class="avatar sm">${initials(c.name)}</div><div><a href="#/contacts/${c.id}"><b>${esc(c.name)}</b></a> <span class="muted small">${extra || ""}</span></div></div>`;
  }

  Object.assign(window, { DBsave: save, esc, money, rel, fd, fdRel, urgency, contact, org, prop, deal, addr, initials, stageBadge, ROLE, KIND, ORGKIND, LINK, FAMILY, coverBadge, pageHeader, t, SCREENS, nav, render, openModal, closeModal, toast, datePicker, audit, addProposal, personLine, daysBetween, TODAY, resetAll, STAGE, TIER_ZH, TIER_ORD, VERSIONS, ICONS, counts });
  function boot() { if (!location.hash) location.hash = "#/today"; render(); NBSync.connect(); }
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot); else boot();
})();
