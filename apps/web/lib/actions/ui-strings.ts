"use server";
// 翻译覆盖值：保存 = upsert(agent_id, key)；两栏都空 = 等于恢复默认（删行）
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function saveUiString(formData: FormData) {
  const { supabase, userId } = await me();
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;
  const zh = String(formData.get("zh") ?? "").trim() || null;
  const en = String(formData.get("en") ?? "").trim() || null;
  const { error } = zh === null && en === null
    ? await supabase.from("ui_strings").delete().eq("key", key)
    : await supabase.from("ui_strings").upsert({ agent_id: userId, key, zh, en, deleted_at: null }, { onConflict: "agent_id,key" });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function resetUiString(key: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("ui_strings").delete().eq("key", key);
  if (error) throw error;
  revalidatePath("/", "layout");
}
