// /tasks —— 未完成任务：全部（按交易分组 + 个人）/ 个人（?scope=personal）+ 快速添加
import { createClient } from "@/lib/supabase/server";
import { addTask } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { todayISO } from "@/lib/format";
import { Section, Empty, Button, inputCls, TaskItem, type TaskRow } from "@/components/ui";
import { PageHeader } from "@/components/page";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ scope?: string; q?: string }> }) {
  const { scope, q = "" } = await searchParams;
  const personalOnly = scope === "personal";
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const [{ data: ts }, { data: ds }] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,playbook_rule_id,deals(title)").is("done_at", null).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("deals").select("id,title").is("deleted_at", null).not("stage", "in", "(closed,terminated)").order("created_at", { ascending: false }),
  ]);
  type Raw = TaskRow & { deals: { title: string } | { title: string }[] | null };
  const needle = q.trim().toLowerCase();
  const allTasks: TaskRow[] = ((ts ?? []) as unknown as Raw[]).map((x) => ({ ...x, deal_title: Array.isArray(x.deals) ? x.deals[0]?.title : x.deals?.title }));
  const suggestions = [...new Set(allTasks.flatMap((x) => [x.playbook_rule_id ? t.or(`task.${x.playbook_rule_id}`, x.title) : x.title, x.deal_title ?? ""]).filter(Boolean))];
  const tasks: TaskRow[] = allTasks
    .filter((x) => !needle || [x.title, x.playbook_rule_id ? t.or(`task.${x.playbook_rule_id}`, x.title) : "", x.deal_title].join(" ").toLowerCase().includes(needle));
  const deals = (ds ?? []) as { id: string; title: string }[];

  const personal = tasks.filter((x) => !x.deal_id);
  const byDeal = new Map<string, TaskRow[]>();
  for (const x of tasks) if (x.deal_id) byDeal.set(x.deal_id, [...(byDeal.get(x.deal_id) ?? []), x]);
  const backTo = personalOnly ? "/tasks?scope=personal" : "/tasks";
  const shownCount = personalOnly ? personal.length : tasks.length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.tasks"), href: "/tasks" }, { label: personalOnly ? t("tasks.scopePersonal") : t("tasks.scopeAll") }]}
        title={`${t("tasks.title")} · ${personalOnly ? t("tasks.scopePersonal") : t("tasks.scopeAll")} · ${shownCount}`}
        subnav={[
          { href: "/tasks", label: t("tasks.scopeAll"), count: tasks.length, active: !personalOnly },
          { href: "/tasks?scope=personal", label: t("tasks.scopePersonal"), count: personal.length, active: personalOnly },
        ]}
        actions={
          <>
          <SearchBox placeholder={t("tasks.search")} label={t("common.search")} allLabel={t("common.searchAll")} items={suggestions.map((label) => ({ label }))} widthClass="w-56" />
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong">{t("tasks.add")}</summary>
            <form action={addTask} className="absolute right-0 z-10 mt-2 flex w-[min(90vw,380px)] flex-col gap-2 rounded-ui border border-line bg-surface p-3 shadow-xl">
              <input name="title" required placeholder={t("tasks.whatToDo")} className={inputCls} />
              <input name="due_date" type="date" className={inputCls} />
              <select name="deal_id" className={inputCls} defaultValue="">
                <option value="">{t("tasks.personalOption")}</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <Button type="submit">{t("tasks.addButton")}</Button>
            </form>
          </details>
          </>
        }
      />

      <Section title={`${t("tasks.personal")} · ${personal.length}`}>
        {personal.length === 0 ? <Empty>{t("common.empty")}</Empty> : (
          <ul className="divide-y divide-line">{personal.map((x) => <TaskItem key={x.id} task={x} today={today} backTo={backTo} t={t} />)}</ul>
        )}
      </Section>

      {!personalOnly && Array.from(byDeal.entries()).map(([dealId, list]) => (
        <Section key={dealId} title={`${list[0].deal_title ?? t("common.deal")} · ${list.length}`}>
          <ul className="divide-y divide-line">{list.map((x) => <TaskItem key={x.id} task={x} today={today} backTo={backTo} t={t} />)}</ul>
        </Section>
      ))}
    </div>
  );
}
