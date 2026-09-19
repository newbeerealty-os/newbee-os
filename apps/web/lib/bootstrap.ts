// 每个请求的"开机数据"：一次 RPC（app_bootstrap）拿回账号设置、姓名、翻译覆盖、侧栏计数。
// React cache：同一个请求里 layout / page / generateMetadata 都调也只跑一次。
import { cache } from "react";
import { CONTACT_TABS } from "@newbee/core";
import { createClient, getUserId } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

export interface Bootstrap {
  name: string | null;
  settings: Record<string, unknown>;
  ui_strings: { key: string; zh: string | null; en: string | null }[];
  deals_by_stage: Record<string, number>;
  tasks: { deal: number; personal: number; today: number };
  ms_today: number;
  contacts_by_kind: Record<string, number>;
  orgs_by_kind: Record<string, number>;
}
const EMPTY: Bootstrap = { name: null, settings: {}, ui_strings: [], deals_by_stage: {}, tasks: { deal: 0, personal: 0, today: 0 }, ms_today: 0, contacts_by_kind: {}, orgs_by_kind: {} };

export const getBootstrap = cache(async (): Promise<Bootstrap> => {
  if (!(await getUserId())) return EMPTY; // 未登录（登录页）：没有账号数据，全部默认
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("app_bootstrap", { p_today: todayISO() });
  if (error) throw new Error(`app_bootstrap failed: ${error.message}`);
  const b = (data ?? {}) as Partial<Bootstrap>;
  return { ...EMPTY, ...b, settings: (b.settings ?? {}) as Record<string, unknown>, tasks: { ...EMPTY.tasks, ...(b.tasks ?? {}) } };
});

/** 侧栏红圈 / 二级计数，全部从 bootstrap 派生 */
export async function navCountsFromBootstrap() {
  const b = await getBootstrap();
  const contactsByTab: Record<string, number> = {};
  for (const tab of CONTACT_TABS) {
    contactsByTab[tab.id] = (tab.kinds as readonly string[]).reduce((s, k) => s + (b.contacts_by_kind[k] ?? 0), 0)
      + (tab.orgKinds as readonly string[]).reduce((s, k) => s + (b.orgs_by_kind[k] ?? 0), 0);
  }
  const sum = (o: Record<string, number>) => Object.values(o).reduce((s, n) => s + n, 0);
  return {
    today: b.ms_today + b.tasks.today,
    deals: sum(b.deals_by_stage),
    byStage: b.deals_by_stage,
    dealTasks: b.tasks.deal,
    personalTasks: b.tasks.personal,
    contacts: sum(b.contacts_by_kind) + sum(b.orgs_by_kind),
    contactsByTab,
  };
}
