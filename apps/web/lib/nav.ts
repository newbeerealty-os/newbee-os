// 侧栏的数据：菜单树 + 红圈计数。服务端算好，传给 client 侧栏。
// 红圈定义：今天 = 今天到期的里程碑 + 未完成任务；交易 = 未删除的全部交易；任务 = 挂在交易上的未完成任务。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Translator } from "@newbee/core";
import { todayISO } from "@/lib/format";

export const DEAL_STAGES = ["lead", "pre", "active", "offer", "under_contract", "closing", "closed", "terminated"] as const;

export interface NavChild { href: string; label: string; count?: number }
export interface NavItem { key: string; href: string; icon: "today" | "deals" | "tasks" | "settings"; label: string; badge?: number; children?: NavChild[] }

export interface NavCounts {
  today: number;
  deals: number;
  byStage: Record<string, number>;
  dealTasks: number;
  personalTasks: number;
}

export async function loadNavCounts(supabase: SupabaseClient): Promise<NavCounts> {
  const today = todayISO();
  const [{ data: deals }, { data: tasks }, { count: msToday }] = await Promise.all([
    supabase.from("deals").select("stage").is("deleted_at", null),
    supabase.from("tasks").select("deal_id,due_date").is("done_at", null).is("deleted_at", null),
    supabase.from("milestones").select("id", { count: "exact", head: true }).eq("status", "pending").eq("due_date", today),
  ]);
  const byStage: Record<string, number> = {};
  for (const d of (deals ?? []) as { stage: string }[]) byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;
  const ts = (tasks ?? []) as { deal_id: string | null; due_date: string | null }[];
  return {
    today: (msToday ?? 0) + ts.filter((t) => t.due_date === today).length,
    deals: (deals ?? []).length,
    byStage,
    dealTasks: ts.filter((t) => t.deal_id).length,
    personalTasks: ts.filter((t) => !t.deal_id).length,
  };
}

export function buildNav(t: Translator, c: NavCounts): NavItem[] {
  return [
    { key: "today", href: "/today", icon: "today", label: t("nav.today"), badge: c.today },
    {
      key: "deals", href: "/deals", icon: "deals", label: t("nav.deals"), badge: c.deals,
      children: [
        { href: "/deals", label: t("nav.all"), count: c.deals },
        ...DEAL_STAGES.map((s) => ({ href: `/deals?stage=${s}`, label: t(`stage.${s}`), count: c.byStage[s] ?? 0 })),
      ],
    },
    {
      key: "tasks", href: "/tasks", icon: "tasks", label: t("nav.tasks"), badge: c.dealTasks,
      children: [
        { href: "/tasks", label: t("nav.all"), count: c.dealTasks + c.personalTasks },
        { href: "/tasks?scope=personal", label: t("nav.personal"), count: c.personalTasks },
      ],
    },
    {
      key: "settings", href: "/settings/theme", icon: "settings", label: t("nav.settings"),
      children: [
        { href: "/settings/language", label: t("settings.language") },
        { href: "/settings/theme", label: t("settings.theme") },
      ],
    },
  ];
}
