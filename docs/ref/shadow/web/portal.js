/* 客户视图（magic link · 只读投影 · 家庭角色）
   投影的规矩（D26 · C1 · C1b）：角色（决策人 / 家人 / 参谋）+ 家人的可见范围（全部 / 仅进度）+ 这笔交易的透明度（分级 / 完全透明，NBSet.transparency）决定能看到什么；
   两种模式都不出佣金、内部备注、对方的私人信息、没确认的 AI 提议。只有决策人能确认 / 提问 / 点「同意」（同意只记时间，offers.js NBOffers.clientAgree）。 */
(function () {
  const A = window.ACTIONS;

  // 这个身份对应客户视图成员表里的哪一行（没有就按角色给一个默认）
  function memberFor(d, role) { return (DB.portalMembers[d.id] || []).find((m) => m.role === role) || null; }
  // 以谁的身份在看：成员行上的联系人；决策人没有成员行时 = 我方主联系人
  function whoOf(d, role) { const m = memberFor(d, role); return (m && m.contactId) || (role === "decision" ? d.primary : null); }
  function project(d, role) {
    // core projectDealForRole()：唯一隐私出口（影子版）。参谋固定仅进度；家人按成员行上的可见范围；决策人全部
    const m = memberFor(d, role); const vis = role === "advisor" ? "progress" : role === "family" ? ((m && m.visibility) || "all") : "all";
    const all = vis === "all"; const full = NBSet.transparency(d.id) === "full";
    return {
      money: all, docs: all, offers: all, tasks: all, explain: all, family: role === "decision", decide: role === "decision", reminders: role !== "advisor", after: all, history: all && full, allTasks: full, vis, full,
      label: `${{ decision: "决策人 · 全部", family: all ? "家人 · 全部" : "家人 · 仅进度（无金额 · 无文件）", advisor: "参谋 · 仅进度（无金额 · 无文件 · 7 天过期）" }[role]} · ${full ? "完全透明" : "分级透明"}`,
    };
  }
  window.portalProject = project;

  SCREENS.portal = function (segs) {
    const id = segs[0] === "demo" ? "d1" : segs[0];
    const tab = segs[1] || "home";
    const d = deal(id); if (!d) return `<div class="portal"><div class="empty">链接失效 · <a href="#/today">回经纪人端</a></div></div>`;
    const role = DB.ui.portalRole || "decision";
    const P = project(d, role);
    const p = prop(d.property);
    const seenKey = `iabs:${id}:${role}`;
    if (!DB.ui.seen[`open:${id}`]) { DB.ui.seen[`open:${id}`] = 1; const m = memberFor(d, role); if (m) { m.opens += 1; m.lastOpen = TODAY() + " " + new Date().toTimeString().slice(0, 5); } DBsave(); }
    const top = `<div class="simbar">影子 · 客户在手机微信里看到的页面 · 角色：<b>${ROLE[role]}</b> <a href="#" data-action="portal-role" data-arg="decision">决策人</a> · <a href="#" data-action="portal-role" data-arg="family">家人</a> · <a href="#" data-action="portal-role" data-arg="advisor">参谋</a> · <a href="#/deals/${id}/client">← 经纪人端</a></div>`;
    if (!DB.ui.seen[seenKey]) {
      return top + `<div class="portal"><div class="hero"><div class="a">${esc(DB.me.name)} · ${esc(DB.org.name)}</div><h1>${esc(p ? p.addr : d.title)}</h1><div class="a">在开始之前，请看两份德州要求的告知</div></div>
        <div class="card"><h3>Information About Brokerage Services（IABS）</h3><p class="small">德州法律要求经纪人在提供服务前告知您：经纪人代表谁、各方的义务、以及您可以联系的 Broker。<span class="muted">（机构自己填好的那份，设置 → 机构 上传一次；全文 1 页，滑动阅读）</span></p><h3 style="margin-top:12px">Consumer Protection Notice</h3><p class="small">TREC 消费者保护通知：您有权向德州房地产委员会投诉、了解 recovery fund。</p><button class="btn pri" style="width:100%;margin-top:8px" data-action="portal-iabs" data-arg="${id}|${role}">我已阅读 · 进入</button><p class="tiny muted" style="margin-top:8px">点击即记录时间、IP（只存哈希）、版本——这是最便宜的合规留痕。</p></div>
        <div class="foot">${esc(DB.org.name)} · Broker ${esc(DB.org.broker)} · ${esc(DB.org.license)}</div></div>`;
    }
    const body = { home: home, money: moneyTab, after: after, share: share }[tab] || home;
    const nav = [["home", "进度"], ...(P.money && d.stage !== "closed" ? [["money", "钱"]] : []), ...(d.stage === "closed" && P.after ? [["after", "成交后"]] : []), ["share", "分享"]];
    return top + `<div class="portal">${hero(d, p, role)}<div class="tabs">${nav.map(([k, l]) => `<a href="#/portal/${id}/${k}" class="${tab === k ? "on" : ""}">${l}</a>`).join("")}</div>${body(d, P, role)}<div class="foot">${esc(DB.me.name)} · ${esc(DB.org.name)} · Broker ${esc(DB.org.broker)} · ${esc(DB.org.license)} · <a href="#" data-action="portal-broker">联系 Broker</a><br>本页由 NewBee OS 根据已确认的合同数据生成，解释不构成法律意见，以合同原文为准。</div></div>`;
  };
  A["portal-role"] = (el, arg) => { DB.ui.portalRole = arg; DBsave(); render(); };
  A["portal-iabs"] = (el, arg) => { const [id, role] = arg.split("|"); DB.ui.seen[`iabs:${id}:${role}`] = TODAY() + " " + new Date().toTimeString().slice(0, 5); const m = memberFor(deal(id), role); if (m && !m.iabsAt) m.iabsAt = DB.ui.seen[`iabs:${id}:${role}`]; audit(id, `IABS + CPN 交付：${ROLE[role]} · IP 哈希记录 · 版本 2026-01`, "system", "portal"); DBsave(); render(); };
  // 页脚「联系 Broker」：机构的 Broker 和电话（§535.155 要让客户找得到 Broker）
  A["portal-broker"] = () => openModal(`<h2>联系 Broker</h2><p class="small">${esc(DB.org.name)} 的 Broker：<b>${esc(DB.org.broker)}</b> · ${esc(DB.org.phone || "")} · ${esc(DB.org.license)}</p><p class="small muted">对经纪人的服务有疑问，可以直接联系 Broker；也可以向德州房地产委员会（TREC）投诉。</p><div class="acts"><button class="btn" data-action="modal-close">知道了</button></div>`);

  function hero(d, p, role) {
    let line = "";
    if (d.stage === "under_contract") line = `合同期 · 第 ${daysBetween(d.effective, TODAY()) + 1} 天 · 过户 ${fd(d.closing)}（${rel(d.closing)}）`;
    else if (d.stage === "listed") line = `挂牌中 · 第 ${daysBetween(d.listed, TODAY())} 天 · ${d.showings || 0} 次看房`;
    else if (d.stage === "closed") line = `已过户 ${rel(d.closing)} · 恭喜！`;
    else line = NBRoadmap.nowText(d, true);
    return `<div class="hero"><div class="a">${esc(DB.me.name)} 为您跟进</div><h1>${esc(p ? p.addr : d.title)}</h1><div class="a">${line}</div><div class="cta" style="margin-top:12px"><a class="btn" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.4);color:#fff;justify-content:center" href="#" data-action="todo" data-arg="拨打">☏ 打给 ${esc(DB.me.name)}</a><a class="btn" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.4);color:#fff;justify-content:center" href="#" data-action="todo" data-arg="微信">❝ 微信</a></div></div><div class="rolebar">您以「${ROLE[role]}」身份查看 · ${esc(project(d, role).label)}</div>`;
  }

  // 摘要（S1）：客户 App 那一组的句子，只用已确认的值；who = 这个身份的联系人（不是这笔交易的客户就一句也不出）
  function phraseCard(d, role) {
    const who = whoOf(d, role); if (!who) return "";
    const ls = NBPhrase.lines(d.id, "client_app", "client", { who });
    return ls.length ? `<div class="card phrcard"><div class="hd"><h3>几句话说清楚</h3><span class="tiny muted">只用已确认的合同数据</span></div><div class="list phr">${ls.map((x) => `<div class="li" data-phrase="${esc(x.key)}"><div class="body"><div class="t small">${esc(x.text)}</div></div></div>`).join("")}</div></div>` : "";
  }
  function home(d, P, role) {
    const tk = DB.tasks[d.id] || [];
    const visible = P.allTasks ? tk : tk.filter((x) => x.clientVisible);
    const nextClient = visible.filter((x) => x.status === "pending" && x.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, P.allTasks ? 6 : 3);
    const doneWeek = tk.filter((x) => x.status === "done" && x.doneAt && daysBetween(x.doneAt, TODAY()) <= 7).length;
    const doneAll = tk.filter((x) => x.status === "done").length;
    const active = !NBRoadmap.TERMINAL.includes(d.stage);
    let out = `<div class="card"><div class="hd"><h3>现在在哪 · 下一步</h3><span class="tiny muted">${esc(NBRoadmap.typeLabel(d))}路线图 · 您的叫法</span></div>${NBRoadmap.render(d, { mode: "wide", client: NBRoadmap.typeOf(d) })}</div>`;
    out += phraseCard(d, role);
    if (active) {
      out += `<div class="card"><div class="hd"><h3>接下来 ${Math.min(3, nextClient.length) || 3} 件事</h3>${P.allTasks ? `<span class="tiny muted">完全透明：这笔交易的全部任务和截止</span>` : `<span class="tiny muted">只列标了「客户可见」的</span>`}</div><div class="list">${(P.tasks ? nextClient : []).map((x) => `<div class="li"><span class="badge ${urgency(x.due)}">${rel(x.due)}</span><div class="body"><div class="t small">${esc(x.name.replace(/^客户：/, ""))}</div><div class="d">${x.assignee === "客户" ? "需要您" : "由 " + esc(x.assignee) + " 处理"} · ${fd(x.due)}</div></div>${x.assignee === "客户" && P.decide ? `<div class="acts"><button class="btn xs pri" data-action="portal-confirm" data-arg="${d.id}|${x.id}">确认</button><button class="btn xs ghost" data-action="ai-open" data-arg="text|${d.id}|client">提问</button></div>` : ""}</div>`).join("") || `<div class="small muted">${P.tasks ? "暂时没有需要您做的事" : "这个身份只看进度"}</div>`}</div></div>`;
      if (P.allTasks) { const dl = (DB.milestones[d.id] || []).filter((m) => m.status === "pending" && m.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6); if (dl.length) out += `<div class="card"><div class="hd"><h3>全部截止</h3><span class="tiny muted">完全透明才有这一张</span></div><div class="list">${dl.map((m) => `<div class="li"><span class="badge ${urgency(m.date)}">${rel(m.date)}</span><div class="body"><div class="t small">${esc(m.label)}</div><div class="d">${fd(m.date)}${m.rule ? " · " + esc(m.rule) : ""}</div></div></div>`).join("")}</div></div>`; }
      if (P.explain && ["under_contract", "clear_to_close"].includes(d.stage)) { const ex = DB.explain[d.id] || []; out += `<div class="card"><div class="hd"><h3>这份合同，说人话 <span class="muted small">${ex.length} 个关键条款</span></h3><span class="tiny muted">经纪人批准过一次才出现 · 读取 $0</span></div>${ex.map((e) => { const f = (DB.fields[d.id] || []).find((x) => x.key === e.key); return `<div class="li"><div class="body"><div class="t small">${esc(f ? f.label : e.key)}：<b>${esc(f ? f.value : "")}</b></div><div class="d">${glossify(e.zh)}</div></div></div>`; }).join("") || `<div class="small muted">经纪人确认全部字段、批准摘要后生成</div>`}<p class="tiny muted" style="margin-top:6px">决策人每笔交易可以问 20 次带引用的问题；解释不是法律意见。</p></div>`; }
    }
    if (["listed", "offer"].includes(d.stage) && P.offers && NBRoadmap.typeOf(d) !== "lessor") out += offersCard(d, P, role);
    if (["listed", "offer", "applying"].includes(d.stage) && ["seller", "lessor"].includes(NBRoadmap.typeOf(d))) out += showingsCard(d, P, role); // v1.7：卖家 / 房东都有看房反馈卡（场次 · 约好的时段 · 要您批的提示）；没有任何定价的话
    if (d.stage === "closed") out += `<div class="card"><h3>恭喜过户</h3><p class="small">钥匙卡已生成（分享页）。接下来一年有几件对您省钱的事${P.after ? "，见「成交后」" : ""}。</p></div>`;
    out += `<div class="card"><div class="hd"><h3>${esc(DB.me.name)} 为您做了什么</h3><span class="tiny muted">NAR 和解后：看得见的价值</span></div><div class="grid2"><div class="stat ok"><div class="l">本周完成</div><div class="v">${doneWeek}</div><div class="s">项</div></div><div class="stat"><div class="l">全程已完成</div><div class="v">${doneAll}</div><div class="s">/ ${tk.length} 项</div></div></div><div class="list" style="margin-top:8px">${tk.filter((x) => x.status === "done").slice(0, 4).map((x) => `<div class="li done"><span class="ck">✓</span><div class="body"><div class="t small">${esc(x.name)}</div><div class="d">${esc(x.doneAt || "")}</div></div></div>`).join("")}</div></div>`;
    if (P.history) { const au = DB.audit.filter((x) => x.deal === d.id && x.actor !== "ai" && !/内部|备注|佣金|commission|split/i.test(x.what || "")).slice(0, 8); out += `<div class="card"><div class="hd"><h3>修改记录</h3><span class="tiny muted">完全透明：谁、什么时候、改了什么（佣金 · 内部备注 · 没确认的提议不出）</span></div><div class="timeline">${au.map((x) => `<div class="tl done"><div class="t small">${esc(x.what)}</div><div class="d">${esc(x.at)} · ${esc(x.who || x.actor || "")}</div></div>`).join("") || `<div class="small muted">还没有记录</div>`}</div></div>`; }
    if (P.family) out += `<div class="card"><div class="hd"><h3>家人</h3><span class="tiny muted">您决定谁看什么</span></div><div class="list">${(DB.portalMembers[d.id] || []).map((m) => `<div class="li"><div class="avatar sm">${initials(m.name)}</div><div class="body"><div class="t small">${esc(m.name)} <span class="badge ${{ decision: "acc", family: "ok", advisor: "mute" }[m.role]}">${ROLE[m.role]}</span></div><div class="d">${m.visibility === "all" ? "全部" : "仅进度"}${m.expires ? ` · ${rel(m.expires)}过期` : ""} · 打开 ${m.opens} 次</div></div></div>`).join("")}</div><button class="btn sm" style="margin-top:8px" data-action="pm-add" data-arg="${d.id}">＋ 邀请家人（发微信链接）</button><p class="tiny muted" style="margin-top:6px">家人不会进经纪人的联系人库；参谋看不到金额和文件。</p></div>`;
    if (P.reminders) out += `<div class="card"><h3>您会收到的提醒</h3><p class="small">只在「您要做 X，截止 Y」和钱的事前 72 小时 + 当天提醒；每天最多 1 条；晚上 9 点后不打扰。整笔交易大约 5–8 条。${role === "family" ? "家人默认零推送。" : ""}</p></div>`;
    return out;
  }
  // Offer 那张卡按交易类型出（W-D14）：卖方看收到的 Offer（买家 · 到手估算 · 同意），买方看自己出的 Offer（哪套房 · 状态 · 同意）；同意只记时间，只有决策人能点（D9）
  function offersCard(d, P, role) {
    const seller = NBRoadmap.typeOf(d) === "seller"; const who = whoOf(d, role); const canDecide = !!who && NBOffers.isDecider(d.id, who);
    const os = NBOffers.list(d.id).filter((o) => o.status !== "rejected").slice().sort((a, b) => (NBOffers.isOpen(b) ? 1 : 0) - (NBOffers.isOpen(a) ? 1 : 0));
    const block = (o) => { const v = NBOffers.last(o); const st = NBOffers.label(o.status); const cs = NBOffers.consentOf(o); const net = seller ? NBOffers.netToSeller(o, d.id) : null; const open = NBOffers.isOpen(o);
      return `<div class="offer ${o.status}" data-offer="${esc(o.id)}" style="margin-bottom:8px"><div class="hd"><b class="small">${seller ? esc(o.buyer) : esc((prop(o.property) || {}).addr || o.property)} <span class="badge ${st[1]}">${st[0]}</span></b><span class="price">${money(v.price)}</span></div>${net ? `<div class="term"><span class="k">到手估算</span><b>${money(net.net)}</b></div>` : ""}<div class="term"><span class="k">Option / 过户</span><span>${esc(v.option)} · ${esc(v.close)}</span></div><div class="term"><span class="k">贷款</span><span>${esc(v.financing)}</span></div>${open && o.expires ? `<div class="note small" style="margin-top:6px">${v.by && /我方|ours/.test(v.by) ? "我们的 counter 等对方回复" : "对方的版本等我们回复"}，到期 ${esc(o.expires)}</div>` : ""}${cs && cs.current ? `<div class="note ok small" style="margin-top:6px">您已同意 · ${esc(cs.at)}${cs.v ? " · 针对 v" + cs.v : ""}（只记时间，对方签字才成合同）</div>` : open && canDecide ? `<button class="btn sm pri" style="margin-top:6px" data-action="portal-agree" data-arg="${d.id}|${o.id}|${who}">同意这个方案</button>` : open ? `<div class="tiny muted" style="margin-top:6px">只有决策人能点「同意」</div>` : ""}</div>`; };
    return `<div class="card"><div class="hd"><h3>${seller ? "Offer 对比" : "我们出的 Offer"}</h3><span class="tiny muted">${seller ? "到手估算 = 价格 − 您付的费用 − 佣金" : "状态跟着谈判走"}</span></div>${os.map(block).join("") || `<div class="small muted">还没有 Offer</div>`}</div>`;
  }
  // 看房反馈（卖家 / 房东都看得到）：场次 · 约好的看房（日期 + 时段，不带对方经纪）· 这套挂牌是「卖家 / 租客批」且有人在等批 → 一行中文提示（请点 BrokerBay 短信里的确认）· 经纪人放行并发出了的反馈文字。
  // 这里没有任何定价的话（定价信号只在经纪人侧）；数据来自 lshow.js NBLShow.forSeller
  function showingsCard(d, P, role) {
    const sf = NBLShow.forSeller(d.id); const hint = NBLShow.sellerHint(d.id); const who = sf.who;
    return `<div class="card lsportal"><div class="hd"><h3>看房反馈</h3><span class="tiny muted">一共 ${sf.total} 场 · 看完 ${sf.done}${sf.upcoming.length ? ` · 约好还没看 ${sf.upcoming.length}` : ""}</span></div>` +
      (hint ? `<div class="note warn small lshint" style="margin-bottom:8px">${esc(hint)}</div>` : "") +
      `<div class="small" style="margin-bottom:4px"><b>约好的看房</b></div><div class="list lsupcoming">${sf.upcoming.map((x) => `<div class="li"><div class="body"><div class="t small">${esc(x.date)} ${esc(x.window)}</div><div class="d">${esc(x.day)} · 请在这个时段前把家里收拾好、方便看房</div></div></div>`).join("") || `<div class="small muted">现在没有约好的看房</div>`}</div>
      <div class="small" style="margin:8px 0 4px"><b>反馈</b></div><div class="list">${sf.rows.map((x) => `<div class="li"><div class="body"><div class="t small">${esc(x.at)}</div><div class="d">${esc(x.text)}</div></div></div>`).join("") || `<div class="small muted">场次是自动同步的；反馈的文字${esc(DB.me.name)}看过才放行，还没有可以给您看的</div>`}</div>
      <p class="tiny muted" style="margin-top:6px">${who === "房东" ? "看房的经纪人" : "看房的买方经纪"}和联系方式只有 ${esc(DB.me.name)} 看得到；有问题直接打给 ${esc(DB.me.name)}。</p></div>`;
  }
  function glossify(text) {
    let t = esc(text);
    DB.glossary.forEach((g) => { const key = g.term.split(" ")[0]; const re = new RegExp("(" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"); if (re.test(t)) t = t.replace(re, `<span class="glossary" data-action="gloss" data-arg="${esc(g.term)}">$1</span>`); });
    return t;
  }
  A["gloss"] = (el, term) => { const g = DB.glossary.find((x) => x.term === term); if (g) openModal(`<h2>${esc(g.term)}</h2><p>${esc(g.zh)}</p><p class="tiny muted">约 60 个 TREC 术语中英对照，AI 起草、经纪人审。</p><div class="acts"><button class="btn" data-action="modal-close">知道了</button></div>`); };
  A["portal-confirm"] = (el, arg) => { const [id, tid] = arg.split("|"); const x = (DB.tasks[id] || []).find((y) => y.id === tid); if (x) { x.status = "done"; x.doneAt = TODAY(); x.note = (x.note ? x.note + "；" : "") + "客户在客户视图确认"; audit(id, `客户确认：${x.name}（portal）`, "human", "客户"); } DBsave(); render(); toast(`已确认，${DB.me.name} 会收到`); };
  // 「同意」= 只记时间（clientAgreedAt），不改 Offer 的状态；非决策人点了会被拒
  A["portal-agree"] = (el, arg) => { const [id, oid, who] = arg.split("|"); const r = NBOffers.clientAgree(id, oid, who || whoOf(deal(id), DB.ui.portalRole || "decision")); DBsave(); render(); toast(r.ok ? "已记录您的同意时间（对方签字后才成合同）" : r.why || "只有决策人能点「同意」"); };

  function moneyTab(d, P) {
    if (!P.money) return `<div class="card"><div class="small muted">这个身份看不到金额</div></div>`;
    const tc = window.titleOf ? window.titleOf(d) : null;
    return `<div class="card"><div class="hd"><h3>什么时候交多少钱给谁</h3></div>${window.moneyList(d, 0, {})}</div><div class="wire" style="margin-top:12px"><b>电汇前请只打这个电话核实账户</b><br>${tc ? `${esc(tc.name)} · ${esc(tc.person)} · ${esc(tc.phone)}` : "产权公司的已知电话（经纪人会告诉您）"}<br><span class="small">任何邮件、短信、微信里的“账户变更”都不要信——先打电话。</span></div><div class="card"><h3>这些钱去哪了</h3><p class="small">Option fee 给卖家（不退）；Earnest money 由产权公司保管，过户时算进首付；验房费、评估费直接付给服务方；首付 + 过户费在过户前 1–2 天电汇给产权公司，金额以 Closing Disclosure 为准。</p></div>`;
  }
  function after(d, P) {
    const h = DB.homeowner[d.id] || [];
    return `<div class="card"><div class="hd"><h3>成交后的第二条时间线</h3><span class="tiny muted">回来的理由</span></div><div class="timeline">${h.map((x, i) => `<div class="tl ${x.status === "open" ? "next" : x.status === "done" ? "done" : ""}"><div class="t small">${esc(x.label)} <span class="tiny muted">${esc(x.due)}</span>${x.ai ? ` <span class="badge ai">AI 起草 · ${esc(DB.me.name)} 审</span>` : ""}</div><div class="d">${esc(x.zh)}</div>${x.ask && P.decide ? `<button class="btn xs" style="margin-top:4px" data-action="portal-ask" data-arg="${d.id}|${i}">找 ${esc(DB.me.name)} 帮忙</button>` : ""}</div>`).join("")}</div></div>${P.docs ? `<div class="card"><h3>文件</h3><p class="small">Closing Disclosure、合同、验房报告——报税、保修、再卖的时候都在这里，保留 4 年以上。</p><button class="btn sm" data-action="todo" data-arg="下载 CD">下载 Closing Disclosure</button></div>` : ""}`;
  }
  // 客户点「找经纪人帮忙」：建一条今天到期的任务 → 进经纪人今天页「需要你 · 今天到期」
  A["portal-ask"] = (el, arg) => { const [id, i] = arg.split("|"); const x = DB.homeowner[id][Number(i)]; DB.tasks[id] = DB.tasks[id] || []; DB.tasks[id].push({ id: "t" + Date.now(), name: `客户请求：${x.label}`, rule: "客户视图「找经纪人帮忙」", due: TODAY(), assignee: DB.me.name, status: "pending", clientVisible: true, origin: "client_ask" }); audit(id, `客户在成交后时间线点了「找经纪人帮忙」：${x.label}`, "human", "客户"); DBsave(); render(); toast(`已发给 ${DB.me.name}（进他的今天页「需要你」）`); };
  function share(d, P) {
    const p = prop(d.property);
    const cards = [["进度卡", `${esc(p ? p.addr : d.title)}`, d.stage === "under_contract" ? `合同期第 ${daysBetween(d.effective, TODAY()) + 1} 天 · 过户还有 ${daysBetween(TODAY(), d.closing)} 天` : d.stage === "listed" ? `挂牌 ${daysBetween(d.listed, TODAY())} 天 · ${d.showings || 0} 次看房` : d.stage === "closed" ? "已过户" : NBRoadmap.nowText(d, true), "给国内家人：他们打不开美国链接，图片能收到"], ["钥匙卡", "🔑 我们的新家", d.stage === "closed" ? `过户 ${fd(d.closing)}` : "过户当天生成", "朋友圈向 · 最高分享时刻"], ["推荐卡", `${esc(DB.me.name)} 帮我们买到了房`, "扫码加微信 · 带追踪 token", "转给朋友 → 自动归因到推荐链"]];
    return `<div class="card"><h3>分享到微信</h3><p class="small">每张卡都是服务端渲染的 PNG，不含敏感信息；私有链接配公开预览。</p></div>` + cards.map(([t, a, b, why]) => `<div class="card"><div class="longimg"><div class="k">${t}</div><h3>${a}</h3><div class="rowl"><span>${b}</span></div><div class="foot">${esc(DB.me.name)} · ${esc(DB.org.name)} · Broker ${esc(DB.org.broker)}</div></div><div class="row" style="margin-top:8px"><button class="btn sm" data-action="todo" data-arg="保存图片">保存图片</button><button class="btn sm ghost" data-action="todo" data-arg="分享">分享</button><span class="tiny muted">${why}</span></div></div>`).join("");
  }
})();
