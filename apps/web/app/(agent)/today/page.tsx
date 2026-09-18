// /today —— 每天打开的第一页：逾期 / 今天 / 未来 7 天 的里程碑与任务（选项卡：全部 / 逾期 / 今天 / 7 天）
import Link from "next/link";
import { addCalendarDays } from "@newbee/core";
import { getPlan, loadCommissions, ytdFor, toReportRows, dashboardLabels } from "@/lib/commissions";
import { CommissionDashboard } from "@/components/commission-dashboard";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Badge, TaskItem, dueTone, type TaskRow } from "@/components/ui";
import { PageHeader, Tabs } from "@/components/page";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();
  const t = await getT();
  const [plan, commissions] = await Promise.all([getPlan(), loadCommissions(supabase)]);
  const ytd = ytdFor(plan, commissions);
  const today = todayISO();
  const horizon = addCalendarDays(today, 7);

  const [{ data: ms }, { data: ts }] = await Promise.all([
    supabase.from("milestones").select("id,key,label,due_date,due_time,deal_id,deals(title)").eq("status", "pending").not("due_date", "is", null).lte("due_date", horizon).order("due_date"),
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,playbook_rule_id,deals(title)").is("done_at", null).is("deleted_at", null).not("due_date", "is", null).lte("due_date", horizon).order("due_date"),
  ]);

  type MsRow = { id: string; key: string; label: string; due_date: string; due_time: string | null; deal_id: string; deals: { title: string } | { title: string }[] | null };
  const milestones = (ms ?? []) as unknown as MsRow[];
  const tasks: TaskRow[] = ((ts ?? []) as unknown as (TaskRow & { deals: { title: string } | { title: string }[] | null })[]).map((x) => ({ ...x, deal_title: dealTitle(x.deals) }));

  const buckets = [
    { id: "overdue", key: "today.overdue", ms: milestones.filter((m) => m.due_date < today), ts: tasks.filter((x) => x.due_date! < today) },
    { id: "today", key: "today.today", ms: milestones.filter((m) => m.due_date === today), ts: tasks.filter((x) => x.due_date === today) },
    { id: "week", key: "today.next7", ms: milestones.filter((m) => m.due_date > today), ts: tasks.filter((x) => x.due_date! > today) },
  ];
  const shown = tab === "all" ? buckets : buckets.filter((b) => b.id === tab);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.today") }]} title={`${t("today.title")} · ${today}`}
        actions={<span className="text-xs text-muted">{t("today.summary", { ms: milestones.length, tasks: tasks.length })}</span>} />
      <Section title={t("dash.title")} right={<Link href="/commissions" className="text-sm text-accent hover:underline">{t("dash.viewAll")}</Link>}>
        <CommissionDashboard compact rows={toReportRows(commissions, t)} today={today} plan={{ capAmount: plan.capAmount, capOn: plan.modules.cap, capYearStart: plan.capYearStart }} capPaid={ytd.brokerPaid} l={dashboardLabels(t)} />
      </Section>

      <Tabs base="/today" active={tab} tabs={[
        { id: "all", label: t("today.all"), count: milestones.length + tasks.length },
        ...buckets.map((b) => ({ id: b.id, label: t(b.key), count: b.ms.length + b.ts.length })),
      ]} />

      {shown.map((b) => (
        <Section key={b.id} title={t(b.key)} right={<span className="text-sm text-muted">{b.ms.length + b.ts.length}</span>}>
          {b.ms.length === 0 && b.ts.length === 0 ? (
            <Empty>{b.id === "overdue" ? t("today.noOverdue") : t("common.empty")}</Empty>
          ) : (
            <>
              {b.ms.length > 0 && (
                <ul className="mb-2 divide-y divide-line">
                  {b.ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg">◆ {t.or(`ms.${m.key}`, m.label)}</div>
                        <Link href={`/deals/${m.deal_id}`} className="text-xs text-accent hover:underline">{dealTitle(m.deals) ?? t("common.deal")}</Link>
                      </div>
                      <Badge tone={dueTone(m.due_date, today)}>{m.due_date}{m.due_time ? ` ${m.due_time.slice(0, 5)}` : ""} · {relDays(m.due_date, today, t)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {b.ts.length > 0 && (
                <ul className="divide-y divide-line">
                  {b.ts.map((x) => <TaskItem key={x.id} task={x} today={today} backTo="/today" t={t} showDeal />)}
                </ul>
              )}
            </>
          )}
        </Section>
      ))}
    </div>
  );
}

function dealTitle(d: { title: string } | { title: string }[] | null | undefined): string | null {
  if (!d) return null;
  return Array.isArray(d) ? d[0]?.title ?? null : d.title;
}
