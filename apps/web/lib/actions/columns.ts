"use server";
// 表格列顺序：存 agents.settings.columns[table] = ["title","stage",…]
import { revalidatePath } from "next/cache";
import { getAgentSettings, patchAgentSettings } from "@/lib/settings";

export async function saveColumnOrder(table: string, order: string[]) {
  const clean = order.filter((x) => typeof x === "string" && /^[a-z_]+$/.test(x)).slice(0, 30);
  const current = ((await getAgentSettings()).columns ?? {}) as Record<string, string[]>;
  await patchAgentSettings({ columns: { ...current, [table]: clean } });
  revalidatePath("/", "layout");
}
