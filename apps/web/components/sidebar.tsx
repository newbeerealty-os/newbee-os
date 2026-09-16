"use client";
// 侧栏（方案 A）：展开 250px / 收起 76px；标题固定、菜单区滚动、底部固定；手风琴只展开当前分组；
// 收起态图标上文字下，悬停时文字隐藏、图标放大、右侧弹出该组子菜单；手机变底部 tab。
// 收起状态存 cookie（服务端按它渲染初始状态，不闪）。
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/nav";

export const SIDEBAR_COOKIE = "sidebar"; // "1" = 收起

const ICONS: Record<NavItem["icon"], React.ReactNode> = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  deals: <><path d="M3 7h6l2 2h10v10H3z" /><path d="M3 7V5h6" /></>,
  tasks: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
};

function Icon({ name, className }: { name: NavItem["icon"]; className: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{ICONS[name]}</svg>;
}

function RedBadge({ n, className = "" }: { n?: number; className?: string }) {
  if (!n) return null;
  return <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d64545] px-1.5 font-mono text-[10.5px] font-semibold leading-none text-white ${className}`}>{n}</span>;
}

/** 头像：有图用图，没有就是默认空头像（人形剪影） */
function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) return <img src={src} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-side-line" />;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-side-hover text-side-muted ring-1 ring-side-line" aria-label={name}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.3-8 5.2V21h16v-1.8c0-2.9-3.6-5.2-8-5.2Z" /></svg>
    </span>
  );
}

export interface SidebarLabels { collapse: string; expand: string; toggle: string }

export function Sidebar({ items, initialCollapsed, labels, footer, userName, avatarUrl }: { items: NavItem[]; initialCollapsed: boolean; labels: SidebarLabels; footer: React.ReactNode; userName: string; avatarUrl?: string | null }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = search ? `${pathname}?${search}` : pathname;
  const activeKey = items.find((i) => pathname === `/${i.key}` || pathname.startsWith(`/${i.key}/`) || pathname.startsWith(`/${i.key}?`))?.key ?? null;

  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [openKey, setOpenKey] = useState<string | null>(activeKey);
  useEffect(() => { setOpenKey(activeKey); }, [activeKey]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
  }

  const childActive = (href: string) => href === current || (href === pathname && !search && !href.includes("?"));

  return (
    <>
      {/* 桌面侧栏 */}
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-side-line bg-side transition-[width] duration-200 md:flex ${collapsed ? "w-[76px]" : "w-[250px]"}`}>
        <div className={`flex h-[52px] shrink-0 items-center border-b border-side-line ${collapsed ? "justify-center" : "justify-between pl-4 pr-3"}`}>
          {!collapsed && <b className="truncate text-[15px] font-semibold text-side-text">New<span className="text-accent">Bee</span> OS</b>}
          <button type="button" onClick={toggleCollapsed} title={collapsed ? labels.expand : labels.collapse} aria-label={collapsed ? labels.expand : labels.collapse}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-side-line text-xs text-side-muted hover:border-side-muted hover:text-side-text">
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className={`min-h-0 flex-1 px-2 py-2 ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}>
          {items.map((item) => {
            const active = item.key === activeKey;
            const open = openKey === item.key;
            const rowCls = active ? "bg-side-active text-side-active-text" : "text-side-text hover:bg-side-hover";
            if (collapsed) {
              return (
                <div key={item.key} className="group relative mb-0.5">
                  <Link href={item.href} className={`relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-md ${rowCls}`}>
                    <Icon name={item.icon} className="h-[18px] w-[18px] transition-all duration-150 group-hover:h-7 group-hover:w-7" />
                    <span className="text-[10.5px] font-medium leading-none group-hover:hidden">{item.label}</span>
                    <RedBadge n={item.badge} className={`absolute top-1.5 right-3.5 !h-4 !min-w-4 !text-[10px] ring-2 ${active ? "ring-side-active" : "ring-side"}`} />
                  </Link>
                  {item.children && (
                    <div className="absolute left-full top-0 z-20 hidden pl-1.5 group-hover:block">
                      <div className="flex min-w-[176px] flex-col rounded-md border border-side-line bg-side p-1.5 shadow-xl">
                        <div className="mb-1 border-b border-side-line px-2.5 pb-2 pt-1.5 text-xs font-semibold text-side-text">{item.label}</div>
                        {item.children.map((c) => (
                          <Link key={c.href} href={c.href} className={`flex items-center rounded-md px-2.5 py-1.5 text-[13px] ${childActive(c.href) ? "bg-side-hover font-semibold text-accent" : "text-side-muted hover:bg-side-hover hover:text-side-text"}`}>
                            {c.label}{c.count !== undefined && <span className="ml-auto pl-3 font-mono text-[11px] opacity-80">{c.count}</span>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={item.key} className="mb-0.5">
                <div className={`flex items-center rounded-md ${rowCls}`}>
                  <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 text-[13.5px] font-medium">
                    <Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? "" : "text-side-muted"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {item.children && (
                    <button type="button" onClick={() => setOpenKey(open ? null : item.key)} aria-label={labels.toggle} aria-expanded={open}
                      className={`ml-auto px-1.5 py-2 text-[10px] transition-transform ${open ? "rotate-90" : ""} ${active ? "" : "text-side-muted"}`}>▶</button>
                  )}
                  <RedBadge n={item.badge} className={`mr-2.5 ${item.children ? "ml-1" : "ml-auto"}`} />
                </div>
                {item.children && open && (
                  <div className="mb-1.5 ml-5 mt-0.5 flex flex-col border-l border-side-line pl-1.5">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} className={`flex items-center rounded-md px-2.5 py-1.5 text-[13px] ${childActive(c.href) ? "bg-side-hover font-semibold text-accent" : "text-side-muted hover:bg-side-hover hover:text-side-text"}`}>
                        {c.label}{c.count !== undefined && <span className="ml-auto font-mono text-[11px] opacity-80">{c.count}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {collapsed ? (
          <div className="group relative flex shrink-0 justify-center border-t border-side-line py-2">
            <Avatar name={userName} src={avatarUrl} />
            <div className="absolute bottom-0 left-full z-20 hidden pl-1.5 group-hover:block">
              <div className="flex min-w-[176px] flex-col gap-2 rounded-md border border-side-line bg-side p-2.5 shadow-xl">
                <div className="truncate text-xs font-semibold text-side-text">{userName}</div>
                {footer}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-side-line px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={userName} src={avatarUrl} />
              <span className="truncate text-xs text-side-muted">{userName}</span>
            </div>
            {footer}
          </div>
        )}
      </aside>

      {/* 手机底部 tab */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-side-line bg-side pb-[env(safe-area-inset-bottom)] pt-1.5 md:hidden">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link key={item.key} href={item.href} className={`relative flex w-16 flex-col items-center gap-0.5 rounded-md py-1 text-[10.5px] font-medium ${active ? "text-accent" : "text-side-muted"}`}>
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
              <RedBadge n={item.badge} className="absolute -top-0.5 right-1.5 !h-4 !min-w-4 !text-[10px]" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
