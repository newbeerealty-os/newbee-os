// 第 1 个月的"设计系统"：几个最小组件，够用就行。shadcn 等真需要时再装。
import Link from "next/link";
import type { Translator } from "@newbee/core";
import { toggleTask } from "@/lib/actions/deals";
import { relDays } from "@/lib/format";

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-ui border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {/* 规矩：卡片标题栏右侧的字号和左侧标题一样（text-sm） */}
        {right && <div className="flex items-center gap-2 text-sm">{right}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export function Button({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const cls = {
    primary: "bg-accent text-accent-ink hover:bg-accent-strong",
    ghost: "border border-line-strong text-fg hover:bg-chip",
    danger: "border border-danger/40 text-danger hover:bg-danger-bg",
  }[variant];
  return (
    <button {...rest} className={`h-10 rounded-md px-3 text-sm font-medium disabled:opacity-50 ${cls} ${rest.className ?? ""}`}>
      {children}
    </button>
  );
}

export const inputCls = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm";

export function Badge({ children, tone = "zinc", size = "sm" }: { children: React.ReactNode; tone?: "zinc" | "blue" | "green" | "amber" | "red"; size?: "sm" | "md" }) {
  const cls = { zinc: "bg-chip text-fg", blue: "bg-info-bg text-info", green: "bg-ok-bg text-ok", amber: "bg-warn-bg text-warn", red: "bg-danger-bg text-danger" }[tone];
  return <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${size === "md" ? "text-sm" : "text-xs"} ${cls}`}>{children}</span>;
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
        <button aria-label={done ? t("common.markUndone") : t("common.markDone")} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${done ? "border-ok bg-ok text-white" : "border-line-strong bg-surface"}`}>
          {done ? "✓" : ""}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done ? "text-muted line-through" : "text-fg"}`}>{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {showDeal && task.deal_id && (
            <Link href={`/deals/${task.deal_id}`} className="text-accent hover:underline">{task.deal_title ?? t("common.deal")}</Link>
          )}
          {task.due_date && !done && <Badge tone={dueTone(task.due_date, today)}>{task.due_date} · {relDays(task.due_date, today, t)}</Badge>}
        </div>
      </div>
    </li>
  );
}
