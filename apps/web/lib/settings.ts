// 服务端专用：当前用户的 agents.settings（jsonb），来自每请求一次的 bootstrap。locale / theme 都从这里取。
import { cache } from "react";
import { parseThemeSettings, type ThemeSettings } from "@newbee/core";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getBootstrap } from "@/lib/bootstrap";

export const getAgentSettings = cache(async (): Promise<Record<string, unknown>> => (await getBootstrap()).settings);

export async function getThemeSettings(): Promise<ThemeSettings> {
  return parseThemeSettings((await getAgentSettings()).theme);
}

/** 合并写回 settings 的一个子键（读-改-写；单人使用，不担心并发） */
export async function patchAgentSettings(patch: Record<string, unknown>): Promise<void> {
  const supabase = await createClient();
  const userId = await getUserId();
  if (!userId) return;
  // 写之前重新读一次最新值（不用 bootstrap 的缓存，避免同一请求里连改两次互相覆盖）
  const { data } = await supabase.from("agents").select("settings").eq("id", userId).single();
  const current = (data?.settings ?? {}) as Record<string, unknown>;
  const { error } = await supabase.from("agents").update({ settings: { ...current, ...patch } }).eq("id", userId);
  if (error) throw error;
}
