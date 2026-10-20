/* NewBee OS · 客户 App 影子 v1.7：卖家 / 房东首页「看房反馈」卡多了约好的看房（日期 + 时段，不带对方经纪）和「要您批」的中文提示（NBLShow.forSeller / sellerHint；没有任何定价的话）· 第六个示例身份「卖房 2」（马先生 · 自动确认的挂牌）
   v1.5：五位示例客户（找房 / 买房 / 卖房 / 租客 = 申请人 / 房东），每一位只看得到自己的交易、看房、对话和文件 · 几句话摘要（只用已确认的值）· 人话路线图 · 看房日 · 决定卡 · 卖方 Offer（同意 = 只记同意时间，只有决策人能点）· 收藏 / 打分 / 反馈回到经纪人 · 房东资产（从他名下的放租交易算）· 续约提醒 90 / 60 / 30 · 透明度读共享设置 */
window.APP_ID = "client"; window.APP_NAME = "客户 App 影子"; window.HOME_TAB = "home";
window.APP_TABS = [["home", "⌂", "首页", false], ["homes", "▦", "房源", false], ["messages", "✉", "消息", false], ["deal", "▤", "进度", true], ["more", "⋯", "更多", false]];
window.APP_VERSIONS = [
  { v: "v1.7", at: "2026-10-20", path: "./", note: "卖家 / 房东首页「看房反馈」卡：约好的看房（日期 + 时段，不带对方经纪）· 要卖家 / 租客批时一行中文提示（请点 BrokerBay 短信里的确认）· 没有任何定价的话；身份多一个「卖房 2」（看房不少没有 Offer 的那笔）" },
  { v: "v1.6", at: "2026-10-06", path: "./v1.6/index.html#client", note: "跟着根目录升 v1.6：新建的房源规格可以为空（显示 —）；客户端功能没变" },
  { v: "v1.5", at: "2026-10-05", path: "./v1.5/index.html#client", note: "一个标准 + 三样新功能：只看自己的交易和房子（搜索 / 看房 / 消息 / 文件都按身份过滤）· 「同意」只记时间戳、只有决策人能点 · 收藏 / 打分 / 反馈回到经纪人那边 · 房东资产从真实交易算、续约 90 / 60 / 30 · 摘要语句（客户组）· 透明度按设置生效" },
  { v: "v1.4", at: "2026-10-01", path: "./v1.4/index.html#client", note: "决定清单 38–48 里客户看得到的两条：看房日（现在这套 / 下一套 / 几点到 / 距离 / 一键导航 / 全天路线和变动，自己开车也能跟）；决定卡（两边条件并排 + 经纪人的看法 + 你的选择；夫妻两个决策人各自已读 / 已答，答得不一样标「需要商量」转给经纪人）" },
  { v: "v1.3", at: "2026-10-01", path: "./v1.3/index.html#client", note: "人话路线图：买房 / 卖房 / 租客 / 房东各自的路线，竖版，已完成 + 现在在哪（绿点）正常显示、后面灰显、分支用您的叫法；「房源」= 我的目标房（经纪人排的顺序 + 收藏）；「看房」= 今天 / 接下来 / 看房历史，每套打分反馈回到经纪人" },
  { v: "v1.2", at: "2026-09-30", path: "./v1.2/index.html#client", note: "和网站 / 经纪人 App 同一份数据（v1.2 的排序和星标是经纪人侧功能，客户 App 界面不变）" },
  { v: "v1.1", at: "2026-09-29", path: "./v1.1/index.html#client", note: "三端一个数据库 · 新增「消息」tab：给经纪人留言、待你回复（确认 / 上传 / 选时间 / 审批一键完成）、催一下（AI 先核实）；文件 / 家人 / 看房模式收进「更多」" },
  { v: "v1.0", at: "2026-09-29", path: "./client/v1.0/index.html", note: "首版：融合 Muse v4 客户 App 影子——买方 5 阶段 / 租客 4 步、今天要处理、钱的时间线（付给谁 · 可退性 · 退找谁）、房子档案一句话定调、客户看房模式、家人意见、房东资产仪表盘；和网站影子共用同一份示例数据" },
];
(function () {
  const A = window.ACTIONS;
  const M = () => (DB.m = DB.m || {});
  const roleKey = () => M().role || "buyer";
  // 六个示例身份 → 各自的联系人（都是决策人，或申请人本人）。这一端画什么只跟着这位联系人走：他自己的交易、看房、对话、文件——别人的一概拿不到
  // v1.7 加了第二位卖家（卖房 2 = 马先生，挂牌设成「自动确认」）：身份种类仍是「卖房」（ROLE_KIND），页面逻辑按种类走
  const ROLES = [["looking", "找房", "c10"], ["buyer", "买房", "c1"], ["seller", "卖房", "c5"], ["seller2", "卖房 2", "c36"], ["renter", "租客", "c9"], ["landlord", "房东", "c4"]];
  const ROLE_KIND = { seller2: "seller" };
  const role = () => ROLE_KIND[roleKey()] || roleKey();
  const who = () => contact((ROLES.find((r) => r[0] === roleKey()) || ROLES[1])[2]);
  window.clientWho = who;
  const TYPE_OF = { looking: "buyer", buyer: "buyer", seller: "seller", landlord: "lessor" }; // 身份 → 交易类型。租客 = 别人那笔放租交易上的申请人，没有自己的交易
  const live = (d) => !NBRoadmap.TERMINAL.includes(d.stage);
  const short = (s) => String(s || "").split(",")[0];
  const agentName = () => DB.me.name;
  // 我的交易：我是「我方客户」的那几笔（NBPhrase.isClientOf：主联系人 / 我方当事人 / 客户视图成员），再按身份的类型收一下
  const myDeals = () => { const t = TYPE_OF[role()]; return t ? DB.deals.filter((d) => NBRoadmap.typeOf(d) === t && NBPhrase.isClientOf(d.id, who().id)) : []; };
  const isMine = (id) => myDeals().some((d) => d.id === id);
  const myDeal = () => { const ds = myDeals(); if (role() === "landlord") return ds.find((d) => d.id === M().asset) || ds[0] || null; return ds.find(live) || ds[0] || null; };
  const cf = (id, key) => { const f = (DB.fields[id] || []).find((x) => x.key === key && x.status === "confirmed" && !x.absent); return f ? f.value : ""; }; // 客户这边只用已确认的字段
  const myThreads = () => NBMsg.listFor("client", { contact: who().id });
  const myThread = () => { const ts = myThreads(); const d = myDeal() || appDeal(); return (d && ts.find((x) => x.t.deal === d.id)) || ts[0] || null; };
  // 看房：只有看完的和经纪人已经同步到客户 App 的（还在约的草稿不给看）
  const myTours = () => NBTours.forClientApp(who().id);
  const nextTour = () => { const ts = myTours().filter((t) => t.status !== "done" && t.date >= TODAY()); return ts.find((t) => t.date === TODAY()) || ts[0] || null; };

  // ---------- 租客身份 = 申请人：他是房东那笔放租交易的对方。只拿得到申请走到哪一步、自己的对话和上传卡；那笔交易的字段、文件、钱、评分卡一样都不给 ----------
  const appDeal = () => (role() === "renter" ? DB.deals.find((d) => NBRoadmap.typeOf(d) === "lessor" && DB.parties.some((p) => p.deal === d.id && p.party === who().id && p.side === "theirs")) || null : null);
  function appView() {
    const a = appDeal(); if (!a) return null; const p = prop(a.property) || {};
    const ms = (k) => (DB.milestones[a.id] || []).find((m) => m.key === k);
    const tids = myThreads().map((x) => x.t.id);
    const up = NBMsg.messages().find((m) => m.kind === "request" && m.request && m.request.to === "client" && m.request.status === "pending" && m.request.action === "upload" && tids.includes(m.thread)) || null;
    const approved = ["lease_pending", "active"].includes(a.stage); const sub = ms("application"); const dec = ms("landlord_decision");
    const steps = [
      { t: "已提交", d: sub && sub.date ? fd(sub.date) : "", st: sub && sub.status !== "done" ? "cur" : "done" },
      { t: "材料核验", d: up ? `还差：${up.request.title}${up.request.due ? " · " + fd(up.request.due) + " 前" : ""}` : "材料齐了", st: up ? "cur" : "done" },
      { t: "房东审核", d: approved ? "已有结果" : dec && dec.date ? `${fd(dec.date)} 前给结果` : "", st: approved ? "done" : up ? "" : "cur" },
      { t: approved ? "已批准 · 准备签约" : "结果：批准 / 被拒", d: approved ? "经纪人起草租约，发给您签" : "有结果 24 小时内通知您；被拒会给书面原因", st: approved ? "cur" : "" },
    ];
    return { deal: a, prop: p, up, approved, steps, next: up ? `您上传「${up.request.title}」` : approved ? "经纪人起草租约，发给您签" : dec && dec.date ? `房东在 ${fd(dec.date)} 前决定` : "等房东审核" };
  }

  // ---------- 文件：自己交易的文件。租房申请表、收入材料的全文只有经纪人能看（房东也不给）；草稿要「完全透明」才给；申请人只看自己传上来的 ----------
  const AGENT_ONLY_DOCS = ["lease_application", "income_docs"];
  function myDocs() {
    const a = appDeal(); if (a) return DB.documents.filter((x) => x.deal === a.id && /^客户上传/.test(x.source || "") && String(x.source).includes(who().name));
    const ids = myDeals().map((d) => d.id);
    return DB.documents.filter((x) => ids.includes(x.deal) && !AGENT_ONLY_DOCS.includes(x.type) && (!/草稿/.test(x.name || "") || NBSet.transparency(x.deal) === "full"));
  }

  window.APP_HEADER = (r) => {
    if (r.name === "messages") return r.segs[1] ? { title: "", sub: "" } : { title: "消息", sub: "和经纪人的对话 · 都挂在你的交易上" };
    if (r.name === "more") return { title: "更多", sub: "文件 · 家人 · 我的看房 · 大字" };
    const n = todayItems().length; const rl = role();
    return ({ home: { title: "欢迎回来", sub: n ? `客户门户 · 今天有 ${n} 件事和您有关` : "客户门户 · 今天没有等您的事" }, homes: { title: rl === "looking" ? "我的目标房" : rl === "renter" ? "我申请的房子" : "我的房子", sub: rl === "looking" ? "经纪人按您的优先顺序排的 · 想调顺序在消息里说一声" : rl === "buyer" ? "合同里的这套 · 看过的房" : "" }, deal: { title: rl === "landlord" ? "资产仪表盘" : rl === "renter" ? "申请进度" : "交易进度", sub: rl === "landlord" ? "一屏看全 · 放租路线图" : rl === "renter" ? "现在到哪一步 · 下一步" : "现在在哪 · 下一步 · 用您的叫法" }, files: { title: "文件与合同人话", sub: "解释、页码、版本" }, family: { title: "家人意见", sub: "角色、意见、隐私" }, tour: { title: "我的看房", sub: "今天 / 接下来 / 看房历史 · 打分和反馈回到经纪人" } })[r.name] || { title: "" };
  };
  // 大字（老花模式）：共享设置，按这位联系人存（NBSet）；换身份跟着换
  const bigOn = () => NBSet.bigFont(who().id);
  window.APP_EXTRA_HEADER = () => `<button class="ib big ${bigOn() ? "on" : ""}" data-action="big">大字</button><span class="ib big on" style="border-radius:50%;padding:0;width:32px">${esc((who() || { name: "客" }).name.slice(0, 1))}</span>`;
  A["big"] = () => { const on = !bigOn(); NBSet.setBigFont(on, who().id); DBsave(); render(); toast(on ? "大字已开" : "大字已关"); };
  A["role"] = (el, r) => { if (!ROLES.some((x) => x[0] === r)) return; M().role = r; NBSet.applyBigFont(who().id); DBsave(); nav("home"); render(); };
  const roleChips = () => `<div class="rolechips">${ROLES.map(([k, l]) => `<button class="${roleKey() === k ? "on" : ""}" data-action="role" data-arg="${k}">${l}</button>`).join("")}</div>`;

  // ---------- 路线图投影：客户看自己那张路线图（买房 / 卖房 / 放租），用客户的叫法 ----------
  const rmView = () => myDeal();
  const rmClient = () => TYPE_OF[role()];
  function rmProgress(v) { const map = NBRoadmap.mapFor(v); let all = 0, done = 0; map.phases.forEach((ph) => { const ns = ph.nodes ? ph.nodes : [].concat.apply([], ph.lines.map((l) => l.nodes)); ns.forEach((n) => { all++; if (NBRoadmap.state(v, n.id) === "done") done++; }); }); return all ? Math.round(done / all * 100) : 0; }
  // 首页用的精简版：现在在哪 + 阶段条（完整竖版在「进度」）
  function rmMini(v) { const map = NBRoadmap.mapFor(v); const stage = NBRoadmap.TERMINAL.includes(v.stage) ? v.stage : NBRoadmap.stageOf(v); const stages = map.stages.concat(NBRoadmap.TERMINAL.includes(stage) && !map.stages.includes(stage) ? [stage] : []); const ci = stages.indexOf(stage); return `<div class="rm v client mini"><div class="rm-now"><span class="rm-dot"></span><span>现在：${esc(NBRoadmap.nowText(v, true))}</span></div><div class="rm-stages">${stages.map((s2, i) => `<span class="${i < ci ? "done" : i === ci ? "cur" : ""}">${esc(NBRoadmap.STAGE_ZH[s2] || s2)}</span>`).join("")}</div></div>`; }
  // 下一个节点：这条对话挂的交易 / 看房上，客户看得到的下一步（NBMsg.nextStep）；没有对话就看路线图上最近的截止
  function nextLine() {
    const t = myThread(); const ns = t ? NBMsg.nextStep(t.t, "client") : null;
    if (ns) return `${ns.label}${ns.due ? " · " + fd(ns.due) + "（" + rel(ns.due) + "）" : ""}`;
    const v = rmView(); const nd = v ? NBRoadmap.nextDue(v) : null;
    return nd ? `${nd.node.c || nd.node.t} · ${fd(nd.date)}${nd.est ? "（估）" : ""}` : "";
  }
  const phraseCard = (d) => { const html = d ? NBPhrase.linesHtml(d.id, "client_app", "client", { who: who().id }) : ""; return html ? `<div class="card phrcard"><div class="hd"><h3>摘要</h3><span class="tiny muted">只用已确认的内容</span></div>${html}</div>` : ""; };
  // 房东：名下每一笔放租交易一行（NBRent.assets）；最近的一次续约提醒
  const myAssets = () => (role() === "landlord" ? NBRent.assets(who().id) : []);
  const renewalSoon = () => { const as = myAssets().filter((a) => a.renewal).sort((x, y) => x.renewal.date.localeCompare(y.renewal.date)); return as[0] ? { a: as[0], r: as[0].renewal } : null; };
  const rentRows = (id) => (DB.money[id] || []).filter((m) => /租金/.test(m.label || ""));
  const rentPaidThisMonth = (id) => rentRows(id).filter((m) => m.status === "paid" && String(m.due || "").slice(0, 7) === TODAY().slice(0, 7)).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const buyerName = (o) => String(o.buyer || "买家").replace(/（[^）]*(代理|经纪)[^）]*）/, ""); // 对方经纪的名字不给客户看

  const clientTasks = (id) => (DB.tasks[id] || []).filter((x) => x.status === "pending" && x.clientVisible && x.assignee === "客户");
  // 今天要处理：全部从数据算——要您做的任务、等您决定的 Offer / 维修报价、看房、申请进度、续约提醒
  function todayItems() {
    const out = []; const r = role();
    myDeals().forEach((d) => clientTasks(d.id).forEach((x) => out.push({ kind: /确认|选择|决定/.test(x.name) ? "需要决定" : "需要准备", when: x.due ? (x.due === TODAY() ? "今天" : fd(x.due) + " 前") : "本周内", t: x.name.replace(/^客户：/, ""), d: `负责人：您${x.rule ? " · " + x.rule : ""}`, act: "查看", href: "#/deal" })));
    if (r === "buyer") { const d = myDeal(); const it = d ? INTEL[d.property] : null; if (it && it.watch) out.push({ kind: "风险变化", when: "新证据", t: it.watch[0], d: it.watch[1], act: "查看依据", href: "#/homes" }); }
    if (r === "seller") myDeals().forEach((d) => {
      NBOffers.openOf(d.id).forEach((o) => { const v = NBOffers.last(o); if (v.who !== "theirs") return; const cs = NBOffers.consentOf(o); const agreed = !!(cs && cs.current); out.push({ kind: agreed ? "已同意" : "需要决定", when: o.expires ? fd(o.expires) + String(o.expires).slice(10) + " 前" : "尽快", t: `${buyerName(o)} 的 counter：${money(v.price)}${v.option ? " · option " + v.option : ""}`, d: agreed ? `您在 ${cs.at} 点了「同意」；对方签字后才成合同。` : "点「同意」只记下您同意的时间；对方签字后才成合同。", act: "看 Offer", href: "#/homes" }); });
      const it = lshowItem(d, "看反馈"); if (it) out.push(it);
    });
    if (r === "renter") { const av = appView(); if (av) { out.push({ kind: "进度", when: av.up ? "等您" : av.approved ? "等签约" : "等房东", t: av.approved ? "申请已批准 · 准备签约" : "申请已提交 · 房东审核中", d: `下一步：${av.next}。被拒会给书面原因。`, act: "看进度", href: "#/deal" }); out.push({ kind: "隐私", when: "随时", t: "谁能看到我的工资单？", d: "房东只看评分卡和摘要；全文只有经纪人；授权可撤回。", act: "查看", href: "#/files" }); } }
    if (r === "landlord") {
      const ids = myDeals().map((d) => d.id);
      NBRent.orders().filter((w) => ids.includes(w.deal) && NBRent.needsApproval(w)).forEach((w) => out.push({ kind: "需要决定", when: "今天", t: `维修报价 ${money(w.cost)} 等您批（${w.what}）`, d: `超过您设的 ${money(NBRent.threshold(w))} 门槛，没批之前不施工。`, act: "去审批", href: "#/deal/" + w.deal }));
      myDeals().filter((d) => ["listed", "offer", "applying"].includes(d.stage)).forEach((d) => { const it = lshowItem(d, "我的房子"); if (it) out.push(it); }); // v1.7：招租中的房子也有「看房反馈」卡（场次 · 约好的时段 · 要您批的提示）
      const rn = renewalSoon(); if (rn) out.push({ kind: "提醒", when: `到期前 ${rn.r.n} 天`, t: `${rn.a.addr} 的续约提醒：${fd(rn.r.date)}`, d: `租约 ${fd(rn.a.leaseEnd)} 到期（${rn.a.daysLeft} 天后）。到期前 ${NBRent.RENEWAL.join(" / ")} 天各提醒一次，带周边租金对比。`, act: "看资产", href: "#/deal/" + rn.a.deal });
    }
    if (r === "looking") {
      const nt = nextTour(); if (nt) out.push({ kind: nt.status === "in_progress" ? "进行中" : NBTours.dayLabel(nt.date), when: nt.start + " 出发", t: nt.status === "in_progress" ? `看房进行中 · 第 ${NBTours.curIndex(nt) + 1} / ${nt.homes.length} 站` : `经纪人已同步 ${nt.homes.length} 站看房路线`, d: "几点到、看几套、每套停留多久都在路线里；看完每套可以打分。", act: "进入看房", href: "#/tour" });
      const tg = NBTours.targets(who().id); const neg = tg.filter((x) => ["offer", "negotiating"].includes(x.status)).length;
      if (tg.length) out.push({ kind: "目标房", when: "经纪人排的顺序", t: `我的目标房 ${tg.length} 套${neg ? " · " + neg + " 套 Offer 中" : ""}`, d: "想调顺序或放弃哪套，在消息里说一声，经纪人改完这里就变。", act: "看目标房", href: "#/homes" });
    }
    return out;
  }
  window.todayItems = todayItems;
  // v1.7：卖家 / 房东首页的「看房反馈」卡——场次 + 约好的看房（日期 + 时段，不带对方经纪）+ 这套挂牌要您批、有人在等 → 一行中文提示（请点 BrokerBay 短信里的确认）。
  // 数据只从 NBLShow.forSeller / sellerHint 来：没有对方经纪的名字 / 电话，也没有任何定价的话（定价信号只在经纪人那边）
  const lshowHtml = (d) => { const sf = NBLShow.forSeller(d.id); const hint = NBLShow.sellerHint(d.id); return (hint ? `<div class="note warn small lshint">${esc(hint)}</div>` : "") + `<div class="lsupcoming"><div class="tiny muted">约好的看房</div>${sf.upcoming.length ? sf.upcoming.map((x) => `<div class="slot"><b class="num">${esc(x.date)} ${esc(x.window)}</b><span class="tiny muted">${esc(x.day)} · 请在这个时段前把家里收拾好、方便看房</span></div>`).join("") : `<div class="small muted">现在没有约好的看房</div>`}</div>`; };
  const lshowItem = (d, act) => { const sf = NBLShow.forSeller(d.id); if (!(sf.total || sf.pendingApproval.length)) return null; return { kind: "看房反馈", when: short((prop(d.property) || {}).addr || d.title), t: `${sf.done} 场看完${sf.upcoming.length ? " · 还约了 " + sf.upcoming.length + " 场" : ""}`, d: sf.rows[0] ? "最近一条：" + sf.rows[0].text : "还没有可以给您看的反馈；经纪人整理好会放到这里", act: act || "看反馈", href: "#/homes", html: lshowHtml(d) }; };

  // 房子档案的「AI 一句话」：按房子写好的样例（不是这里算出来的）；watch = 首页「风险变化」那一条
  const INTEL = {
    p1: { line: "地基风险中等偏高，建议验房时加做 foundation inspection；屋顶和空调都是 2016 年，短期没有大额支出。", watch: ["地基信号升为「关注」", "卖方披露与周边历史标记形成组合信号，建议验房时重点核验。"] },
    p6: { line: "屋顶 2011 年是最大的未知：报价前要么让卖方提供屋顶检查，要么在 option 期内自己做。" },
    p2: { line: "屋顶 2021 年新换是卖点；在售同小区两套定价偏高，你的价格有竞争力。" },
    p8: { line: "2015 年建，屋顶和空调都是原装；正在招租。" },
  };
  const intelLine = (p) => (INTEL[p.id] || {}).line || "证据还在收集中。";
  function intelTiles(p) { const y = new Date().getFullYear(); const watch = !!(INTEL[p.id] || {}).watch; return [["屋顶", p.roof ? `约 ${y - p.roof} 年` : "—", "卖方披露 · 待 permit 核验"], ["空调 HVAC", p.hvac ? String(p.hvac) : "—", "披露与 permit 一致"], ["地基信号", watch ? "需关注" : "正常", "周边公开记录，不等于本房结论"], ["月度持有成本", "待确认", `贷款 · 税费 · 保险 · HOA${p.hoa ? " $" + p.hoa + "/年" : ""}`]].map(([l, v, d2]) => `<div class="pro"><div class="l">${l}</div><div class="v" style="${v === "需关注" ? "color:var(--warn)" : ""}">${esc(v)}</div><div class="tiny muted">${esc(d2)}</div></div>`).join(""); }

  // ================= 首页 =================
  SCREENS.home = function () {
    const r = role(); const d = myDeal(); const av = appView(); const p = d ? prop(d.property) : av ? av.prop : null; const v = rmView(); const pct = v ? rmProgress(v) : 0;
    const nt = nextTour(); const assets = myAssets(); const rn = r === "landlord" ? renewalSoon() : null; const ns = r === "renter" || r === "landlord" ? "" : nextLine();
    const notice = r === "looking" && nt ? `${NBTours.dayLabel(nt.date)} ${nt.start} · ${nt.status === "in_progress" ? "看房进行中，第 " + (NBTours.curIndex(nt) + 1) + " 站" : "经纪人已同步 " + nt.homes.length + " 站看房路线"}`
      : r === "renter" ? (av ? "下一步：" + av.next : "还没有申请")
      : r === "landlord" ? (rn ? `${rn.a.addr}：到期前 ${rn.r.n} 天的续约提醒在 ${fd(rn.r.date)}` : "最近没有要到期的租约")
      : ns ? "下一个节点：" + ns : r === "looking" ? "最近没有安排看房 · 目标房在「房源」" : "现在没有等您的节点";
    const hero = r === "landlord" ? `<div class="hero"><div class="k">房东资产组合 · ${assets.length} 套</div><h2>一屏看全：出租、招租与租约到期</h2><p>本月租金到账、招租天数、维修审批和续约节点都在这里。</p><div class="acts"><a class="btn pri" href="#/deal">打开资产仪表盘</a><a class="btn" href="#/homes">我的房子</a></div></div>` : `<div class="hero"><div class="k">房子档案 · 按证据等级</div><h2>一套房子，不只看照片</h2><p>结构、设备、公开记录、现场观察与真实成本，按证据等级放在一起。</p><div class="acts"><a class="btn pri" href="#/homes">打开房子档案</a>${r === "looking" ? `<a class="btn" href="#/tour">我的看房</a>` : `<a class="btn" href="#/deal">${r === "renter" ? "申请进度" : "交易进度"}</a>`}</div></div>`;
    const items = todayItems(); const hot = myThreads().find((x) => x.pend || x.unread);
    return roleChips() +
      `<div class="card"><div class="row"><span class="badge acc">${{ looking: "找房中", buyer: "当前买房交易", seller: "当前卖房", renter: "当前租房申请", landlord: "房东" }[r]}</span><span class="sp"></span><span class="tiny muted">${esc(who().name)}</span></div><b style="display:block;margin-top:6px;font-size:1.05em">${p ? esc(p.addr) : "还没有房子"}</b><div class="small muted">${v ? esc(NBRoadmap.nowText(v, true)) : av ? (av.approved ? "已批准 · 签约前" : "申请审核中") : ""}</div><a class="btn sm" style="margin-top:8px" href="#/deal">查看详情</a></div>
      <div class="note acc" style="margin-bottom:12px"><b>●</b> ${esc(notice)} <a href="${r === "looking" && nt ? "#/tour" : "#/deal"}">去看 →</a></div>` +
      (hot ? (function () { const pend = NBMsg.pending(hot.t.id, "client"); return `<a class="card" href="#/messages/${hot.t.id}" style="display:block;border-color:var(--warn)"><div class="row"><span class="badge warn">${pend.length ? `${pend.length} 件待你回复` : "新消息"}</span><span class="sp"></span><span class="tiny muted">${esc(agentName())} · ${NBMsgUI.fmtAt(hot.t.lastAt)}</span></div><b style="display:block;margin-top:6px">${esc(pend.length ? pend[0].request.title : hot.t.lastText)}</b><div class="small muted">${pend.length ? "点一下就能确认 / 上传 / 选时间，不用打字" : "打开看看"}</div></a>`; })() : "") + hero +
      (v && r !== "landlord" ? `<div class="card"><div class="hd"><h3>现在在哪 · 下一步</h3><span class="badge ok">${pct}%</span></div><div class="bar" style="margin-bottom:8px"><i style="width:${pct}%"></i></div>${rmMini(v)}<a class="btn sm" style="margin-top:8px" href="#/deal">看完整路线图</a></div>` : av ? appCard(av, true) : "") +
      phraseCard(d) +
      `<div class="sec"><h2>今天要处理</h2><a href="#/deal">完整时间线</a></div>` +
      (items.map((x) => `<div class="card${x.html ? " lscard-c" : ""}"><div class="tiny muted mono">${esc(x.kind)} · ${esc(x.when)}</div><b style="display:block;margin-top:4px">${esc(x.t)}</b><div class="small muted">${esc(x.d)}</div>${x.html || ""}<a class="btn sm" style="margin-top:8px" href="${x.href}">${esc(x.act)}</a></div>`).join("") || `<div class="empty small">今天没有等您的事</div>`) +
      (d && p && r !== "landlord" ? `<div class="sec"><h2>房子档案 · 一页读懂</h2><a href="#/homes">全部证据</a></div><div class="card"><div class="note ai"><b>AI 一句话定调：</b>${esc(intelLine(p))}</div><div class="g2" style="margin-top:8px">${intelTiles(p)}</div></div>` : "");
  };

  // ================= 房源 =================
  // 收藏 / 打分 / 一句话：写进共享的 DB.homeFeedback（NBTours.setClientFb），经纪人 App 和网站读同一份。key = 房源 id（路线里手输地址的那一站没有房源 id，就用那一站的 id）
  const fbOf = (key) => NBTours.clientFb(who().id, key) || {};
  const fbKey = (h) => h.prop || h.id;
  const seenHomes = () => { const seen = {}; myTours().forEach((t) => t.homes.forEach((h) => { if (h.visit && h.visit.arrived) seen[fbKey(h)] = { key: fbKey(h), addr: h.addr, p: h.prop ? prop(h.prop) : null, tag: NBTours.dayLabel(t.date) + " 看过" }; })); return Object.values(seen); };
  // 这个身份能收藏 / 打分的房：自己的目标房、自己路线上的每一站、自己交易的那套、自己申请的那套
  const myHomeKeys = () => { const ks = {}; myTours().forEach((t) => t.homes.forEach((h) => { ks[fbKey(h)] = true; })); NBTours.targets(who().id).forEach((x) => { ks[x.prop] = true; }); myDeals().forEach((d) => { if (d.property) ks[d.property] = true; }); const a = appDeal(); if (a && a.property) ks[a.property] = true; return ks; };
  const homeCard = (h) => { const p = h.p; const fb = fbOf(h.key); return `<div class="homecard" data-home="${esc(h.key)}"><div class="ph">${esc(short(h.addr))}</div><div class="bd"><div class="row"><span class="badge mute">${esc(h.tag)}</span><span class="sp"></span><button class="btn xs ${fb.fav ? "pri" : ""}" data-action="fav" data-arg="${esc(h.key)}">${fb.fav ? "♥ 已收藏" : "♡ 收藏"}</button></div>${p ? `<div class="kv" style="margin-top:6px"><div class="r"><span>户型 / 面积</span><b>${p.beds ?? "—"} 房 ${p.baths ?? "—"} 卫${p.sqft ? " · " + Number(p.sqft).toLocaleString("en-US") + " sqf" : ""}</b></div><div class="r"><span>学区</span><b>${esc(p.isd || "—")}</b></div><div class="r"><span>建于 / 屋顶</span><b>${p.year || "—"} / ${p.roof || "—"}</b></div><div class="r"><span>HOA</span><b>${p.hoa ? money(p.hoa) + " / 年" : "没有"}</b></div></div><div class="note ai" style="margin-top:8px"><b>AI 一句话：</b>${esc(intelLine(p))}</div>` : `<div class="small muted" style="margin-top:6px">公开资料整理中 · 价格 / 户型 / 学区 / 照片</div>`}<div class="row" style="margin-top:8px"><span class="small muted">我的打分</span><span class="stars">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= (fb.score || 0) ? "on" : ""}" data-action="score" data-arg="${esc(h.key)}|${n}">★</i>`).join("")}</span></div></div></div>`; };
  // 目标房状态用客户的叫法（顺序和状态是经纪人改的，这里只读）
  const TGT_CLIENT = { watching: ["在看", "warn"], offer: ["出价中", "acc"], negotiating: ["谈判中", "acc"], on_hold: ["先放一放", "mute"], passed: ["放弃了", "mute"], lost: ["没拿到 · 以后还能再试", "mute"], won: ["签约了", "ok"] };
  function offerCard(d, o) {
    const v = NBOffers.last(o); const st = NBOffers.label(o.status); const open = NBOffers.isOpen(o); const net = NBOffers.netToSeller(o, d.id); const cs = NBOffers.consentOf(o); const dec = NBOffers.isDecider(d.id, who().id); const theirs = v.who === "theirs";
    const old = (o.consents || []).slice(-1)[0]; const canAgree = open && theirs && dec && !(cs && cs.current);
    return `<div class="card offercard" data-offer="${o.id}"><div class="row"><b>${esc(buyerName(o))}</b><span class="sp"></span><span class="badge ${st[1]}">${esc(st[0])}</span></div>
      <div class="kv"><div class="r"><span>价格（v${v.v} · ${theirs ? "对方提的" : "我们提的"}）</span><b>${money(v.price)}</b></div><div class="r"><span>Option</span><b>${esc(v.option || "—")}</b></div><div class="r"><span>过户</span><b>${esc(v.close || "—")}</b></div><div class="r"><span>净到手（估）</span><b>${money(net.net)}</b></div></div><div class="tiny muted">${esc(net.label)}</div>
      ${cs ? `<div class="note ok small consent" style="margin-top:8px">${cs.by && cs.by !== who().id ? esc((contact(cs.by) || {}).name || "另一位决策人") : "您"}在 ${esc(cs.at)} 对 v${cs.v || v.v} 点了「同意」。只记同意的时间，对方签字后才成合同。${cs.current ? "" : "之后又出了新版本，要重新点。"}</div>` : old && open ? `<div class="tiny muted" style="margin-top:6px">v${old.v || ""} 的同意（${esc(old.at || "")}）已留底；出了新版本要重新点。</div>` : ""}
      ${canAgree ? `<button class="btn wide pri" style="margin-top:8px" data-action="agree" data-arg="${d.id}|${o.id}">同意这个 counter（只记同意时间）</button>` : open && theirs && !dec ? `<div class="tiny muted" style="margin-top:8px">只有决策人（签约人，含配偶）能点「同意」；您可以看。</div>` : open && !theirs ? `<div class="tiny muted" style="margin-top:8px">我们的 counter 已发出，等对方回复。</div>` : ""}</div>`;
  }
  function sellerHomes() {
    return myDeals().map((d) => { const p = prop(d.property) || {}; const sf = NBTours.sellerFeedback(d.id); const lp = cf(d.id, "list_price"); const rng = ((DB.cma || {})[d.property] || {}).range; const oh = (DB.marketing || {}).openHouse; const os = NBOffers.list(d.id).slice().sort((a, b) => (NBOffers.isOpen(b) ? 1 : 0) - (NBOffers.isOpen(a) ? 1 : 0));
      return `<div class="card"><div class="hd"><h3>${esc(short(p.addr || d.title))} · ${esc(NBRoadmap.stageLabel(d.stage))}</h3><span class="badge ai">${sf.total} 场看房</span></div><div class="note ok"><b>看房反馈：</b>${sf.done} 场看完${sf.upcoming ? ` · 还约了 ${sf.upcoming} 场` : ""}。${sf.rows.length ? "下面是经纪人给您看的反馈。" : "还没有可以给您看的反馈；经纪人整理好会放到这里。"}</div>${sf.rows.length ? `<div class="list">${sf.rows.map((x) => `<div class="li"><span class="badge mute">${esc(fd(x.at))}</span><div class="body"><div class="t small">${esc(x.text)}</div></div></div>`).join("")}</div>` : ""}<div class="kv" style="margin-top:8px"><div class="r"><span>挂牌价</span><b>${lp ? esc(lp) : money(d.price)}</b></div>${rng ? `<div class="r"><span>建议区间（CMA）</span><b>${money(rng[0])}–${money(rng[1])}</b></div>` : ""}${oh && oh.deal === d.id ? `<div class="r"><span>Open House</span><b>${esc(oh.when)} · ${(oh.signins || []).length} 组登记</b></div>` : ""}</div></div>
        <div class="sec"><h2>Offer（${os.length}）</h2><span class="lk">净到手：三端同一个算法</span></div>${os.map((o) => offerCard(d, o)).join("") || `<div class="empty small">还没有 Offer</div>`}`; }).join("") + `<p class="tiny muted">对方经纪的私人信息和我们的谈判底线不会出现在这里。</p>`;
  }
  function landlordHomes() {
    const as = myAssets(); const sc = (DB.rentals || {}).scorecard; const scA = sc ? as.find((a) => a.deal === sc.deal) : null;
    return (as.map((a) => { const d = deal(a.deal) || {}; const rows = rentRows(a.deal).length; const paid = rentPaidThisMonth(a.deal); const listing = !a.leaseEnd;
      return `<a class="card assetrow" href="#/deal/${a.deal}" data-asset="${a.deal}" style="display:block;color:inherit"><div class="row"><b>${esc(a.addr)}</b><span class="sp"></span><span class="badge ${listing ? "warn" : paid ? "ok" : rows ? "warn" : "mute"}">${listing ? `挂牌 ${daysBetween(d.listed || d.created, TODAY())} 天` : paid ? "本月租金已到账" : rows ? "本月租金还没到" : "出租中"}</span></div><div class="small muted">${esc(NBRoadmap.stageLabel(a.stage))} · 月租 ${money(a.rent)}${a.tenant ? ` · ${esc(a.tenantRole || "租客")} ${esc(a.tenant)}` : ""}${a.leaseEnd ? ` · 租约 ${a.daysLeft} 天后到期（${fd(a.leaseEnd)}）` : ""}</div>${a.renewal ? `<div class="tiny muted" style="margin-top:4px">下一次续约提醒：到期前 ${a.renewal.n} 天 · ${fd(a.renewal.date)}</div>` : ""}${a.openOrders ? `<div class="tiny" style="margin-top:4px"><span class="badge warn">${a.openOrders} 张维修工单在办</span></div>` : ""}</a>`; }).join("") || `<div class="empty">名下还没有放租的房子</div>`) +
      (scA ? `<div class="card soft scorecard"><b>申请评分卡 · ${esc(scA.addr)}</b><div class="small muted">您只看评分卡与摘要；工资单、信用报告全文只有经纪人能看。评分只对照您的书面标准。</div><div style="margin-top:6px">${(sc.rows || []).map((x) => `<div class="light ${esc(x[2] || "")}" style="display:flex">${esc(x[0])}：${esc(x[1])}</div>`).join("")}</div><div class="note ok" style="margin-top:8px">${esc(sc.verdict || "")}</div>${NBPhrase.linesHtml(scA.deal, "client_app", "client", { who: who().id })}</div>` : "");
  }
  function renterHomes() {
    const av = appView(); if (!av) return `<div class="empty">还没有申请 · 经纪人帮您提交后会出现在这里</div>`;
    const a = av.deal; const p = av.prop; const c = p.criteria;
    return `<div class="card"><div class="hd"><h3>${esc(short(p.addr))}</h3><span class="badge ${av.approved ? "ok" : "acc"}">${av.approved ? "已批准" : "申请中"}</span></div><div class="kv"><div class="r"><span>租金</span><b>${money(a.price)} / 月</b></div>${a.availableFrom ? `<div class="r"><span>可入住</span><b>${fd(a.availableFrom)}</b></div>` : ""}${p.beds != null ? `<div class="r"><span>户型</span><b>${p.beds} 房 ${p.baths ?? "—"} 卫</b></div>` : ""}${c ? `<div class="r"><span>房东的书面标准</span><b>收入 ≥ ${c.incomeX}× 月租 · 信用 ≥ ${c.credit} · 宠物 ${esc(c.pets || "")}</b></div>` : ""}</div><p class="tiny muted" style="margin:8px 0 0">书面标准对每一位申请人都一样；被拒会给书面原因。</p><a class="btn sm" style="margin-top:8px" href="#/deal">看申请进度</a></div>`;
  }
  SCREENS.homes = function () {
    const r = role();
    if (r === "seller") return roleChips() + sellerHomes();
    if (r === "landlord") return roleChips() + landlordHomes();
    const nt = nextTour(); const seen = seenHomes(); const tg = r === "looking" ? NBTours.targets(who().id) : [];
    const targetsHtml = r === "looking" ? `<div class="card"><div class="hd"><h3>我的目标房</h3><span class="tiny muted">${tg.length} 套 · 经纪人排的顺序</span></div>${tg.length ? `<div class="tgtlist ro">${tg.map((x, i) => { const p = prop(x.prop); const st = TGT_CLIENT[x.status] || TGT_CLIENT.watching; const fav = fbOf(x.prop).fav; return `<div class="tgt"><span class="rank">${i + 1}</span><div class="body"><div class="t">${esc((p || {}).addr || x.prop)} <span class="badge ${st[1]}">${st[0]}</span></div><div class="d">${p ? `${p.beds ?? "—"} 房 ${p.baths ?? "—"} 卫 · ${esc(p.isd || "")} · ` : ""}${x.kind === "rent" ? "想租" : "想买"}</div></div><button class="btn xs ${fav ? "pri" : ""}" data-action="fav" data-arg="${esc(x.prop)}">${fav ? "♥" : "♡"}</button></div>`; }).join("")}</div>` : `<div class="empty small">还没有目标房 · 看房时告诉经纪人想买哪套</div>`}<p class="tiny muted" style="margin:8px 0 0">想调顺序、放弃某套，在消息里说一声；经纪人改完这里立刻变。收藏和打分经纪人那边同步看到。</p></div>` : "";
    const d = myDeal(); const own = r === "buyer" && d && d.property && prop(d.property) ? [{ key: d.property, addr: prop(d.property).addr, p: prop(d.property), tag: NBRoadmap.stageLabel(d.stage) }] : [];
    const rest = seen.filter((h) => !own.some((o) => o.key === h.key));
    return roleChips() + (nt ? `<div class="note acc" style="margin-bottom:10px">${NBTours.dayLabel(nt.date)} ${nt.start} 出发 · ${nt.homes.length} 站 · <a href="#/tour">进入我的看房 →</a></div>` : "") +
      (r === "renter" ? renterHomes() : "") + targetsHtml + own.map(homeCard).join("") +
      (rest.length || r === "looking" ? `<div class="sec"><h2>看过的房</h2><span class="lk">${rest.length} 套</span></div>` + (rest.map(homeCard).join("") || `<div class="empty small">还没有看过的房</div>`) : "") +
      (r === "renter" ? `<div class="card soft"><b>租房 DNA（P2）</b><div class="small muted">记住你每次都选了带 in-unit laundry 的，新房源自动匹配推送。</div></div>` : "") +
      (r === "looking" ? `<div class="card soft"><b>家人各自打分（P2）</b><div class="small muted">家人各自给每套房打分，分歧记下来，用打分收敛「学区 vs 通勤」。</div></div>` : "");
  };
  A["fav"] = (el, key) => { if (!myHomeKeys()[key]) return; const on = !fbOf(key).fav; NBTours.setClientFb(who().id, key, { fav: on }); DBsave(); render(); toast(on ? "已收藏 · 经纪人那边同步看到" : "已取消收藏"); };
  A["score"] = (el, arg) => { const [key, n] = String(arg).split("|"); if (!myHomeKeys()[key] || !(Number(n) >= 1 && Number(n) <= 5)) return; NBTours.setClientFb(who().id, key, { score: Number(n) }); DBsave(); render(); toast(`已打 ${Number(n)} 星 · 经纪人那边同步看到`); };
  // 同意（决定 D9）：只记下同意的时间，不改 Offer 的状态；只有决策人能点。有等着的请求卡就答那张卡（NBMsg.answer 里同一个检查），没有就直接记（NBOffers.clientAgree）
  A["agree"] = (el, arg) => {
    const [did, oid] = String(arg).split("|"); if (!isMine(did)) { toast("这不是您的交易"); return; }
    const o = NBOffers.byId(did, oid); if (!o || !NBOffers.isOpen(o)) { toast("这个 Offer 现在不在谈"); return; }
    const req = NBMsg.messages().find((m) => m.kind === "request" && m.request && m.request.status === "pending" && m.request.to === "client" && m.request.effect && m.request.effect.type === "offer" && m.request.effect.deal === did && m.request.effect.offer === oid);
    if (req) { const x = NBMsg.answer(req.id, { status: "done", answer: "同意", by: who().id, byName: who().name, role: "client" }); if (x && x.blocked) { toast(x.why); return; } }
    else { const x = NBOffers.clientAgree(did, oid, who().id); if (!x.ok) { toast(x.why); return; } }
    const cs = NBOffers.consentOf(o); if (!cs) { toast("没有记上，请在消息里告诉经纪人"); return; }
    DBsave(); render(); toast(`已记录您的同意（${cs.at}）· 只记同意，对方签字后才成合同`);
  };

  // ================= 进度 / 资产 =================
  const appCard = (av, mini) => `<div class="card appcard"><div class="hd"><h3>申请进度</h3><span class="tiny muted">${esc(short(av.prop.addr))}</span></div>${av.steps.map((s, i) => `<div class="stage ${s.st}"><span class="no">${s.st === "done" ? "✓" : i + 1}</span><div><div class="t">${esc(s.t)}</div>${s.d ? `<div class="d">${esc(s.d)}</div>` : ""}</div></div>`).join("")}${mini ? `<a class="btn sm" style="margin-top:8px" href="#/deal">看申请进度</a>` : `<div class="note" style="margin-top:8px">隐私：您的工资单、信用报告全文只有经纪人能看；房东只看评分卡和摘要；授权可以撤回。申请材料 ${NBRent.RETENTION.application} 天后自动删，收入材料 ${NBRent.RETENTION.income} 天后删。</div>`}</div>`;
  const MONEY_ST = { paid: "已付", due: "到期", upcoming: "将到期" };
  const moneyCard = (rows, title, sub) => (rows.length ? `<div class="card"><div class="hd"><h3>${title}</h3><span class="tiny muted">${sub}</span></div>${rows.map((m) => { const mt = NBMoney.meta(m); return `<div class="money"><div><b>${esc(m.label)}</b><div class="tiny muted">${m.due ? fd(m.due) : "日期未定"} · ${MONEY_ST[m.status] || esc(m.status || "")}</div></div><div class="amt">${mt.missing ? "待定" : money(m.amount)}</div><div class="who">付给：${esc(m.to || "—")}${m.wire ? " · 电汇前先电话核实账户" : ""}<br>可退吗：${esc(mt.refund)}<br>退找谁：${esc(mt.refundWho)}</div></div>`; }).join("")}</div>` : "");
  // 透明度（决定 D26）：读共享设置（经纪人在网站 / App 里改，这里跟着变）。分级 = 已确认的事实 · 截止日 · 要您做的事；完全透明 = 再加全部任务和修改记录。哪一种都不给：佣金、内部备注、对方的私人信息、没确认的 AI 提议
  const HIDE_AUDIT = /佣金|commission|CDA|提议|proposal|内部|底线|评分卡|对方经纪|split|GCI/i;
  const clientHistory = (id) => DB.audit.filter((a) => a.deal === id && a.actor === "human" && !HIDE_AUDIT.test(a.what || "")).slice(0, 8);
  function transCard(d) {
    const full = NBSet.transparency(d.id) === "full"; let extra = "";
    if (full) { const ts = (DB.tasks[d.id] || []).filter((x) => x.status === "pending"); const hist = clientHistory(d.id);
      extra = `<div class="tiny muted" style="margin-top:8px">全部任务和截止（${ts.length}）</div><div class="list">${ts.map((x) => `<div class="li"><div class="body"><div class="t small">${esc(x.name)}</div><div class="d">${esc(x.assignee || "")} · ${x.due ? fd(x.due) : "无日期"}</div></div></div>`).join("") || `<div class="empty small">没有待办</div>`}</div><div class="tiny muted" style="margin-top:8px">修改记录（最近 ${hist.length} 条）</div><div class="list">${hist.map((a) => `<div class="li"><div class="body"><div class="t small">${esc(a.what)}</div><div class="d">${esc(a.who || "")} · ${esc(a.at || "")}</div></div></div>`).join("") || `<div class="empty small">还没有记录</div>`}</div>`; }
    return `<div class="card transcard"><div class="hd"><h3>当前门户可见范围</h3><span class="badge ${full ? "warn" : "ok"}" data-trans="${full ? "full" : "tiered"}">${full ? "完全透明" : "分级透明"}</span></div><div class="row">${["路线图", "截止日", "您的任务", "已确认的文件"].concat(full ? ["全部任务", "修改记录"] : []).map((c) => `<span class="badge acc">${c}</span>`).join("")}</div><p class="small muted">${full ? "经纪人为这笔交易开了「完全透明」（开的时候记了一条修改记录）：您看得到全部任务、截止和修改记录。" : "分级透明（默认）：您看到已确认的事实、截止日、需要您做的事和已确认的文件。"}佣金、经纪人的内部备注、对方的私人信息、还没确认的 AI 提议，哪一种都不会出现在这里。</p>${extra}</div>`;
  }
  const wireNote = () => `<div class="wire"><b>付款安全</b><div class="small">任何电汇指令都会被阻断——只通过已知电话核验收款方，应用不会要求你在聊天里发送完整账户。<a href="#" data-action="todo" data-arg="核验步骤">查看核验步骤</a></div></div>`;
  const nudgeRow = (label) => `<div class="row" style="margin-top:8px"><span class="small muted">${esc(label)}</span><span class="sp"></span><button class="btn xs" data-action="nudge">催一下</button></div>`;
  const woCard = (w) => { const need = NBRent.needsApproval(w); const th = NBRent.threshold(w); const p = prop((deal(w.deal) || {}).property) || {}; const stg = (w.stages || [])[w.stage] || "";
    return `<div class="card wocard" data-wo="${w.id}"><div class="hd"><h3>维修 · ${esc(short(p.addr || ""))}</h3>${th != null ? `<span class="badge warn">门槛 ${money(th)}</span>` : ""}</div><b>${esc(w.what)}${w.cost != null ? " · 报价 " + money(w.cost) : ""}</b><div class="small muted">${w.vendor ? "Vendor：" + esc((contact(w.vendor) || {}).name || "") + " · " : ""}现在：${esc(stg)}${th != null ? ` · 超过 ${money(th)} 先由您批，没批之前不施工` : ""}</div>${w.declined && !w.approved ? `<div class="note" style="margin-top:8px">您没批${w.declined.reason ? "（" + esc(w.declined.reason) + "）" : ""} · 工单停在报价审批，不施工</div>` : ""}${need ? `<div class="row" style="margin-top:8px"><button class="btn sm" data-action="wo-no" data-arg="${w.id}">先不修</button><button class="btn sm pri" data-action="wo-ok" data-arg="${w.id}">批准 ${money(w.cost)}</button></div>` : w.approved ? `<div class="note ok" style="margin-top:8px">您已批准 · 进度：${esc(stg)}</div>` : ""}</div>`; };
  function landlordDeal(d) {
    const as = myAssets(); const ids = as.map((a) => a.deal); const a = as.find((x) => x.deal === d.id) || as[0];
    const active = as.filter((x) => x.stage === "active").length; const listing = as.filter((x) => ["pre_listing", "listed", "applying", "lease_pending"].includes(x.stage)).length; const got = as.reduce((s, x) => s + rentPaidThisMonth(x.deal), 0);
    const orders = NBRent.orders().filter((w) => ids.includes(w.deal) && w.stage < (w.stages || []).length - 1); const need = orders.filter((w) => NBRent.needsApproval(w)).length;
    const rens = NBRent.renewalDates(d); const rows = rentRows(d.id);
    return `<div class="stats"><div class="stat ok"><div class="v">${active} / ${listing}</div><div class="l">出租中 / 招租中</div></div><div class="stat"><div class="v">${money(got)}</div><div class="l">本月已到账</div></div><div class="stat ${need ? "warn" : ""}"><div class="v">${need}</div><div class="l">等您批的维修</div></div></div>` +
      (as.length > 1 ? `<div class="chips">${as.map((x) => `<a class="chip ${x.deal === d.id ? "on" : ""}" href="#/deal/${x.deal}">${esc(x.addr)}</a>`).join("")}</div>` : "") +
      orders.map(woCard).join("") +
      (a.leaseEnd ? `<div class="card"><div class="hd"><h3>租金时间线 · ${esc(a.addr)}</h3><span class="tiny muted">月租 ${money(a.rent)}</span></div>${rows.map((m) => `<div class="money"><div><b>${esc(m.label)}</b></div><div class="amt">${money(m.amount)}</div><div class="who">${m.due ? fd(m.due) : "日期未定"} · ${m.status === "paid" ? "已到账" : "还没到"}</div></div>`).join("") || `<div class="empty small">这套还没有租金记录</div>`}</div>
      <div class="card renewcard"><div class="hd"><h3>续约节点</h3><span class="tiny muted">到期前 ${NBRent.RENEWAL.join(" / ")} 天</span></div><div class="kv"><div class="r"><span>租约到期</span><b>${fd(a.leaseEnd)} · ${a.daysLeft} 天后</b></div>${rens.map((x) => `<div class="r"><span>到期前 ${x.n} 天</span><b>${fd(x.date)} · ${x.done ? "已提醒" : rel(x.date)}</b></div>`).join("")}</div><p class="tiny muted" style="margin:8px 0 0">每次提醒带周边租金对比；续不续、涨不涨由您定。</p></div>` : "") +
      `<div class="card"><div class="hd"><h3>${esc(a.addr)} · 放租路线图</h3><span class="tiny muted">现在在哪 · 下一步</span></div>${NBRoadmap.render(d, { mode: "v", client: "lessor" })}</div>` + phraseCard(d) + transCard(d) +
      `<div class="card soft"><b>多套房组合分析（P2）</b><div class="small muted">年化回报、空置预测、续约意向预测——从工具变顾问。</div></div>`;
  }
  SCREENS.deal = function (segs) {
    const r = role(); if (r === "landlord" && segs && segs[0] && isMine(segs[0])) M().asset = segs[0];
    const d = myDeal(); const v = rmView();
    if (r === "renter") { const av = appView(); if (!av) return roleChips() + `<div class="empty">还没有申请 · 经纪人帮您提交后会出现在这里</div>`;
      return roleChips() + `<div class="card"><div class="row"><b>${esc(av.prop.addr || "")}</b><span class="sp"></span>${NBRoadmap.stageBadgeHtml(av.approved ? "lease_pending" : "applying")}</div><div class="small muted">下一步：${esc(av.next)}</div>${nudgeRow("想知道进展可以催一下；系统先核实是不是真的逾期")}</div>` + appCard(av) + (av.up ? `<div class="card upcard"><div class="hd"><h3>等您上传</h3><span class="tiny muted">拍照就行</span></div>${NBMsgUI.reqCard(av.up, "client")}</div>` : "") + wireNote(); }
    if (!d) return roleChips() + `<div class="empty">还没有交易 · 经纪人建好后会出现在这里</div>`;
    if (r === "landlord") return roleChips() + landlordDeal(d);
    const p = prop(d.property); const stage = NBRoadmap.TERMINAL.includes(v.stage) ? v.stage : NBRoadmap.stageOf(v); const ns = nextLine();
    const price = cf(d.id, "sales_price"); const down = cf(d.id, "cash_portion"); const paid = (DB.money[d.id] || []).filter((m) => m.status === "paid").length;
    return roleChips() + `<div class="card"><div class="row"><b>${p ? esc(p.addr) : esc(d.title)}</b><span class="sp"></span>${NBRoadmap.stageBadgeHtml(stage)}</div><div class="small muted">${esc(NBRoadmap.typeLabel(d))} · ${esc(NBRoadmap.nowText(v, true))}</div>${r === "buyer" && price ? `<div class="g2" style="margin-top:8px"><div class="pro"><div class="l">合同金额</div><div class="v">${esc(price)}</div></div><div class="pro"><div class="l">首付</div><div class="v">${esc(down || "待确认")}</div></div><div class="pro"><div class="l">已付项目</div><div class="v">${paid} 项</div></div><div class="pro"><div class="l">交割资金</div><div class="v">以 Closing Disclosure 为准</div></div></div>` : ""}</div>
      <div class="card"><div class="hd"><h3>现在在哪 · 下一步</h3><span class="tiny muted">${esc(NBRoadmap.typeLabel(v))}路线图 · 用您的叫法</span></div>${NBRoadmap.render(v, { mode: "v", client: rmClient() })}${nudgeRow(ns ? "下一个节点：" + ns : "现在没有等着的节点")}</div>` +
      phraseCard(d) + moneyCard(DB.money[d.id] || [], "钱的时间线", "每笔都说明付给谁、何时可退、退找谁") + transCard(d) + wireNote();
  };
  A["nudge"] = () => { const t = myThread(); if (!t) { toast("还没有和经纪人的对话"); return; } const x = NBMsg.nudge(t.t.id, { role: "client", id: who().id, name: who().name }); DBsave(); render(); toast(x.text); };
  // 维修报价：只在「报价审批 · 超过门槛 · 还没批」时能点（NBRent.needsApproval）；有等着的审批卡就答那张卡，没有就直接记
  const woReq = (id) => NBMsg.messages().find((m) => m.kind === "request" && m.request && m.request.status === "pending" && m.request.to === "client" && m.request.effect && m.request.effect.type === "wo-approve" && m.request.effect.wo === id);
  const myOrder = (id) => { const w = NBRent.byId(id); return w && isMine(w.deal) ? w : null; };
  A["wo-ok"] = (el, id) => { const w = myOrder(id); if (!w) return; if (!NBRent.needsApproval(w)) { toast("这张工单现在不用您批"); return; } const req = woReq(id); if (req) NBMsg.answer(req.id, { status: "done", answer: "批准施工", by: who().id, byName: who().name, role: "client" }); else NBRent.approve(id, who().name); DBsave(); render(); toast("已批准，经纪人会派单；进度会显示在这里和消息里"); };
  A["wo-no"] = (el, id) => { const w = myOrder(id); if (!w) return; if (!NBRent.needsApproval(w)) { toast("这张工单现在不用您批"); return; } const req = woReq(id); if (req) NBMsg.answer(req.id, { status: "declined", answer: "先不修", by: who().id, byName: who().name, role: "client" }); else NBRent.decline(id, "先不修", who().name); DBsave(); render(); toast("记下了：先不修。工单停在报价审批，不施工"); };

  // ================= 文件 · 合同人话 =================
  SCREENS.files = function () {
    const d = myDeal(); const docs = myDocs(); const many = myDeals().length > 1; const r = role();
    const ex = d ? (DB.explain[d.id] || []) : []; const fs = d ? (DB.fields[d.id] || []) : [];
    const me = d ? ((DB.portalMembers || {})[d.id] || []).find((m) => m.contactId === who().id) : null;
    return roleChips() + (ex.length ? `<div class="card explain"><div class="hd"><h3>这份合同，说人话</h3><span class="tiny muted">${ex.length} 个关键条款 · 中英对照</span></div>${ex.map((e) => { const f = fs.find((x) => x.key === e.key && x.status === "confirmed") || {}; return `<div class="li" style="flex-direction:column;align-items:stretch"><div class="row"><b>${esc(f.label || e.key)}</b><span class="sp"></span><span class="badge mute">${f.page ? "p." + esc(f.page) : "—"}</span></div><div class="small">${esc(e.zh)}</div><div class="tiny muted">${esc(e.en)}</div></div>`; }).join("")}<p class="tiny muted">免责声明 v2026-01：依据已确认字段生成，不构成法律意见。有疑问点「问 ${esc(agentName())}」。</p><button class="btn sm" data-action="todo" data-arg="问经纪人">问 ${esc(agentName())}（每笔 20 次带引用问答）</button></div>` : "") +
      `<div class="card filescard"><div class="hd"><h3>文件</h3><span class="tiny muted">${r === "renter" ? "您自己传上来的" : "可理解摘要 + 原件"}</span></div><div class="list">${docs.map((x) => `<div class="li"><div class="body"><div class="t">${esc(x.name)}</div><div class="d">${many ? esc(short((prop((deal(x.deal) || {}).property) || {}).addr || "")) + " · " : ""}${x.pages} 页 · ${x.locked ? "已锁定（成交版本）" : "当前版本"}${x.retention ? " · 保留到 " + esc(x.retention) : ""}</div></div><button class="btn xs" data-action="todo" data-arg="打开原件">原件</button></div>`).join("") || `<div class="empty small">${r === "renter" ? `还没有文件 · 您上传的材料会出现在这里（申请材料 ${NBRent.RETENTION.application} 天后自动删，收入材料 ${NBRent.RETENTION.income} 天后删）` : "还没有文件"}</div>`}</div>${r === "renter" ? `<p class="tiny muted" style="margin:8px 0 0">房东那边的文件（书面标准原件、申请表、租约草稿）不在这里；您的工资单全文只有经纪人能看。</p>` : r === "landlord" ? `<p class="tiny muted" style="margin:8px 0 0">申请表和收入材料的全文只有经纪人能看；您看评分卡和摘要（在「房源」）。</p>` : ""}</div>
      <div class="card soft iabs"><b>IABS · 消费者保护通知</b><div class="small muted">${me && me.iabsAt ? `首次打开时已交付并记录时间（${esc(me.iabsAt)}）。` : "首次打开客户视图时交付并记录时间；现在还没有记录。"}</div></div>`;
  };

  // ================= 家人意见 =================
  // 家人意见的样例只有陈家这一笔有（写好的样例）；别的交易从空的开始，各存各的
  const OPS_SAMPLE = { d1: [{ who: "陈太太", t: "学区优先，通勤 40 分钟以内可以接受", at: "昨天" }, { who: "陈父", t: "屋顶年份要问清楚", at: "今天" }] };
  const opsOf = (id) => (M().opsBy || {})[id] || OPS_SAMPLE[id] || [];
  // 成员：这笔交易客户视图里的人；还没有人进过客户视图 → 我方的当事人（都是决策人）
  const membersOf = (d) => { const pm = (DB.portalMembers || {})[d.id]; if (pm && pm.length) return pm; return DB.parties.filter((p) => p.deal === d.id && p.side === "ours" && p.type === "person" && (p.signer || p.primary)).map((p) => ({ name: (contact(p.party) || {}).name || "", role: "decision", visibility: "all", contactId: p.party })); };
  SCREENS.family = function () {
    const d = myDeal(); if (!d) return roleChips() + `<div class="empty">家人意见挂在您自己的交易上 · ${role() === "renter" ? "您现在是申请人，这里还没有可看的" : "现在还没有交易"}</div>`;
    const pm = membersOf(d); const ops = opsOf(d.id); const p = prop(d.property) || {};
    return roleChips() + `<div class="card famcard"><div class="hd"><h3>家庭角色</h3><span class="tiny muted">${esc(short(p.addr || d.title))}</span></div><div class="list">${pm.map((m) => `<div class="li"><span class="badge ${{ decision: "acc", family: "ok", advisor: "mute" }[m.role] || "mute"}">${ROLE[m.role] || esc(m.role)}</span><div class="body"><div class="t">${esc(m.name)}</div><div class="d">${m.visibility === "all" ? "全部" : "仅进度（无金额 · 无文件）"}${m.expires ? ` · ${rel(m.expires)}过期` : ""}${m.opens != null ? ` · 打开 ${m.opens} 次` : ""}${m.role === "decision" ? " · 能点「同意」" : " · 只能看"}</div></div></div>`).join("") || `<div class="empty small">还没有成员</div>`}</div><button class="btn sm" style="margin-top:8px" data-action="todo" data-arg="邀请家人">＋ 邀请家人（发微信链接）</button><p class="tiny muted">签约人（夫妻）都是决策人；家人 = 不签字的亲属，默认零推送；参谋看不到金额和文件，7 天过期。家人不进经纪人的联系人库。</p></div>
      <div class="card"><div class="hd"><h3>家人意见</h3><span class="badge ${ops.length ? "warn" : "mute"}">${ops.length ? ops.length + " 条" : "还没有"}</span></div><div class="list">${ops.map((o) => `<div class="li"><div class="body"><div class="t">${esc(o.t)}</div><div class="d">${esc(o.who)} · ${esc(o.at)}</div></div></div>`).join("") || `<div class="empty small">还没有人写意见</div>`}</div><textarea id="op" rows="2" placeholder="写一条意见…" style="margin-top:8px"></textarea><button class="btn sm pri" style="margin-top:6px" data-action="op-add">发表意见</button></div>
      <div class="card soft"><b>隐私</b><div class="small muted">家人的意见只在家庭圈可见；经纪人只看到聚合动态（"家人打开了 3 次"），不点名。</div></div>`;
  };
  A["op-add"] = () => { const d = myDeal(); const v = ((document.getElementById("op") || {}).value || "").trim(); if (!d || !v) return; M().opsBy = M().opsBy || {}; M().opsBy[d.id] = opsOf(d.id).concat([{ who: who().name, t: v, at: "刚刚" }]); DBsave(); render(); toast("已发表，家人能看到"); };

  // ================= 我的看房（今天 / 接下来 / 看房历史；每套打分反馈回到经纪人）=================
  // 开锁方式、可看时段、经纪人的现场备注和专业资料不进这一页
  SCREENS.tour = function (segs) {
    const ts = myTours();
    if (segs[0] && !ts.some((t) => t.id === segs[0])) return roleChips() + `<div class="empty">这条看房路线不是您的，打不开 · <a href="#/tour">回到我的看房</a></div>`;
    const cur = (segs[0] && ts.find((t) => t.id === segs[0])) || nextTour(); const hist = ts.filter((t) => t.status === "done").reverse();
    const up = ts.filter((t) => t.status !== "done" && t.date >= TODAY());
    if (!ts.length) return roleChips() + `<div class="empty">还没有看房安排 · 经纪人排好路线会出现在这里</div>`;
    const stopCards = (tr) => tr.homes.map((h, i) => { const p = h.prop ? prop(h.prop) : null; const fb = fbOf(fbKey(h)); const here = NBTours.here(h); const done = NBTours.visited(h); const isNow = tr.status === "in_progress" && i === NBTours.curIndex(tr); return `<div class="card ${isNow ? "" : "soft"}"><div class="row"><span class="badge ${here ? "acc" : done ? "ok" : isNow ? "acc" : "mute"}">${here ? "现在在这" : done ? "看过了" : isNow ? "下一站" : "第 " + (i + 1) + " 站"}</span><b>${esc(short(h.addr))}</b><span class="sp"></span><span class="tiny num muted">${esc(String(h.time || "").split("–")[0].replace(/[（(].*/, ""))}</span></div><div class="small muted">${esc(h.meet && h.meet !== "—" ? "集合点：" + h.meet : "集合点待确认")}${h.drive ? " · " + esc(h.drive) : ""}</div>${p ? `<div class="kv" style="margin-top:6px"><div class="r"><span>户型 / 学区</span><b>${p.beds ?? "—"} 房 ${p.baths ?? "—"} 卫 · ${esc(p.isd || "")}</b></div><div class="r"><span>AI 一句话</span><b style="text-align:left">${esc(intelLine(p))}</b></div></div>` : `<div class="small muted" style="margin-top:6px">初步信息：公开资料 · 亮点 · 已确认风险（经纪人专业资料不在这里）</div>`}<div class="row" style="margin-top:8px"><button class="btn sm" data-action="todo" data-arg="导航">导航</button><button class="btn sm ${fb.fav ? "pri" : ""}" data-action="cfav" data-arg="${tr.id}|${h.id}">${fb.fav ? "♥ 已收藏" : "♡ 收藏"}</button><span class="stars">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= (fb.score || 0) ? "on" : ""}" data-action="cscore" data-arg="${tr.id}|${h.id}|${n}">★</i>`).join("")}</span></div>${done || here ? `<textarea id="fb-${h.id}" rows="2" placeholder="看完一句话：喜欢什么、担心什么" style="margin-top:8px">${esc(fb.text || "")}</textarea><button class="btn sm pri" style="margin-top:6px" data-action="cfb" data-arg="${tr.id}|${h.id}">${fb.sent ? "已发给经纪人 · 再发一次" : "发给经纪人"}</button>` : ""}</div>`; }).join("");
    let html = roleChips();
    if (up.length > 1) html += `<div class="chips" style="margin-bottom:10px">${up.map((t) => `<a class="chip ${cur && t.id === cur.id ? "on" : ""}" href="#/tour/${t.id}">${NBTours.dayLabel(t.date)} ${t.start} · ${t.homes.length} 套</a>`).join("")}</div>`;
    if (cur && cur.status !== "done") {
      const ci = NBTours.curIndex(cur); const now = cur.homes[ci]; const nxt = cur.homes[ci + 1]; const etas = NBTours.eta(cur); const e0 = etas[ci] || {}, e1 = etas[ci + 1] || {};
      const changes = cur.homes.filter((h) => h.status === "reschedule" || /替补|重排/.test(h.how || ""));
      html += `<div class="note acc" style="margin-bottom:10px">${NBTours.dayLabel(cur.date)} ${cur.start} 出发 · ${cur.homes.length} 站${cur.status === "in_progress" ? ` · 进行中，第 ${ci + 1} 站` : " · 每套停留约 45 分钟"}</div>` +
        (now ? `<div class="nowcard"><div class="k">${cur.status === "in_progress" ? "现在这套" : "第一套"} · ${ci + 1} / ${cur.homes.length}</div><div class="addr">${esc(short(now.addr))}</div><div class="meta">${esc(String(now.time || "").split("–")[0].replace(/[（(].*/, ""))} 到 · 预计 ${e0.arrive || "—"}${now.meet && now.meet !== "—" ? " · 集合点 " + esc(now.meet) : ""}${now.drive ? " · " + esc(now.drive) : ""}</div><div class="acts"><button class="btn pri" data-action="todo" data-arg="导航">一键导航</button><button class="btn" data-action="todo" data-arg="给经纪人打电话">打给 ${esc(agentName())}</button></div></div>` : "") +
        (nxt ? `<div class="nextcard"><span class="k">下一套</span><b>${esc(short(nxt.addr))}</b><span class="small muted">预计 ${e1.arrive || "—"} 到${nxt.drive ? " · " + esc(nxt.drive) : ""}</span></div>` : `<div class="nextcard"><span class="k">下一套</span><b>没有了 · 这是最后一套</b></div>`) +
        `<div class="card" style="margin-top:10px"><div class="hd"><h3>全天路线</h3><span class="tiny muted">${changes.length ? changes.length + " 处变动" : "没有变动"}</span></div>${etas.map((x, i) => `<div class="stop ${NBTours.visited(x.home) ? "done" : i === ci ? "here" : ""}"><span class="no">${i + 1}</span><div><b>${esc(short(x.home.addr))}</b><div class="small muted">预计 ${x.arrive}–${x.leave}${x.home.status === "reschedule" ? ` · <span class="bad">时间有变动，等经纪人确认</span>` : /替补|重排/.test(x.home.how || "") ? " · 改过时间" : ""}</div></div></div>`).join("")}</div>` +
        `<div class="sec"><h2>每套打分 / 反馈</h2><span class="lk">回到经纪人</span></div>` + stopCards(cur);
    }
    else if (cur) html += `<div class="note" style="margin-bottom:10px">${NBTours.dayLabel(cur.date)} 的看房已完成${cur.homes.length ? " · " + cur.homes.length + " 套" : ""}</div>` + stopCards(cur);
    // 看房历史：只带您自己打的分（经纪人的评分和现场备注不在这里）
    html += `<div class="sec"><h2>看房历史</h2><span class="lk">${hist.length} 次</span></div>` + (hist.length ? `<div class="card histcard"><div class="list">${hist.map((t) => `<a class="li" href="#/tour/${t.id}"><span class="badge mute">${fd(t.date)}</span><div class="body"><div class="t">${t.homes.length} 套</div><div class="d">${t.homes.map((h) => { const s = fbOf(fbKey(h)).score; return esc(short(h.addr)) + (s ? " ★" + s : ""); }).join(" · ")}</div></div><span class="tiny muted">›</span></a>`).join("")}</div></div>` : `<div class="empty small">还没有看完的</div>`);
    html += `<div class="card soft"><b>看完之后</b><div class="small muted">收藏、打分和反馈会回到经纪人那条 tour（经纪人 App 和网站读同一份）；您的原话和 AI 总结分开保存。想进一步谈的房子经纪人会放进「我的目标房」。</div></div>`;
    return html;
  };
  const myStop = (tid, hid) => { const tr = myTours().find((t) => t.id === tid); const h = tr ? tr.homes.find((x) => x.id === hid) : null; return h ? { tr, h } : null; };
  A["cfav"] = (el, arg) => { const [tid, hid] = String(arg).split("|"); const s = myStop(tid, hid); if (!s) return; const on = !fbOf(fbKey(s.h)).fav; NBTours.setClientFb(who().id, fbKey(s.h), { fav: on, tour: tid, home: hid }); DBsave(); render(); toast(on ? "已收藏 · 经纪人那边同步看到" : "已取消收藏"); };
  A["cscore"] = (el, arg) => { const [tid, hid, n] = String(arg).split("|"); const s = myStop(tid, hid); if (!s || !(Number(n) >= 1 && Number(n) <= 5)) return; NBTours.setClientFb(who().id, fbKey(s.h), { score: Number(n), tour: tid, home: hid }); DBsave(); render(); };
  A["cfb"] = (el, arg) => { const [tid, hid] = String(arg).split("|"); const s = myStop(tid, hid); if (!s) return; const text = ((document.getElementById("fb-" + hid) || {}).value || "").trim(); const fb = NBTours.setClientFb(who().id, fbKey(s.h), { text, tour: tid, home: hid, sent: true }); const addr = short(s.h.addr);
    audit(s.tr.deal, `客户看房反馈：${addr} · 收藏 ${fb.fav ? "是" : "否"} · ${fb.score || 0} 星${text ? " ·「" + text.slice(0, 40) + "」" : ""}`, "human", who().name);
    const t = NBMsg.ensureThread({ kind: "client", deal: s.tr.deal, contact: who().id, members: [who().id], anchor: { type: "tour", id: s.tr.id }, subject: "看房路线 · " + s.tr.homes.length + " 站" });
    NBMsg.send({ thread: t.id, from: { role: "client", id: who().id, name: who().name }, kind: "feedback", text: `${addr}：${text || "（没写文字）"} · ${fb.score || 0} 星${fb.fav ? " · 已收藏" : ""}`, attach: [{ type: "property", id: hid, label: addr }] });
    DBsave(); render(); toast("已同步给经纪人（在消息里也能看到）"); };

  // ================= 消息（给经纪人留言 · 待你回复 · 催一下）=================
  SCREENS.messages = function (segs) {
    const v = "client";
    if (segs[0]) { const t = NBMsg.thread(segs[0]); if (!t || !NBMsg.canOpen(t, v, who().id)) return roleChips() + `<div class="empty">这条对话不是您的，打不开 · <a href="#/messages">回到消息</a></div>`; NBMsgUI.autoRead(t.id); return roleChips() + NBMsgUI.threadView(t, v, { back: "#/messages" }); }
    const items = myThreads();
    const pend = items.flatMap((it) => NBMsg.pending(it.t.id, "client").map((m) => ({ m, t: it.t })));
    const pendCards = pend.length ? `<div class="sec"><h2>待你回复</h2><span class="lk">${pend.length} 件</span></div><div class="pendcards">${pend.map(({ m, t }) => `<div class="card"><div class="tiny muted mono">${esc(NBMsg.anchorOf(t).label)} · ${esc(agentName())} · ${NBMsgUI.fmtAt(m.at)}</div>${m.text ? `<div class="small" style="margin-top:4px">${esc(m.text)}</div>` : ""}${NBMsgUI.reqCard(m, v)}</div>`).join("")}</div>` : `<div class="note ok" style="margin-bottom:12px">没有等你回复的事 · 有问题直接在下面的对话里说</div>`;
    return roleChips() + pendCards + `<div class="sec"><h2>和经纪人的对话</h2><span class="lk">挂在你的交易上</span></div>` + (items.length ? `<div class="thlist">${items.map((it) => NBMsgUI.listItem(it, null)).join("")}</div>` : `<div class="empty">还没有对话 · 经纪人发起后会出现在这里</div>`) +
      `<div class="card soft" style="margin-top:12px"><b>怎么用</b><div class="small muted">对话已经挂在你的房子 / 交易上，直接说就行，不用再说明是哪套房。「催一下」会先由系统核实是否真的逾期，确认了才转给经纪人，每天最多 1 次。晚上 9 点到早上 8 点不推送。</div></div>`;
  };
  SCREENS.more = function () {
    return roleChips() + `<div class="tiles"><a class="tile" href="#/files"><span class="ab">▣</span><div><div class="tt">文件</div><div class="td">合同人话 · 页码 · 版本</div></div></a><a class="tile" href="#/family"><span class="ab">☺</span><div><div class="tt">家人意见</div><div class="td">角色 · 意见 · 隐私</div></div></a>${myTours().length ? `<a class="tile" href="#/tour"><span class="ab">⌂</span><div><div class="tt">我的看房</div><div class="td">今天 · 接下来 · 看房历史</div></div></a>` : ""}<a class="tile" href="#" data-action="big"><span class="ab">Aa</span><div><div class="tt">大字模式</div><div class="td">${bigOn() ? "已开" : "关"}</div></div></a></div>
      <div class="card"><div class="hd"><h3>这个影子 App</h3><span class="badge mute">${esc(DB.version)}</span></div><p class="small muted" style="margin-top:0">客户 App = 只读优先的透明协作端；和网站、经纪人 App 是同一个数据库（${NBSync.status === "cloud" ? "云同步" : "本机同步"}）。上面五个身份是五位示例客户：每一位只看得到自己的交易、看房、对话和文件。想模拟互发消息：在新标签页打开经纪人 App，两边各发一条。</p><div class="row"><button class="btn" data-action="surface-new" data-arg="agent">新标签页打开经纪人 App ↗</button><button class="btn" data-action="surface-new" data-arg="web">网站 OS ↗</button></div><button class="btn sm" style="margin-top:8px" data-action="reset">重置演示数据</button></div>`;
  };
  SCREENS.notfound = () => `<div class="empty">没有这一页 · <a href="#/home">回首页</a></div>`;

  // ---------- 顶栏搜索（mcore 的搜索框调它）：只搜这个身份自己的东西——自己的交易 / 房子 / 看房 / 对话 / 文件，和这一端有的页面 ----------
  const PAGES = [["home", "首页"], ["homes", "房源"], ["messages", "消息"], ["deal", "进度"], ["files", "文件 · 合同人话"], ["family", "家人意见"], ["tour", "我的看房"], ["more", "更多"]];
  window.APP_SEARCH_HINT = "我的房子、对话、文件、页面…";
  window.APP_SEARCH = (q) => {
    const out = []; const hit = (s) => String(s || "").toLowerCase().includes(q); const r = role();
    myDeals().forEach((d) => { const p = prop(d.property) || {}; const st = NBRoadmap.stageLabel(d.stage); if (hit(d.title) || hit(p.addr) || hit(st)) out.push({ label: p.addr || d.title, sub: `我的${NBRoadmap.typeLabel(d)} · ${st}`, path: r === "landlord" ? "deal/" + d.id : "deal" }); });
    const av = appView(); if (av && (hit(av.prop.addr) || hit("申请"))) out.push({ label: av.prop.addr || "", sub: "我申请的房子", path: "deal" });
    NBTours.targets(who().id).forEach((x, i) => { const p = prop(x.prop) || {}; if (r === "looking" && hit(p.addr)) out.push({ label: p.addr, sub: `我的目标房 · 第 ${i + 1} 位`, path: "homes" }); });
    myTours().forEach((t) => { if (t.homes.some((h) => hit(h.addr)) || hit("看房")) out.push({ label: `看房 · ${NBTours.dayLabel(t.date)} · ${t.homes.length} 套`, sub: t.homes.map((h) => short(h.addr)).join(" · "), path: "tour/" + t.id }); });
    myThreads().forEach((it) => { const a = NBMsg.anchorOf(it.t); if (hit(it.t.subject) || hit(it.t.lastText) || hit(a.label)) out.push({ label: it.t.subject || a.label || "对话", sub: "对话 · " + (a.label || ""), path: "messages/" + it.t.id }); });
    myDocs().forEach((x) => { if (hit(x.name)) out.push({ label: x.name, sub: "文件", path: "files" }); });
    PAGES.forEach(([path, l]) => { if (hit(l)) out.push({ label: l, sub: "页面", path }); });
    return out;
  };
})();
