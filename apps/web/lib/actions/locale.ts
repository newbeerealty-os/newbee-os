"use server";
// 切换语言：写 cookie（本设备立即生效）+ agents.settings.locale（跨设备 / 未来 App 读同一个字段）
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from("agents").select("settings").eq("id", user.id).single();
    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    await supabase.from("agents").update({ settings: { ...settings, locale } }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}
