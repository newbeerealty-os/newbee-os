// 设置页顶部的两个入口：语言 / 翻译、主题
import Link from "next/link";
import { getT } from "@/lib/i18n";

const TABS = [
  { href: "/settings/language", key: "settings.language" },
  { href: "/settings/theme", key: "settings.theme" },
  { href: "/settings/commission", key: "settings.commission" },
];

export async function SettingsTabs({ active }: { active: string }) {
  const t = await getT();
  return (
    <div className="flex gap-1 border-b border-line">
      {TABS.map((x) => (
        <Link key={x.href} href={x.href} aria-current={x.href === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${x.href === active ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}>
          {t(x.key)}
        </Link>
      ))}
    </div>
  );
}
