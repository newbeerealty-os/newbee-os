// 中 / EN 切换：两个提交按钮走同一个 Server Action，无客户端 JS
import { LOCALES } from "@newbee/core";
import { setLocale } from "@/lib/actions/locale";
import { getLocale, getT } from "@/lib/i18n";

export async function LocaleSwitch({ className = "" }: { className?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  return (
    <form action={setLocale} className={`inline-flex overflow-hidden rounded-md border border-zinc-300 text-xs ${className}`}>
      {LOCALES.map((l) => (
        <button key={l} name="locale" value={l} disabled={l === locale} aria-current={l === locale ? "true" : undefined}
          className={`px-2 py-1 ${l === locale ? "bg-zinc-800 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}>
          {t(`locale.${l}`)}
        </button>
      ))}
    </form>
  );
}
