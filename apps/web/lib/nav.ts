// 侧栏的数据：菜单树 + 红圈计数。服务端算好，传给 client 侧栏。计数来自 bootstrap（一次 RPC）。
// 红圈定义：今天 = 今天到期的里程碑 + 未完成任务；交易 = 未删除的全部交易；任务 = 挂在交易上的未完成任务。
import { CONTACT_TABS, type Translator } from "@newbee/core";
import { navCountsFromBootstrap } from "@/lib/bootstrap";

export const COMMISSION_FILTERS = ["all", "listing", "buyer", "both", "landlord", "tenant", "referral", "pending", "paid"] as const;
export const DEAL_STAGES = ["lead", "pre", "active", "offer", "under_contract", "closing", "closed", "terminated"] as const;

export interface NavChild { href: string; label: string; count?: number }
export interface NavItem { key: string; href: string; icon: "today" | "deals" | "contacts" | "tasks" | "commissions" | "settings"; label: string; badge?: number; children?: NavChild[] }

export interface NavCounts {
  today: number;
  deals: number;
  byStage: Record<string, number>;
  dealTasks: number;
  personalTasks: number;
  contacts: number;
  contactsByTab: Record<string, number>;
}

/** 计数全部来自每请求一次的 bootstrap RPC（数据库里 count，不把行拉回来数） */
export async function loadNavCounts(): Promise<NavCounts> {
  return navCountsFromBootstrap();
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
      key: "contacts", href: "/contacts", icon: "contacts", label: t("nav.contacts"),
      children: [
        { href: "/contacts", label: t("nav.all"), count: c.contacts },
        ...CONTACT_TABS.map((tab) => ({ href: `/contacts?tab=${tab.id}`, label: t(`contactTab.${tab.id}`), count: c.contactsByTab[tab.id] ?? 0 })),
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
      key: "commissions", href: "/commissions", icon: "commissions", label: t("nav.commissions"),
      children: COMMISSION_FILTERS.map((f) => ({ href: f === "all" ? "/commissions" : `/commissions?f=${f}`, label: commissionFilterLabel(t, f) })),
    },
    {
      key: "settings", href: "/settings/language", icon: "settings", label: t("nav.settings"),
      children: [{ href: "/settings/language", label: t("settings.langTheme") }],
    },
  ];
}

// 佣金二级菜单 / 列表页签共用的标签
export function commissionFilterLabel(t: Translator, f: string): string {
  switch (f) {
    case "listing": return t("commSide.listing");
    case "buyer": return t("commSide.buyer");
    case "both": return t("comm.filter.both");
    case "landlord": return t("commSide.landlord");
    case "tenant": return t("commSide.tenant");
    case "referral": return t("commKind.referral");
    case "pending": return t("comm.filter.pending");
    case "paid": return t("comm.filter.paid");
    default: return t("comm.all");
  }
}
