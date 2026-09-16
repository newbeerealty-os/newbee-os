import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { loadNavCounts, buildNav } from "@/lib/nav";
import { Sidebar, SIDEBAR_COOKIE } from "@/components/sidebar";
import { LocaleSwitch } from "@/components/locale-switch";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [t, counts, cookieStore, { data: agent }] = await Promise.all([
    getT(),
    loadNavCounts(supabase),
    cookies(),
    supabase.from("agents").select("name").eq("id", user.id).single(),
  ]);
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="flex min-h-dvh">
      <Suspense>
        <Sidebar
          items={buildNav(t, counts)}
          initialCollapsed={collapsed}
          labels={{ collapse: t("nav.collapse"), expand: t("nav.expand"), toggle: t("nav.toggleGroup") }}
          userName={agent?.name ?? user.email ?? ""}
          footer={
            <div className="flex items-center gap-2">
              <LocaleSwitch />
              <form action="/auth/signout" method="post"><button className="text-xs text-side-muted hover:text-side-text">{t("nav.signout")}</button></form>
            </div>
          }
        />
      </Suspense>
      <main className="min-w-0 flex-1 p-4 pb-24 md:px-8 md:py-6 md:pb-8">{children}</main>
    </div>
  );
}
