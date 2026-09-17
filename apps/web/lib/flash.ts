// 一次性提示（flash）：server action 成功后写一个短命 cookie，(agent) layout 读出来交给 Toaster 弹一下。
// 规矩：每个写操作结束都要 setFlash（或 redirect 到能看到结果的页面 + setFlash），用户按了按钮必须看得到反应。
import { cookies } from "next/headers";

export const FLASH_COOKIE = "flash";
export const FLASH_KEYS = ["saved", "created", "deleted", "uploaded", "derived", "extracted", "reset", "sent"] as const;
export type FlashKey = (typeof FLASH_KEYS)[number];
export interface Flash { key: FlashKey; tone: "ok" | "error"; id: number }

export async function setFlash(key: FlashKey, tone: Flash["tone"] = "ok") {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify({ key, tone, id: Date.now() } satisfies Flash), { path: "/", maxAge: 10, httpOnly: false, sameSite: "lax" });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Flash;
    return (FLASH_KEYS as readonly string[]).includes(f.key) ? f : null;
  } catch { return null; }
}
