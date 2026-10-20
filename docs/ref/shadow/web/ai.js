/* AI 助手：右下角两个按钮（语音 / 文字），半透明底部面板；只答系统 + 房地产；写动作走确认卡 */
(function () {
  const A = window.ACTIONS;
  const S = () => (DB.ui.ai = DB.ui.ai || { open: false, mode: "text", ctx: null, log: [], listening: false });

  function sheet() {
    const s = S(); if (!s.open) return "";
    const ctxDeal = s.ctx && deal(s.ctx);
    const sugs = ["上一个 offer 是哪个房子？", "1234 Sample Dr 的 HOA 一年多少？", "帮我记一下明天提醒 Kevin 锁 rate", "把 1234 Sample Dr 的进度分享给陈太太", "这周有什么要炸的？", "今天天气怎么样？"];
    return `<div class="sheet" role="dialog" aria-label="AI 助手"><div class="hd"><span class="badge ${s.mode === "voice" ? "ai" : "acc"}">${s.mode === "voice" ? "🎙 语音" : "✎ 文字"}</span><b>助手</b><span class="tiny muted">${ctxDeal ? "上下文：" + esc(ctxDeal.title) : "全局"} · Haiku 门卫 · 只答系统 + 房地产 · 写动作先出确认卡</span><span class="sp" style="flex:1"></span>${coverBadge("8")}<button class="btn xs ghost" data-action="ai-close">关闭</button></div>
      <div class="log chat">${s.log.length ? s.log.map((m) => `<div class="msg ${m.who}">${m.html || esc(m.text)}${m.meta ? `<div class="meta">${esc(m.meta)}</div>` : ""}</div>`).join("") : `<div class="msg ai">你好，我能查这个系统里的数据、帮你记东西、起草消息。试试下面的问题。</div>`}${s.listening ? `<div class="listening"><i></i> 正在听…（MediaRecorder → 服务端转写，中英混说）<button class="btn xs ai" data-action="ai-voice-stop">停止</button></div>` : ""}</div>
      <div class="sugs">${sugs.map((x) => `<span class="pill" data-action="ai-sug" data-arg="${esc(x)}">${esc(x)}</span>`).join("")}</div>
      <div class="in"><input id="ai-in" placeholder="${s.mode === "voice" ? "说话会自动转成文字进这里" : "问一句 / 说一句"}" data-enter="ai-send"><button class="btn ai" data-action="ai-voice">🎙</button><button class="btn pri" data-action="ai-send">发送</button></div></div>`;
  }
  function open(mode, ctx, intent) {
    const s = S(); s.open = true; s.mode = mode || "text"; if (ctx) s.ctx = ctx;
    if (intent === "share") { respond(`把 ${ctxDealTitle()} 分享给相关的人`); }
    else if (intent === "reply") { push("ai", "", `<b>起草回复（客户面文字，T2 · 你放行后才发）：</b><br>“陈太太您好，1234 Sample Dr 的 HOA 是每年约 $850（合同第 14 页 HOA 附录），卖家负责付 resale certificate；HOA 文件送到后您有 3 天可以因文件内容终止。”<div class="confirm" style="margin-top:6px"><div class="t">T2 · 对客户的文字</div><div class="acts"><button class="btn sm pri" data-action="ai-approve-text">放行 · 复制到微信</button><button class="btn sm ghost" data-action="toast" data-arg="已丢弃">改一下</button></div></div>`, "依据：deal_fields.hoa v1 · Contract.pdf p.14"); }
    else if (intent === "client") { push("ai", "", `我是 ${esc(DB.me.name)} 的助手，可以解释这份合同里的条款（带页码引用），不给法律意见。本笔交易还可以问 <b>18 / 20</b> 次。`, "客户面封顶 T2 · 所有回答进监督日志"); }
    else if (intent && intent.startsWith("share:")) { const c = contact(intent.slice(6)); push("ai", "", `找到和 <b>${esc(c ? c.name : "")}</b> 相关的人：${relatedPeople(c).map((x) => `<span class="chip">${esc(x)}</span>`).join(" ")}<div class="row" style="margin-top:6px"><button class="btn sm pri" data-action="toast" data-arg="已生成分享链接（影子）">一键分享联系方式（navigator.share）</button></div>`); }
    else if (intent && intent.startsWith("prop:")) { const p = prop(intent.slice(5)); if (p) { const nv = (x) => (x == null || x === "" ? "—" : x); push("ai", "", `<b>${esc(p.addr)}</b>：${window.NBPropFile ? esc(NBPropFile.specLine(p)) : `${nv(p.beds)} 房 ${nv(p.baths)} 卫`} · 屋顶 ${nv(p.roof)} · HOA ${p.hoa == null || p.hoa === "" ? "—" : money(p.hoa) + "/年"}。相关交易 ${DB.deals.filter((d) => d.property === p.id).length} 笔；产权人 ${DB.owners.filter((o) => o.property === p.id && !o.to).map((o) => esc(window.ownerLabel ? ownerLabel(o) : (o.name || ownerName(o.owner)))).join("、") || "未知"}。`, "来源：properties · property_owners · deals"); } }
    if (mode === "voice" && !intent) { s.listening = true; setTimeout(() => { const st = S(); if (!st.listening) return; st.listening = false; DBsave(); render(); respond("帮我记一下明天提醒 Kevin 锁 rate"); }, 1400); }
    DBsave(); render();
  }
  const ctxDealTitle = () => { const s = S(); const d = s.ctx && deal(s.ctx); return d ? d.title : "1234 Sample Dr · 买方"; };
  function push(who, text, html, meta) { S().log.push({ who, text, html, meta }); if (S().log.length > 12) S().log.shift(); }
  function relatedPeople(c) {
    if (!c) return [];
    const out = [];
    DB.parties.filter((p) => DB.parties.some((q) => q.deal === p.deal && q.party === c.id)).forEach((p) => { if (p.party && p.party !== c.id && contact(p.party)) out.push(`${contact(p.party).name}（${p.role}）`); });
    return [...new Set(out)];
  }
  window.ownerName = window.ownerName || ((id) => (contact(id) || org(id) || {}).name || id);

  function respond(q) {
    const s = S();
    push("me", q);
    const ql = q.toLowerCase();
    const d = s.ctx && deal(s.ctx);
    let html = "", meta = "Haiku · $0.006", gateOut = false;
    if (/天气|股票|新闻|笑话|菜谱|翻译/.test(ql)) { html = "这个我不管——我只回答这个系统里的数据和房地产交易的问题。"; meta = "门卫：OUT（不计费）"; gateOut = true; }
    else if (/上一个 offer|哪个房子/.test(ql)) { const o = NBOffers.byId("d5", "o3") || NBOffers.list("d5")[0]; const last = NBOffers.last(o); html = `赵女士上一个 offer 是 <a href="#/deals/d5">${esc((prop(o.property) || {}).addr || "1357 Prototype Blvd")}</a>：我方最高 ${money(last.price)}（v${last.v}，含 appraisal gap ${esc(last.appraisalGap)}），${fd(o.lostAt)} 落选${o.outcome ? `，最终成交 <b>${money(o.outcome)}</b>，差 ${money(o.outcome - last.price)}` : ""}。`; meta = "来源：offers.d5.o3 · 最终成交价记在那条 Offer 的 outcome 上"; }
    else if (/卖了多少|成交价/.test(ql)) { const o = NBOffers.byId("d5", "o3") || NBOffers.list("d5")[0]; html = o && o.outcome ? `${esc((prop(o.property) || {}).addr || "")} 最终成交 <b>${money(o.outcome)}</b>（MLS 关闭后回填，${fd(window.__d(-2))}）。` : "这套房的最终成交价还没回填。"; meta = "来源：offers.d5.o3.outcome"; }
    else if (/hoa/.test(ql)) { const f = DB.fields.d1.find((x) => x.key === "hoa_yes_no"); html = `1234 Sample Dr 的 HOA：<b>${esc(prop("p1").hoa ? money(prop("p1").hoa) + " / 年" : "")}</b>；合同 HOA 附录写的是“${esc(f.value)}”（Contract.pdf 第 ${f.page} 页：<q>${esc(f.quote)}</q>）。`; meta = "来源：deal_fields.hoa_yes_no v1 · properties.p1"; }
    else if (/要炸|截止|这周/.test(ql)) { const wk = NBScore.TH().weekDays; const items = []; DB.deals.forEach((dd) => { if (NBRoadmap.TERMINAL.includes(dd.stage)) return; (DB.milestones[dd.id] || []).forEach((m) => { if (m.status === "pending" && m.date && daysBetween(TODAY(), m.date) <= wk) items.push(`${dd.title.split(" · ")[0]}：${m.label} ${rel(m.date)}`); }); }); html = items.length ? `${wk} 天内：<br>` + items.map(esc).join("<br>") : `${wk} 天内没有截止。`; meta = "来源：milestones（只读）· 「本周」= SCORE_CONFIG.thresholds.weekDays"; }
    else if (/记一下|建任务|提醒/.test(ql)) { const m = ql.match(/提醒(.+?)(锁|$)/); const task = q.replace(/^帮我记一下/, "").trim() || "提醒 Kevin 锁 rate"; const due = /明天/.test(ql) ? window.__d(1) : /后天/.test(ql) ? window.__d(2) : TODAY(); const id = addProposal({ type: "note", tier: 2, deal: d ? d.id : "d1", title: `新建任务：${task}（截止 ${due}）`, evidence: `你说：“${q}”`, payload: { task, due, assignee: DB.me.name } }); html = `<div class="confirm"><div class="t">T2 · 写动作 · 确认卡</div><div>新建任务：<b>${esc(task)}</b> · 截止 ${due} · 负责人 ${esc(DB.me.name)} · 交易 ${esc(d ? d.title : "1234 Sample Dr · 买方")}</div><div class="ev">依据：你刚才说的话 · 可撤销</div><div class="acts"><button class="btn sm pri" data-action="ai-card-approve" data-arg="${id}">批准</button><button class="btn sm" data-action="prop-edit" data-arg="${id}">改一下</button><button class="btn sm ghost" data-action="ai-card-reject" data-arg="${id}">算了</button></div></div>`; meta = "proposals · 批准前不落库"; void m; }
    else if (/分享/.test(ql)) { const dd = d || deal("d1"); const ps = DB.parties.filter((p) => p.deal === dd.id && p.party && contact(p.party)); html = `${esc(dd.title)} 相关的人：${ps.map((p) => `<span class="chip">${esc(contact(p.party).name)} · ${esc(p.role)}</span>`).join(" ")}<div class="row" style="margin-top:6px"><button class="btn sm pri" data-action="toast" data-arg="已打开系统分享（navigator.share）">分享进度卡给 陈太太</button><button class="btn sm" data-action="toast" data-arg="已复制联系方式">复制 Maria 的联系方式</button></div>`; meta = "来源：deal_parties · 分享走 navigator.share，不自动发微信"; }
    else if (/option/.test(ql)) { const m = DB.milestones.d1.find((x) => x.key === "option_period_end"); html = `1234 Sample Dr 的 Option 期 ${fd(m.date)} 17:00 截止（${rel(m.date)}），规则：${esc(m.rule)}。`; meta = "来源：milestones.d1.option_period_end"; }
    else if (/多少钱|钱|首付/.test(ql)) { const mo = DB.money.d1; html = `1234 Sample Dr 接下来要交的钱：${mo.filter((x) => x.status !== "paid").map((x) => `${esc(x.label)} ${money(x.amount)} → ${esc(x.to)}（${rel(x.due)}）`).join("；")}。电汇前只打 972-000-0100 核实。`; meta = "来源：money_events（deriveMoneyEvents）"; }
    else { html = `我能查交易、联系人、房源、里程碑、钱，能帮你记任务、起草消息。这句我没听懂，换个说法？`; meta = "门卫：IN · 未匹配"; }
    push("ai", "", html, meta);
    NBAi.log({ kind: "助手", model: "haiku", cost: 0.006, deal: d ? d.id : null, gate: gateOut ? "out" : undefined }); // 门卫 OUT 的那一次照样记一行，成本 0
    DBsave(); render();
    const log = document.querySelector(".sheet .log"); if (log) log.scrollTop = log.scrollHeight;
  }

  A["ai-open"] = (el, arg) => { const [mode, ctx, intent] = (arg || "text").split("|"); open(mode, ctx || null, intent || null); };
  A["ai-close"] = () => { const s = S(); s.open = false; s.listening = false; DBsave(); render(); };
  A["ai-send"] = () => { const i = document.getElementById("ai-in"); const q = i && i.value.trim(); if (!q) return; respond(q); };
  A["ai-sug"] = (el, arg) => respond(arg);
  A["ai-voice"] = () => { const s = S(); s.mode = "voice"; s.listening = true; DBsave(); render(); setTimeout(() => { const st = S(); if (!st.listening) return; st.listening = false; DBsave(); render(); respond("把 1234 Sample Dr 的进度分享给陈太太"); }, 1400); };
  A["ai-voice-stop"] = () => { const s = S(); s.listening = false; DBsave(); render(); respond("这周有什么要炸的？"); };
  A["ai-card-approve"] = (el, id) => { A["prop-approve"](null, id); push("ai", "", "已建好任务，进了 Today；修改记录里有一条。", "audit_log actor=human（你批的）"); DBsave(); render(); };
  A["ai-card-reject"] = (el, id) => { A["prop-reject"](null, id); push("ai", "", "好，没记。", ""); DBsave(); render(); };
  A["ai-approve-text"] = () => { NBAi.log({ kind: "对客户文字（放行）", model: "haiku", cost: 0.006, deal: "d1", reviewer: DB.me.name }); const w = DB.wechat[0]; if (w && w.digest.unanswered.length) w.digest.unanswered.shift(); toast("已放行并复制，去微信粘贴（不自动发）"); DBsave(); render(); };

  window.AI = { sheet, open, close: () => { const s = S(); if (s.open) { s.open = false; DBsave(); render(); } } };
})();
