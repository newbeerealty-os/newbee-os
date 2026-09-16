// 服务端专用：当前用户的 agents.settings（jsonb），每个请求只查一次。locale / theme 都从这里取。
import { cache } from "react";
import { parseThemeSettings, type ThemeSettings } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";

export const getAgentSettings = cache(async (): Promise<Record<string, unknown>> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase.from("agents").select("settings").eq("id", user.id).single();
  return (data?.settings ?? {}) as Record<string, unknown>;
});

export async function getThemeSettings(): Promise<ThemeSettings> {
  return parseThemeSettings((await getAgentSettings()).theme);
}

/** 合并写回 settings 的一个子键（读-改-写；单人使用，不担心并发） */
export async function patchAgentSettings(patch: Record<string, unknown>): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const current = await getAgentSettings();
  const { error } = await supabase.from("agents").update({ settings: { ...current, ...patch } }).eq("id", user.id);
  if (error) throw error;
}
