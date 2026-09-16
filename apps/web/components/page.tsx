// 页面骨架：页头（面包屑 + 标题 + 动作）、选项卡（链接式 ?tab=，服务端只渲染当前块）、手机上的二级胶囊、统计卡
import Link from "next/link";

export interface Crumb { label: string; href?: string }
export interface SubNav { href: string; label: string; count?: number; active: boolean }

export function PageHeader({ crumbs, title, actions, subnav }: { crumbs: Crumb[]; title: React.ReactNode; actions?: React.ReactNode; subnav?: SubNav[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && " / "}
                {c.href ? <Link href={c.href} className="text-accent hover:underline">{c.label}</Link> : <span className={i === crumbs.length - 1 ? "font-medium text-fg" : ""}>{c.label}</span>}
              </span>
            ))}
          </div>
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {subnav && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:hidden">
          {subnav.map((s) => (
            <Link key={s.href} href={s.href} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${s.active ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface text-fg"}`}>
              {s.label}{s.count !== undefined && <span className={`font-mono text-[10.5px] ${s.active ? "opacity-85" : "text-muted"}`}>{s.count}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export interface TabDef { id: string; label: string; count?: number | null }

/** 选项卡 = 链接，?tab=id；第一个是默认，不带参数 */
export function Tabs({ base, tabs, active, param = "tab" }: { base: string; tabs: TabDef[]; active: string; param?: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-line px-4">
      {tabs.map((tb, i) => {
        const on = tb.id === active;
        return (
          <Link key={tb.id} href={i === 0 ? base : `${base}${sep}${param}=${tb.id}`} aria-current={on ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13.5px] font-medium ${on ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}>
            {tb.label}
            {tb.count !== undefined && tb.count !== null && <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${on ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>{tb.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "danger" | "warn" }) {
  return (
    <div className="rounded-ui border border-line bg-surface px-4 py-3">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className={`mt-0.5 text-[22px] font-semibold tracking-tight tabular-nums ${tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : ""}`}>
        {value}{sub && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{sub}</span>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}
