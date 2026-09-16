// /tasks —— 所有未完成任务（按交易分组）+ 个人任务 + 快速添加
import { createClient } from "@/lib/supabase/server";
import { addTask } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { todayISO } from "@/lib/format";
import { Section, Empty, Button, inputCls, TaskItem, type TaskRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const [{ data: ts }, { data: ds }] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,playbook_rule_id,deals(title)").is("done_at", null).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("deals").select("id,title").is("deleted_at", null).not("stage", "in", "(closed,terminated)").order("created_at", { ascending: false }),
  ]);
  type Raw = TaskRow & { deals: { title: string } | { title: string }[] | null };
  const tasks: TaskRow[] = ((ts ?? []) as unknown as Raw[]).map((x) => ({ ...x, deal_title: Array.isArray(x.deals) ? x.deals[0]?.title : x.deals?.title }));
  const deals = (ds ?? []) as { id: string; title: string }[];

  const personal = tasks.filter((x) => !x.deal_id);
  const byDeal = new Map<string, TaskRow[]>();
  for (const x of tasks) if (x.deal_id) byDeal.set(x.deal_id, [...(byDeal.get(x.deal_id) ?? []), x]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("tasks.title")} · {tasks.length}</h1>

      <Section title={t("tasks.add")}>
        <form action={addTask} className="flex flex-col gap-2 sm:flex-row">
          <input name="title" required placeholder={t("tasks.whatToDo")} className={inputCls} />
          <input name="due_date" type="date" className={`${inputCls} sm:w-40`} />
          <select name="deal_id" className={`${inputCls} sm:w-48`} defaultValue="">
            <option value="">{t("tasks.personalOption")}</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <Button type="submit">{t("tasks.addButton")}</Button>
        </form>
      </Section>

      <Section title={`${t("tasks.personal")} · ${personal.length}`}>
        {personal.length === 0 ? <Empty>{t("common.empty")}</Empty> : (
          <ul className="divide-y divide-line">{personal.map((x) => <TaskItem key={x.id} task={x} today={today} backTo="/tasks" t={t} />)}</ul>
        )}
      </Section>

      {Array.from(byDeal.entries()).map(([dealId, list]) => (
        <Section key={dealId} title={`${list[0].deal_title ?? t("common.deal")} · ${list.length}`}>
          <ul className="divide-y divide-line">{list.map((x) => <TaskItem key={x.id} task={x} today={today} backTo="/tasks" t={t} />)}</ul>
        </Section>
      ))}
    </div>
  );
}
