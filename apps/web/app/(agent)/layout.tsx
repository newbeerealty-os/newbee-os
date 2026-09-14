import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/today", label: "今天" },
  { href: "/deals", label: "交易" },
  { href: "/tasks", label: "任务" },
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* 桌面：左栏；手机：底部 tab */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-zinc-200 bg-white py-2 pb-[env(safe-area-inset-bottom)] md:static md:w-52 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-4">
        <div className="hidden px-2 pb-4 text-lg font-semibold md:block">NewBee OS</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 md:px-3">
            {n.label}
          </Link>
        ))}
        <form action="/auth/signout" method="post" className="hidden md:mt-auto md:block">
          <button className="px-3 py-2 text-xs text-zinc-400">退出</button>
        </form>
      </nav>
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
    </div>
  );
}
