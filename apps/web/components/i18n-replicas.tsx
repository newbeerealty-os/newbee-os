// 翻译编辑页的"页面复刻"：每个页面一个 (T) => JSX 的纯函数，文字全部走 T(key)。
// 规矩：新增任何界面文案，必须放进对应页面的复刻（apps/web/test/i18n-replicas.test.tsx 会检查每条文案都被放置）。
// 这个文件只能 import 纯组件（不能碰 next/navigation、Server Action、supabase），否则测试跑不了。
import { MESSAGES } from "@newbee/core";
import { StageDot } from "@/components/stage";
import { ChannelIcon } from "@/components/channel-icon";

type Vars = Record<string, string | number>;
export type TFn = (k: string, vars?: Vars) => React.ReactNode;
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
/** 侧栏复刻。是函数不是组件：收集器要能跑进去看到里面的 key */
const side = (T: TFn, active: string) => (
  <div className="flex w-40 shrink-0 flex-col gap-0.5 rounded-ui bg-side p-2 text-side-text">
    <div className="px-2 pb-2 text-sm font-semibold">New<span className="text-accent">Bee</span> OS</div>
    {[["today", "◐"], ["deals", "▤"], ["contacts", "◉"], ["tasks", "☑"], ["commissions", "$"], ["settings", "⚙"]].map(([k, ic]) => <div key={k} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${k === active ? "bg-side-active text-side-active-text" : ""}`}><span className="w-3 text-side-muted">{ic}</span>{T(`nav.${k}`)}</div>)}
    <div className="mt-2 flex items-center gap-1 px-1 text-[11px] text-side-muted"><span className="rounded bg-side-active px-1.5 py-0.5 text-side-active-text">{T("locale.zh")}</span><span className="px-1.5">{T("locale.en")}</span></div>
    <div className="mt-1 flex items-center justify-between border-t border-side-line px-1 pt-1.5 text-[11px] text-side-muted"><span>Jason W.</span><span>{T("nav.signout")}</span></div>
  </div>
);

export const REPLICAS: Record<string, (T: TFn, hidden: string) => React.ReactNode> = {
  nav: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">{side(T, "deals")}<div className="flex-1 rounded-ui border border-dashed border-line p-3 text-xs text-muted">{T("nav.all")} · {T("nav.personal")} · {T("settings.langTheme")}</div></div>
      <div className="flex flex-wrap gap-2">{["saved", "created", "deleted", "uploaded", "derived", "extracted", "reset", "sent"].map((k) => <span key={k} className="rounded-full bg-fg px-3 py-1 text-xs font-medium text-surface">✓ {T(`flash.${k}`)}</span>)}</div>
      <W className="flex flex-col gap-2 border-danger/40 p-3 text-xs"><b className="text-danger">{T("error.title")}</b><span className="font-mono text-muted">…</span><div className="flex gap-1"><Btn>{T("error.retry")}</Btn><Btn ghost>{T("error.back")}</Btn></div></W>
      <Hidden title={h} items={[T("nav.collapse"), T("nav.expand"), T("nav.toggleGroup"), T("meta.description")]} />
    </div>
  ),
  today: (T, h) => (
    <div className="flex gap-3">{side(T, "today")}<div className="flex min-w-0 flex-1 flex-col gap-3">
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
    <div className="flex gap-3">{side(T, "deals")}<div className="flex min-w-0 flex-1 flex-col gap-3">
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
      <Hidden title={h} items={[T("deals.none"), T("deals.noneInStage"), T("common.noMatch"), T("deals.next"), T("common.dragColumn")]} />
    </div></div>
  ),
  deal: (T, h) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">1234 Sample pl <span className="font-normal text-muted">· {T("type.seller")}</span></b><Chip><StageDot stage="under_contract" /> {T("stage.under_contract")}</Chip><span className="flex-1" /><Input>{T("stage.offer")}</Input><Btn ghost>{T("deal.changeStage")}</Btn><Btn>{T("deal.derive")}</Btn></div>
      <Tabs items={[T("tab.overview"), T("tab.all"), T("deal.tab.parties"), T("deal.files"), T("deal.pending"), T("deal.fields"), T("deal.milestones"), T("deal.tab.tasks")]} />
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
    <div className="flex gap-3">{side(T, "contacts")}<div className="flex min-w-0 flex-1 flex-col gap-3">
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
    <div className="flex gap-3">{side(T, "tasks")}<div className="flex min-w-0 flex-1 flex-col gap-3">
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
      <Tabs items={[T("settings.language"), T("settings.theme"), T("settings.commission")]} />
      <div className="text-xs text-muted">{T("settings.themeHint")} · {T("settings.nowUsing", { name: "…" })} {T("theme.sandstone")}</div>
      <Card title={T("settings.mode")}><div className="flex gap-1">{["auto", "day", "night"].map((m) => <Chip key={m} tone={m === "auto" ? "info" : ""}>{T(`settings.mode.${m}`)}</Chip>)}</div></Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title={T("settings.dayThemes")}>{["blueprint", "porcelain", "sandstone", "steel", "ivory"].map((th) => <div key={th} className="flex items-baseline gap-2 py-0.5"><b>{T(`theme.${th}`)}</b><span className="text-xs text-muted">{T(`theme.${th}.tagline`)}</span>{th === "sandstone" && <Chip tone="ok">{T("settings.current")}</Chip>}</div>)}</Card>
        <Card title={T("settings.nightThemes")}>{["obsidian", "graphite", "jade", "indigo", "deepsea"].map((th) => <div key={th} className="flex items-baseline gap-2 py-0.5"><b>{T(`theme.${th}`)}</b><span className="text-xs text-muted">{T(`theme.${th}.tagline`)}</span></div>)}</Card>
      </div>
      <Card title={T("settings.location")} right={T("settings.sunToday", { rise: "07:17", set: "19:31" })}><div className="text-xs text-muted">{T("settings.locationHint")}</div><div className="mt-1 flex gap-1"><Input>{T("settings.lat")}</Input><Input>{T("settings.lng")}</Input><Btn ghost>{T("settings.useMyLocation")}</Btn><span className="text-xs text-muted">{T("settings.locating")} · {T("settings.locationFailed")}</span></div></Card>
      <Card title={T("settings.language")} right={<Chip>{T("settings.tr.changedOnly")} 3</Chip>}>
        <div className="text-xs text-muted">{T("settings.tr.hint")}</div>
        <div className="mt-2 rounded-ui border border-line-strong p-2 text-xs"><div className="text-muted">{T("deal.tab.parties")} › … · {T("settings.tr.hidden")}</div><div className="mt-1 flex gap-2"><Input>{T("settings.tr.zh")}</Input><Input>{T("settings.tr.en")}</Input></div><div className="mt-1 text-muted">{T("settings.tr.defaultIs", { v: "…" })} · {T("settings.tr.sample")}: {"{n}"}</div><div className="mt-1 flex justify-end gap-1"><Btn ghost>{T("settings.tr.reset")}</Btn><Btn ghost>{T("settings.tr.cancel")}</Btn><Btn>{T("settings.tr.save")}</Btn></div><div className="mt-1 text-muted">{T("settings.tr.other")} · {T("settings.tr.g.pages")} · {T("settings.tr.g.deals")} · {T("settings.tr.g.contacts")} · {T("settings.tr.g.names")} · {T("settings.tr.g.money")}</div></div>
      </Card>
      <Card title={T("settings.title")}><div className="flex flex-wrap gap-2 text-xs"><Btn>{T("common.save")}</Btn><Btn ghost>{T("common.reset")}</Btn><Btn ghost>{T("common.delete")}</Btn><span className="text-muted">{T("settings.langTheme")}</span></div></Card>
      <Hidden title={h} items={[T("settings.languageHint"), T("settings.filter"), T("settings.key"), T("settings.default"), T("settings.overridden"), T("settings.stale"), T("settings.count", { n: 500 })]} />
    </div>
  ),
  commissions: (T, h) => (
    <div className="flex gap-3">{side(T, "commissions")}<div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">{T("comm.title")} · {T("comm.all")}</b><span className="text-xs text-accent">{T("nav.commissions")}</span><span className="flex-1" /><span className="flex items-center gap-1 text-xs text-muted">{T("comm.from")}<Input>2026-01-01</Input>{T("comm.to")}<Input>2026-12-31</Input></span><Input>{T("comm.search")}</Input><Btn ghost>{T("comm.newReferral")}</Btn><Btn>{T("comm.new")}</Btn></div>
      <div className="grid grid-cols-4 gap-2">{[["comm.stat.gci", "$27,000"], ["comm.stat.nci", "$17,820"], ["comm.stat.paid", "$8,910"], ["comm.stat.pending", "$8,910"]].map(([k, v]) => <W key={k} className="px-3 py-2"><div className="text-xs text-muted">{T(k)}</div><div className="font-mono text-lg font-semibold">{v}</div></W>)}</div>
      <Card title={T("comm.period")} right={T("comm.capPeriod", { start: "2026-01-01", end: "2026-12-31" })}>
        <div className="flex justify-between text-xs"><span>{T("comm.cap")} · <span className="font-mono">$8,100 / $16,000</span></span><span className="text-muted">51% · {T("comm.capHit")}</span></div><div className="mt-1 h-2 rounded-full bg-chip"><div className="h-full w-1/2 rounded-full bg-accent" /></div>
        <div className="mt-2 flex justify-between text-xs"><span>{T("comm.stat.fixed")}</span><span className="font-mono">$3,000</span></div>
      </Card>
      <Tabs items={[T("comm.all"), T("commSide.listing"), T("commSide.buyer"), T("comm.filter.both"), T("commSide.landlord"), T("commSide.tenant"), T("commKind.referral"), T("comm.filter.pending"), T("comm.filter.paid")]} />
      <Card title={<>{T("comm.title")} · {T("comm.all")}</>} right="3">
        <div className="grid grid-cols-[.9fr_1.8fr_1fr_.9fr_.9fr_.9fr_.9fr_.8fr] gap-2 border-b border-line pb-1 text-[11px] font-semibold text-muted"><span>{T("comm.col.date")}</span><span>{T("comm.col.what")}</span><span>{T("comm.col.kind")}</span><span className="text-right">{T("comm.col.price")}</span><span className="text-right">{T("comm.col.gci")}</span><span className="text-right">{T("comm.col.deductions")}</span><span className="text-right">{T("comm.col.nci")}</span><span>{T("comm.col.status")}</span></div>
        <div className="grid grid-cols-[.9fr_1.8fr_1fr_.9fr_.9fr_.9fr_.9fr_.8fr] items-center gap-2 border-b border-line py-2 font-mono text-xs"><span>2026-10-15</span><b className="font-sans">1234 Sample Pl</b><span className="flex gap-1"><Chip tone="info">{T("commSide.listing")}</Chip><Chip>{T("comm.both")}</Chip></span><span className="text-right">$450,000</span><span className="text-right">$13,500</span><span className="text-right text-danger">($4,590)</span><span className="text-right font-semibold">$8,910</span><Chip tone="warn">{T("commStatus.pending")}</Chip></div>
        <div className="grid grid-cols-[.9fr_1.8fr_1fr_.9fr_.9fr_.9fr_.9fr_.8fr] items-center gap-2 border-b border-line py-2 font-mono text-xs"><span>2026-08-02</span><b className="font-sans">88 Harbor Ln</b><span className="flex gap-1"><Chip tone="info">{T("commSide.buyer")}</Chip></span><span className="text-right">$390,000</span><span className="text-right">$11,700</span><span className="text-right text-danger">($4,050)</span><span className="text-right font-semibold">$7,650</span><Chip tone="ok">{T("commStatus.paid")}</Chip></div>
        <div className="grid grid-cols-[.9fr_1.8fr_1fr_.9fr_.9fr_.9fr_.9fr_.8fr] items-center gap-2 py-2 font-mono text-xs"><span>2026-11-30</span><b className="font-sans">Li Wei</b><span className="flex gap-1"><Chip tone="warn">{T("commKind.referral")}</Chip></span><span className="text-right">$300,000</span><span className="text-right">$2,250</span><span className="text-right text-danger">($675)</span><span className="text-right font-semibold">$1,575</span><Chip>{T("commStatus.projected")}</Chip></div>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">{["deal", "referral"].map((k) => <Chip key={k}>{T(`commKind.${k}`)}</Chip>)}{["listing", "buyer", "landlord", "tenant", "management", "referral"].map((s) => <Chip key={s} tone="info">{T(`commSide.${s}`)}</Chip>)}</div>
        <div className="mt-1 flex flex-wrap gap-1 text-xs">{["projected", "pending", "closed", "paid", "cancelled"].map((s) => <Chip key={s}>{T(`commStatus.${s}`)}</Chip>)}</div>
      </Card>
      <div className="flex flex-wrap items-center gap-2"><b className="text-base">1234 Sample Pl · {T("commSide.listing")}</b><span className="text-xs text-accent">{T("nav.commissions")}</span><span className="flex-1" /><Btn ghost>{T("comm.f.deal")}</Btn><Btn ghost>{T("comm.delete")}</Btn></div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <Card title={T("comm.detail")} right={<span className="flex items-center gap-2"><span className="text-muted">{T("comm.delete")}</span><Btn>{T("comm.save")}</Btn></span>}>
          <div className="grid grid-cols-[6rem_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
            <span className="text-muted">{T("comm.f.deal")}</span><Input>1234 Sample Pl</Input>
            <span className="text-muted">{T("comm.f.side")}</span><Input>{T("commSide.listing")}</Input>
            <span className="text-muted">{T("comm.f.price")} · {T("comm.f.amount")}</span><span className="flex gap-1"><Input>$450,000 <span className="ml-auto text-accent">{T("comm.fromDeal")}</span></Input><Input>3 %</Input><Chip tone="info">%</Chip><Chip>$</Chip></span>
            <span className="text-muted">{T("comm.f.referralOut")}</span><span className="flex gap-1"><Input>25 %</Input><Input>{T("comm.f.referralOutTo")}</Input></span>
            <span className="text-muted">{T("comm.f.client")}</span><Input>Li Wei</Input>
            <span className="text-muted">{T("comm.f.partner")}</span><span className="flex gap-1"><Input>Jane Broker</Input><Input>{T("comm.f.partnerOrg")}</Input></span>
            <span className="text-muted">{T("comm.f.referralIn")}</span><Input>25 %</Input>
            <span className="text-muted">{T("comm.f.fees")}</span><span className="flex flex-wrap gap-1"><Input>{T("comm.f.feeName")}</Input><Chip>{T("comm.f.feeBasis.flat")}</Chip><Chip>{T("comm.f.feeBasis.pct_of_gci")}</Chip><Chip>{T("comm.f.feeBasis.pct_of_price")}</Chip><Btn ghost>{T("comm.f.addFee")}</Btn></span>
            <span className="text-muted">{T("comm.f.expectedAt")}</span><Input>2026-10-15</Input>
            <span className="text-muted">{T("comm.f.closedAt")}</span><Input>—</Input>
            <span className="text-muted">{T("comm.f.paidAt")}</span><Input>—</Input>
            <span className="text-muted">{T("comm.f.notes")}</span><Input>…</Input>
          </div>
        </Card>
        <Card title={T("comm.r.gci")} right="$13,500">
          {[["comm.r.referralOut", "($3,375)"], ["comm.r.brokerSplit", "($3,037.50)"], ["comm.r.brokerPre", "70% · $2,500"], ["comm.r.brokerPost", "100% · $537.50"], ["comm.r.royalty", "($810)"], ["comm.r.team", "($0)"], ["comm.r.perDealFee", "($540)"], ["comm.r.eoFee", "($0)"], ["comm.r.total", "($7,762.50)"]].map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-1 text-xs"><span>{T(k)}</span><span className="font-mono">{v}</span></div>)}
          <div className="text-[11px] text-muted">{T("comm.r.agentPct", { pct: 70 })}</div>
          <div className="flex justify-between py-1.5 text-sm font-semibold"><span>{T("comm.r.nci")}</span><span className="font-mono">$5,737.50</span></div>
          <div className="flex justify-between text-xs text-muted"><span>{T("comm.r.capAfter")}</span><span className="font-mono">$10,600 / $16,000</span></div>
        </Card>
      </div>
      <Card title={T("nav.commissions")} right={<span className="flex items-center gap-2"><span>{T("comm.r.nci")} $8,910</span><span className="text-muted">{T("comm.delete")}</span><Btn>{T("comm.save")}</Btn></span>}>
        <div className="flex flex-wrap gap-2 border-b border-line pb-2 text-xs"><span className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink">● {T("commSide.listing")} · 3% · $8,910 · {T("commStatus.pending")}</span><span className="rounded-full border border-dashed border-line-strong px-3 py-1 text-muted">+ {T("comm.addOtherSide")} · {T("commSide.buyer")}</span><span className="rounded-full border border-dashed border-line-strong px-3 py-1 text-muted">+ {T("comm.new")}</span></div>
        <div className="mt-2 grid grid-cols-[6rem_1fr] items-center gap-x-2 gap-y-1.5 text-xs"><span className="text-muted">{T("comm.f.deal")}</span><Input>1234 Sample Pl · {T("type.seller")}</Input><span className="text-muted">{T("comm.f.side")}</span><Input>{T("commSide.listing")}</Input></div>
      </Card>
      <Card title={T("comm.referralsOf")} right={T("comm.newReferral")}><div className="py-2 text-center text-muted">{T("comm.noReferrals")}</div></Card>
      <Hidden title={h} items={[T("comm.none"), T("comm.deleteConfirm")]} />
    </div></div>
  ),
  plan: (T, h) => (
    <div className="flex flex-col gap-3">
      <Tabs items={[T("settings.commission"), T("settings.language"), T("settings.theme")]} />
      <div className="text-xs text-muted">{T("plan.hint")}</div>
      <Card title={T("plan.presets")} right={<span className="flex items-center gap-2"><span className="text-ok">{T("plan.presetApplied")}</span><Btn>{T("common.save")}</Btn></span>}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{["perDeal", "annual", "exp", "kw", "real", "fathom", "tiered", "remax"].map((id, i) => <div key={id} className={`rounded-md border px-2 py-1.5 ${i === 0 ? "border-accent bg-accent-soft" : "border-line-strong"}`}><div className="text-xs font-medium">{T(`plan.preset.${id}`)}</div><div className="text-[11px] text-muted">{T(`plan.preset.${id}.desc`)}</div></div>)}</div>
      </Card>
      <Card title={T("plan.perDeal")} right={<Chip tone="info">{T("plan.module.on")}</Chip>}><div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{[["plan.perDealFee", "$540"], ["plan.perDealFeeLease", "$125"], ["plan.perDealFeePostCap", "$0"], ["plan.perDealFeeCap", "$0"], ["plan.perDealFeeAfterCap", "$0"], ["plan.eoFee", "$0"], ["plan.eoCap", "$0"]].map(([k, v]) => <label key={k} className="flex flex-col gap-1"><span className="text-muted">{T(k)}</span><Input>{v}</Input></label>)}</div></Card>
      <Card title={T("plan.recurring")} right={<Chip tone="info">{T("plan.module.on")}</Chip>}>
        <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 text-xs"><span className="text-muted">{T("plan.recurringName")}</span><span className="text-muted">{T("plan.recurringAmount")}</span><span className="text-muted">{T("plan.recurringPeriod")}</span><Input>Annual fee</Input><Input>$3,000</Input><Input>{T("plan.period.yearly")}</Input></div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="text-accent">{T("plan.recurringAdd")}</span><span className="text-muted">{T("plan.recurringTotal", { amount: "$3,000" })} · {T("plan.period.monthly")} · {T("plan.period.quarterly")}</span></div>
      </Card>
      <Card title={T("plan.split")} right={<Chip>{T("plan.module.off")}</Chip>}>
        <div className="flex items-center gap-2 text-xs text-muted">{T("plan.splitMode")}<Chip tone="info">{T("plan.splitMode.flat")}</Chip><Chip>{T("plan.splitMode.tiers")}</Chip></div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">{[["plan.splitPreCap", "70 %"], ["plan.splitPostCap", "100 %"]].map(([k, v]) => <label key={k} className="flex flex-col gap-1"><span className="text-muted">{T(k)}</span><Input>{v}</Input></label>)}</div>
        <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2 text-xs"><span className="text-muted">{T("plan.tiers.upTo")}</span><span className="text-muted">{T("plan.tiers.pct")}</span><Input>50,000</Input><Input>60</Input><Input>100,000</Input><Input>70</Input><span className="px-1 text-muted">{T("plan.tiers.last")}</span><Input>80</Input></div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs"><span className="text-accent">{T("plan.tiers.add")}</span><span className="text-muted">{T("plan.tiers.hint")}</span></div>
      </Card>
      <Card title={T("plan.cap")} right={<Chip>{T("plan.module.off")}</Chip>}><div className="grid grid-cols-2 gap-2 text-xs"><label className="flex flex-col gap-1"><span className="text-muted">{T("plan.capAmount")}</span><Input>$16,000</Input><span className="text-[11px] text-muted">{T("plan.capHint")}</span></label><label className="flex flex-col gap-1"><span className="text-muted">{T("plan.capYearStart")}</span><Input>01-01</Input></label></div></Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title={T("plan.royalty")} right={<Chip>{T("plan.module.off")}</Chip>}><div className="grid grid-cols-2 gap-2 text-xs">{[["plan.royaltyPct", "6 %"], ["plan.royaltyCap", "$3,000"]].map(([k, v]) => <label key={k} className="flex flex-col gap-1"><span className="text-muted">{T(k)}</span><Input>{v}</Input></label>)}</div></Card>
        <Card title={T("plan.team")} right={<Chip>{T("plan.module.off")}</Chip>}><div className="grid grid-cols-2 gap-2 text-xs">{[["plan.teamPct", "0 %"], ["plan.teamCap", "$0"]].map(([k, v]) => <label key={k} className="flex flex-col gap-1"><span className="text-muted">{T(k)}</span><Input>{v}</Input></label>)}<label className="flex flex-col gap-1"><span className="text-muted">{T("plan.teamBasis")}</span><span className="flex gap-1"><Chip tone="info">{T("plan.teamBasis.gci")}</Chip><Chip>{T("plan.teamBasis.after_broker")}</Chip></span></label></div></Card>
      </div>
      <Card title={T("comm.period")} right={T("comm.capPeriod", { start: "2026-01-01", end: "2026-12-31" })}><div className="flex justify-between text-xs"><span>{T("comm.stat.fixed")}</span><span className="font-mono">$3,000</span></div></Card>
      <Hidden title={h} items={[T("plan.period"), T("plan.saved")]} />
    </div>
  ),
  login: (T, h) => (
    <div className="mx-auto flex max-w-sm flex-col gap-3"><b className="text-lg">NewBee OS</b><span className="text-xs text-muted">{T("login.subtitle")}</span><Input>you@example.com</Input><Input>{T("login.passwordPlaceholder")}</Input><Btn>{T("login.signIn")}</Btn><Btn ghost>{T("login.sendLink")}</Btn><span className="text-xs text-muted">{T("login.wait")}</span><span className="rounded bg-ok-bg p-2 text-xs text-ok">{T("login.sent")}</span><Hidden title={h} items={[]} /></div>
  ),
  field: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.fields")}</div><W className="grid gap-x-6 gap-y-1 p-3 text-sm sm:grid-cols-2">{Object.keys(MESSAGES).filter((k) => k.startsWith("field.")).map((k) => <div key={k} className="flex justify-between border-b border-line py-1"><span>{T(k)}</span><span className="font-mono text-xs text-muted">{k.slice(6)}</span></div>)}</W><Hidden title={h} items={[]} /></div>),
  ms: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.milestones")}</div><W className="p-3 text-sm">{Object.keys(MESSAGES).filter((k) => k.startsWith("ms.")).map((k) => <div key={k} className="flex justify-between border-b border-line py-1"><span>◆ {T(k)}</span><Chip>2026-11-30</Chip></div>)}</W><Hidden title={h} items={[]} /></div>),
  task: (T, h) => (<div className="flex flex-col gap-2"><div className="text-xs text-muted">{T("deal.tab.tasks")}</div><W className="p-3 text-sm">{Object.keys(MESSAGES).filter((k) => k.startsWith("task.")).map((k) => <div key={k} className="flex items-center gap-2 border-b border-line py-1"><span className="h-4 w-4 rounded border border-line-strong" />{T(k)}<span className="ml-auto font-mono text-xs text-muted">{k.slice(5)}</span></div>)}</W><Hidden title={h} items={[]} /></div>),
};
export const ORDER = ["nav", "today", "deals", "deal", "contacts", "contact", "form", "tasks", "commissions", "plan", "settings", "login", "field", "ms", "task"];

/** 用收集器跑一遍复刻，得到每个页面放了哪些 key */
export function placedKeys(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const id of ORDER) { const set = new Set<string>(); const collect: TFn = (k) => { set.add(k); return null; }; REPLICAS[id](collect, ""); out[id] = set; }
  return out;
}
