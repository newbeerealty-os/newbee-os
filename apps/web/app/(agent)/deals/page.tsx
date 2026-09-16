// /deals —— 交易列表（?stage= 按阶段过滤）+ 顶部统计 + 新建交易
import Link from "next/link";
import { addCalendarDays } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { DEAL_STAGES } from "@/lib/nav";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, dueTone } from "@/components/ui";
import { PageHeader, Stat, StatGrid } from "@/components/page";

export const dynamic = "force-dynamic";

const TYPES = ["seller", "buyer", "lease_listing", "lease_tenant", "property_mgmt"];

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const stageFilter = DEAL_STAGES.includes(stage as (typeof DEAL_STAGES)[number]) ? stage! : null;
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const horizon = addCalendarDays(today, 7);

  const { data } = await supabase.from("deals").select("id,title,type,stage,addenda,created_at,milestones(key,label,due_date,status),tasks(id,done_at,deleted_at)").is("deleted_at", null).order("created_at", { ascending: false });
  type Row = { id: string; title: string; type: string; stage: string; addenda: string[]; milestones: { key: string; label: string; due_date: string | null; status: string }[]; tasks: { id: string; done_at: string | null; deleted_at: string | null }[] };
  const all = (data ?? []) as unknown as Row[];
  const deals = stageFilter ? all.filter((d) => d.stage === stageFilter) : all;

  // 统计只看当前过滤范围
  const pendingMs = deals.flatMap((d) => d.milestones.filter((m) => m.status === "pending" && m.due_date));
  const stats = {
    week: pendingMs.filter((m) => m.due_date! >= today && m.due_date! <= horizon).length,
    overdue: pendingMs.filter((m) => m.due_date! < today).length,
    open: deals.reduce((n, d) => n + d.tasks.filter((x) => !x.done_at && !x.deleted_at).length, 0),
  };
  const byStage: Record<string, number> = {};
  for (const d of all) byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;
  const subnav = [
    { href: "/deals", label: t("deals.stageAll"), count: all.length, active: !stageFilter },
    ...DEAL_STAGES.map((s) => ({ href: `/deals?stage=${s}`, label: t(`stage.${s}`), count: byStage[s] ?? 0, active: stageFilter === s })),
  ];
  const title = stageFilter ? `${t("deals.title")} · ${t(`stage.${stageFilter}`)}` : `${t("deals.title")} · ${t("deals.stageAll")}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.deals"), href: "/deals" }, { label: stageFilter ? t(`stage.${stageFilter}`) : t("deals.stageAll") }]} title={title} subnav={subnav}
        actions={
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong">{t("deals.new")}</summary>
            <form action={createDeal} className="absolute right-0 z-10 mt-2 flex w-[min(90vw,380px)] flex-col gap-2 rounded-ui border border-line bg-surface p-3 shadow-xl">
              <input name="title" required placeholder={t("deals.titlePlaceholder")} className={inputCls} />
              <select name="type" className={inputCls} defaultValue="seller">
                {TYPES.map((k) => <option key={k} value={k}>{t(`type.${k}`)}</option>)}
              </select>
              <Button type="submit">{t("deals.create")}</Button>
            </form>
          </details>
        } />

      <StatGrid>
        <Stat label={t("deals.stat.count")} value={deals.length} />
        <Stat label={t("deals.stat.week")} value={stats.week} tone={stats.week ? "warn" : undefined} />
        <Stat label={t("deals.stat.overdue")} value={stats.overdue} tone={stats.overdue ? "danger" : undefined} />
        <Stat label={t("deals.stat.open")} value={stats.open} />
      </StatGrid>

      <Section title={title} right={<span className="font-mono text-xs text-muted">{deals.length}</span>}>
        {deals.length === 0 ? (
          <Empty>{stageFilter ? t("deals.noneInStage") : t("deals.none")}</Empty>
        ) : (
          <div className="-mx-4 -my-4">
            <div className="hidden grid-cols-[1.6fr_1fr_1.2fr_1.4fr_.6fr] gap-3 border-b border-line bg-chip/40 px-4 py-2 text-[11.5px] font-semibold text-muted md:grid">
              <span>{t("deals.col.deal")}</span><span>{stageFilter ? t("deals.col.type") : t("deals.col.stage")}</span><span>{t("deals.col.next")}</span><span>{t("deals.col.date")}</span><span className="text-right">{t("deals.col.open")}</span>
            </div>
            <ul className="divide-y divide-line">
              {deals.map((d) => {
                const next = d.milestones.filter((m) => m.status === "pending" && m.due_date && m.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
                const open = d.tasks.filter((x) => !x.done_at && !x.deleted_at).length;
                return (
                  <li key={d.id}>
                    <Link href={`/deals/${d.id}`} className="grid gap-1.5 px-4 py-3 hover:bg-chip/40 md:grid-cols-[1.6fr_1fr_1.2fr_1.4fr_.6fr] md:items-center md:gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-fg">{d.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[11.5px] text-muted">
                          {d.addenda.map((a) => <Badge key={a} tone="blue">{a.replace(/_addendum$/, "")}</Badge>)}
                          <span className="md:hidden">{t("deals.openTasks", { n: open })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Badge>{t(`type.${d.type}`)}</Badge>
                        {!stageFilter && <Badge tone="blue">{t(`stage.${d.stage}`)}</Badge>}
                      </div>
                      <div className="truncate text-sm">{next ? t.or(`ms.${next.key}`, next.label) : <span className="text-muted">{t("deals.noNext")}</span>}</div>
                      <div>{next && <Badge tone={dueTone(next.due_date, today)}>{next.due_date} · {relDays(next.due_date, today, t)}</Badge>}</div>
                      <div className="hidden text-right font-mono text-sm md:block">{open}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>
    </div>
  );
}
