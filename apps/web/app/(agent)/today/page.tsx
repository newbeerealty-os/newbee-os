// /today —— 每天打开的第一页：逾期 / 今天 / 未来 7 天 的里程碑与任务
import Link from "next/link";
import { addCalendarDays } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Badge, TaskItem, dueTone, type TaskRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();
  const today = todayISO();
  const horizon = addCalendarDays(today, 7);

  const [{ data: ms }, { data: ts }] = await Promise.all([
    supabase.from("milestones").select("id,key,label,due_date,due_time,deal_id,deals(title)").eq("status", "pending").not("due_date", "is", null).lte("due_date", horizon).order("due_date"),
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,deals(title)").is("done_at", null).is("deleted_at", null).not("due_date", "is", null).lte("due_date", horizon).order("due_date"),
  ]);

  type MsRow = { id: string; key: string; label: string; due_date: string; due_time: string | null; deal_id: string; deals: { title: string } | { title: string }[] | null };
  const milestones = (ms ?? []) as unknown as MsRow[];
  const tasks: TaskRow[] = ((ts ?? []) as unknown as (TaskRow & { deals: { title: string } | { title: string }[] | null })[]).map((t) => ({ ...t, deal_title: dealTitle(t.deals) }));

  const buckets = [
    { name: "逾期", ms: milestones.filter((m) => m.due_date < today), ts: tasks.filter((t) => t.due_date! < today) },
    { name: "今天", ms: milestones.filter((m) => m.due_date === today), ts: tasks.filter((t) => t.due_date === today) },
    { name: "未来 7 天", ms: milestones.filter((m) => m.due_date > today), ts: tasks.filter((t) => t.due_date! > today) },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">今天 · {today}</h1>
        <span className="text-xs text-zinc-500">{milestones.length} 个节点 · {tasks.length} 个任务</span>
      </div>

      {buckets.map((b) => (
        <Section key={b.name} title={b.name} right={<span className="text-xs text-zinc-400">{b.ms.length + b.ts.length}</span>}>
          {b.ms.length === 0 && b.ts.length === 0 ? (
            <Empty>{b.name === "逾期" ? "没有逾期，很好。" : "空"}</Empty>
          ) : (
            <>
              {b.ms.length > 0 && (
                <ul className="mb-2 divide-y divide-zinc-100">
                  {b.ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-800">◆ {m.label}</div>
                        <Link href={`/deals/${m.deal_id}`} className="text-xs text-[#1f5f8b] hover:underline">{dealTitle(m.deals)}</Link>
                      </div>
                      <Badge tone={dueTone(m.due_date, today)}>{m.due_date}{m.due_time ? ` ${m.due_time.slice(0, 5)}` : ""} · {relDays(m.due_date, today)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {b.ts.length > 0 && (
                <ul className="divide-y divide-zinc-100">
                  {b.ts.map((t) => <TaskItem key={t.id} t={t} today={today} backTo="/today" showDeal />)}
                </ul>
              )}
            </>
          )}
        </Section>
      ))}
    </div>
  );
}

function dealTitle(d: { title: string } | { title: string }[] | null | undefined): string {
  if (!d) return "交易";
  return Array.isArray(d) ? d[0]?.title ?? "交易" : d.title;
}
