/* NewBee OS 三端影子 · 消息界面（三端共用同一套组件与动作；各端只决定入口、路由和身份）
   身份：网站 = 经纪人（切到 Broker 视角时 = Broker）· 经纪人 App = 经纪人 · 客户 App = 当前客户身份
   v1.5：请求卡的每个选项自己带结果（done / declined / discuss），按钮上不再猜；一条对话只有它的参与人能打开；
        Broker 的「要经纪人补充」是发给经纪人的；客户看到的状态从客户这边说（等你 / 等经纪人）。 */
(function () {
  const S = () => window.NB_SURFACE || (window.APP_ID === "agent" ? "agent" : window.APP_ID === "client" ? "client" : "web");
  const D = () => window.DB;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = () => window.NBMsg;
  const drafts = {}; // 每条线程的输入草稿（重绘不丢）
  const viewer = () => {
    const s = S();
    if (s === "client") return "client";
    if (s === "web" && D().ui && D().ui.role === "broker") return "broker";
    return "agent";
  };
  const me = () => {
    const v = viewer(); const d = D();
    if (v === "broker") return { role: "broker", id: (((d.org || {}).members || []).find((x) => x.role === "broker") || {}).id || "broker", name: (d.org && d.org.broker) || "Broker" };
    if (v === "client") { const c = (window.clientWho && window.clientWho()) || d.contacts.find((x) => x.kind === "client"); return { role: "client", id: c.id, name: c.name }; }
    return { role: "agent", id: d.me.id, name: d.me.name };
  };
  const threadPath = (tid) => ({ web: `#/messages/${tid}`, agent: `#/messages/${tid}`, client: `#/messages/${tid}` }[S()]);
  const fmtAt = (at) => { if (!at) return ""; const [dd, tm] = at.split(" "); const n = window.rel ? window.rel(dd) : dd; return `${n === "今天" ? "" : n + " "}${tm || ""}`.trim(); };
  const avatar = (from) => `<span class="av ${from.role}">${from.role === "system" ? "◌" : from.role === "ai" ? "AI" : esc((from.name || "?").slice(0, from.name && from.name.match(/^[A-Za-z]/) ? 2 : 1))}</span>`;
  const attachChips = (m) => (m.attach || []).map((a) => `<span class="attachchip">${{ milestone: "◷", property: "⌂", document: "▤", offer: "✎", workorder: "🔧", money: "$", proposal: "⚑" }[a.type] || "•"} ${esc(a.label || a.id)}</span>`).join("");

  // ---------- 一条消息 ----------
  function bubble(m, v) {
    const mine = m.from.role === (v === "client" ? "client" : v) || (v === "client" && m.from.role === "family");
    if (m.kind === "system" || m.kind === "feedback") return `<div class="msg sys"><div class="bubble">${m.kind === "feedback" ? "<b>看房反馈</b> · " : ""}${esc(m.text)}${attachChips(m)}<div class="when">${fmtAt(m.at)}</div></div></div>`;
    if (m.ai && m.ai.draft) {
      if (v === "client") return "";
      return `<div class="msg ai me"><div><div class="who">AI 草稿 · 未发出（客户看不到）· ${fmtAt(m.at)}</div><div class="bubble">${esc(m.text)}<div class="why">为什么这样写：${esc(m.ai.why || "按模板起草")}</div></div><div class="ra"><button class="btn xs pri" data-action="msg-ai-approve" data-arg="${m.id}">放行发出</button><button class="btn xs" data-action="msg-ai-edit" data-arg="${m.id}">改一下再发</button><button class="btn xs ghost" data-action="msg-ai-drop" data-arg="${m.id}">丢弃</button></div></div></div>`;
    }
    if (m.kind === "request" && m.request) return `<div class="msg ${mine ? "me" : ""} req">${mine ? "" : avatar(m.from)}<div><div class="who">${esc(m.from.name)}${m.from.role === "ai" ? " · 已核实" : ""} · ${fmtAt(m.at)}</div>${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ""}${reqCard(m, v)}</div></div>`;
    return `<div class="msg ${mine ? "me" : ""} ${m.kind === "note" ? "note" : ""} ${m.kind === "nudge" ? "nudge" : ""}">${mine ? "" : avatar(m.from)}<div><div class="who">${esc(m.from.name)}${m.kind === "note" ? " · 内部备注（客户看不到）" : ""}${m.kind === "nudge" ? " · 催一下" : ""} · ${fmtAt(m.at)}</div><div class="bubble">${esc(m.text)}${attachChips(m)}</div></div></div>`;
  }
  function decideCard(m, v) {
    const r = m.request; const dc = r.decision || { sides: [], deciders: [], reads: {}, answers: {} }; const D = window.DB; const nm = (cid) => (D.contacts.find((c) => c.id === cid) || {}).name || cid;
    const meId = v === "client" ? me().id : null; const many = (dc.deciders || []).length > 1; const agent = (D.me || {}).name || "经纪人";
    const sides = `<div class="dc-sides">${(dc.sides || []).map((sd) => `<div class="dc-side"><div class="dc-k">${esc(sd.label)}</div>${(sd.items || []).map((it) => `<div class="dc-it">${esc(it)}</div>`).join("")}</div>`).join("")}</div>`;
    const view = dc.agentView ? `<div class="dc-view"><b>${esc((D.me || {}).name || "经纪人")} 的看法：</b>${esc(dc.agentView)}</div>` : "";
    const who = `<div class="dc-who">${(dc.deciders || []).map((cid) => `<span class="badge ${dc.answers[cid] ? "ok" : dc.reads[cid] ? "acc" : "mute"}">${esc(nm(cid))} · ${dc.answers[cid] ? "已答：" + esc(dc.answers[cid]) : dc.reads[cid] ? "已看 · 未答" : "未看"}</span>`).join("")}</div>`;
    let acts = "";
    if (r.status === "pending" && v === "client") {
      // 影子：两位决策人在同一部手机上演示——每人一行按钮；真实版每人只看到自己那一行
      acts = `<div class="dc-rows">${(dc.deciders || []).map((cid) => `<div class="dc-row ${cid === meId ? "me" : ""}"><span class="dc-name">${esc(nm(cid))}${cid === meId ? "（我）" : ""}</span>${dc.answers[cid] ? `<span class="small muted">已选「${esc(dc.answers[cid])}」</span>` : (r.options || []).map((o, i) => `<button class="btn xs ${i === 0 ? "pri" : ""}" data-action="msg-decide" data-arg="${m.id}|${cid}|${esc(M().optLabel(o))}">${esc(M().optLabel(o))}</button>`).join("")}</div>`).join("")}<div class="tiny muted">${many ? `影子演示：二位决策人各自点自己那一行；真实版每个人只看到自己的按钮。两人答得不一样不由系统投票，标「需要商量」转给 ${esc(agent)}。` : `只有决策人能答；选「想先商量」的那一项会转给 ${esc(agent)}。`}</div></div>`;
    } else if (r.status === "discuss") {
      acts = `<div class="dc-rows"><span class="badge bad">需要商量</span><span class="small">${(dc.deciders || []).map((cid) => `${esc(nm(cid))}「${esc(dc.answers[cid] || "")}」`).join(" · ")}</span>${v !== "client" ? `<button class="btn xs pri" data-action="msg-decide-reset" data-arg="${m.id}">打完电话 · 重新请${many ? "二位" : "对方"}点</button>` : `<span class="tiny muted">${esc(agent)}会联系${many ? "二位" : "您"}</span>`}</div>`;
    } else if (r.status === "done") {
      acts = `<div class="dc-rows"><span class="badge ok">已决定：${esc(r.answer || "")}</span><span class="tiny muted">${fmtAt(r.doneAt)} · ${many ? "两位决策人一致" : "决策人已答"}</span></div>`;
    }
    return `<div class="reqcard decide ${r.status}"><div class="rk">请决定</div><div class="rt">${esc(r.title)}</div>${sides}${view}${who}<div class="rd">${r.due ? "请在 " + esc(r.due) + " 前答复" : ""}</div>${acts}</div>`;
  }
  function reqCard(m, v) {
    const r = m.request; if (r.action === "decide") return decideCard(m, v);
    const mineToAnswer = r.status === "pending" && (r.to === v || (r.to === "client" && v === "client"));
    const lab = M().REQ_LABEL[r.action] || "请求";
    // 每个按钮带的结果 = 选项自己的 outcome（done 同意 / 办了 · declined 不同意 · discuss 想先商量）；没给选项的确认卡 = 确认 / 有问题（有问题 = 想先商量）；「稍后」不改任何状态
    const opt = (o, i) => { const label = M().optLabel(o); return `<button class="btn xs ${i === 0 ? "pri" : ""}" data-action="msg-req" data-arg="${m.id}|${M().optOutcome(r, label)}|${esc(label)}">${esc(label)}</button>`; };
    const acts = !mineToAnswer ? "" : `<div class="ra">` + (r.action === "confirm" || r.action === "approve" || r.action === "pick_time"
      ? (r.options && r.options.length ? r.options.map(opt).join("") : `<button class="btn xs pri" data-action="msg-req" data-arg="${m.id}|done|确认">确认</button><button class="btn xs" data-action="msg-req" data-arg="${m.id}|discuss|有问题">有问题</button>`)
      : r.action === "upload" ? `<button class="btn xs pri" data-action="msg-req" data-arg="${m.id}|done|已上传（模拟）">拍照上传（模拟）</button><button class="btn xs" data-action="msg-later" data-arg="${m.id}">稍后</button>`
      : `<button class="btn xs pri" data-action="msg-req-answer" data-arg="${m.id}">回答</button>`) + `</div>`;
    const again = r.status === "discuss" && v !== "client" && r.to === "client" ? `<div class="ra"><button class="btn xs pri" data-action="msg-decide-reset" data-arg="${m.id}">打完电话 · 重新请对方点</button></div>` : "";
    const whoTo = r.to === "broker" ? (r.effect && r.effect.type === "proposal" ? " · T3 · Broker 审批" : " · 等 Broker") : r.to === "agent" ? " · 等经纪人" : "";
    return `<div class="reqcard ${r.status}"><div class="rk">${lab}${whoTo}</div><div class="rt">${esc(r.title)}</div><div class="rd">${r.due ? "截止 " + esc(r.due) + " · " : ""}${r.status === "pending" ? (mineToAnswer ? "等你处理" : `等${{ client: "客户", agent: "经纪人", broker: "Broker" }[r.to] || "对方"}`) : r.status === "done" ? `已处理${r.answer ? "：" + esc(r.answer) : ""} · ${fmtAt(r.doneAt)}` : r.status === "discuss" ? `想先商量${r.answer ? "：" + esc(r.answer) : ""} · ${fmtAt(r.doneAt)}` : `未同意${r.answer ? "：" + esc(r.answer) : ""}`}</div>${acts}${again}</div>`;
  }

  // ---------- 上下文卡 ----------
  function ctxCard(t) {
    const c = M().contextCard(t, viewer()); const s = S(); const href = c.href && c.href[s];
    return `<div class="ctxcard"><div class="ct"><span class="ico">${c.icon}</span><b>${esc(c.title)}</b>${c.sub ? `<span class="muted"> · ${esc(c.sub)}</span>` : ""}${href ? `<a class="lk" href="${href}">打开 →</a>` : ""}</div>${c.lines.map(([k, val]) => `<div class="cl"><span class="k">${esc(k)}</span><span>${esc(val)}</span></div>`).join("")}</div>`;
  }

  // ---------- 线程列表 ----------
  function listItem(it, cur) {
    const t = it.t; const a = M().anchorOf(t); const d = D(); const v = viewer();
    const who = v === "client" ? `${d.me.name}（经纪人）` : t.kind === "client" ? ((d.contacts.find((x) => x.id === t.contact) || {}).name || "客户") : t.kind === "broker" ? (t.broadcast ? "全公司公告" : (v === "broker" ? d.me.name : "Broker")) : "团队";
    const st = M().statusLabel(t.status, v);
    return `<a class="th ${cur === t.id ? "on" : ""} ${it.unread ? "unread" : ""}" href="${threadPath(t.id)}"><span class="av ${v === "client" ? "agent" : t.kind}">${esc(who.slice(0, 1))}</span><div class="body"><div class="t">${esc(who)}${t.pinned && v !== "client" ? " ★" : ""}<span class="anchor">${a.icon} ${esc(a.label)}</span></div><div class="d">${esc(t.lastText || "")}</div></div><div class="meta"><div>${fmtAt(t.lastAt)}</div>${it.unread ? `<span class="un">${it.unread}</span>` : it.pend ? `<span class="pend">${it.pend} 待办</span>` : `<span class="st">${st}</span>`}</div></a>`;
  }

  // ---------- 输入区 ----------
  const KINDS = {
    agent: [["text", "留言"], ["confirm", "请确认"], ["upload", "请上传"], ["pick_time", "约时间"], ["answer", "提问"], ["note", "内部备注"]],
    broker: [["text", "留言"], ["answer", "要经纪人补充"]],
    client: [["text", "留言"], ["answer", "提问"]],
  };
  function composer(t, v) {
    const st = D().ui.comp || {}; const kind = st.tid === t.id ? (st.kind || "text") : "text";
    // 经纪人：客户对话里六种都能发；问 Broker 的对话 = 留言 / 提问（「内部备注」Broker 也看得到，不放）；团队对话 = 留言 / 内部备注
    const kinds = (KINDS[v] || KINDS.client).filter(([k]) => v !== "agent" || t.kind === "client" || (t.kind === "broker" ? ["text", "answer"] : ["text", "note"]).includes(k));
    const draft = drafts[t.id] || "";
    const extra = kind === "confirm" || kind === "upload" || kind === "answer" ? `<input id="cmp-title" placeholder="${{ confirm: "要客户确认什么（一句话）", upload: "要客户上传什么", answer: v === "client" ? "想问经纪人什么" : "要对方回答什么" }[kind]}" value="${esc(st.title || "")}" data-change="msg-field" data-arg="title"><input id="cmp-due" placeholder="截止（如 ${D().today}）" value="${esc(st.due || "")}" data-change="msg-field" data-arg="due" style="max-width:180px">` : kind === "pick_time" ? `<input id="cmp-title" placeholder="选什么时间（如：周六看房几点出发）" value="${esc(st.title || "")}" data-change="msg-field" data-arg="title"><input id="cmp-opts" placeholder="选项，用 / 分开：10:00 / 13:00" value="${esc(st.opts || "")}" data-change="msg-field" data-arg="opts">` : "";
    const ai = v === "agent" && t.kind === "client" ? `<span class="sp"></span><button class="btn xs ai" data-action="msg-ai" data-arg="${t.id}|update">AI 帮我写 · 进度</button><button class="btn xs ai" data-action="msg-ai" data-arg="${t.id}|reply">AI 帮我写 · 回复</button><button class="btn xs ai" data-action="msg-ai" data-arg="${t.id}|reminder">AI 帮我写 · 提醒</button>` : "";
    const nudgeBtn = v === "client" && !t.broadcast ? `<button class="btn xs" data-action="msg-nudge" data-arg="${t.id}" title="AI 先核实是否真逾期，每天最多 1 次">催一下</button>` : "";
    const quick = (M().QUICK[v] || []).map((q) => `<button class="chipbtn" data-action="msg-quick" data-arg="${t.id}|${esc(q)}">${esc(q)}</button>`).join("");
    if (t.broadcast && v !== "broker") return `<div class="composer"><div class="small muted">公告只读 · 有问题在交易的对话里问 Broker</div></div>`;
    return `<div class="composer"><div class="kinds">${kinds.map(([k, l]) => `<button class="${kind === k ? "on" : ""}" data-action="msg-kind" data-arg="${t.id}|${k}">${l}</button>`).join("")}${nudgeBtn}${ai}</div>${extra}<textarea id="cmp-text" placeholder="${kind === "note" ? "只有你和团队看得到" : v === "client" ? "直接说，不用再说明是哪套房 —— 对话已经挂在上面的对象上" : "写给对方的话（客户可见文字先在这里，再由你发出）"}" data-change="msg-draft" data-arg="${t.id}">${esc(draft)}</textarea><div class="row"><div class="quick">${quick}</div><span class="sp"></span><span class="tiny muted">21:00–08:00 不推送，消息照常送达</span><button class="btn sm pri" data-action="msg-send" data-arg="${t.id}">发送</button></div></div>`;
  }

  // ---------- 一整条线程 ----------
  const whoId = (v) => (v === "client" ? me().id : null);
  function threadView(t, v, opts = {}) {
    if (!M().canOpen(t, v, whoId(v))) return `<div class="thread"><div class="empty" style="margin:auto">这条对话不是你的，打不开${opts.back ? ` · <a href="${opts.back}">回到列表</a>` : ""}</div></div>`;
    const msgs = M().msgsOf(t.id).filter((m) => M().visibleTo(m, v));
    const d = D(); const who = t.kind === "client" ? (t.members || [t.contact]).map((id) => (d.contacts.find((x) => x.id === id) || {}).name).filter(Boolean).join("、") : t.kind === "broker" ? (t.broadcast ? "全公司" : "经纪人 ↔ Broker") : "团队";
    const acts = v === "agent" && !t.broadcast ? `<button class="btn xs" data-action="msg-pin" data-arg="${t.id}">${t.pinned ? "取消置顶" : "置顶"}</button><button class="btn xs" data-action="msg-close" data-arg="${t.id}">${t.status === "closed" ? "重新打开" : "结束对话"}</button>` : "";
    return `<div class="thread"><div class="thh"><div><div class="t">${esc(t.subject)}</div><div class="d">${esc(who)} · <span class="badge ${t.status === "waiting_agent" ? "warn" : t.status === "closed" ? "mute" : "acc"}">${M().statusLabel(t.status, v)}</span></div></div><span class="sp"></span>${acts}${opts.back ? `<a class="btn xs" href="${opts.back}">‹ 列表</a>` : ""}</div>${ctxCard(t)}<div class="msgs" id="msgs">${msgs.map((m) => bubble(m, v)).join("") || `<div class="empty small">还没有消息</div>`}</div>${t.status === "closed" && v !== "agent" ? `<div class="composer"><div class="small muted">对话已结束</div></div>` : composer(t, v)}</div>`;
  }

  // ---------- 小问答框（网站用 modal，手机用 sheet）----------
  let askCb = null;
  function askText(label, onOk, fields) {
    askCb = onOk;
    const fs = (fields || [["ask-text", label, true]]).map(([id, ph, big]) => big ? `<textarea id="${id}" placeholder="${esc(ph)}" style="width:100%;min-height:80px;margin-top:8px"></textarea>` : `<input id="${id}" placeholder="${esc(ph)}" style="width:100%;margin-top:8px">`).join("");
    const html = `<h2>${esc(label)}</h2>${fs}<div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn pri" data-action="msg-ask-ok">确定</button></div>`;
    if (window.openModal) window.openModal(html); else if (window.openSheet) window.openSheet(html);
    setTimeout(() => { const n = document.querySelector("#ask-text, #ask-a"); if (n) n.focus(); }, 30);
  }
  // ---------- 动作（三端共用）----------
  function reg() {
    const A = window.ACTIONS; if (!A || A["msg-send"]) return;
    A["msg-ask-ok"] = () => { const vals = ["ask-text", "ask-a", "ask-b"].map((id) => (document.getElementById(id) || {}).value || ""); const cb = askCb; askCb = null; if (window.closeModal) window.closeModal(); if (window.closeSheet) window.closeSheet(); if (cb) cb(vals[0] || vals[1], vals[2]); };
    const save = () => window.DBsave();
    const rerender = () => window.render();
    A["msg-kind"] = (el, arg) => { const [tid, k] = arg.split("|"); D().ui.comp = Object.assign({}, D().ui.comp, { tid, kind: k }); save(); rerender(); };
    A["msg-field"] = (el, k) => { D().ui.comp = Object.assign({}, D().ui.comp, { [k]: el.value }); save(); };
    A["msg-draft"] = (el, tid) => { drafts[tid] = el.value; };
    A["msg-quick"] = (el, arg) => { const [tid, q] = arg.split("|"); drafts[tid] = (drafts[tid] ? drafts[tid] + " " : "") + q; const ta = document.getElementById("cmp-text"); if (ta) { ta.value = drafts[tid]; ta.focus(); } };
    A["msg-send"] = (el, tid) => {
      const t = M().thread(tid); if (!t) return; const v = viewer(); const st = (D().ui.comp && D().ui.comp.tid === tid) ? D().ui.comp : {}; const kind = st.kind || "text";
      const ta = document.getElementById("cmp-text"); const text = (ta ? ta.value : drafts[tid] || "").trim();
      const title = (document.getElementById("cmp-title") || {}).value || st.title || ""; const due = (document.getElementById("cmp-due") || {}).value || st.due || ""; const opts = ((document.getElementById("cmp-opts") || {}).value || st.opts || "").split("/").map((x) => x.trim()).filter(Boolean);
      if (kind === "text" || kind === "note") { if (!text) { window.toast("先写点什么"); return; } M().send({ thread: tid, from: me(), kind: kind === "note" ? "note" : "text", text, internal: kind === "note" }); }
      else { if (!title && !text) { window.toast("写一句要对方做什么"); return; } const to = v === "client" || v === "broker" ? "agent" : (t.kind === "broker" ? "broker" : "client"); /* 客户 / Broker 发的请求都是给经纪人的 */ M().send({ thread: tid, from: me(), kind: "request", text, request: { action: kind === "pick_time" ? "pick_time" : kind, to, title: title || text.slice(0, 40), due, options: opts.length ? opts : undefined } }); }
      drafts[tid] = ""; D().ui.comp = { tid, kind: "text" }; if (t.deal && window.audit) window.audit(t.deal, `消息 ${kind}（${v}）`); save(); rerender(); window.toast(kind === "note" ? "备注已记下（客户看不到）" : "已发送");
      setTimeout(() => { const box = document.getElementById("msgs"); if (box) box.scrollTop = box.scrollHeight; }, 0);
    };
    A["msg-decide"] = (el, arg) => { const [mid, cid, choice] = arg.split("|"); const D = window.DB; const nm = (D.contacts.find((c) => c.id === cid) || {}).name || cid; const r = M().decide(mid, cid, choice, nm); save(); rerender(); window.toast(!r ? "这张卡已经处理过了" : r.status === "blocked" ? r.why : r.status === "done" ? "已记录时间戳" : r.status === "discuss" ? "需要商量 → 已转给经纪人" : `${nm}已选，等另一位`); };
    A["msg-decide-reset"] = (el, mid) => { M().decideReset(mid); save(); rerender(); window.toast("已重新发给对方"); };
    // arg = 消息 id|结果（done / declined / discuss）|按钮上的字
    A["msg-req"] = (el, arg) => { const [mid, status, ans] = arg.split("|"); const m = me(); const r = M().answer(mid, { status, answer: ans, by: m.id, byName: m.name, role: viewer() }); save(); rerender(); window.toast(!r ? "这张卡已经处理过了" : r.blocked ? r.why : status === "done" ? "已处理，对方会看到" : status === "discuss" ? "已转给经纪人：想先商量" : "已答复"); };
    A["msg-later"] = () => { window.toast("好，先不传；这张卡还在，随时回来传"); };
    A["msg-req-answer"] = (el, mid) => {
      askText("你的回答", (ans) => { if (!ans.trim()) return; const m = me(); M().answer(mid, { status: "done", answer: ans.trim(), by: m.id, byName: m.name, role: viewer() }); save(); rerender(); window.toast("已回答"); });
    };
    A["msg-ai"] = (el, arg) => { const [tid, kind] = arg.split("|"); const t = M().thread(tid); if (!t) return; const text = M().aiDraft(kind, t); M().send({ thread: tid, from: { role: "ai", id: "ai", name: "AI 草稿" }, kind: "text", text, ai: { draft: true, tier: 2, why: { update: "按「阶段 + 下一步 + 截止」模板起草进度更新", reply: "针对客户最近一条消息起草回复；涉及合同条款的数字以文件为准", reminder: "按下一步截止起草提醒，并附请求卡", feedback: "汇总看房反馈" }[kind] || "" } }); save(); rerender(); window.toast("AI 起草好了：客户看不到，你放行才发出（T2）"); };
    A["msg-ai-approve"] = (el, mid) => { const m = M().messages().find((x) => x.id === mid); if (!m) return; delete m.ai.draft; m.ai.approvedBy = me().name; m.ai.approvedAt = M().now(); m.from = Object.assign({}, me()); m.at = M().now(); m.seq = Date.now(); m.seen = { agent: true }; m.upd = M().stamp(); const t = M().thread(m.thread); if (t) { t.lastAt = m.at; t.lastText = m.text; t.status = "waiting_client"; t.upd = M().stamp(); } if (window.audit && t && t.deal) window.audit(t.deal, `AI 草稿放行发出 ${mid}`); save(); rerender(); window.toast("已放行发出（写入审计）"); };
    A["msg-ai-edit"] = (el, mid) => { const ms = M().messages(); const i = ms.findIndex((x) => x.id === mid); if (i < 0) return; drafts[ms[i].thread] = ms[i].text; ms.splice(i, 1); save(); rerender(); };
    A["msg-ai-drop"] = (el, mid) => { const ms = M().messages(); const i = ms.findIndex((x) => x.id === mid); if (i >= 0) ms.splice(i, 1); save(); rerender(); window.toast("已丢弃草稿"); };
    A["msg-nudge"] = (el, tid) => { const r = M().nudge(tid, me()); save(); rerender(); window.toast(r.text); };
    A["msg-pin"] = (el, tid) => { const t = M().thread(tid); if (t) { t.pinned = !t.pinned; t.upd = M().stamp(); } save(); rerender(); };
    A["msg-close"] = (el, tid) => { const t = M().thread(tid); if (t) { t.status = t.status === "closed" ? "open" : "closed"; t.upd = M().stamp(); } save(); rerender(); };
    A["msg-filter"] = (el, k) => { D().ui.msgFilter = k; save(); rerender(); };
    A["msg-new"] = (el, arg) => { // kind|deal|contact
      const [kind, dealId, contactId] = arg.split("|"); const d = D(); const dl = d.deals.find((x) => x.id === dealId);
      const cid = kind === "client" ? (contactId || (dl ? dl.primary : null)) : null; // 问 Broker / 团队的对话不挂客户（不然会混进客户的往来和打电话前那张卡）
      const t = M().ensureThread({ kind, deal: dealId || null, contact: cid, members: cid ? [cid] : [], anchor: dealId ? { type: "deal", id: dealId } : { type: "none" }, subject: dl ? `${dl.title.split(" · ")[0]} · ${{ client: "客户对话", broker: "问 Broker", team: "团队" }[kind]}` : `${{ client: "客户对话", broker: "问 Broker", team: "团队" }[kind]}` });
      save(); window.nav(threadPath(t.id).replace(/^#\//, ""));
    };
    A["msg-contact"] = (el, cid) => { const d = D(); const ex = M().threads().find((x) => x.kind === "client" && x.contact === cid && !x.archived); if (ex) { window.nav(threadPath(ex.id).replace(/^#\//, "")); return; } const dl = d.deals.find((x) => x.primary === cid && !window.NBRoadmap.TERMINAL.includes(x.stage)) || d.deals.find((x) => x.primary === cid); const tr = (d.tours || []).find((x) => x.client === cid); const t = M().ensureThread({ kind: "client", deal: dl ? dl.id : null, contact: cid, members: [cid], anchor: dl ? { type: "deal", id: dl.id } : tr ? { type: "tour", id: tr.id } : { type: "none" }, subject: dl ? dl.title : (tr ? "看房路线" : "对话") }); save(); window.nav(threadPath(t.id).replace(/^#\//, "")); };
    A["msg-announce"] = () => { askText("发公告（全公司）", (subj, text) => { if (!subj || !text) { window.toast("标题和内容都要写"); return; } const t = { id: M().uid("th"), kind: "broker", deal: null, contact: null, members: [], anchor: { type: "org" }, subject: "公告：" + subj, status: "open", broadcast: true, lastAt: M().now(), lastText: text, created: M().now() }; M().threads().push(t); M().send({ thread: t.id, from: me(), kind: "text", text }); save(); window.nav(threadPath(t.id).replace(/^#\//, "")); }, [["ask-a", "公告标题", false], ["ask-b", "公告内容", true]]); };
  }

  // 打开一条线程时自动标已读（渲染后异步做，避免渲染里改数据）
  function autoRead(tid) { setTimeout(() => { const v = viewer(); if (!M().canOpen(M().thread(tid), v, whoId(v))) return; const n = M().markRead(tid, v, whoId(v)); if (n) { window.DBsave(); if (window.render) window.render(); } }, 60); }

  window.NBMsgUI = { viewer, me, bubble, reqCard, ctxCard, listItem, composer, threadView, KINDS, reg, autoRead, threadPath, drafts, fmtAt, askText };
  if (window.ACTIONS) reg(); else document.addEventListener("DOMContentLoaded", reg);
})();
