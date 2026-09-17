// /commissions —— 佣金列表：统计卡 + cap 进度 + 可拖可排的表；?f= 过滤（all / listing / buyer / both / lease / referral / pending / paid）；?from=&to=
import Link from "next/link";
import { matchesQuery, sortRows, compareText, compareNumber, compareDate, recurringPerPeriod } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { money } from "@/lib/format";
import { getAgentSettings } from "@/lib/settings";
import { getPlan, loadCommissions, ytdFor, effectiveDate, type CommissionRow } from "@/lib/commissions";
import { whatOf, isBothSides } from "@/lib/commission-props";
import { COMMISSION_FILTERS as FILTERS, commissionFilterLabel } from "@/lib/nav";
import { Section, Empty, Badge, Button, inputCls } from "@/components/ui";
import { PageHeader, Tabs, Stat, StatGrid, SortHeader, readSort } from "@/components/page";
import { SearchBox } from "@/components/search-box";
import { DataTable } from "@/components/data-table";
import { StageDot } from "@/components/stage";
import { COMMISSION_STATUS_TONE as STATUS_TONE } from "@/components/commission-list";
import { PeriodCard } from "@/components/period-card";

export const dynamic = "force-dynamic";


export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; from?: string; to?: string; sort?: string; dir?: string }> }) {
  const sp = await searchParams;
  const f = (FILTERS as readonly string[]).includes(sp.f ?? "") ? sp.f! : "all";
  const q = (sp.q ?? "").trim();
  const { sort, dir } = readSort(sp);
  const supabase = await createClient();
  const [t, plan, agentSettings] = await Promise.all([getT(), getPlan(), getAgentSettings()]);
  const all = await loadCommissions(supabase);
  const ytd = ytdFor(plan, all);
  const columnOrder = ((agentSettings.columns ?? {}) as Record<string, string[]>).commissions;

  const inFilter = (r: CommissionRow, x = f) => {
    switch (x) {
      case "listing": return r.kind === "deal" && r.side === "listing";
      case "buyer": return r.kind === "deal" && r.side === "buyer";
      case "both": return isBothSides(r, all);
      case "landlord": return r.kind === "deal" && r.side === "landlord";
      case "tenant": return r.kind === "deal" && r.side === "tenant";
      case "referral": return r.kind === "referral";
      case "pending": return r.status === "pending" || r.status === "closed";
      case "paid": return r.status === "paid";
      default: return true;
    }
  };
  const inRange = (r: CommissionRow) => { const d = effectiveDate(r); return (!sp.from || d >= sp.from) && (!sp.to || d <= sp.to); };
  const text = (r: CommissionRow) => ({ text: [whatOf(r, t), t(`commSide.${r.side}`), t(`commStatus.${r.status}`), r.notes].filter(Boolean).join(" "), nums: [r.price ?? 0, r.computed?.gci ?? 0, r.computed?.nci ?? 0] });
  const rows = all.filter((r) => inFilter(r) && inRange(r) && matchesQuery(q, text(r)));

  // 统计：本周期
  const inPeriod = all.filter((r) => { const d = effectiveDate(r); return d >= ytd.period.start && d <= ytd.period.end && r.status !== "cancelled"; });
  const sum = (xs: CommissionRow[], k: "gci" | "nci") => xs.reduce((s, r) => s + (r.computed?.[k] ?? 0), 0);
  const stats = { gci: sum(inPeriod, "gci"), nci: sum(inPeriod, "nci"), paid: sum(inPeriod.filter((r) => r.status === "paid"), "nci"), pending: sum(inPeriod.filter((r) => r.status === "pending" || r.status === "closed"), "nci") };

  const items = rows.map((r) => ({ r, what: whatOf(r, t), date: effectiveDate(r), both: isBothSides(r, all) }));
  const sorted = sort === "date" ? sortRows(items, (x) => x.date, compareDate, dir)
    : sort === "what" ? sortRows(items, (x) => x.what, compareText, dir)
    : sort === "kind" ? sortRows(items, (x) => t(`commSide.${x.r.side}`), compareText, dir)
    : sort === "price" ? sortRows(items, (x) => x.r.price, compareNumber, dir)
    : sort === "gci" ? sortRows(items, (x) => x.r.computed?.gci ?? null, compareNumber, dir)
    : sort === "ded" ? sortRows(items, (x) => x.r.computed?.totalDeductions ?? null, compareNumber, dir)
    : sort === "nci" ? sortRows(items, (x) => x.r.computed?.nci ?? null, compareNumber, dir)
    : sort === "status" ? sortRows(items, (x) => t(`commStatus.${x.r.status}`), compareText, dir)
    : items;
  const hp = { f: f === "all" ? undefined : f, q: q || undefined, from: sp.from, to: sp.to, sort: sp.sort, dir: sp.dir };
  const href = (nf: string) => { const u = new URLSearchParams(); if (nf !== "all") u.set("f", nf); if (q) u.set("q", q); if (sp.from) u.set("from", sp.from); if (sp.to) u.set("to", sp.to); const s = u.toString(); return s ? `/commissions?${s}` : "/commissions"; };
  const fLabel = (x: string) => commissionFilterLabel(t, x);
  const H = (col: string, label: string, align?: "right") => <SortHeader col={col} label={label} sort={sort} dir={dir} params={hp} align={align} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.commissions"), href: "/commissions" }, { label: fLabel(f) }]} title={`${t("comm.title")} · ${fLabel(f)}`}
        subnav={FILTERS.map((x) => ({ href: href(x), label: fLabel(x), count: all.filter((r) => inFilter(r, x)).length, active: f === x }))}
        actions={
          <>
            <form method="get" className="flex items-center gap-1 text-xs text-muted">
              {f !== "all" && <input type="hidden" name="f" value={f} />}
              {t("comm.from")}<input type="date" name="from" defaultValue={sp.from ?? ""} className={`${inputCls} w-36`} />{t("comm.to")}<input type="date" name="to" defaultValue={sp.to ?? ""} className={`${inputCls} w-36`} />
              <Button variant="ghost">OK</Button>
            </form>
            <SearchBox placeholder={t("comm.search")} label={t("common.search")} allLabel={t("common.searchAll")} items={all.map((r) => ({ label: whatOf(r, t), ...text(r) }))} widthClass="w-56" />
            <Link href="/commissions/new?kind=referral" className="flex h-10 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-chip">{t("comm.newReferral")}</Link>
            <Link href="/commissions/new" className="flex h-10 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong">{t("comm.new")}</Link>
          </>
        } />

      <StatGrid>
        <Stat label={t("comm.stat.gci")} value={money(stats.gci)} />
        <Stat label={t("comm.stat.nci")} value={money(stats.nci)} />
        <Stat label={t("comm.stat.paid")} value={money(stats.paid)} />
        <Stat label={t("comm.stat.pending")} value={money(stats.pending)} tone={stats.pending ? "warn" : undefined} />
      </StatGrid>
      <PeriodCard t={t} plan={plan} ytd={ytd} fixed={recurringPerPeriod(plan)} money={money} />

      <div className="hidden md:block">
        <Tabs base={href("all")} param="f" active={f} tabs={FILTERS.map((x) => ({ id: x, label: fLabel(x), count: all.filter((r) => inFilter(r, x)).length }))} />
      </div>

      <Section title={`${t("comm.title")} · ${fLabel(f)}`} right={<span className="font-mono text-sm text-muted">{rows.length}</span>}>
        {rows.length === 0 ? <Empty>{q ? t("common.noMatch") : t("comm.none")}</Empty> : (
          <DataTable table="commissions" initialOrder={columnOrder} dragHint={t("common.dragColumn")}
            columns={[
              { id: "date", width: ".9fr", header: H("date", t("comm.col.date")) },
              { id: "what", width: "1.8fr", header: H("what", t("comm.col.what")) },
              { id: "kind", width: "1fr", header: H("kind", t("comm.col.kind")) },
              { id: "price", width: ".9fr", align: "right", header: H("price", t("comm.col.price"), "right") },
              { id: "gci", width: ".9fr", align: "right", header: H("gci", t("comm.col.gci"), "right") },
              { id: "ded", width: ".9fr", align: "right", mobile: false, header: H("ded", t("comm.col.deductions"), "right") },
              { id: "nci", width: ".9fr", align: "right", header: H("nci", t("comm.col.nci"), "right") },
              { id: "status", width: ".8fr", header: H("status", t("comm.col.status")) },
            ]}
            rows={sorted.map(({ r, what, date, both }) => ({ key: r.id, href: `/commissions/${r.id}`, cells: {
              date: <span className="font-mono text-xs">{date}</span>,
              what: <div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{what}</div>{r.deal && <div className="flex items-center gap-1 text-[11.5px] text-muted"><StageDot stage={r.deal.stage} /> {t(`stage.${r.deal.stage}`)}</div>}</div>,
              kind: <div className="flex flex-wrap gap-1"><Badge tone={r.kind === "referral" ? "amber" : "blue"}>{r.kind === "referral" ? t("commKind.referral") : t(`commSide.${r.side}`)}</Badge>{both && <Badge>{t("comm.both")}</Badge>}</div>,
              price: <span className="font-mono text-sm">{r.price ? money(r.price) : "—"}</span>,
              gci: <span className="font-mono text-sm">{money(r.computed?.gci ?? 0)}</span>,
              ded: <span className="font-mono text-sm text-danger">({money(r.computed?.totalDeductions ?? 0)})</span>,
              nci: <span className="font-mono text-sm font-semibold">{money(r.computed?.nci ?? 0)}</span>,
              status: <Badge tone={STATUS_TONE[r.status] ?? "zinc"}>{t(`commStatus.${r.status}`)}</Badge>,
            } }))} />
        )}
      </Section>
    </div>
  );
}
