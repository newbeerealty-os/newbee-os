/* 租房申请进件 → 评估报告 → 房东 approve → 签好的租约进件（全部示例数据，人名虚构） */
(function () {
  const A = window.ACTIONS;
  const L = (id) => { DB.ui.lease = DB.ui.lease || {}; DB.ui.lease[id] = DB.ui.lease[id] || { a: { step: -1 }, b: { step: -1 }, approved: false, c: { step: -1 } }; return DB.ui.lease[id]; };
  const dd = (n) => window.__d(n);
  const APP_STEPS = ["上传 Application.pdf（2 份申请 · 8 页）", "识别 2 份 TXR-2003 · 拆成 2 条文档", "抽取：申请人 / 同住人 / 宠物 / 车辆 / 住址 / 工作 / 经纪", "遮蔽 SSN · 驾照号 · 出生年 · 账号 → 不入库", "生成待确认卡"];
  const INC_STEPS = ["上传 paystub ×2 · offer letter · bank statement（4 份）", "分类 + 遮蔽账号", "只抽：雇主 · 税前月收入 · 入职日 · 月均入账", "对照房东书面标准（core evaluateApplication）"];
  const LEASE_STEPS = ["上传 Lease.pdf（TXR-2001 · 14 页 + 宠物附录）", "分类：lease（租约 TXR-2001）· pet_agreement（宠物附加协议）", "抽取 14 个租约字段（页码 · 原文 · 置信度 · 来源）", "生成待确认表（系统自己不确认任何一格）"];

  function steps(list, st) {
    return `<div class="steps">${list.map((s, i) => `<div class="step ${i < st ? "done" : i === st ? "run" : "todo"}"><span class="st">${i < st ? "✓" : i + 1}</span><span>${s}</span></div>`).join("")}</div>`;
  }
  function runSteps(id, key, n, doneFn) {
    const st = L(id)[key]; st.step = 0; DBsave(); render();
    for (let i = 1; i <= n; i++) setTimeout(() => { L(id)[key].step = i; DBsave(); render(); }, 650 * i);
    setTimeout(() => { L(id)[key].step = n; L(id)[key].done = true; if (doneFn) doneFn(); DBsave(); render(); }, 650 * n + 500);
  }

  SCREENS.lease = function (segs) {
    const id = segs[1] || "d7";
    const d = deal(id); if (!d) return `<div class="empty">没有这笔租赁交易</div>`;
    const p = prop(d.property); const st = L(id);
    const phase = st.c.confirmed ? 4 : st.approved ? 3 : st.b.done ? 2 : st.a.confirmed ? 1 : 0;
    const bar = [["1", "申请进件"], ["2", "评估报告"], ["3", "房东批准 → 交易"], ["4", "租约进件"]];
    return `<div class="crumb"><a href="#/deals">交易</a> › <a href="#/deals/${id}">${esc(d.title)}</a> › 租房申请</div>` +
      pageHeader(`租房申请进件 <span class="badge ai">示例</span>`, `${esc(p.addr)} · 挂牌租金 ${money(d.price)} / 月 · 可入住 ${fd(d.availableFrom)} · 房东 ${esc((contact(d.primary) || {}).name || "")}`, `<a class="btn sm" href="#/deals/${id}">回交易</a>`, "4d") +
      `<div class="row" style="margin-bottom:14px">${bar.map(([n, l], i) => `<span class="chip ${i < phase ? "on" : ""}" style="${i === phase ? "border-color:var(--ai);color:var(--ai)" : ""}">${n} ${l}${i < phase ? " ✓" : ""}</span>`).join('<span class="muted">→</span>')}</div>` +
      phaseA(d, st) + (st.a.confirmed ? phaseB(d, st) : "") + (st.b.done ? phaseC(d, st) : "") + (st.approved ? phaseD(d, st) : "");
  };

  // ---------------- 1 · 申请进件 ----------------
  function phaseA(d, st) {
    const a = st.a;
    if (a.step < 0) return `<div class="card"><h2>1 · 上传租房申请表</h2><p class="small muted">TXR-2003 一人一份，两个成年人就是两份，可以合在一个 PDF 里传。影子：点一下模拟。</p><div class="dropzone" data-action="lease-app-upload" data-arg="${d.id}"><div class="big">⇪</div><b>拖入申请表 PDF</b><div class="small muted" style="margin-top:6px">抽取只输出我们要的字段；SSN / 驾照号 / 出生年份 / 账号在 OCR 文本里先遮蔽，不进数据库</div></div></div>`;
    if (!a.done) return `<div class="card"><h2>1 · 正在处理 Application.pdf</h2>${steps(APP_STEPS, a.step)}</div>`;
    const conf = (n) => `<span class="conf">置信 ${n.toFixed(2)} <span class="bar ${n < NBScore.TH().lowConfidence ? "warn" : "ok"}"><i style="width:${Math.round(n * 100)}%"></i></span></span>`;
    const row = (k, v1, v2, pg, c) => `<tr><td class="small muted">${k}</td><td>${v1}</td><td>${v2}</td><td class="tiny muted nowrap">p.${pg} ${conf(c)}</td></tr>`;
    if (a.confirmed) return `<div class="card"><div class="hd"><h2>1 · 申请进件 <span class="badge ok">已创建</span></h2><span class="small muted">${esc(a.at)}</span></div><div class="row">${a.created.map((x) => `<a class="chip" href="${x.href}">${esc(x.label)}</a>`).join("")}</div><p class="small muted" style="margin-top:8px">申请 PDF 60 天后自动删除，只留结构化字段和 audit；SSN / 驾照号从未入库。</p></div>`;
    return `<div class="card"><div class="hd"><h2>1 · 待确认 · 申请人信息</h2><span class="small muted">每格可改 · 页码来自申请表</span></div>
      <div class="tbl"><table><tr><th></th><th>申请人 1</th><th>申请人 2</th><th>来源</th></tr>
      ${row("姓名", "<b>林先生</b>", "<b>林太太</b>（曾用名：无）", "1 / 1", 0.98)}
      ${row("关系", "—", "配偶（申请表“同住人 / 关系”栏）", "2", 0.93)}
      ${row("生日（只取月-日）", "04-09", "12-02", "1", 0.97)}
      ${row("手机 / 邮箱", "469-000-0031 · l***@example.com", "469-000-0032 · lt***@example.com", "1", 0.99)}
      ${row("工作", "Demo Software Inc · Product Manager · 2025-05 起 · 自报 $7,900 / 月", "全职照顾家庭 · 无收入", "3", 0.9)}
      ${row("现住址", "Portland, OR · 2023-08 至今 · $2,150 / 月 · 房东电话已取", "同左", "2", 0.91)}
      ${row("前住址", "Plano, TX · 2020–2023 · 公寓", "同左", "2", 0.86)}
      </table></div>
      <div class="grid3" style="margin-top:12px">
        <div class="note small"><b>同住人</b> 未成年 1 人（不取姓名、不取年龄）<br><b>宠物</b> 猫 ×2（12 lb / 9 lb）<br><b>车辆</b> 2019 Honda CR-V · 2016 Toyota Camry</div>
        <div class="note small"><b>申请信息</b> ${esc(prop(d.property).addr)} · 期望入住 ${fd(d.availableFrom)} · 12 个月 · ${money(d.price)} / 月 · 申请日 ${dd(-1)} · Authorization ✓ 已签</div>
        <div class="note small"><b>申请人的经纪</b> Jane Doe · Demo Realty Group · 214-000-0040 · jane@example.com<br><b>紧急联系人</b> 林父 · 469-000-0033</div>
      </div>
      <div class="note acc" style="margin-top:12px"><b>点确认后会创建</b><ul class="small" style="margin:6px 0 0;padding-left:1.2em"><li>联系人 ×2：林先生、林太太（类别：租客申请人；来源：租房申请）——同名同电话的已有联系人会给“合并”选项</li><li>关系：林先生 ↔ 林太太 配偶（家庭圈）</li><li>联系人 ×1 + 公司 ×1：Jane Doe（对方经纪）+ Demo Realty Group（经纪公司，已有则复用）</li><li>挂到房源 ${esc(prop(d.property).addr)} 的这笔租赁交易；各方：申请人 ×2（对方）、租客经纪（对方）、房东（我方）</li><li>任务 ×2：致电前房东核实、致电雇主核实（申请表已签授权）</li></ul></div>
      <div class="row" style="margin-top:12px"><button class="btn pri" data-action="lease-app-confirm" data-arg="${d.id}">一键确认 · 创建以上全部</button><button class="btn" data-action="todo" data-arg="逐项修改">逐项改</button><span class="small muted">事务性：全部成功或全部不写，写 audit</span></div></div>`;
  }
  A["lease-app-upload"] = (el, id) => { runSteps(id, "a", APP_STEPS.length, () => { DB.documents.unshift({ id: "doc" + Date.now(), deal: id, name: "Application.pdf", pages: 8, type: "lease_application", uploaded: TODAY(), sha: "c0a1…7e", locked: false, retention: dd(60) + "（未成交自动删除）", children: [{ name: "TXR-2003 Residential Lease Application · 申请人 1", type: "lease_application", pages: "1–4" }, { name: "TXR-2003 Residential Lease Application · 申请人 2", type: "lease_application", pages: "5–8" }] }); DB.aiCalls.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), kind: "租房申请抽取（2 份）", model: "sonnet", cost: 0.07, deal: id, reviewer: "—", flag: false }); }); };
  A["lease-app-confirm"] = (el, id) => {
    const st = L(id); const d = deal(id);
    const c1 = "c" + Date.now(), c2 = "c" + (Date.now() + 1), ca = "c" + (Date.now() + 2), oa = "o" + Date.now();
    DB.contacts.push({ id: c1, name: "林先生", kind: "applicant", tags: ["租客申请人"], phone: "469-000-0031", birthday: "04-09", lang: "zh", source: "租房申请", channel: "电话", notes: "Demo Software Inc · Product Manager" });
    DB.contacts.push({ id: c2, name: "林太太", kind: "applicant", tags: ["租客申请人"], phone: "469-000-0032", birthday: "12-02", lang: "zh", source: "租房申请", channel: "电话" });
    DB.orgs.push({ id: oa, name: "Demo Realty Group", kind: "brokerage" });
    DB.contacts.push({ id: ca, name: "Jane Doe", kind: "agent", tags: ["对方经纪"], phone: "214-000-0040", org: oa, licenseType: "sales_agent", lang: "en", channel: "邮件", source: "租房申请" });
    DB.links.push({ from: c1, to: c2, kind: "spouse" });
    DB.parties.push({ deal: id, party: c1, type: "person", role: "租客申请人", side: "theirs", signer: true });
    DB.parties.push({ deal: id, party: c2, type: "person", role: "租客申请人", side: "theirs", signer: true });
    DB.parties.push({ deal: id, party: ca, type: "person", role: "租客经纪", side: "theirs" });
    DB.tasks[id] = DB.tasks[id] || [];
    DB.tasks[id].push({ id: "t" + Date.now(), name: "致电前房东核实租房历史（Portland · Plano）", rule: "申请进件后 1 天", due: dd(1), assignee: "Jason", status: "pending", clientVisible: false, note: "申请表 Authorization 已签" });
    DB.tasks[id].push({ id: "t" + (Date.now() + 1), name: "致电雇主核实（Demo Software Inc · 主管）", rule: "申请进件后 1 天", due: dd(1), assignee: "Lisa", status: "pending", clientVisible: false });
    { const rm = NBRoadmap.rmOf(d); rm.pre = Math.max(rm.pre, NBRoadmap.typeOf(d) === "lessee" ? 3 : 4); NBRoadmap.syncStage(d); } d.lastAction = TODAY(); // 阶段由路线图进度算出（收申请 → 申请审核中）
    st.a.confirmed = true; st.a.at = TODAY() + " " + new Date().toTimeString().slice(0, 5);
    st.a.created = [{ label: "联系人 · 林先生", href: `#/contacts/${c1}` }, { label: "联系人 · 林太太", href: `#/contacts/${c2}` }, { label: "关系 · 配偶", href: `#/contacts/${c1}` }, { label: "经纪 · Jane Doe", href: `#/contacts/${ca}` }, { label: "公司 · Demo Realty Group", href: `#/contacts` }, { label: "各方 ×3", href: `#/deals/${id}/parties` }, { label: "任务 ×2", href: `#/deals/${id}/tasks` }];
    audit(id, "租房申请确认：contacts ×3 · organizations ×1 · contact_links ×1 · deal_parties ×3 · tasks ×2（事务）", "human");
    DBsave(); render(); toast("已创建：2 个申请人、1 个经纪 + 公司、各方 3、任务 2");
  };

  // ---------------- 2 · 评估报告 ----------------
  function phaseB(d, st) {
    const b = st.b; const p = prop(d.property); const cr = p.criteria;
    if (b.step < 0) return `<div class="card"><h2>2 · 上传收入 / 背景材料 → 评估报告</h2><p class="small muted">paystub、offer letter、bank statement、第三方信用 / 背景报告。只抽数字，不留原件（30 天后删）。</p><div class="dropzone" data-action="lease-inc-upload" data-arg="${d.id}"><div class="big">⇪</div><b>拖入收入文件</b><div class="small muted" style="margin-top:6px">影子：点一下模拟 4 份文件</div></div><div class="note small" style="margin-top:10px"><b>房东书面标准（§92.3515）</b> 收入 ≥ ${cr.incomeX}× 月租 · 信用 ≥ ${cr.credit} · 宠物 ${esc(cr.pets)} · ${cr.evictionYears} 年内无驱逐 · ${esc(cr.other)} <a href="#/properties/${p.id}">改</a></div></div>`;
    if (!b.done) return `<div class="card"><h2>2 · 正在处理收入文件</h2>${steps(INC_STEPS, b.step)}</div>`;
    const need = d.price * cr.incomeX; const inc = 7950; const x = (inc / d.price).toFixed(1);
    const rows = [
      ["收入 ≥ " + cr.incomeX + "× 月租（需 ≥ " + money(need) + "）", `核实税前月收入 ${money(inc)} → ${x}×`, "ok", "paystub ×2 p.1 · offer letter p.1"],
      ["申报收入 vs 核实收入", "申报 $7,900 · 核实 $7,950 · 差 0.6%（>10% 才标“待解释”）", "ok", "申请表 p.3 · paystub"],
      ["在职时长 ≥ 6 个月", "2025-05 入职 · 1 年 4 个月", "ok", "offer letter p.1"],
      ["信用 ≥ " + cr.credit, "未上传第三方信用报告", "wait", "—"],
      [cr.evictionYears + " 年内无驱逐 / 欠租", "未上传背景报告；前房东电话核实进行中", "wait", "任务：致电前房东"],
      ["宠物：" + cr.pets, "猫 ×2 · 12 lb / 9 lb → 符合，押金 $600", "ok", "申请表 p.2"],
      ["每卧室 ≤ 2 人", "3 人 / 3 卧", "ok", "申请表 p.2（同住人只用于人数）"],
      ["车位", "2 辆 · 车位 2", "ok", "申请表 p.2"],
      ["入住日 vs 可入住日", `${fd(d.availableFrom)} = ${fd(d.availableFrom)}`, "ok", "申请表 p.1"],
    ];
    const ok = rows.filter((r) => r[2] === "ok").length, wait = rows.filter((r) => r[2] === "wait").length;
    return `<div class="card"><div class="hd"><h2>2 · 租客评估报告 <span class="badge ok">${ok} 项满足</span> <span class="badge warn">${wait} 项待核实</span></h2><span class="small muted">core evaluateApplication() · 不输出“推荐 / 不推荐”</span></div>
      <div class="tbl"><table><tr><th>房东标准</th><th>申请人数据</th><th>结果</th><th>依据</th></tr>${rows.map((r) => `<tr><td class="small">${r[0]}</td><td class="small">${r[1]}</td><td><span class="badge ${r[2] === "ok" ? "ok" : "warn"}">${r[2] === "ok" ? "满足" : "待核实"}</span></td><td class="tiny muted">${r[3]}</td></tr>`).join("")}</table></div>
      <div class="note small" style="margin-top:10px">本报告依据房东提供的书面标准整理，由经纪人审核后发出，不构成法律意见；受 Fair Housing 法保护的信息（种族、肤色、宗教、性别、国籍、家庭状况、残疾）不进入评估，同住人只用于人数上限，辅助动物不按宠物算。</div>
      <div class="row" style="margin-top:12px"><button class="btn pri" data-action="toast" data-arg="已生成品牌 PDF（中英），打开系统分享 / 邮件草稿——不自动发">发给房东（PDF）</button><button class="btn" data-action="lease-deny-tpl" data-arg="${d.id}">拒绝通知模板</button><span class="small muted">房东看完在下面点批准</span></div></div>`;
  }
  A["lease-inc-upload"] = (el, id) => { runSteps(id, "b", INC_STEPS.length, () => { DB.aiCalls.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), kind: "收入文件抽取（4 份）+ 评估", model: "sonnet", cost: 0.09, deal: id, reviewer: "Jason", flag: false }); DB.documents.unshift({ id: "doc" + Date.now(), deal: id, name: "Income-docs.zip", pages: 9, type: "income_docs", uploaded: TODAY(), sha: "d4f2…19", locked: false, retention: dd(30) + "（到期删文件留数字）" }); }); };
  A["lease-deny-tpl"] = (el, id) => openModal(`<h2>拒绝通知（模板 · 你审）</h2><p class="small">Texas Property Code §92.3515：房东须提供书面选择标准；拒绝时说明依据的标准。用了第三方信用 / 背景报告时附 FCRA adverse action 信息。</p><div class="note small">尊敬的申请人：感谢您申请 ${esc(prop(deal(id).property).addr)}。根据房东于 __ 日提供给您的书面租客选择标准，您的申请未获批准，依据的标准为：<b>［勾选：收入倍数 / 信用 / 租房历史 / 宠物政策 / 其他］</b>。<br><br>［如用了第三方报告］本决定部分依据 ［报告机构名称、地址、电话］ 提供的消费者报告。该机构未参与决定，无法说明原因。您有权在 60 天内向该机构免费索取报告副本，并对报告内容提出异议。<br><br>申请费 ［已退还 / 按标准不退］。<br>${esc(DB.me.name)} · ${esc(DB.org.name)}</div><div class="acts"><button class="btn" data-action="toast" data-arg="已复制">复制</button><button class="btn" data-action="modal-close">关闭</button></div>`);

  // ---------------- 3 · 房东批准 → 交易 ----------------
  function phaseC(d, st) {
    if (!st.approved) return `<div class="card"><h2>3 · 房东批准</h2><p class="small muted">房东回复“同意”后点一下：申请人变租客，挂牌交易转成租赁交易，派生签约前的任务和钱。</p><div class="row"><button class="btn ok" data-action="lease-approve" data-arg="${d.id}">房东 Approve → 生成交易</button><button class="btn ghost" data-action="lease-deny-tpl" data-arg="${d.id}">房东拒绝 → 通知</button></div></div>`;
    return `<div class="card"><div class="hd"><h2>3 · 已批准 <span class="badge ok">交易已生成</span></h2><span class="small muted">${esc(st.approvedAt)}</span></div><div class="row"><a class="chip" href="#/deals/${d.id}">交易 · ${esc(d.title)} · 待签租约</a><a class="chip" href="#/deals/${d.id}/parties">各方：租客 ×2 · 租客经纪 · 房东</a><a class="chip" href="#/deals/${d.id}/tasks">任务 ×5</a><a class="chip" href="#/deals/${d.id}/money">钱 ×3</a></div></div>`;
  }
  A["lease-approve"] = (el, id) => {
    const st = L(id); const d = deal(id);
    DB.parties.filter((x) => x.deal === id && x.role === "租客申请人").forEach((x) => { x.role = "租客"; });
    DB.contacts.forEach((c) => { if (c.kind === "applicant" && DB.parties.some((x) => x.deal === id && x.party === c.id)) { c.kind = "client"; c.tags = ["租客"]; } });
    { const rm = NBRoadmap.rmOf(d); rm.pre = Math.max(rm.pre, 5); NBRoadmap.syncStage(d); } d.title = prop(d.property).addr + " · 租赁"; d.lastAction = TODAY(); // 阶段由路线图进度算出（批准 → 已批准 · 签约前）
    DB.tasks[id] = DB.tasks[id] || [];
    [["起草租约 TXR-2001 + 宠物附录", dd(1), "Jason"], ["通知其他申请人（§92.3515 书面说明）", dd(1), "Jason"], ["关闭挂牌 · 更新 MLS 状态", dd(1), "Lisa"], ["收押金 $2,400 + 宠物押金 $600（只以电话核实账户）", dd(5), "Lisa"], ["入住检查表（入住 48 小时内）", dd(12), "Lisa"]].forEach(([n, due, who], i) => DB.tasks[id].push({ id: "t" + (Date.now() + i), name: n, rule: "租赁 Playbook · 批准后", due, assignee: who, status: "pending", clientVisible: n.startsWith("收押金") }));
    DB.money[id] = [{ id: "mo1", label: "押金", amount: 2400, to: "房东（经经纪信托账户）", due: dd(5), status: "due", how: "电汇 · 先电话核实" }, { id: "mo2", label: "宠物押金", amount: 600, to: "房东", due: dd(5), status: "due", how: "同上" }, { id: "mo3", label: "首月租金", amount: 2400, to: "房东", due: dd(12), status: "upcoming", how: "电汇 / 支票" }];
    DB.portalMembers[id] = [{ id: "pm1", name: "林先生", role: "decision", visibility: "all", opens: 0, lastOpen: null, contactId: DB.contacts.find((c) => c.name === "林先生").id, iabsAt: null }];
    st.approved = true; st.approvedAt = TODAY() + " " + new Date().toTimeString().slice(0, 5);
    audit(id, `房东批准：申请人 → 租客；阶段 → ${NBRoadmap.stageLabel(d.stage)}；派生任务 ×5 · money ×3（租赁 Playbook）`, "human");
    DBsave(); render(); toast("交易已生成：待签租约。签完把租约传进来。");
  };

  // ---------------- 4 · 租约进件 ----------------
  function phaseD(d, st) {
    const c = st.c;
    if (c.step < 0) return `<div class="card"><h2>4 · 上传签好的租约</h2><p class="small muted">TXR-2001 Residential Lease + 附录。抽取租金 / 租期 / 押金 / 滞纳金 / 水电 / 续约通知 → 确认 → 派生租期里程碑和每月钱。</p><div class="dropzone" data-action="lease-doc-upload" data-arg="${d.id}"><div class="big">⇪</div><b>拖入 Lease.pdf</b><div class="small muted" style="margin-top:6px">影子：点一下模拟</div></div></div>`;
    if (!c.done) return `<div class="card"><h2>4 · 正在处理 Lease.pdf</h2>${steps(LEASE_STEPS, c.step)}</div>`;
    if (c.confirmed) return `<div class="card"><div class="hd"><h2>4 · 租约已确认 ${stageBadge(d.stage)}</h2><span class="small muted">${esc(c.at)}</span></div><div class="row"><a class="chip" href="#/deals/${d.id}/milestones">里程碑 ×${(DB.milestones[d.id] || []).length}（含续约提醒 ${NBRent.RENEWAL.join(" / ")} 天 · 押金退还）</a><a class="chip" href="#/deals/${d.id}/money">钱：押金 · 首月 · 每月 1 日</a><a class="chip" href="#/deals/${d.id}/fields">租约字段 ×${(DB.fields[d.id] || []).length}</a><a class="chip" href="#/portal/${d.id}">租客视图</a></div><p class="small muted" style="margin-top:8px">租约确认只把「租约线」走完：押金 / 首月租金、钥匙交接 · 入住还是待做（路线图上自己点）；到期前 ${NBRent.RENEWAL.join(" / ")} 天各提醒一次（续约 / 涨租 / 退租检查）；押金退还按 §92.103 退租后 30 天。</p></div>`;
    const end = dd(12 + 365);
    const lc = NBScore.TH().lowConfidence; const F = leaseRows(d, end);
    return `<div class="card"><div class="hd"><h2>4 · 待确认 · 租约字段</h2><span class="small muted">和买卖合同同一套机制（电子版 · 置信 ≥ ${lc} 的可以一次确认；低于线的逐条看）</span></div><div class="list">${F.map((f) => `<div class="field pending" data-field="${esc(f.key)}"><div class="k">${esc(f.label)}<div class="tiny mono">${esc(f.key)}</div></div><div class="v">${esc(f.value)}<span class="src">来源 Lease.pdf p.${f.page} · <q>${esc(f.quote)}</q> · 置信 ${f.conf.toFixed(2)}${f.conf < lc ? ` · <span class="badge warn">低于 ${lc} · 逐条看</span>` : ""}</span></div><div></div></div>`).join("")}</div><div class="row" style="margin-top:12px"><button class="btn pri" data-action="lease-doc-confirm" data-arg="${d.id}">确认这 ${F.length} 条 · 派生租期里程碑</button><button class="btn" data-action="todo" data-arg="逐条改">逐条改</button></div></div>`;
  }
  // 租约样例的字段：注册表里的 key（NB_FIELDS）；来源都是打印的电子版
  function leaseRows(d, end) {
    const start = d.availableFrom; const ll = (contact(d.primary) || {}).name || "房东";
    return [["landlord_entity", ll, 1, "Landlord: " + ll, 0.98], ["tenant_names", "林先生、林太太", 1, "Tenant(s): Lin, Wei and Lin, Mei", 0.98], ["occupant_count", "3 人", 1, "Occupants: 3", 0.95], ["lease_start", start, 1, "Commencement Date: " + start, 0.96], ["lease_end", end, 1, "Expiration Date: " + end, 0.96], ["rent", "$2,400", 2, "Monthly Rent: $2,400.00", 0.99], ["rent_due_day", "每月 1 日", 2, "due on the first day of each month", 0.96], ["deposit", "$2,400", 3, "Security Deposit: $2,400.00", 0.97], ["pet_deposit", "$600", 13, "Pet deposit: $600 (2 cats)", 0.95], ["late_fee_start_day", "3 日", 3, "not received by 11:59 p.m. on the 3rd day", 0.9], ["late_fee", "$75 + $25 / 日", 3, "initial late charge $75 … daily late charge $25", 0.9], ["utilities_tenant", "全部（水 · 电 · 燃气 · 网络 · 垃圾）", 4, "Tenant will pay all utilities", 0.92], ["utilities_landlord", "无", 4, "Landlord pays: none", 0.88], ["notice_days", "60 天", 5, "written notice at least 60 days before the Expiration Date", 0.9]]
      .map(([key, value, page, quote, conf]) => { const r = NBExtract.reg(key); return { key, tier: r.tier, para: r.para, label: r.zh, value, page, quote, conf, src: "typed", docKind: "text" }; });
  }
  A["lease-doc-upload"] = (el, id) => { runSteps(id, "c", LEASE_STEPS.length, () => { DB.documents.unshift({ id: "doc" + Date.now(), deal: id, name: "Lease.pdf", pages: 16, type: "lease", uploaded: TODAY(), sha: "b7c3…44", locked: false, sourceKind: "text", tv: "txr-2001 @ 2001", children: [{ name: "TXR-2001 Residential Lease", type: "lease", pages: "1–14", tv: "txr-2001 @ 2001" }, { name: "Pet Agreement", type: "pet_agreement", pages: "15–16" }] }); DB.aiCalls.unshift({ at: TODAY() + " " + new Date().toTimeString().slice(0, 5), kind: "租约抽取（16 页）", model: "sonnet", cost: 0.08, deal: id, reviewer: "—", flag: false }); }); };
  // 确认租约字段 → 派生（extract.js NBExtract.deriveAll：租约开始 / 到期 · 续约提醒 90 / 60 / 30 · 钱）+ 这条线自己的几个节点。
  // 只把路线图的「租约线」走完；押金 / 首月租金、钥匙交接 · 入住不自动标完成（钱和交房是另一条线，收到了在路线图上点）
  A["lease-doc-confirm"] = (el, id) => {
    const st = L(id); const d = deal(id); const start = d.availableFrom; const end = dd(12 + 365);
    const dn = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    DB.fields[id] = leaseRows(d, end).map((f) => Object.assign(f, { status: "confirmed", v: 1, confirmedAt: TODAY(), by: DB.me.name }));
    const r = NBExtract.deriveAll(id) || { milestones: 0 };
    const ms = (DB.milestones[id] = DB.milestones[id] || []); const put = (key, label, kind, date, lane, rule) => { if (ms.some((m) => m.key === key)) return; let n = ms.length + 1; while (ms.some((m) => m.id === "m" + n)) n++; ms.push(Object.assign({ id: "m" + n, key, label, kind, date, status: "pending", lane }, rule ? { rule } : {})); };
    put("lease_sign", "租约签署", "event", TODAY(), 1); const sg = ms.find((m) => m.key === "lease_sign"); if (sg) sg.status = "done";
    put("deposit", "押金 + 宠物押金收讫", "deadline", dd(5), 2, "签约后 5 天"); put("move_in", "入住 · 交钥匙", "event", start, 2); put("move_in_form", "入住检查表交回", "deadline", dn(start, 2), 2, "入住后 48 小时"); put("first_rent", "首月租金", "deadline", start, 3, "入住日"); put("rent_due", "每月 1 日房租（循环）", "deadline", dn(start, 30), 3, "每月 · 第 3 天起滞纳金"); put("deposit_return", "押金退还", "deadline", dn(end, 30), 4, "退租后 30 天（§92.103）");
    DB.money[id] = (DB.money[id] || []).concat([{ id: "mo4", label: "每月租金（示例：第 2 个月）", amount: 2400, to: "房东", due: dn(start, 30), status: "upcoming", how: "每月 1 日", refund: "不退", refundWho: "—" }]);
    { const rm = NBRoadmap.rmOf(d); rm.pre = Math.max(rm.pre, 5); const la = NBRoadmap.mapFor(d).phases[1].lines.find((l) => l.key === "A"); if (la) { rm.lines.A = la.nodes.length; rm.out.A = "ok"; } NBRoadmap.syncStage(d); } d.lastAction = TODAY();
    st.c.confirmed = true; st.c.at = TODAY() + " " + new Date().toTimeString().slice(0, 5);
    audit(id, `租约字段 ×${DB.fields[id].length} 确认 → 派生租期里程碑 ×${ms.length} · 每月钱；路线图「租约线」走完，押金 / 入住待做（租赁 Playbook）`, "system", "core");
    DBsave(); render(); toast(`租约已确认：里程碑 ${ms.length} 个、续约提醒 ${NBRent.RENEWAL.join(" / ")} 天都派生了；押金和入住还是待做`);
  };
})();
