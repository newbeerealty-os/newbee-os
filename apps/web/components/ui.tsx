// 第 1 个月的"设计系统"：几个最小组件，够用就行。shadcn 等真需要时再装。
import Link from "next/link";
import type { Translator } from "@newbee/core";
import { toggleTask } from "@/lib/actions/deals";
import { relDays } from "@/lib/format";

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-zinc-400">{children}</p>;
}

export function Button({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const cls = {
    primary: "bg-[#1f5f8b] text-white hover:bg-[#184b6e]",
    ghost: "border border-zinc-300 text-zinc-700 hover:bg-zinc-50",
    danger: "border border-red-200 text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button {...rest} className={`h-10 rounded-md px-3 text-sm font-medium disabled:opacity-50 ${cls} ${rest.className ?? ""}`}>
      {children}
    </button>
  );
}

export const inputCls = "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm";

export function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "blue" | "green" | "amber" | "red" }) {
  const cls = { zinc: "bg-zinc-100 text-zinc-700", blue: "bg-sky-100 text-sky-800", green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-700" }[tone];
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function dueTone(date: string | null, today: string): "zinc" | "amber" | "red" {
  if (!date) return "zinc";
  if (date < today) return "red";
  if (date === today) return "amber";
  return "zinc";
}

export interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  done_at: string | null;
  deal_id: string | null;
  deal_title?: string | null;
  /** 有 rule id 的任务按 task.<id> 翻译显示；手工任务原样显示 */
  playbook_rule_id?: string | null;
}

/** 一行任务：勾选 = Server Action（bind 上参数），无需客户端 JS */
export function TaskItem({ task, today, backTo, t, showDeal = false }: { task: TaskRow; today: string; backTo: string; t: Translator; showDeal?: boolean }) {
  const done = !!task.done_at;
  const title = task.playbook_rule_id ? t.or(`task.${task.playbook_rule_id}`, task.title) : task.title;
  return (
    <li className="flex items-start gap-3 py-2">
      <form action={toggleTask.bind(null, task.id, !done, backTo)}>
        <button aria-label={done ? t("common.markUndone") : t("common.markDone")} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 bg-white"}`}>
          {done ? "✓" : ""}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {showDeal && task.deal_id && (
            <Link href={`/deals/${task.deal_id}`} className="text-[#1f5f8b] hover:underline">{task.deal_title ?? t("common.deal")}</Link>
          )}
          {task.due_date && !done && <Badge tone={dueTone(task.due_date, today)}>{task.due_date} · {relDays(task.due_date, today, t)}</Badge>}
        </div>
      </div>
    </li>
  );
}
