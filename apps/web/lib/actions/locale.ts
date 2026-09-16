"use server";
// 切换语言：写 cookie（本设备立即生效）+ agents.settings.locale（跨设备 / 未来 App 读同一个字段）
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "@newbee/core";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { patchAgentSettings } from "@/lib/settings";

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await patchAgentSettings({ locale });
  revalidatePath("/", "layout");
}
