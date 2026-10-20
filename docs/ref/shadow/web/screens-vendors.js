/* Vendor 库（手册第 20 步）· Vendor 页 · 联系人 Vendor 卡 · 交易 Vendor tab · 关联 / 记一次 / 复制推荐
   规则：Vendor 仍是联系人（kind = vendor，或 vcats 非空）；类别可多个；每做一次事 = 一条合作记录（vjobs，挂交易，1–5 星）；
   Vendor 的星级 = 合作记录的平均，不单独打；推荐只复制纯文本，不自动发送，不含评价原文。 */
(function () {
  const A = window.ACTIONS;

  // ---------- 类别目录（真实版：packages/core/src/vendors/categories.ts）----------
  // [key, 中文名, English, 短名（只在筛选条用）]
  const VCATS = [
    ["交易", [["title", "Title 公司", "Title company", "Title"], ["lender", "贷款 Lender", "Lender", "Lender"], ["inspector", "验房师", "Inspector", "验房"], ["appraiser", "估价师", "Appraiser", "估价"], ["insurance", "房屋保险", "Insurance", "保险"], ["warranty", "房屋保修 Warranty", "Home warranty", "Warranty"], ["surveyor", "测量 Survey", "Surveyor", "Survey"], ["attorney", "律师", "Attorney", "律师"], ["cpa", "会计 CPA", "CPA", "CPA"], ["qi_1031", "1031 中介", "1031 QI", "1031"], ["mover", "搬家", "Mover", "搬家"]]],
    ["房屋维修", [["plumber", "水管工", "Plumber", "水管"], ["electrician", "电工", "Electrician", "电工"], ["hvac", "空调 HVAC", "HVAC", "HVAC"], ["roofer", "屋顶", "Roofer", "屋顶"], ["foundation", "地基", "Foundation", "地基"], ["handyman", "杂工 Handyman", "Handyman", "Handyman"], ["pest", "除虫", "Pest control", "除虫"], ["pool", "泳池", "Pool", "泳池"], ["landscaper", "园艺", "Landscaper", "园艺"], ["garage_door", "车库门", "Garage door", "车库门"], ["flooring", "地板", "Flooring", "地板"], ["painter", "油漆", "Painter", "油漆"], ["cleaner", "清洁", "Cleaner", "清洁"]]],
    ["上市准备", [["stager", "软装 Staging", "Stager", "Staging"], ["photographer", "摄影", "Photographer", "摄影"], ["junk", "清运", "Junk removal", "清运"], ["sign", "挂牌 / 牌子", "Sign install", "牌子"], ["locksmith", "锁匠", "Locksmith", "锁匠"]]],
    ["其他", [["property_manager", "物业管理", "Property manager", "物业"], ["contractor", "总包", "General contractor", "总包"]]],
  ];
  const CAT = {};
  VCATS.forEach(([g, list]) => list.forEach(([k, zh, en, short]) => { CAT[k] = { g, zh, en, short }; }));
  const catLabel = (k) => k.startsWith("x:") ? k.slice(2) : CAT[k] ? (DB.ui.lang === "en" ? CAT[k].en : CAT[k].zh) : k;
  const catShort = (k) => k.startsWith("x:") ? k.slice(2) : CAT[k] ? (DB.ui.lang === "en" ? CAT[k].en : CAT[k].short) : k;

  // ---------- 纯函数（真实版：packages/core/src/vendors/stats.ts）----------
  const vv = () => (DB.ui.vv = DB.ui.vv || { cats: [], mode: "or", q: "", sel: null });
  const jobsAll = () => (DB.vjobs = DB.vjobs || []).filter((j) => !j.deleted);
  const isVendor = (c) => c && (c.kind === "vendor" || (c.vcats || []).length > 0);
  const vendorsAll = () => DB.contacts.filter(isVendor);
  const jobsOf = (cid) => jobsAll().filter((j) => j.contact === cid).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  function vendorStats(cid) {
    const js = jobsOf(cid); const rated = js.filter((j) => j.rating);
    const avg = rated.length ? rated.reduce((s, j) => s + j.rating, 0) / rated.length : null;
    return { jobs: js.length, deals: new Set(js.filter((j) => j.deal).map((j) => j.deal)).size, avg, rated: rated.length, last: js[0] ? js[0].date : null, latest: js.find((j) => j.review) || null };
  }
  const company = (c) => (c.org && org(c.org) ? org(c.org).name : "");
  function filterVendors() {
    const st = vv(); const q = (st.q || "").toLowerCase();
    return vendorsAll().filter((c) => {
      const cs = c.vcats || [];
      if (st.cats.length) { if (st.mode === "and" ? !st.cats.every((k) => cs.includes(k)) : !st.cats.some((k) => cs.includes(k))) return false; }
      if (q) { const hay = [c.name, company(c), c.phone, ...cs.map(catLabel), ...cs.map(catShort)].join(" ").toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    }).map((c) => ({ c, s: vendorStats(c.id) })).sort((a, b) => (b.s.avg || 0) - (a.s.avg || 0) || b.s.jobs - a.s.jobs || (b.s.last || "").localeCompare(a.s.last || ""));
  }
  function recommendationText(ids) {
    const blocks = ids.map((id) => contact(id)).filter(Boolean).map((c) => {
      const s = vendorStats(c.id); const co = company(c);
      return [`${(c.vcats || []).map(catLabel).join(" / ")}${co ? " · " + co : ""}`, c.name, c.phone || "", s.avg ? `★${s.avg.toFixed(1)}（合作 ${s.jobs} 次）` : s.jobs ? `合作过 ${s.jobs} 次` : ""].filter(Boolean).join("\n");
    });
    return "推荐几位我合作过的服务商：\n\n" + blocks.join("\n\n");
  }
  const stars = (n, big) => `<span class="vstars${big ? " big" : ""}" title="${n ? n.toFixed ? n.toFixed(1) : n : "未评分"}">${[1, 2, 3, 4, 5].map((i) => `<i class="${n && i <= Math.round(n) ? "on" : ""}">★</i>`).join("")}</span>`;
  const BY = { me: "我", client: "客户", other: "其他人" };
  const catTags = (cs) => (cs || []).map((k) => `<span class="badge acc">${esc(catLabel(k))}</span>`).join(" ");
  function copyText(txt, msg) {
    const done = () => toast(msg || "已复制");
    try { navigator.clipboard.writeText(txt).then(done, () => fallback()); } catch (e) { fallback(); }
    function fallback() { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) { /* ignore */ } ta.remove(); done(); }
  }
  Object.assign(window, { VCATS, catLabel, catShort, vendorStats, recommendationText });

  // ================= Vendor 页 =================
  SCREENS.vendors = function () {
    const st = vv(); const sel = st.sel;
    const list = filterVendors();
    const counts = {}; vendorsAll().forEach((c) => (c.vcats || []).forEach((k) => { counts[k] = (counts[k] || 0) + 1; }));
    const custom = Object.keys(counts).filter((k) => !CAT[k]);
    const groups = VCATS.map(([g, ls]) => [g, ls.map((x) => x[0]).filter((k) => counts[k])]).concat(custom.length ? [["自定义", custom]] : []).filter(([, ks]) => ks.length);
    const acts = sel ? `<button class="btn pri" data-action="v-copysel">复制已选（${sel.length}）</button><button class="btn" data-action="v-selcancel">取消</button>`
      : `<button class="btn" data-action="v-selstart">复制推荐</button><button class="btn pri" data-action="v-new" data-arg="">＋ Vendor</button>`;
    return pageHeader(t("vendors"), "Vendor 还是联系人。类别可以多个；每做一次事记一条合作（挂在交易上，1–5 星），星级是这些记录的平均。", acts, "20a") +
      `<div class="row" style="margin-bottom:10px"><input placeholder="搜名字 / 公司 / 电话 / 类别" value="${esc(st.q)}" data-change="v-q" data-enter="v-q" style="max-width:260px"><div class="seg" title="多选类别时：OR = 任一类别；AND = 同时具备"><button class="${st.mode === "or" ? "on" : ""}" data-action="v-mode" data-arg="or">OR</button><button class="${st.mode === "and" ? "on" : ""}" data-action="v-mode" data-arg="and">AND</button></div>${st.cats.length ? `<button class="btn xs ghost" data-action="v-clearcats">清空类别</button>` : ""}</div>` +
      `<div class="vfilter">${groups.map(([g, ks]) => `<div class="vfg"><span class="vgl">${esc(g)}</span>${ks.map((k) => `<span class="chip ${st.cats.includes(k) ? "on" : ""}" data-action="v-cat" data-arg="${esc(k)}" title="${esc(catLabel(k))}">${esc(catShort(k))} <span class="tiny muted">${counts[k]}</span></span>`).join("")}</div>`).join("")}</div>` +
      (sel ? `<div class="note acc small" style="margin:10px 0">勾选要推荐的 Vendor，再点右上“复制已选”。复制的是纯文本（类别 · 公司 / 名字 / 手机 / 星级），不含评价原文。</div>` : "") +
      (list.length ? `<div class="vgrid">${list.map(({ c, s }) => venCard(c, s, sel)).join("")}</div>` : `<div class="empty">没有符合的 Vendor</div>`);
  };
  function venCard(c, s, sel) {
    const on = sel && sel.includes(c.id); const co = company(c);
    const main = sel ? `data-action="v-tog" data-arg="${c.id}"` : `data-action="nav" data-arg="contacts/${c.id}"`;
    return `<div class="vcard ${sel ? "selmode" : ""} ${on ? "on" : ""}" ${main}>${sel ? `<span class="vck">${on ? "✓" : ""}</span>` : ""}<div class="vbody">
      <div class="vl1">${catTags(c.vcats)}${co ? ` <span class="vco">${esc(co)}</span>` : ""}</div>
      <div class="vl2"><b>${esc(c.name)}</b>${s.avg ? ` ${stars(s.avg)} <span class="tiny muted">${s.avg.toFixed(1)}</span>` : ` <span class="tiny muted">未评分</span>`}</div>
      <div class="vl3">${c.phone ? `<button class="linkbtn" data-action="v-phone" data-arg="${esc(c.phone)}" title="点一下复制">${esc(c.phone)}</button> · ` : ""}合作 ${s.jobs} 次 · ${s.deals} 笔交易</div>
      ${s.latest ? `<div class="vl4">${stars(s.latest.rating)} “${esc(s.latest.review)}” <span class="muted">— ${esc(s.latest.by === "me" ? "我" : s.latest.byName || BY[s.latest.by])} · ${fd(s.latest.date)}</span></div>` : ""}
    </div></div>`;
  }
  A["v-q"] = (el) => { vv().q = el.value; DBsave(); render(); };
  A["v-mode"] = (el, arg) => { vv().mode = arg; DBsave(); render(); };
  A["v-cat"] = (el, k) => { const st = vv(); st.cats = st.cats.includes(k) ? st.cats.filter((x) => x !== k) : st.cats.concat(k); DBsave(); render(); };
  A["v-clearcats"] = () => { vv().cats = []; DBsave(); render(); };
  A["v-phone"] = (el, ph, e) => { e.stopPropagation(); copyText(ph, "电话已复制：" + ph); };
  A["v-selstart"] = () => { vv().sel = []; DBsave(); render(); };
  A["v-selcancel"] = () => { vv().sel = null; DBsave(); render(); };
  A["v-tog"] = (el, id) => { const st = vv(); st.sel = st.sel.includes(id) ? st.sel.filter((x) => x !== id) : st.sel.concat(id); DBsave(); render(); };
  A["v-copysel"] = () => { const st = vv(); if (!st.sel.length) return toast("先勾选至少一个 Vendor"); const n = st.sel.length; copyText(recommendationText(st.sel), `已复制 ${n} 位 Vendor 的推荐`); st.sel = null; DBsave(); render(); };

  // ================= 联系人详情 · Vendor 卡 =================
  const origContacts = SCREENS.contacts;
  SCREENS.contacts = function (segs) {
    const html = origContacts(segs);
    const c = segs[0] ? contact(segs[0]) : null;
    return isVendor(c) || (c && jobsOf(c.id).length) ? html + vendorContactCard(c) : html;
  };
  function jobRow(j, showDeal) {
    const d = j.deal ? deal(j.deal) : null;
    return `<div class="li"><div class="body"><div class="t small">${fd(j.date)} ${showDeal ? (d ? `· <a href="#/deals/${d.id}/vendors">${esc(d.title)}</a>` : "· 没挂交易") : ""} ${catTags(j.cats)}</div><div class="d">${j.rating ? stars(j.rating) : '<span class="muted">未评分</span>'} ${esc(j.what || "")}${j.cost ? " · " + money(j.cost) : ""}${j.review ? ` · “${esc(j.review)}”` : ""}${j.review || j.rating ? ` <span class="muted">— ${esc(j.by === "me" ? "我" : j.byName || BY[j.by])}</span>` : ""}</div></div><div class="acts"><button class="btn xs" data-action="v-job" data-arg="${j.contact}|${j.deal || ""}|${j.id}">改</button><button class="btn xs ghost" data-action="v-jdel" data-arg="${j.id}">删</button></div></div>`;
  }
  function vendorContactCard(c) {
    const s = vendorStats(c.id); const js = jobsOf(c.id);
    return `<div class="card" style="margin-top:14px"><div class="hd"><h3>Vendor</h3>${coverBadge("20a")}<span class="sp"></span>${s.avg ? `${stars(s.avg, true)} <b>${s.avg.toFixed(1)}</b> <span class="small muted">（${s.rated} 条评分）</span>` : `<span class="small muted">还没有评分</span>`}</div>
      <div class="row" style="margin-bottom:8px">${catTags(c.vcats) || '<span class="small muted">还没有类别</span>'}<button class="btn xs" data-action="v-cats" data-arg="${c.id}">改类别</button><span class="sp"></span><span class="small muted">合作 ${s.jobs} 次 · ${s.deals} 笔交易</span><button class="btn sm pri" data-action="v-job" data-arg="${c.id}||">＋ 记一次</button></div>
      ${js.length ? `<div class="list">${js.map((j) => jobRow(j, true)).join("")}</div>` : `<div class="empty small">还没有合作记录。在交易的 Vendor tab 里关联他，或点“记一次”。</div>`}
      <div class="note small" style="margin-top:8px">评价是你的私人笔记，客户视图看不到。RESPA：不记录、不计算任何 Vendor 回扣或推荐费。</div></div>`;
  }
  window.vendorContactCard = vendorContactCard;

  // ================= 交易详情 · Vendor tab =================
  window.vendorDealTab = function (d) {
    const js = jobsAll().filter((j) => j.deal === d.id);
    const ids = [...new Set(js.map((j) => j.contact))];
    return `<div class="row" style="margin-bottom:10px">${coverBadge("20a")}<span class="small muted">这笔交易里请过的 Vendor：每做一次事记一条（类别 · 日期 · 费用 · 1–5 星 · 评价）。关联时同时加进 各方 → 中立。</span><span class="sp"></span><button class="btn sm pri" data-action="v-pick" data-arg="${d.id}">＋ 关联 Vendor</button></div>` +
      (ids.length ? `<div class="grid2">${ids.map((cid) => { const c = contact(cid); if (!c) return ""; const mine = js.filter((j) => j.contact === cid).sort((a, b) => (b.date || "").localeCompare(a.date || "")); const s = vendorStats(cid); const co = company(c);
        return `<div class="card"><div class="hd"><div><div>${catTags(c.vcats)}${co ? ` <span class="vco">${esc(co)}</span>` : ""}</div><h3 style="margin-top:4px"><a href="#/contacts/${c.id}">${esc(c.name)}</a> ${s.avg ? stars(s.avg) : ""}</h3><div class="small muted">${c.phone ? `<button class="linkbtn" data-action="v-phone" data-arg="${esc(c.phone)}">${esc(c.phone)}</button> · ` : ""}总共合作 ${s.jobs} 次 · ${s.deals} 笔交易</div></div></div>
          <div class="list">${mine.map((j) => jobRow(j, false)).join("")}</div>
          <div class="row" style="margin-top:8px"><button class="btn xs" data-action="v-job" data-arg="${cid}|${d.id}|">再记一次</button><button class="btn xs ghost" data-action="v-unlink" data-arg="${cid}|${d.id}">从本交易移除</button></div></div>`; }).join("")}</div>`
        : `<div class="empty">这笔交易还没有关联 Vendor。点“＋ 关联 Vendor”，从 Vendor 库里挑，或现场新建一个。</div>`);
  };

  // ---- 关联 Vendor：选择框（搜索 + 类别筛选 + 新 Vendor）----
  let pick = { deal: null, q: "", cat: "" };
  function pickList() {
    const q = pick.q.toLowerCase();
    const linked = new Set(jobsAll().filter((j) => j.deal === pick.deal).map((j) => j.contact));
    const ls = vendorsAll().filter((c) => (!pick.cat || (c.vcats || []).includes(pick.cat)) && (!q || [c.name, company(c), c.phone, ...(c.vcats || []).map(catLabel)].join(" ").toLowerCase().includes(q)))
      .map((c) => ({ c, s: vendorStats(c.id) })).sort((a, b) => (b.s.avg || 0) - (a.s.avg || 0) || b.s.jobs - a.s.jobs);
    return ls.length ? ls.map(({ c, s }) => `<div class="li"><div class="body"><div class="t small">${esc(c.name)} ${company(c) ? `<span class="muted">· ${esc(company(c))}</span>` : ""} ${linked.has(c.id) ? '<span class="badge ok">已关联</span>' : ""}</div><div class="d">${catTags(c.vcats)} ${s.avg ? stars(s.avg) : ""} 合作 ${s.jobs} 次</div></div><div class="acts"><button class="btn xs pri" data-action="v-pickgo" data-arg="${c.id}">选</button></div></div>`).join("")
      : `<div class="empty small">没找到。<button class="btn xs" data-action="v-new" data-arg="${pick.deal}">＋ 新 Vendor</button></div>`;
  }
  function catOptions(selected) {
    return `<option value="">全部类别</option>` + VCATS.map(([g, ls]) => `<optgroup label="${esc(g)}">${ls.map(([k]) => `<option value="${k}" ${selected === k ? "selected" : ""}>${esc(catLabel(k))}</option>`).join("")}</optgroup>`).join("");
  }
  A["v-pick"] = (el, dealId) => {
    pick = { deal: dealId, q: "", cat: "" };
    openModal(`<h2>关联 Vendor</h2><p class="small muted">${esc(deal(dealId).title)} · 选一个 Vendor，然后记这次做了什么。</p><div class="row"><input id="vp-q" placeholder="搜名字 / 公司 / 电话" data-input="v-pickq" style="flex:1;min-width:160px"><select id="vp-cat" data-change="v-pickcat">${catOptions("")}</select></div><div class="list" id="vp-list" style="margin-top:8px;max-height:46vh;overflow:auto">${pickList()}</div><div class="acts"><button class="btn" data-action="v-new" data-arg="${dealId}">＋ 新 Vendor</button><span class="sp"></span><button class="btn" data-action="modal-close">取消</button></div>`);
    setTimeout(() => { const i = document.getElementById("vp-q"); if (i) i.focus(); }, 30);
  };
  A["v-pickq"] = (el) => { pick.q = el.value; document.getElementById("vp-list").innerHTML = pickList(); };
  A["v-pickcat"] = (el) => { pick.cat = el.value; document.getElementById("vp-list").innerHTML = pickList(); };
  A["v-pickgo"] = (el, cid) => { A["v-job"](el, `${cid}|${pick.deal}|`); };
  document.addEventListener("input", (e) => { const el = e.target.closest("[data-input]"); if (!el) return; const fn = A[el.getAttribute("data-input")]; if (fn) fn(el, el.getAttribute("data-arg"), e); });

  // ---- 类别多选（下拉里带 checkbox）----
  function catMulti(id, selected) {
    const sel = selected || [];
    const summary = sel.length ? sel.map(catLabel).join("、") : "选类别（可多选）";
    const extra = sel.filter((k) => !CAT[k]);
    return `<details class="msel" id="${id}"><summary>${esc(summary)}</summary><div class="mselpop">${VCATS.map(([g, ls]) => `<div class="vgl">${esc(g)}</div>${ls.map(([k]) => `<label class="mck"><input type="checkbox" value="${k}" ${sel.includes(k) ? "checked" : ""} data-change="v-msum" data-arg="${id}"> ${esc(catLabel(k))}</label>`).join("")}`).join("")}${extra.map((k) => `<label class="mck"><input type="checkbox" value="${esc(k)}" checked data-change="v-msum" data-arg="${id}"> ${esc(catLabel(k))}</label>`).join("")}<div class="row" style="margin-top:6px"><input placeholder="自定义类别" id="${id}-x" style="flex:1"><button type="button" class="btn xs" data-action="v-mx" data-arg="${id}">加</button></div></div></details>`;
  }
  const readMulti = (id) => [...document.querySelectorAll(`#${id} input[type=checkbox]:checked`)].map((i) => i.value);
  A["v-msum"] = (el, id) => { const ks = readMulti(id); document.querySelector(`#${id} summary`).textContent = ks.length ? ks.map(catLabel).join("、") : "选类别（可多选）"; };
  A["v-mx"] = (el, id) => { const inp = document.getElementById(id + "-x"); const v = (inp.value || "").trim(); if (!v) return; const k = "x:" + v; const lab = document.createElement("label"); lab.className = "mck"; lab.innerHTML = `<input type="checkbox" value="${esc(k)}" checked data-change="v-msum" data-arg="${id}"> ${esc(v)}`; inp.parentElement.before(lab); inp.value = ""; A["v-msum"](null, id); };

  // ---- 新 Vendor ----
  A["v-new"] = (el, dealId) => {
    openModal(`<h2>新 Vendor</h2><p class="small muted">建成联系人（kind = vendor）；公司没有就一起建成机构。同名同电话的已有联系人会提示合并。</p><div class="fgrid"><label>名字<input id="vn-name" placeholder="Mike Chen"></label><label>公司<input id="vn-co" placeholder="Demo Plumbing" list="vn-orgs"></label><datalist id="vn-orgs">${DB.orgs.filter((o) => ["vendor", "title", "lender"].includes(o.kind)).map((o) => `<option value="${esc(o.name)}">`).join("")}</datalist><label>手机（首选）<input id="vn-phone" placeholder="469-000-0000"></label><label>类别${catMulti("vn-cats", [])}</label></div><div class="acts"><button class="btn" data-action="modal-close">取消</button><button class="btn pri" data-action="v-newok" data-arg="${dealId || ""}">${dealId ? "建好并记一次" : "建好"}</button></div>`);
  };
  A["v-newok"] = (el, dealId) => {
    const name = document.getElementById("vn-name").value.trim(); if (!name) return toast("名字必填");
    const phone = document.getElementById("vn-phone").value.trim(); const coName = document.getElementById("vn-co").value.trim();
    const dup = DB.contacts.find((c) => c.name.toLowerCase() === name.toLowerCase() || (phone && c.phone === phone));
    if (dup) toast(`已有 ${dup.name}（同名或同电话）· 真实版会让你选合并还是新建`);
    let oid = null;
    if (coName) { const o = DB.orgs.find((x) => x.name.toLowerCase() === coName.toLowerCase()); if (o) oid = o.id; else { oid = "o" + Date.now(); DB.orgs.push({ id: oid, name: coName, kind: "vendor" }); } }
    const cid = "c" + Date.now();
    DB.contacts.push({ id: cid, name, kind: "vendor", tags: [], vcats: readMulti("vn-cats"), phone, org: oid, lang: "en", channel: "电话", source: "手动" });
    DBsave();
    if (dealId) A["v-job"](el, `${cid}|${dealId}|`); else { closeModal(); toast(`${name} 已加进 Vendor 库`); nav("contacts/" + cid); }
  };

  // ---- 改类别 ----
  A["v-cats"] = (el, cid) => { const c = contact(cid); openModal(`<h2>${esc(c.name)} 的类别</h2><p class="small muted">一个 Vendor 可以属于多个类别。</p>${catMulti("vc-cats", c.vcats || [])}<div class="acts"><button class="btn" data-action="modal-close">取消</button><button class="btn pri" data-action="v-catsok" data-arg="${cid}">保存</button></div>`); const d = document.getElementById("vc-cats"); if (d) d.open = true; };
  A["v-catsok"] = (el, cid) => { const c = contact(cid); c.vcats = readMulti("vc-cats"); if (c.vcats.length && !["client", "agent", "tc", "title_lending"].includes(c.kind)) c.kind = "vendor"; closeModal(); DBsave(); toast("类别已保存"); render(); };

  // ---- 记一次 / 改一次 ----
  A["v-job"] = (el, arg) => {
    const [cid, dealId, jid] = arg.split("|");
    const c = contact(cid); const j = jid ? (DB.vjobs || []).find((x) => x.id === jid) : null;
    const cur = j || { cats: (c.vcats || []).slice(0, 1), date: TODAY(), rating: null, by: "me" };
    const dsel = dealId || (j && j.deal) || "";
    const dealField = dealId ? `<div class="small"><b>交易</b>：${esc(deal(dealId).title)}</div>` : `<label>交易<select id="vj-deal"><option value="">（不挂交易）</option>${DB.deals.map((d) => `<option value="${d.id}" ${dsel === d.id ? "selected" : ""}>${esc(d.title)}</option>`).join("")}</select></label>`;
    openModal(`<h2>${j ? "改这次合作" : "记一次"} · ${esc(c.name)}</h2><p class="small muted">每做一次事记一条；Vendor 的星级 = 这些记录的平均。</p><div class="fgrid">${dealField}<label>类别${catMulti("vj-cats", cur.cats)}</label><label>日期<input type="date" id="vj-date" value="${esc(cur.date || "")}"></label><label>费用（可空）<input id="vj-cost" inputmode="decimal" value="${cur.cost == null ? "" : cur.cost}" placeholder="$"></label><label class="full">做了什么<input id="vj-what" value="${esc(cur.what || "")}" placeholder="例：option 期修漏水"></label>
      <div class="full"><div class="small" style="margin-bottom:4px">评分（再点一次同一颗星 = 清空）</div><span class="vstars big pick" id="vj-stars" data-v="${cur.rating || ""}">${[1, 2, 3, 4, 5].map((i) => `<i class="${cur.rating && i <= cur.rating ? "on" : ""}" data-action="v-star" data-arg="${i}">★</i>`).join("")}</span></div>
      <label class="full">评价<textarea id="vj-review" rows="2" placeholder="只有你看得到">${esc(cur.review || "")}</textarea></label><label>评价来自<select id="vj-by">${Object.entries(BY).map(([k, l]) => `<option value="${k}" ${cur.by === k ? "selected" : ""}>${l}</option>`).join("")}</select></label><label>谁说的（可空）<input id="vj-byname" value="${esc(cur.byName || "")}" placeholder="例：张先生"></label></div>
      <div class="acts"><button class="btn" data-action="modal-close">取消</button><button class="btn pri" data-action="v-jobok" data-arg="${cid}|${dealId || ""}|${jid || ""}">保存</button></div>`);
  };
  A["v-star"] = (el, n) => { const box = document.getElementById("vj-stars"); const v = Number(box.getAttribute("data-v") || 0) === Number(n) ? 0 : Number(n); box.setAttribute("data-v", v || ""); [...box.children].forEach((i, k) => i.classList.toggle("on", k < v)); };
  A["v-jobok"] = (el, arg) => {
    const [cid, dealArg, jid] = arg.split("|");
    const c = contact(cid);
    const dealId = dealArg || (document.getElementById("vj-deal") ? document.getElementById("vj-deal").value : "") || null;
    const cats = readMulti("vj-cats"); if (!cats.length) return toast("至少选一个类别");
    const costRaw = document.getElementById("vj-cost").value.replace(/[$,\s]/g, "");
    const rec = { contact: cid, deal: dealId, cats, date: document.getElementById("vj-date").value || null, what: document.getElementById("vj-what").value.trim(), cost: costRaw ? Number(costRaw) : null, rating: Number(document.getElementById("vj-stars").getAttribute("data-v")) || null, review: document.getElementById("vj-review").value.trim(), by: document.getElementById("vj-by").value, byName: document.getElementById("vj-byname").value.trim() };
    DB.vjobs = DB.vjobs || [];
    if (jid) Object.assign(DB.vjobs.find((x) => x.id === jid), rec); else DB.vjobs.unshift(Object.assign({ id: "j" + Date.now() }, rec));
    const added = cats.filter((k) => !(c.vcats || []).includes(k));
    if (added.length) c.vcats = (c.vcats || []).concat(added);
    if (c.kind !== "vendor" && !["client", "agent", "tc", "title_lending", "family"].includes(c.kind)) c.kind = "vendor";
    if (dealId && !DB.parties.some((p) => p.deal === dealId && p.party === cid)) DB.parties.push({ deal: dealId, party: cid, type: "person", role: cats.map(catLabel).join(" / "), side: "neutral" });
    if (dealId) audit(dealId, `Vendor ${c.name}：${jid ? "改" : "记"}一次合作（${cats.map(catLabel).join("、")}${rec.rating ? " · " + rec.rating + " 星" : ""}）`);
    closeModal(); DBsave(); toast(`已记下${added.length ? "，类别自动加上：" + added.map(catLabel).join("、") : ""}`); render();
  };
  A["v-jdel"] = (el, jid) => { const j = DB.vjobs.find((x) => x.id === jid); j.deleted = true; DBsave(); toast("已删除这条合作（软删，真实版可恢复）"); render(); };
  A["v-unlink"] = (el, arg) => {
    const [cid, dealId] = arg.split("|"); const c = contact(cid);
    if (!confirm(`把 ${c.name} 从这笔交易移除？这笔交易里他的合作记录会一起删掉（软删）。`)) return;
    DB.vjobs.filter((j) => j.contact === cid && j.deal === dealId).forEach((j) => { j.deleted = true; });
    DB.parties = DB.parties.filter((p) => !(p.deal === dealId && p.party === cid && p.side === "neutral"));
    audit(dealId, `Vendor ${c.name} 从本交易移除`); DBsave(); toast("已移除"); render();
  };

  // ================= 迁移页：Wise Agent Vendor List =================
  const origImporter = SCREENS.importer;
  SCREENS.importer = function (segs, r) {
    const st = DB.ui.vimp || {};
    return origImporter(segs, r) + `<div class="card" style="margin-top:14px"><div class="hd"><h3>Wise Agent Vendor List</h3>${coverBadge("20a")}</div><div class="grid2"><div class="small"><ol style="padding-left:1.2em;margin:0"><li>PDF 或 CSV：公司、名字、类别、手机、邮箱、地址、网址</li><li>→ 联系人 kind = vendor + 公司（机构）；类别按目录映射，映射不上的进“自定义”</li><li>同名 / 同电话的已有联系人 → 合并建议</li><li>按地址把 Vendor 和过去的交易对一遍 → “在这笔交易干过活”的提议，你确认才写合作记录（不带评分）</li></ol></div>
      <div>${st.done ? `<div class="grid2"><div class="stat ok"><div class="l">Vendor</div><div class="v">12</div><div class="s">3 个已有 → 合并</div></div><div class="stat warn"><div class="l">合作提议</div><div class="v">30</div><div class="s">按地址对上的过去交易</div></div></div><div class="list" style="margin-top:8px">${[["Sample Home Warranty", "910 Example Ct", "房屋保修 Warranty"], ["Demo Plumbing", "910 Example Ct", "水管工"], ["Sample Roofing", "5678 Demo Ln", "屋顶"]].map(([v, a, k]) => `<div class="li"><div class="body"><div class="t small">${v} → ${a}</div><div class="d">${k} · 依据：邮件和文件里的地址</div></div><div class="acts"><button class="btn xs pri" data-action="toast" data-arg="已记为合作（影子）">确认</button><button class="btn xs ghost" data-action="toast" data-arg="已跳过">跳过</button></div></div>`).join("")}</div>`
        : `<button class="btn" data-action="v-imp">上传 Vendor List（影子：点一下模拟）</button><div class="small muted" style="margin-top:6px">地址对不上或有歧义的（同公司不同业务线、只有询价没做成的）不生成提议。</div>`}</div></div></div>`;
  };
  A["v-imp"] = () => { DB.ui.vimp = { done: true }; DBsave(); toast("Vendor List 导入完成（示例数字）"); render(); };
})();
