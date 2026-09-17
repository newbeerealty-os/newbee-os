"use client";
// 所见即所得的翻译编辑器：每个页面一个"复刻"，复刻里的每段文字都是 <T k> —— 点中弹出中 / 英两个框，Enter 保存、Esc 取消。
// 复刻是 (T) => JSX 的纯函数：用"收集器"跑一遍就知道哪些 key 被放进了页面，没放的自动进"其他"页签。
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MESSAGES, sceneOf, type Locale } from "@newbee/core";
import { saveUiString, resetUiString } from "@/lib/actions/ui-strings";
import { StageDot } from "@/components/stage";
import { ChannelIcon } from "@/components/channel-icon";

export type Overrides = Record<string, { zh?: string | null; en?: string | null }>;
type Vars = Record<string, string | number>;
type TFn = (k: string, vars?: Vars) => React.ReactNode;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);
const DEAL_STAGES = ["lead", "pre", "active", "offer", "under_contract", "closing", "closed", "terminated"];

// ---------- 页面复刻（只读展示，文字全部走 T） ----------
const W = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-ui border border-line bg-surface ${className}`}>{children}</div>;
const Card = ({ title, right, children }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) => (
  <W><div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm font-semibold">{title}<span className="text-sm text-muted">{right}</span></div><div className="p-3 text-sm">{children}</div></W>
);
const Btn = ({ children, ghost }: { children: React.ReactNode; ghost?: boolean }) => <span className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium ${ghost ? "border border-line-strong text-fg" : "bg-accent text-accent-ink"}`}>{children}</span>;
const Chip = ({ children, tone = "" }: { children: React.ReactNode; tone?: "" | "warn" | "bad" | "ok" | "info" }) => <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${tone === "warn" ? "bg-warn-bg text-warn" : tone === "bad" ? "bg-danger-bg text-danger" : tone === "ok" ? "bg-ok-bg text-ok" : tone === "info" ? "bg-info-bg text-info" : "bg-chip text-fg"}`}>{children}</span>;
const Input = ({ children }: { children: React.ReactNode }) => <span className="flex h-8 items-center rounded-md border border-line-strong bg-surface px-2 text-xs text-muted">{children}</span>;
const Tabs = ({ items }: { items: React.ReactNode[] }) => <div className="flex gap-1 border-b border-line">{items.map((x, i) => <span key={i} className={`border-b-2 px-2.5 py-1.5 text-xs font-medium ${i === 0 ? "border-accent text-accent" : "border-transparent text-muted"}`}>{x}</span>)}</div>;
const Hidden = ({ title, items }: { title: React.ReactNode; items: React.ReactNode[] }) => items.length ? <div className="rounded-ui border border-dashed border-line-strong p-3 text-xs text-muted"><div className="mb-1 font-medium">{title}</div><div className="flex flex-wrap gap-x-4 gap-y-1">{items.map((x, i) => <span key={i}>{x}</span>)}</div></div> : null;
const Side = ({ T, active }: { T: TFn; active: string }) => (
  <div className="flex w-40 shrink-0 flex-col gap-0.5 rounded-ui bg-side p-2 text-side-text">
    <div className="px-2 pb-2 text-sm font-semibold">New<span className="text-accent">Bee</span> OS</div>
    {[["today", "◐"], ["deals", "▤"], ["contacts", "◉"], ["tasks", "☑"], ["settings", "⚙"]].map(([k, ic]) => <div key={k} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${k === active ? "bg-side-active text-side-active-text" : ""}`}><span className="w-3 text-side-muted">{ic}</span>{T(`nav.${k}`)}</div>)}
    <div className="mt-2 flex items-center gap-1 px-1 text-[11px] text-side-muted"><span className="rounded bg-side-active px-1.5 py-0.5 text-side-active-text">{T("locale.zh")}</span><span className="px-1.5">{T("locale.en")}</span></div>
  </div>
);

const REPLICAS: Record<string, (T: TFn, hidden: string) => React.ReactNode> = {
  nav: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3"><Side T={T} active="deals" /><div className="flex-1 rounded-ui border border-dashed border-line p-3 text-xs text-muted">{T("nav.all")} · {T("nav.personal")} · {T("settings.langTheme")}</div></div>
      <Hidden title={h} items={[T("nav.collapse"), T("nav.expand"), T("nav.toggleGroup"), T("meta.description")]} />
    </div>
  ),
  today: (T, h) => (
    <div className="flex gap-3"><Side T={T} active="today" /><div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-baseline justify-between"><b className="text-base">{T("today.title")} · 2026-09-17</b><span className="text-xs text-muted">{T("today.summary", { ms: 2, tasks: 5 })}</span></div>
      <Tabs items={[T("today.all"), T("today.overdue"), T("today.today"), T("today.next7")]} />
      <Card title={T("today.overdue")} right="0"><div className="py-3 text-center text-muted">{T("today.noOverdue")}</div></Card>
      <Card title={T("today.next7")} right="3">
        <div className="flex items-center justify-between py-1"><span>◆ {T("ms.option_period_end")} <span className="text-xs text-accent">{T("common.deal")}</span></span><Chip tone="warn">09-19 · {T("rel.inDays", { n: 2 })}</Chip></div>
        <div className="flex items-center justify-between py-1"><span>◆ {T("ms.title_commitment_due")}</span><Chip>09-29 · {T("rel.tomorrow")}</Chip></div>
        <div className="flex items-center justify-between py-1"><span>☐ {T("task.uc-03")}</span><Chip tone="bad">09-15 · {T("rel.overdue", { n: 2 })}</Chip></div>
        <div className="flex items-center justify-between py-1"><span>☐ {T("task.uc-06")}</span><Chip tone="warn">{T("rel.today")}</Chip></div>
        <div className="flex items-center justify-between py-1"><span>☐ {T("task.cl-02")}</span><Chip>{T("rel.tbd")}</Chip></div>
      </Card>
      <Hidden title={h} items={[T("common.markDone"), T("common.markUndone"), T("common.empty")]} />
    </div></div>
  ),
  deals: (T, h) => (
    <div className="flex gap-3"><Side T={T} active="deals" /><div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">{T("deals.title")} · {T("deals.stageAll")}</b><span className="text-xs text-accent">{T("nav.deals")}</span><span className="flex-1" /><Input>{T("deals.search")}</Input><Btn ghost>{T("common.search")}</Btn><Btn>{T("deals.new")}</Btn></div>
      <div className="flex gap-2 text-xs"><Input>{T("deals.titlePlaceholder")}</Input><Btn>{T("deals.create")}</Btn><span className="text-muted">{T("common.searchAll")}</span></div>
      <div className="grid grid-cols-4 gap-2">{[["deals.stat.count", "2"], ["deals.stat.week", "4"], ["deals.stat.overdue", "1"], ["deals.stat.open", "63"]].map(([k, v]) => <W key={k} className="px-3 py-2"><div className="text-xs text-muted">{T(k)}</div><div className="text-lg font-semibold">{v}</div></W>)}</div>
      <Card title={<>{T("deals.title")} · {T("deals.stageAll")}</>} right="2">
        <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.3fr_.5fr] gap-2 border-b border-line pb-1 text-[11px] font-semibold text-muted"><span>{T("deals.col.deal")}</span><span>{T("deals.col.stage")} / {T("deals.col.type")}</span><span>{T("deals.col.next")}</span><span>{T("deals.col.date")}</span><span>{T("deals.col.open")}</span></div>
        <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.3fr_.5fr] items-center gap-2 border-b border-line py-2"><b>1234 Sample pl</b><span className="flex gap-1"><Chip>{T("type.seller")}</Chip><Chip><StageDot stage="under_contract" /> {T("stage.under_contract")}</Chip></span><span>{T("ms.option_period_end")}</span><Chip tone="warn">09-19 · {T("rel.inDays", { n: 2 })}</Chip><span>12</span></div>
        <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.3fr_.5fr] items-center gap-2 py-2"><b>88 Harbor Ln</b><span className="flex gap-1"><Chip>{T("type.buyer")}</Chip><Chip><StageDot stage="closing" /> {T("stage.closing")}</Chip></span><span className="text-muted">{T("deals.noNext")}</span><span className="text-xs text-muted">{T("deals.openTasks", { n: 7 })}</span><span>7</span></div>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">{DEAL_STAGES.map((s) => <Chip key={s}><StageDot stage={s} /> {T(`stage.${s}`)}</Chip>)}</div>
        <div className="mt-1 flex flex-wrap gap-1 text-xs">{["seller", "buyer", "lease_listing", "lease_tenant", "property_mgmt"].map((s) => <Chip key={s}>{T(`type.${s}`)}</Chip>)}</div>
      </Card>
      <Hidden title={h} items={[T("deals.none"), T("deals.noneInStage"), T("common.noMatch"), T("deals.next")]} />
    </div></div>
  ),
  deal: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">1234 Sample pl <span className="font-normal text-muted">· {T("type.seller")}</span></b><Chip><StageDot stage="under_contract" /> {T("stage.under_contract")}</Chip><span className="flex-1" /><Input>{T("stage.offer")}</Input><Btn ghost>{T("deal.changeStage")}</Btn><Btn>{T("deal.derive")}</Btn></div>
      <Tabs items={[T("tab.overview"), T("deal.tab.parties"), T("deal.files"), T("deal.pending"), T("deal.fields"), T("deal.milestones"), T("deal.tab.tasks")]} />
      <div className="grid grid-cols-4 gap-2">{[["deal.stat.price", "$450,000"], ["deal.stat.option", "09-19"], ["deal.stat.closing", "11-30"], ["deal.stat.open", "12 / 63"]].map(([k, v]) => <W key={k} className="px-3 py-2"><div className="text-xs text-muted">{T(k)}</div><div className="text-lg font-semibold">{v}</div></W>)}</div>
      <Card title={T("deal.next3")} right="0"><div className="py-2 text-center text-muted">{T("deal.nothingNext")}</div></Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title={T("deal.files")} right={<Btn>{T("deal.uploadPdf")}</Btn>}>
          <div className="text-center text-muted">{T("deal.uploadHint")}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1">{["uploaded", "extracting", "review", "confirmed", "failed"].map((s) => <Chip key={s} tone={s === "failed" ? "bad" : s === "review" ? "warn" : s === "confirmed" ? "ok" : s === "extracting" ? "info" : ""}>{T(`docStatus.${s}`)}</Chip>)}<span className="text-xs text-muted">{T("common.pages", { n: 13 })}</span></div>
          <div className="mt-2 flex gap-1"><Btn ghost>{T("deal.extract")}</Btn><Btn ghost>{T("deal.retryExtract")}</Btn></div>
        </Card>
        <Card title={T("deal.pending")} right={<Chip tone="warn">{T("deal.pendingHint")}</Chip>}>
          <div className="flex justify-between"><b>{T("field.closing_date")}</b><span className="text-xs text-muted">{T("deal.page", { n: 9 })} · {T("deal.confidence", { n: 92 })}</span></div>
          <div className="mt-2 flex gap-1"><Input>2026-11-30</Input><Btn>{T("deal.confirm")}</Btn><Btn ghost>{T("deal.reject")}</Btn></div>
          <div className="mt-2 text-center text-muted">{T("deal.noPending")}</div>
        </Card>
        <Card title={T("deal.fields")} right={<Btn>{T("deal.derive")}</Btn>}>
          <div className="grid grid-cols-2 gap-2 text-xs">{["parties", "money", "dates", "property", "addenda", "commission", "lease"].map((g) => <div key={g} className="font-mono uppercase tracking-wide text-accent">{T(`group.${g}`)}</div>)}</div>
          <div className="mt-2 flex gap-1"><Input>{T("field.effective_date")}</Input><Input>{T("deal.valuePlaceholder")}</Input><Btn ghost>{T("deal.manualWrite")}</Btn></div>
          <div className="mt-1 text-xs text-muted">{T("deal.addendaHint", { list: "hoa_addendum · financing_addendum" })}</div>
          <div className="mt-1 text-center text-muted">{T("deal.noFields")}</div>
        </Card>
        <Card title={T("deal.milestones")} right="8">
          <div className="flex justify-between py-1"><span>{T("ms.closing")} <span className="text-xs text-muted">{T("common.internal")}</span></span><Chip>{T("deal.missingAnchor")}</Chip></div>
          <div className="text-center text-muted">{T("deal.noMilestones")}</div>
        </Card>
        <Card title={T("deal.tasks", { open: 12, total: 63 })}>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono uppercase text-muted">{["pre_listing", "listing_appt", "post_listing", "offers", "under_contract", "closing", "after_closing"].map((s) => <span key={s}>{T(`playbookStage.${s}`)}</span>)}<span>{T("deal.otherStage")}</span></div>
          <div className="mt-1 text-center text-muted">{T("deal.noTasks")}</div>
        </Card>
        <Card title={T("deal.tab.parties")} right={<Btn>{T("parties.add")}</Btn>}>
          <div className="flex flex-wrap gap-2 text-xs">{["ours", "theirs", "neutral"].map((s) => <span key={s} className="font-mono uppercase text-muted">{T(`partySide.${s}`)}</span>)}</div>
          <div className="mt-2 grid grid-cols-[1.4fr_1fr_1fr_auto] gap-1 text-xs text-muted"><span>{T("parties.who")}</span><span>{T("parties.role")}</span><span>{T("parties.side")}</span><span>{T("parties.primary")}</span></div>
          <div className="mt-1 flex gap-1"><Input>{T("contacts.person")} / {T("contacts.company")}</Input><Input>{T("partyRole.buyer")}</Input><Input>{T("parties.autoSide")}</Input><Btn ghost>{T("parties.remove")}</Btn></div>
          <div className="mt-2 flex flex-wrap gap-1">{["buyer", "seller", "tenant", "landlord", "listing_agent", "buyer_agent", "listing_broker", "buyer_broker", "tc", "buyer_attorney", "seller_attorney", "escrow_officer", "title_company", "lender", "loan_officer", "inspector", "appraiser", "surveyor", "photographer", "stager", "contractor", "hoa", "property_manager", "referral", "other"].map((r) => <Chip key={r} tone="info">{T(`partyRole.${r}`)}</Chip>)}</div>
          <div className="mt-1 text-center text-muted">{T("parties.none")}</div>
        </Card>
      </div>
      <Hidden title={h} items={[]} />
    </div>
  ),
  contacts: (T, h) => (
    <div className="flex gap-3"><Side T={T} active="contacts" /><div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">{T("contacts.title")} · {T("contacts.all")}</b><span className="flex-1" /><span className="flex overflow-hidden rounded-md border border-line-strong text-xs"><span className="bg-accent px-2 py-1 text-accent-ink">{T("contacts.viewTable")}</span><span className="px-2 py-1">{T("contacts.viewCards")}</span></span><Input>{T("contacts.search")}</Input><Btn ghost>{T("contacts.addOrg")}</Btn><Btn>{T("contacts.add")}</Btn></div>
      <Tabs items={[T("contacts.all"), ...["client", "agent", "brokerage", "title_lending", "vendor", "tc", "attorney", "other"].map((k) => T(`contactTab.${k}`))]} />
      <Card title={T("contacts.all")} right="3">
        <div className="grid grid-cols-[1.6fr_1fr_1.3fr_1fr_.9fr_.9fr_.5fr] gap-2 border-b border-line pb-1 text-[11px] font-semibold text-muted"><span>{T("contacts.col.name")}</span><span>{T("contacts.col.org")}</span><span>{T("contacts.col.email")}</span><span>{T("contacts.col.phone")}</span><span>{T("contacts.col.kind")}</span><span>{T("contacts.col.licenseType")}</span><span>{T("contacts.col.deals")}</span></div>
        <div className="grid grid-cols-[1.6fr_1fr_1.3fr_1fr_.9fr_.9fr_.5fr] items-center gap-2 py-2"><b>Kelly Wald</b><span>Republic Title</span><span className="font-mono text-xs">kwald@republictitle.com</span><span className="font-mono text-xs">972-769-8355</span><Chip tone="info">{T("contactKind.title_lending")}</Chip><Chip tone="info">{T("licenseType.broker")}</Chip><span>4</span></div>
        <div className="grid grid-cols-[1.6fr_1fr_1.3fr_1fr_.9fr_.9fr_.5fr] items-center gap-2 py-2"><b>Republic Title <span className="text-xs text-muted">{T("contacts.company")} · {T("orgKind.title_company")}</span></b><span>—</span><span>—</span><span>—</span><Chip>{T("orgKind.title_company")}</Chip><span className="text-xs text-muted">{T("contacts.deals", { n: 4 })}</span><span>4</span></div>
        <div className="mt-2 flex flex-wrap gap-1">{["client", "agent", "title_lending", "vendor", "tc", "attorney", "other"].map((k) => <Chip key={k} tone="info">{T(`contactKind.${k}`)}</Chip>)}</div>
        <div className="mt-1 flex flex-wrap gap-1">{["brokerage", "title_company", "lender", "law_firm", "vendor", "hoa", "property_management", "other"].map((k) => <Chip key={k}>{T(`orgKind.${k}`)}</Chip>)}</div>
        <div className="mt-1 flex flex-wrap gap-1">{["sales_agent", "broker", "broker_associate"].map((k) => <Chip key={k} tone="info">{T(`licenseType.${k}`)}</Chip>)}</div>
      </Card>
      <Hidden title={h} items={[T("contacts.none"), T("contacts.noMatch"), T("contacts.person")]} />
    </div></div>
  ),
  contact: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">Kelly Wald</b><span className="text-xs text-accent">{T("contactTab.title_lending")} ← {T("nav.contacts")}</span><span className="flex-1" /><Btn ghost>{T("contact.edit")}</Btn><Btn ghost>{T("contact.delete")}</Btn></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Card title={T("contact.details")} right={<Chip tone="info">{T("contact.preferred")} · <ChannelIcon kind="wechat" className="inline h-3 w-3" /> {T("channel.wechat")} · {T("language.zh")}</Chip>}>
            {[["phone", "contact.f.phone", "972-769-8355"], ["email", "contact.f.email", "kwald@republictitle.com"], ["wechat", "contact.f.wechat", "kelly_w"]].map(([ic, k, v]) => <div key={k} className="flex items-center gap-2 py-1"><span className="flex w-20 items-center gap-1 text-xs text-muted"><ChannelIcon kind={ic} className="h-3 w-3" />{T(k)}</span><span className="rounded bg-chip px-2 font-mono text-xs">{v}</span><span className="rounded bg-chip px-1 text-[10px] text-muted">{T("contact.copy")}</span><span className="text-[10px] text-ok">{T("contact.copied")}</span></div>)}
            {["address", "licenseType", "licenseNo", "source", "referredBy", "birthday", "lastContacted", "preferredChannel", "preferredLanguage"].map((k) => <div key={k} className="flex gap-2 py-0.5"><span className="w-20 text-xs text-muted">{T(`contact.f.${k}`)}</span><span className="text-xs">…</span></div>)}
            <div className="mt-1 flex flex-wrap gap-1">{["phone", "sms", "email", "wechat", "whatsapp"].map((c) => <Chip key={c}><ChannelIcon kind={c} className="inline h-3 w-3" /> {T(`channel.${c}`)}</Chip>)}<Chip>{T("language.en")}</Chip></div>
          </Card>
          <Card title={T("contact.links")} right={<Btn ghost>{T("contact.addLink")}</Btn>}>
            <div className="flex flex-wrap gap-1">{["spouse", "partner", "parent", "child", "sibling", "relative", "friend", "assistant", "colleague", "other"].map((r) => <Chip key={r} tone="info">{T(`relation.${r}`)}</Chip>)}</div>
            <div className="mt-2 flex gap-1 text-xs text-muted"><span>{T("contact.linkWho")}</span><span>{T("contact.linkRelation")}</span><span>{T("contact.removeLink")}</span></div>
            <div className="text-center text-muted">{T("contact.noLinks")}</div>
          </Card>
          <Card title={T("contact.tab.notes")} right={<Btn ghost>{T("contact.notesSave")}</Btn>}><div className="text-center text-muted">{T("contact.noNotes")}</div></Card>
        </div>
        <div className="flex flex-col gap-3">
          <Card title={T("contact.relatedDeals")} right={T("contact.relatedDealsCount", { n: 2 })}>
            <div className="flex gap-2 rounded-ui border border-line p-2"><span className="w-1 rounded bg-warn" /><div><b>1234 Sample pl</b> <Chip tone="info">{T("partyRole.escrow_officer")}</Chip><div className="text-xs text-muted"><StageDot stage="under_contract" /> {T("stage.under_contract")} · {T("contact.nextMilestone")} · {T("ms.option_period_end")}</div></div></div>
            <div className="mt-1 text-center text-muted">{T("contact.noDeals")}</div>
          </Card>
          <Card title={T("contact.relatedContacts")} right={T("contact.relatedVia")}>
            <div className="rounded-ui border border-line p-2"><b>Hua Wang</b> <Chip tone="info">{T("partyRole.seller")}</Chip><div className="text-xs text-muted">{T("contact.sharedDeals", { n: 2 })} · {T("relation.spouse")}：Li Wang</div></div>
            <div className="mt-1 text-center text-muted">{T("contact.noRelated")}</div>
          </Card>
          <Card title={T("contact.tab.profile")} right={<>{T("contact.tab.deals")} · {T("contact.peopleInOrg")}</>}><div className="text-center text-muted">{T("contact.noPeople")}</div></Card>
        </div>
      </div>
      <Hidden title={h} items={[T("contact.deleteConfirm"), T("contact.save"), T("contact.cancel")]} />
    </div>
  ),
  form: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2"><Btn ghost>{T("contacts.addOrg")}</Btn><Btn>{T("contacts.add")}</Btn></div>
      <W className="grid grid-cols-2 gap-2 p-3 text-xs">
        {["kind", "organization", "firstName", "lastName", "nameZh", "jobTitle", "email", "phone", "wechat", "preferredChannel", "preferredLanguage", "tags", "source", "name", "website", "primaryContact", "address", "address2", "city", "state", "zip", "notes"].map((k) => <label key={k} className="flex flex-col gap-1 text-muted">{T(`contact.f.${k}`)}<Input>{k === "email" ? <>jason@g<span className="text-muted">mail.com</span> <span className="rounded bg-chip px-1 text-[10px]">{T("contact.emailTabHint")}</span></> : k === "organization" ? T("contact.f.noOrganization") : "…"}</Input></label>)}
        <div className="col-span-2 flex flex-wrap gap-1"><span className="text-muted">{T("contact.commonTags")}</span><Chip>首购</Chip><Chip>换房</Chip></div>
        <div className="col-span-2 flex flex-wrap gap-1 text-accent"><span>{T("contact.addOrgInline")}</span><Input>{T("contact.newOrgName")}</Input><Btn>{T("contact.orgCreate")}</Btn><span className="text-muted">{T("contact.noOrgForKind")}</span></div>
        <div className="col-span-2 rounded-ui border border-line p-2"><div>{T("contact.unsaved")}</div><div className="mt-1 flex gap-1"><Btn>{T("contact.unsavedSave")}</Btn><Btn ghost>{T("contact.unsavedDiscard")}</Btn><Btn ghost>{T("contact.unsavedCancel")}</Btn></div></div>
      </W>
      <Card title={T("photo.photos")} right={<><Btn>{T("photo.upload")}</Btn> <Btn ghost>{T("photo.editAvatar")}</Btn> <Btn ghost>{T("photo.removeAvatar")}</Btn></>}>
        <div className="text-center text-muted">{T("photo.none")}</div>
        <div className="mt-2 flex flex-wrap gap-1 text-xs"><Chip tone="info">{T("photo.isAvatar")}</Chip><Chip>{T("photo.setAvatar")}</Chip><Chip tone="bad">{T("photo.delete")}</Chip><Chip>{T("photo.chooseFile")}</Chip><span className="text-muted">{T("photo.orPick")}</span><span className="text-muted">{T("photo.dragHint")}</span><span className="text-muted">{T("photo.zoom")}</span><Btn>{T("photo.use")}</Btn><span className="text-muted">{T("photo.saving")}</span><Btn ghost>{T("photo.cancel")}</Btn><span className="text-muted">{T("photo.original")}</span></div>
      </Card>
      <Hidden title={h} items={[]} />
    </div>
  ),
  tasks: (T, h) => (
    <div className="flex gap-3"><Side T={T} active="tasks" /><div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">{T("tasks.title")} · {T("tasks.scopeAll")} · 63</b><span className="flex-1" /><Input>{T("tasks.search")}</Input><Btn>{T("tasks.add")}</Btn></div>
      <div className="flex gap-1 text-xs"><Chip tone="info">{T("tasks.scopeAll")}</Chip><Chip>{T("tasks.scopePersonal")}</Chip></div>
      <div className="flex gap-1"><Input>{T("tasks.whatToDo")}</Input><Input>{T("tasks.personalOption")}</Input><Btn>{T("tasks.addButton")}</Btn></div>
      <Card title={<>{T("tasks.personal")} · 1</>}><div className="flex items-center gap-2 py-1"><span className="h-4 w-4 rounded border border-line-strong" />{T("task.pl-02")}<Chip tone="warn">{T("rel.today")}</Chip></div></Card>
      <Card title="1234 Sample pl · 12">{["uc-01", "uc-02", "uc-11", "cl-01", "ac-07"].map((k) => <div key={k} className="flex items-center gap-2 py-1"><span className="h-4 w-4 rounded border border-line-strong" />{T(`task.${k}`)}</div>)}</Card>
      <Hidden title={h} items={[]} />
    </div></div>
  ),
  settings: (T, h) => (
    <div className="flex flex-col gap-3">
      <Tabs items={[T("settings.language"), T("settings.theme")]} />
      <div className="text-xs text-muted">{T("settings.themeHint")} · {T("settings.nowUsing", { name: "…" })} {T("theme.sandstone")}</div>
      <Card title={T("settings.mode")}><div className="flex gap-1">{["auto", "day", "night"].map((m) => <Chip key={m} tone={m === "auto" ? "info" : ""}>{T(`settings.mode.${m}`)}</Chip>)}</div></Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title={T("settings.dayThemes")}>{["blueprint", "porcelain", "sandstone", "steel", "ivory"].map((th) => <div key={th} className="flex items-baseline gap-2 py-0.5"><b>{T(`theme.${th}`)}</b><span className="text-xs text-muted">{T(`theme.${th}.tagline`)}</span>{th === "sandstone" && <Chip tone="ok">{T("settings.current")}</Chip>}</div>)}</Card>
        <Card title={T("settings.nightThemes")}>{["obsidian", "graphite", "jade", "indigo", "deepsea"].map((th) => <div key={th} className="flex items-baseline gap-2 py-0.5"><b>{T(`theme.${th}`)}</b><span className="text-xs text-muted">{T(`theme.${th}.tagline`)}</span></div>)}</Card>
      </div>
      <Card title={T("settings.location")} right={T("settings.sunToday", { rise: "07:17", set: "19:31" })}><div className="text-xs text-muted">{T("settings.locationHint")}</div><div className="mt-1 flex gap-1"><Input>{T("settings.lat")}</Input><Input>{T("settings.lng")}</Input><Btn ghost>{T("settings.useMyLocation")}</Btn><span className="text-xs text-muted">{T("settings.locating")} · {T("settings.locationFailed")}</span></div></Card>
      <Card title={T("settings.title")}><div className="flex flex-wrap gap-2 text-xs"><Btn>{T("common.save")}</Btn><Btn ghost>{T("common.reset")}</Btn><Btn ghost>{T("common.delete")}</Btn><span className="text-muted">{T("settings.langTheme")}</span></div></Card>
      <Hidden title={h} items={[T("settings.languageHint"), T("settings.filter"), T("settings.key"), T("settings.default"), T("settings.overridden"), T("settings.stale"), T("settings.count", { n: 500 })]} />
    </div>
  ),
  login: (T, h) => (
    <div className="mx-auto flex max-w-sm flex-col gap-3"><b className="text-lg">NewBee OS</b><span className="text-xs text-muted">{T("login.subtitle")}</span><Input>you@example.com</Input><Input>{T("login.passwordPlaceholder")}</Input><Btn>{T("login.signIn")}</Btn><Btn ghost>{T("login.sendLink")}</Btn><span className="text-xs text-muted">{T("login.wait")}</span><span className="rounded bg-ok-bg p-2 text-xs text-ok">{T("login.sent")}</span><Hidden title={h} items={[]} /></div>
  ),
  field: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.fields")}</div><W className="grid gap-x-6 gap-y-1 p-3 text-sm sm:grid-cols-2">{Object.keys(MESSAGES).filter((k) => k.startsWith("field.")).map((k) => <div key={k} className="flex justify-between border-b border-line py-1"><span>{T(k)}</span><span className="font-mono text-xs text-muted">{k.slice(6)}</span></div>)}</W><Hidden title={h} items={[]} /></div>),
  ms: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.milestones")}</div><W className="p-3 text-sm">{Object.keys(MESSAGES).filter((k) => k.startsWith("ms.")).map((k) => <div key={k} className="flex justify-between border-b border-line py-1"><span>◆ {T(k)}</span><Chip>2026-11-30</Chip></div>)}</W><Hidden title={h} items={[]} /></div>),
  task: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.tab.tasks")}</div><W className="p-3 text-sm">{Object.keys(MESSAGES).filter((k) => k.startsWith("task.")).map((k) => <div key={k} className="flex items-center gap-2 border-b border-line py-1"><span className="h-4 w-4 rounded border border-line-strong" />{T(k)}<span className="ml-auto font-mono text-xs text-muted">{k.slice(5)}</span></div>)}</W><Hidden title={h} items={[]} /></div>),
};
const ORDER = ["nav", "today", "deals", "deal", "contacts", "contact", "form", "tasks", "settings", "login", "field", "ms", "task"];

/** 用收集器跑一遍复刻，得到每个页面放了哪些 key */
function placedKeys(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const id of ORDER) { const set = new Set<string>(); const collect: TFn = (k) => { set.add(k); return null; }; REPLICAS[id](collect, ""); out[id] = set; }
  return out;
}

export function I18nWysiwyg({ overrides, locale, labels, tabNames }: { overrides: Overrides; locale: Locale; labels: Record<string, string>; tabNames: Record<string, string> }) {
  const router = useRouter();
  const [ov, setOv] = useState<Overrides>(overrides);
  useEffect(() => { setOv(overrides); }, [overrides]);
  const [page, setPage] = useState(ORDER[0]);
  const [dim, setDim] = useState(false);
  const [editing, setEditing] = useState<{ k: string; x: number; y: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const placed = useMemo(placedKeys, []);
  const others = useMemo(() => { const all = new Set(ORDER.flatMap((id) => [...placed[id]])); return Object.keys(MESSAGES).filter((k) => !all.has(k)); }, [placed]);

  const eff = (k: string, l: Locale) => (ov[k]?.[l] || MESSAGES[k]?.[l] || k);
  const isChanged = (k: string) => !!(ov[k]?.zh || ov[k]?.en);
  const changedCount = Object.keys(MESSAGES).filter(isChanged).length;

  const T: TFn = (k, vars) => (
    <span data-k={k} onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const hr = host.current!.getBoundingClientRect(); setEditing({ k, x: Math.max(0, Math.min(r.left - hr.left, hr.width - 340)), y: r.bottom - hr.top + 6 }); }}
      className={`cursor-pointer rounded-sm border-b-[1.5px] transition-colors hover:bg-accent/15 ${isChanged(k) ? "border-accent" : "border-dashed border-transparent hover:border-accent"} ${editing?.k === k ? "bg-accent/20" : ""} ${dim && !isChanged(k) ? "opacity-35" : ""}`}>
      {fill(eff(k, locale), vars)}
    </span>
  );

  async function save(k: string, zh: string, en: string) {
    const fd = new FormData(); fd.set("key", k); fd.set("zh", zh); fd.set("en", en);
    await saveUiString(fd);
    const d = MESSAGES[k];
    setOv((o) => ({ ...o, [k]: { zh: zh.trim() && zh.trim() !== d.zh ? zh.trim() : null, en: en.trim() && en.trim() !== d.en ? en.trim() : null } }));
    setEditing(null); router.refresh();
  }
  async function reset(k: string) { await resetUiString(k); setOv((o) => ({ ...o, [k]: {} })); setEditing(null); router.refresh(); }

  const tabs = [...ORDER, ...(others.length ? ["other"] : [])];
  return (
    <div className="flex flex-col gap-3" onClick={() => setEditing(null)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{labels.hint}</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setDim(!dim)} className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm ${dim ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong text-fg hover:bg-chip"}`}>{labels.changedOnly}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] ${dim ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>{changedCount}</span></button>
      </div>
      <div className="-mx-1 flex gap-0.5 overflow-x-auto overflow-y-hidden px-1 shadow-[inset_0_-1px_0_var(--line)]">
        {tabs.map((id) => { const n = id === "other" ? others.length : placed[id].size; const c = (id === "other" ? others : [...placed[id]]).filter(isChanged).length; return (
          <button key={id} type="button" onClick={() => { setPage(id); setEditing(null); }} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13.5px] font-medium ${page === id ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}>
            {id === "other" ? labels.other : tabNames[id] ?? id}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${c ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>{c ? `${c}/${n}` : n}</span>
          </button>); })}
      </div>
      <div ref={host} className="relative rounded-ui border border-line bg-bg p-4">
        {page === "other"
          ? <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{others.map((k) => <span key={k}>{T(k)} <span className="text-xs text-muted">· {(() => { const { scene, section } = sceneOf(k); return `${scene[locale]} › ${section[locale]}`; })()}</span></span>)}</div>
          : REPLICAS[page](T, labels.hidden)}
        {editing && (() => { const k = editing.k; const { scene, section } = sceneOf(k); return (
          <div className="absolute z-30 flex w-[330px] flex-col gap-2 rounded-ui border border-line-strong bg-surface p-3 shadow-2xl" style={{ left: editing.x, top: editing.y }} onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter") { e.preventDefault(); const f = e.currentTarget; save(k, (f.querySelector("[name=zh]") as HTMLInputElement).value, (f.querySelector("[name=en]") as HTMLInputElement).value); } }}>
            <div className="text-xs text-muted">{scene[locale]} › {section[locale]} · {section.where[locale]}</div>
            <label className="flex flex-col gap-1 text-xs text-muted">{labels.zh}<input name="zh" autoFocus defaultValue={eff(k, "zh")} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg" />{ov[k]?.zh && <span>{fill(labels.defaultIs, { v: MESSAGES[k].zh })}</span>}</label>
            <label className="flex flex-col gap-1 text-xs text-muted">{labels.en}<input name="en" defaultValue={eff(k, "en")} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg" />{ov[k]?.en && <span>{fill(labels.defaultIs, { v: MESSAGES[k].en })}</span>}</label>
            {MESSAGES[k].zh.includes("{") && <span className="text-[11px] text-muted">{labels.sample}: {MESSAGES[k].zh}</span>}
            <div className="flex justify-end gap-1">
              {isChanged(k) && <button type="button" onClick={() => reset(k)} className="h-8 rounded-md border border-danger/40 px-2.5 text-xs font-medium text-danger hover:bg-danger-bg">{labels.reset}</button>}
              <button type="button" onClick={() => setEditing(null)} className="h-8 rounded-md border border-line-strong px-2.5 text-xs font-medium text-fg hover:bg-chip">{labels.cancel}</button>
              <button type="button" onClick={(e) => { const f = e.currentTarget.closest("div.absolute")!; save(k, (f.querySelector("[name=zh]") as HTMLInputElement).value, (f.querySelector("[name=en]") as HTMLInputElement).value); }} className="h-8 rounded-md bg-accent px-2.5 text-xs font-medium text-accent-ink hover:bg-accent-strong">{labels.save}</button>
            </div>
          </div>); })()}
      </div>
    </div>
  );
}
