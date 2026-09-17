// 语言切换：一个按钮 = 图标 + 当前语言名，点一下换成另一种。走 Server Action，无客户端 JS。
import { LOCALES } from "@newbee/core";
import { setLocale } from "@/lib/actions/locale";
import { getLocale, getT } from "@/lib/i18n";

export async function LocaleSwitch({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const other = LOCALES.find((l) => l !== locale) ?? locale;
  return (
    <form action={setLocale} className={className}>
      <button name="locale" value={other} title={t(`locale.${other}`)} aria-label={t(`locale.${other}`)}
        className={`flex items-center gap-2 rounded-md text-side-text hover:bg-side-hover ${compact ? "h-9 w-9 justify-center" : "w-full px-2.5 py-2 text-[13px]"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 text-side-muted" aria-hidden="true">
          <path d="M3 5h9M7.5 3v2M4 14c3-2 5-5 5.5-9M6 9c1 2.5 3 4.5 5.5 5.5" /><path d="m12 20 3.5-9 3.5 9M13.3 17h4.4" />
        </svg>
        {!compact && <span>{t(`locale.${locale}`)}</span>}
      </button>
    </form>
  );
}
