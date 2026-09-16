// 服务端专用：决定当前 locale、拿到带覆盖值的 t()。每个请求只算一次（React cache）。
// locale 来源：cookie → agents.settings.locale（新设备）→ 默认 zh。
import { cache } from "react";
import { cookies } from "next/headers";
import { makeT, isLocale, DEFAULT_LOCALE, type Locale, type Overrides, type Translator } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getAgentSettings } from "@/lib/settings";

export const LOCALE_COOKIE = "locale";

export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const saved = (await getAgentSettings()).locale;
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
});

/** 未登录时 ui_strings 查不到行（RLS），自然回到代码默认值 */
export const getT = cache(async (): Promise<Translator> => {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.from("ui_strings").select("key,zh,en").is("deleted_at", null);
  const overrides: Overrides = {};
  for (const r of (data ?? []) as { key: string; zh: string | null; en: string | null }[]) {
    overrides[r.key] = { zh: r.zh ?? undefined, en: r.en ?? undefined };
  }
  return makeT(locale, overrides);
});
