import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { loadNavCounts, buildNav } from "@/lib/nav";
import { Sidebar, SIDEBAR_COOKIE } from "@/components/sidebar";
import { LocaleSwitch } from "@/components/locale-switch";
import { Toaster } from "@/components/toaster";
import { readFlash, FLASH_COOKIE } from "@/lib/flash";

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
  const flash = await readFlash();

  return (
    <div className="flex min-h-dvh">
      <Suspense>
        <Sidebar
          items={buildNav(t, counts)}
          initialCollapsed={collapsed}
          labels={{ collapse: t("nav.collapse"), expand: t("nav.expand"), toggle: t("nav.toggleGroup") }}
          userName={agent?.name ?? user.email ?? ""}
          avatarUrl={(user.user_metadata as { avatar_url?: string } | null)?.avatar_url ?? null}
          localeRow={<LocaleSwitch />}
          localeIcon={<LocaleSwitch compact />}
          footer={<form action="/auth/signout" method="post"><button className="shrink-0 text-xs text-side-muted hover:text-side-text">{t("nav.signout")}</button></form>}
        />
      </Suspense>
      <main className="min-w-0 flex-1 p-4 pb-24 md:px-8 md:py-6 md:pb-8">{children}</main>
      <Toaster cookieName={FLASH_COOKIE} initial={flash ? { id: flash.id, tone: flash.tone, text: t(`flash.${flash.key}`) } : null} />
      {/* error.tsx 是 client 边界拿不到 t()，文案从这里读 */}
      <span hidden id="nb-error-labels" data-title={t("error.title")} data-retry={t("error.retry")} data-back={t("error.back")} />
    </div>
  );
}
