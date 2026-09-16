"use server";
// 保存主题设置到 agents.settings.theme；形状由 core 的 ThemeSettingsSchema 把关
import { revalidatePath } from "next/cache";
import { parseThemeSettings } from "@newbee/core";
import { patchAgentSettings } from "@/lib/settings";

export async function saveTheme(formData: FormData) {
  const num = (k: string) => { const n = Number(formData.get(k)); return Number.isFinite(n) ? n : undefined; };
  const theme = parseThemeSettings({
    mode: formData.get("mode"),
    day: formData.get("day"),
    night: formData.get("night"),
    lat: num("lat"),
    lng: num("lng"),
  });
  await patchAgentSettings({ theme });
  revalidatePath("/", "layout");
}
