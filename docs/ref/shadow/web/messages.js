/* NewBee OS 网站 OS 影子 · 消息页（有针对性的沟通：每条对话挂在交易 / 看房 / 工单 / 公告上）
   经纪人视角：客户对话 · 问 Broker · 团队；Broker 视角：审批与消息（T3 审批 · 经纪人提问 · 公告） */
(function () {
  const A = window.ACTIONS; const U = () => window.NBMsgUI; const M = () => window.NBMsg;
  const FILTERS = { agent: [["all", "全部"], ["mine", "待我回复"], ["client", "客户"], ["broker", "Broker"], ["team", "团队"]], broker: [["all", "全部"], ["mine", "待我审批"], ["broker", "经纪人提问"], ["ann", "公告"]] };

  function filtered(v) {
    const f = DB.ui.msgFilter || "all";
    let items = M().listFor(v, {});
    if (f === "mine") items = items.filter((it) => it.unread || it.pend);
    else if (f === "ann") items = items.filter((it) => it.t.broadcast);
    else if (f === "broker" && v === "broker") items = items.filter((it) => !it.t.broadcast);
    else if (f !== "all") items = items.filter((it) => it.t.kind === f);
    return items;
  }

  SCREENS.messages = function (segs) {
    const v = U().viewer();
    if (segs[0] === "new") { setTimeout(() => A["msg-new"](null, `${segs[2] || "client"}|${segs[1] || ""}|${segs[3] || ""}`), 0); return `<div class="empty">正在打开对话…</div>`; }
    const cur = segs[0] && M().thread(segs[0]) ? segs[0] : null;
    if (cur) U().autoRead(cur);
    const items = filtered(v);
    const un = M().totalUnread(v), pe = M().totalPending(v);
    const acts = v === "broker" ? `<button class="btn sm pri" data-action="msg-announce">发公告</button>` : `<button class="btn sm" data-action="msg-new" data-arg="broker|${(DB.deals[0] || {}).id || ""}">问 Broker</button><button class="btn sm pri" data-action="msg-new" data-arg="client|${(DB.deals[0] || {}).id || ""}">新建客户对话</button>`;
    const head = pageHeader(v === "broker" ? "审批与消息" : "消息", v === "broker" ? `T3 审批、经纪人提问和公告都在这里 · 每条对话挂在一笔交易上，不用再解释背景` : `每条对话挂在一笔交易 / 一条看房路线 / 一张工单上：对方打开就看到背景，不用再说明是哪套房、什么情况 · 内部备注客户永远看不到 · AI 起草的客户可见文字先放行再发出（T2）`, acts, "W1", `${un} 条未读 · ${pe} 件待办`);
    const chips = `<div class="seg" style="margin-bottom:12px">${(FILTERS[v] || FILTERS.agent).map(([k, l]) => `<button class="${(DB.ui.msgFilter || "all") === k ? "on" : ""}" data-action="msg-filter" data-arg="${k}">${l}</button>`).join("")}</div>`;
    const left = `<div class="msgleft">${chips}${items.length ? `<div class="thlist">${items.map((it) => U().listItem(it, cur)).join("")}</div>` : `<div class="empty">这个筛选下没有对话</div>`}</div>`;
    const right = cur ? U().threadView(M().thread(cur), v, { back: "#/messages" }) : `<div class="thread"><div class="empty" style="margin:auto">左边选一条对话${v === "agent" ? "，或从交易 / 联系人页「发消息」" : ""}</div></div>`;
    return head + `<div class="msgwrap ${cur ? "hasthread" : ""}">${left}${right}</div>`;
  };

  // 交易详情 · 沟通 tab 上半部分
  window.dealMessages = (d) => {
    const v = U().viewer();
    const items = M().listFor(v, { deal: d.id });
    return `<div class="row" style="margin-bottom:10px"><span class="small muted">这笔交易的对话：客户、Broker、团队各一条线程，都挂在这笔交易上。</span><span class="sp"></span><button class="btn sm" data-action="msg-new" data-arg="team|${d.id}">团队</button><button class="btn sm" data-action="msg-new" data-arg="broker|${d.id}">问 Broker</button><button class="btn sm pri" data-action="msg-new" data-arg="client|${d.id}|${d.primary}">发给客户</button></div>` +
      (items.length ? `<div class="thlist compact">${items.map((it) => U().listItem(it, null)).join("")}</div>` : `<div class="empty">这笔交易还没有对话 · 点右上角发第一条</div>`);
  };

  // Broker 后台 · 审批与消息 tab
  window.brokerMessages = () => {
    const v = "broker";
    const pendReq = M().messages().filter((m) => m.kind === "request" && m.request && m.request.status === "pending" && m.request.to === "broker");
    const qs = M().listFor(v, {}).filter((it) => !it.t.broadcast && it.unread);
    const anns = M().listFor(v, {}).filter((it) => it.t.broadcast);
    return `<div class="grid2"><div class="card"><div class="hd"><h3>等我审批（T3）</h3><span class="badge ${pendReq.length ? "warn" : "ok"}">${pendReq.length}</span></div>${pendReq.length ? pendReq.map((m) => { const t = M().thread(m.thread); return `<div class="li"><div class="body"><div class="t">${esc(m.request.title)}</div><div class="d">${esc(t ? t.subject : "")} · ${esc(m.from.name)} · ${U().fmtAt(m.at)}</div></div><div class="acts"><a class="btn xs pri" href="#/messages/${m.thread}">去审批</a></div></div>`; }).join("") : `<div class="empty small">没有等审批的</div>`}</div>` +
      `<div class="card"><div class="hd"><h3>经纪人提问</h3><span class="badge ${qs.length ? "warn" : "mute"}">${qs.length} 条未读</span></div>${qs.length ? qs.map((it) => U().listItem(it, null)).join("") : `<div class="empty small">没有未读的提问</div>`}</div></div>` +
      `<div class="card" style="margin-top:14px"><div class="hd"><h3>公告</h3><button class="btn sm pri" data-action="msg-announce">发公告</button></div>${anns.length ? anns.map((it) => U().listItem(it, null)).join("") : `<div class="empty small">还没有公告</div>`}<div class="small muted" style="margin-top:8px">全部对话在「<a href="#/messages">审批与消息</a>」页；切回经纪人视角看客户对话。</div></div>`;
  };

})();
