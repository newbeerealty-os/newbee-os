// /today —— 每天打开的第一页：逾期 / 今天 / 未来 7 天 的里程碑与任务
import Link from "next/link";
import { addCalendarDays } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Badge, TaskItem, dueTone, type TaskRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();
  const t = await getT();
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
    { key: "today.overdue", ms: milestones.filter((m) => m.due_date < today), ts: tasks.filter((x) => x.due_date! < today) },
    { key: "today.today", ms: milestones.filter((m) => m.due_date === today), ts: tasks.filter((x) => x.due_date === today) },
    { key: "today.next7", ms: milestones.filter((m) => m.due_date > today), ts: tasks.filter((x) => x.due_date! > today) },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{t("today.title")} · {today}</h1>
        <span className="text-xs text-zinc-500">{t("today.summary", { ms: milestones.length, tasks: tasks.length })}</span>
      </div>

      {buckets.map((b) => (
        <Section key={b.key} title={t(b.key)} right={<span className="text-xs text-zinc-400">{b.ms.length + b.ts.length}</span>}>
          {b.ms.length === 0 && b.ts.length === 0 ? (
            <Empty>{b.key === "today.overdue" ? t("today.noOverdue") : t("common.empty")}</Empty>
          ) : (
            <>
              {b.ms.length > 0 && (
                <ul className="mb-2 divide-y divide-zinc-100">
                  {b.ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-800">◆ {t.or(`ms.${m.key}`, m.label)}</div>
                        <Link href={`/deals/${m.deal_id}`} className="text-xs text-[#1f5f8b] hover:underline">{dealTitle(m.deals) ?? t("common.deal")}</Link>
                      </div>
                      <Badge tone={dueTone(m.due_date, today)}>{m.due_date}{m.due_time ? ` ${m.due_time.slice(0, 5)}` : ""} · {relDays(m.due_date, today, t)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {b.ts.length > 0 && (
                <ul className="divide-y divide-zinc-100">
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
