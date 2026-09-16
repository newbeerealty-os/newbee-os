import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { LocaleSwitch } from "@/components/locale-switch";

const NAV = [
  { href: "/today", key: "nav.today" },
  { href: "/deals", key: "nav.deals" },
  { href: "/tasks", key: "nav.tasks" },
  { href: "/settings/theme", key: "nav.settings" },
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getT();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* 桌面：左栏；手机：底部 tab */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-side-line bg-side py-2 pb-[env(safe-area-inset-bottom)] md:static md:w-52 md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-4">
        <div className="hidden px-2 pb-4 text-lg font-semibold text-side-text md:block">NewBee OS</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-side-text hover:bg-side-hover md:px-3">
            {t(n.key)}
          </Link>
        ))}
        <div className="flex items-center gap-2 md:mt-auto md:flex-col md:items-start md:gap-1 md:px-3 md:pt-4">
          <LocaleSwitch />
          <form action="/auth/signout" method="post" className="hidden md:block">
            <button className="py-2 text-xs text-side-muted">{t("nav.signout")}</button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
    </div>
  );
}
