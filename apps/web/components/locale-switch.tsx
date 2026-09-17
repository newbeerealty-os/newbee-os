// 语言切换：两种语言并排（国旗 + 名称），当前的高亮，点另一个切换。走 Server Action，无客户端 JS。
// 国旗用内嵌 SVG（Windows 不显示国旗 emoji）。
import { LOCALES, type Locale } from "@newbee/core";
import { setLocale } from "@/lib/actions/locale";
import { getLocale, getT } from "@/lib/i18n";

function Flag({ locale, className = "h-3.5 w-5" }: { locale: Locale; className?: string }) {
  if (locale === "zh") {
    return (
      <svg viewBox="0 0 30 20" className={`${className} shrink-0 rounded-[2px]`} aria-hidden="true">
        <rect width="30" height="20" fill="#de2910" />
        <polygon points="5,3 6.2,6.6 10,6.6 6.9,8.8 8.1,12.4 5,10.2 1.9,12.4 3.1,8.8 0,6.6 3.8,6.6" fill="#ffde00" />
        <circle cx="12" cy="3" r="0.9" fill="#ffde00" /><circle cx="14" cy="5.5" r="0.9" fill="#ffde00" /><circle cx="14" cy="9" r="0.9" fill="#ffde00" /><circle cx="12" cy="11.5" r="0.9" fill="#ffde00" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 20" className={`${className} shrink-0 rounded-[2px]`} aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * 20 / 13} width="30" height={20 / 13} fill="#b22234" />)}
      <rect width="12" height={20 * 7 / 13} fill="#3c3b6e" />
    </svg>
  );
}

export async function LocaleSwitch({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  return (
    <form action={setLocale} className={`flex ${compact ? "flex-col items-center gap-1" : "items-center gap-1"} ${className}`}>
      {LOCALES.map((l) => {
        const on = l === locale;
        return (
          <button key={l} name="locale" value={l} disabled={on} aria-current={on ? "true" : undefined} title={t(`locale.${l}`)}
            className={`flex items-center gap-1.5 rounded-md text-[13px] ${compact ? "h-8 w-9 justify-center" : "flex-1 justify-center px-2 py-1.5"} ${on ? "bg-side-active text-side-active-text" : "text-side-muted hover:bg-side-hover hover:text-side-text"}`}>
            <Flag locale={l} />
            {!compact && <span>{t(`locale.${l}`)}</span>}
          </button>
        );
      })}
    </form>
  );
}
