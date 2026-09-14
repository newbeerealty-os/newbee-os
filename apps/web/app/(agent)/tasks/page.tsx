// /tasks —— 所有未完成任务（按交易分组）+ 个人任务 + 快速添加
import { createClient } from "@/lib/supabase/server";
import { addTask } from "@/lib/actions/deals";
import { todayISO } from "@/lib/format";
import { Section, Empty, Button, inputCls, TaskItem, type TaskRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const today = todayISO();
  const [{ data: ts }, { data: ds }] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,deals(title)").is("done_at", null).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("deals").select("id,title").is("deleted_at", null).not("stage", "in", "(closed,terminated)").order("created_at", { ascending: false }),
  ]);
  type Raw = TaskRow & { deals: { title: string } | { title: string }[] | null };
  const tasks: TaskRow[] = ((ts ?? []) as unknown as Raw[]).map((t) => ({ ...t, deal_title: Array.isArray(t.deals) ? t.deals[0]?.title : t.deals?.title }));
  const deals = (ds ?? []) as { id: string; title: string }[];

  const personal = tasks.filter((t) => !t.deal_id);
  const byDeal = new Map<string, TaskRow[]>();
  for (const t of tasks) if (t.deal_id) byDeal.set(t.deal_id, [...(byDeal.get(t.deal_id) ?? []), t]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">任务 · {tasks.length}</h1>

      <Section title="添加任务">
        <form action={addTask} className="flex flex-col gap-2 sm:flex-row">
          <input name="title" required placeholder="要做什么" className={inputCls} />
          <input name="due_date" type="date" className={`${inputCls} sm:w-40`} />
          <select name="deal_id" className={`${inputCls} sm:w-48`} defaultValue="">
            <option value="">个人任务</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <Button type="submit">添加</Button>
        </form>
      </Section>

      <Section title={`个人 · ${personal.length}`}>
        {personal.length === 0 ? <Empty>空</Empty> : (
          <ul className="divide-y divide-zinc-100">{personal.map((t) => <TaskItem key={t.id} t={t} today={today} backTo="/tasks" />)}</ul>
        )}
      </Section>

      {Array.from(byDeal.entries()).map(([dealId, list]) => (
        <Section key={dealId} title={`${list[0].deal_title ?? "交易"} · ${list.length}`}>
          <ul className="divide-y divide-zinc-100">{list.map((t) => <TaskItem key={t.id} t={t} today={today} backTo="/tasks" />)}</ul>
        </Section>
      ))}
    </div>
  );
}
