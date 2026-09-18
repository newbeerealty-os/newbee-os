"use client";
// 佣金总览：过滤行（时间 + 类型）→ 四张卡（笔数 / GCI / NCI 去哪儿了 / Cap；三行文字 + 分段横条 + 图例）→ 每月柱状 + 待收清单。
// 数据算法在 core（buildCommissionReport），这里只画。颜色走主题的 --viz-* 变量。compact = 门户首页版（不放月度柱）。
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCommissionReport, periodRange, REPORT_STATUSES, PERIOD_PRESETS, type ReportRow, type PeriodPreset, type CommissionSide, type ReportStatus } from "@newbee/core";

export type DashLabels = Record<string, string>;
export interface CommissionDashboardProps {
  rows: ReportRow[];
  today: string;
  plan: { capAmount: number; capOn: boolean; capYearStart: string };
  capPaid: number;
  l: DashLabels;
  compact?: boolean;
  /** 初始时间段（/commissions 从 URL 来） */
  initial?: { from: string; to: string };
  /** 时间段变化时写进 URL（?from&to），让下面的表跟着 */
  syncUrl?: boolean;
}

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const short = (n: number) => (Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : money(n));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
// 类型颜色顺序固定：卖方 / 买方 / 放租 / 寻租 / 推荐费 用主题的 5 个分类色，托管用灰
const SIDE_ORDER: CommissionSide[] = ["listing", "buyer", "landlord", "tenant", "referral", "management"];
const SIDE_VAR = (s: CommissionSide) => (s === "management" ? "var(--viz-ded-2)" : `var(--viz-side-${SIDE_ORDER.indexOf(s) + 1})`);
const STATUS_VAR = (i: number) => `var(--viz-status-${i + 1})`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// ---------- 提示浮层（一个，全局复用） ----------
interface TipRow { color: string; label: string; value: string }
interface Tip { x: number; y: number; title: string; rows: TipRow[]; total?: [string, string] }
function Tooltip({ tip }: { tip: Tip | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  useEffect(() => {
    if (!tip || !ref.current) return;
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    let left = tip.x + 14, top = tip.y + 14;
    if (left + w > window.innerWidth - 8) left = tip.x - w - 14;
    if (top + h > window.innerHeight - 8) top = tip.y - h - 14;
    setPos({ left, top });
  }, [tip]);
  if (!tip) return null;
  return (
    <div ref={ref} role="status" style={pos} className="pointer-events-none fixed z-40 min-w-40 rounded-xl bg-fg px-3 py-2 text-xs text-surface shadow-xl">
      <div className="mb-1 font-semibold opacity-80">{tip.title}</div>
      {tip.rows.map((r, i) => <div key={i} className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} />{r.label}</span><b className="font-mono font-medium">{r.value}</b></div>)}
      {tip.total && <div className="mt-1 flex justify-between gap-3 border-t border-surface/20 pt-1"><span>{tip.total[0]}</span><b className="font-mono font-medium">{tip.total[1]}</b></div>}
    </div>
  );
}

// ---------- 环 ----------
interface Part { label: string; color: string; value: number }
type SetTip = React.Dispatch<React.SetStateAction<Tip | null>>;
function Ring({ label, value, sub, parts, center, centerSub, fmt, onTip, href, share }: { label: string; value: string; sub?: React.ReactNode; parts: Part[]; center: string; centerSub?: string; fmt: (n: number) => string; onTip: SetTip; href?: string; share: string }) {
  const [hot, setHot] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const enter = (i: number, e: React.PointerEvent) => { setHot(i); onTip({ x: e.clientX, y: e.clientY, title: label, rows: [{ color: parts[i].color, label: parts[i].label, value: fmt(parts[i].value) }], total: [share, pct(parts[i].value, total)] }); };
  const move = (e: React.PointerEvent) => onTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
  const leave = () => { setHot(null); onTip(null); };
  const cls = "flex min-w-0 flex-col gap-2 rounded-ui border border-line bg-surface p-3";
  const inner = (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>{centerSub !== undefined && <span className="shrink-0 font-mono text-[11.5px] text-muted">{center} {centerSub}</span>}</div>
        <div className="truncate font-mono text-xl leading-tight">{value}</div>
        {sub && <div className="truncate text-[11.5px] text-muted">{sub}</div>}
      </div>
      {/* 分段横条：按占比着色，段间 2px 留白；悬停一段显示金额 + 占比 */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-chip">
        {parts.map((p, i) => total > 0 && p.value > 0 && (
          <div key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color, opacity: hot !== null && hot !== i ? 0.35 : 1 }} className="h-full min-w-[3px] cursor-pointer border-r-2 border-surface transition-opacity last:border-r-0"
            onPointerEnter={(e) => enter(i, e)} onPointerMove={move} onPointerLeave={leave} />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11.5px]">
        {parts.map((p, i) => (
          <div key={i} className="contents">
            <span className={`flex min-w-0 items-center gap-1.5 truncate rounded px-1 py-px ${hot === i ? "bg-chip text-fg" : "text-muted"}`} onPointerEnter={(e) => enter(i, e)} onPointerMove={move} onPointerLeave={leave}><i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />{p.label}</span>
            <span className="text-right font-mono text-fg">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </>
  );
  return href ? <Link href={href} className={`${cls} hover:border-accent`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

// ---------- 主组件 ----------
export function CommissionDashboard(p: CommissionDashboardProps) {
  const router = useRouter();
  const params = useSearchParams();
  const presets = (p.plan.capYearStart === "01-01" ? PERIOD_PRESETS.filter((x) => x !== "period") : PERIOD_PRESETS) as PeriodPreset[];
  // URL 里带的时间段如果正好等于某个预设，就把那个预设点亮
  const [preset, setPreset] = useState<PeriodPreset | "custom">(() => { if (!p.initial) return "year"; const hit = presets.find((x) => { const r = periodRange(x, p.today, p.plan.capYearStart); return r.from === p.initial!.from && r.to === p.initial!.to; }); return hit ?? "custom"; });
  const [range, setRange] = useState(p.initial ?? periodRange("year", p.today, p.plan.capYearStart));
  const [sides, setSides] = useState<CommissionSide[]>([...SIDE_ORDER]);
  const [metric, setMetric] = useState<"nci" | "gci" | "n">("nci");
  const [tip, setTip] = useState<Tip | null>(null);

  const report = useMemo(() => buildCommissionReport(p.rows, { ...range, sides }), [p.rows, range, sides]);
  // 上一段同样长度，做对比
  const prev = useMemo(() => { const len = daysBetween(range.from, range.to) + 1; const to = new Date(Date.parse(range.from) - 86_400_000); const from = new Date(to.getTime() - (len - 1) * 86_400_000); const iso = (d: Date) => d.toISOString().slice(0, 10); return buildCommissionReport(p.rows, { from: iso(from), to: iso(to), sides }); }, [p.rows, range, sides]);

  const applyRange = (next: { from: string; to: string }, pr: PeriodPreset | "custom") => {
    setRange(next); setPreset(pr);
    if (p.syncUrl) { const u = new URLSearchParams(params.toString()); u.set("from", next.from); u.set("to", next.to); router.replace(`?${u.toString()}`, { scroll: false }); }
  };
  const l = p.l;
  const sideLabel = (s: CommissionSide) => l[`side_${s}`];
  const sideColor = (s: CommissionSide) => SIDE_VAR(s);
  const statusParts = (by: Record<ReportStatus, number>): Part[] => REPORT_STATUSES.map((st, i) => ({ label: l[`status_${st}`], color: STATUS_VAR(i), value: by[st] }));
  const delta = (cur: number, before: number, fmt: (n: number) => string) => {
    if (!before && !cur) return null;
    const d = cur - before;
    return <><b className={d >= 0 ? "text-ok" : "text-danger"}>{d >= 0 ? "+" : "−"}{fmt(Math.abs(d))}</b> {l.vsPrev}</>;
  };
  const bd = report.breakdown;
  const nciParts: Part[] = [
    { label: l.bd_take, color: STATUS_VAR(0), value: bd.nci },
    { label: l.r_brokerSplit, color: "var(--viz-ded-1)", value: bd.brokerSplit },
    { label: l.r_referralOut, color: "var(--viz-ded-2)", value: bd.referralOut },
    { label: l.bd_fees, color: "var(--viz-ded-3)", value: bd.perDeal + bd.royalty + bd.team + bd.other },
  ].filter((x) => x.value > 0 || x.label === l.bd_take);
  const monthLabel = (m: string) => l.month.replace("{m}", String(Number(m.slice(5))));
  const hrefFor = (f?: string) => (f ? `/commissions?f=${f}&from=${range.from}&to=${range.to}` : `/commissions?from=${range.from}&to=${range.to}`);

  // 月度柱
  const [hotBar, setHotBar] = useState<number | null>(null);
  // 柱状图自己的类型开关（图例可点）：只影响这张图，不影响上面的卡和待收；顶部胶囊关掉的类型这里也不出现
  const [hidden, setHidden] = useState<CommissionSide[]>([]);
  const chartSides = sides.filter((x) => !hidden.includes(x));
  const W = 640, H = 220, L = 44, B = 26, T = 10;
  const key = (c: { n: number; gci: number; nci: number }) => (metric === "n" ? c.n : metric === "gci" ? c.gci : c.nci);
  const fmtM = metric === "n" ? (v: number) => l.count.replace("{n}", String(v)) : money;
  const monthTotal = (m: (typeof report.monthly)[number]) => chartSides.reduce((a, x) => a + (m.bySide[x] ? key(m.bySide[x]!) : 0), 0);
  const max = Math.max(1, ...report.monthly.map(monthTotal));
  const top = (() => { const p10 = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p10) * p10; })();
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const bw = (W - L - 8) / Math.max(1, report.monthly.length);

  return (
    <div className="flex flex-col gap-3">
      <Tooltip tip={tip} />
      {/* 过滤行 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-line-strong bg-surface">
          {presets.map((x) => <button key={x} type="button" aria-pressed={preset === x} onClick={() => applyRange(periodRange(x, p.today, p.plan.capYearStart), x)} className={`px-3 py-1.5 text-[13px] font-semibold ${preset === x ? "bg-accent text-accent-ink" : "text-muted hover:text-fg"}`}>{l[`period_${x}`]}</button>)}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {l.from}<input type="date" value={range.from} onChange={(e) => e.target.value && applyRange({ ...range, from: e.target.value }, "custom")} className="h-8 rounded-md border border-line-strong bg-surface px-2 font-mono text-xs text-fg" />
          {l.to}<input type="date" value={range.to} onChange={(e) => e.target.value && applyRange({ ...range, to: e.target.value }, "custom")} className="h-8 rounded-md border border-line-strong bg-surface px-2 font-mono text-xs text-fg" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SIDE_ORDER.map((s) => { const on = sides.includes(s); return (
            <button key={s} type="button" aria-pressed={on} onClick={() => setSides(on ? sides.filter((x) => x !== s) : [...sides, s])} className={`flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold ${on ? "" : "opacity-40"}`}>
              <i className="h-2 w-2 rounded-full" style={{ background: sideColor(s) }} />{sideLabel(s)}
            </button>); })}
        </div>
      </div>

      {/* 四张卡 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Ring label={l.ring_count} value={l.count.replace("{n}", String(report.count.total))} sub={delta(report.count.total, prev.count.total, (n) => l.count.replace("{n}", String(n)))} parts={statusParts(report.count.byStatus)} center={String(report.count.byStatus.paid + report.count.byStatus.closed)} centerSub={l.closedCount} fmt={(n) => l.count.replace("{n}", String(n))} onTip={setTip} share={l.share} href={p.compact ? hrefFor() : undefined} />
        <Ring label={l.ring_gci} value={money(report.gci.total)} sub={delta(report.gci.total, prev.gci.total, money)} parts={statusParts(report.gci.byStatus)} center={short(report.gci.total)} fmt={money} onTip={setTip} share={l.share} href={p.compact ? hrefFor() : undefined} />
        <Ring label={l.ring_nci} value={money(report.nci.total)} sub={<>{pct(report.nci.total, report.gci.total)} {l.paidRate}{p.plan.capOn && p.plan.capAmount > 0 && <> · {l.cap.replace("{pct}", pct(p.capPaid, p.plan.capAmount))}{p.capPaid >= p.plan.capAmount && ` · ${l.capHit}`}</>}</>} parts={nciParts} center={pct(report.nci.total, report.gci.total)} centerSub={l.paidRate} fmt={money} onTip={setTip} share={l.share} href={p.compact ? hrefFor("paid") : undefined} />
        <Ring label={l.ring_volume} value={money(report.volume.total)} sub={delta(report.volume.total, prev.volume.total, money)} center={l.count.replace("{n}", String(report.count.total))} centerSub="" parts={[{ label: l.vol_sell, color: SIDE_VAR("listing"), value: report.volume.sell }, { label: l.vol_buy, color: SIDE_VAR("buyer"), value: report.volume.buy }, { label: l.vol_lease, color: SIDE_VAR("landlord"), value: report.volume.lease }]} fmt={money} onTip={setTip} share={l.share} href={p.compact ? hrefFor() : undefined} />
      </div>

      {/* 月度 + 待收 */}
      <div className={`grid gap-3 ${p.compact ? "" : "lg:grid-cols-[2fr_1fr]"}`}>
        {!p.compact && (
          <section className="rounded-ui border border-line bg-surface">
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <h2 className="text-sm font-semibold">{l.monthly}</h2>
              <div className="flex overflow-hidden rounded-full border border-line-strong text-xs">{(["nci", "gci", "n"] as const).map((m) => <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)} className={`px-2.5 py-1 font-semibold ${metric === m ? "bg-accent text-accent-ink" : "text-muted hover:text-fg"}`}>{l[`m_${m}`]}</button>)}</div>
            </header>
            <div className="p-4">
              {report.count.total === 0 ? <p className="py-8 text-center text-sm text-muted">{l.none}</p> : (
                <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
                  {[0, 1, 2, 3, 4].map((i) => { const v = (top * i) / 4; return <g key={i}><line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted)">{metric === "n" ? v : short(v)}</text></g>; })}
                  {report.monthly.map((m, i) => {
                    const x = L + i * bw + bw * 0.2, w = bw * 0.6; let acc = 0; const total = monthTotal(m);
                    const segs = chartSides.filter((s) => m.bySide[s]).map((s) => { const v = key(m.bySide[s]!); const y1 = y(acc + v), y0 = y(acc); acc += v; return { s, v, y1, h: Math.max(0, y0 - y1 - 2), last: acc >= total - 0.001 }; });
                    return (
                      <g key={m.month} style={{ opacity: hotBar !== null && hotBar !== i ? 0.35 : 1 }} className="cursor-pointer transition-opacity"
                        onPointerEnter={(e) => { setHotBar(i); setTip({ x: e.clientX, y: e.clientY, title: monthLabel(m.month), rows: segs.map((g) => ({ color: sideColor(g.s), label: sideLabel(g.s), value: fmtM(g.v) })), total: [l.total, fmtM(total)] }); }}
                        onPointerMove={(e) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))} onPointerLeave={() => { setHotBar(null); setTip(null); }}>
                        <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
                        {segs.map((g) => <rect key={g.s} x={x} y={g.y1 + 1} width={w} height={g.h} fill={sideColor(g.s)} rx={g.last ? 3 : 0} />)}
                        <text x={x + w / 2} y={H - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--muted)">{monthLabel(m.month)}</text>
                        {total > 0 && total === max && <text x={x + w / 2} y={y(total) - 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text)">{metric === "n" ? total : short(total)}</text>}
                      </g>
                    );
                  })}
                </svg>
              )}
              <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {sides.map((s) => { const on = !hidden.includes(s); return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setHidden(on ? [...hidden, s] : hidden.filter((x) => x !== s))}
                    className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-chip ${on ? "text-muted" : "text-muted/50 line-through"}`}>
                    <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: sideColor(s), opacity: on ? 1 : 0.35 }} />{sideLabel(s)}
                  </button>); })}
              </div>
            </div>
          </section>
        )}
        <section className="rounded-ui border border-line bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">{l.pending}</h2>
            <span className="font-mono text-sm text-muted">{money(report.pendingTotal)} · {l.count.replace("{n}", String(report.pending.length))}</span>
          </header>
          <div className="px-4 py-1">
            {report.pending.length === 0 ? <p className="py-6 text-center text-sm text-muted">{l.noPending}</p> : report.pending.slice(0, p.compact ? 5 : 8).map((r) => {
              const d = daysBetween(p.today, r.date);
              const when = d < 0 ? l.rel_overdue.replace("{n}", String(-d)) : d === 0 ? l.rel_today : l.rel_inDays.replace("{n}", String(d));
              return (
                <Link key={r.id} href={`/commissions/${r.id}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-line py-2 last:border-0 hover:bg-chip/50">
                  <span className="truncate text-[13.5px] font-semibold">{r.title}</span>
                  <span className="text-right font-mono text-sm">{money(r.nci)}</span>
                  <span className="flex items-center gap-2 text-xs text-muted"><i className="h-2 w-2 rounded-full" style={{ background: sideColor(r.side) }} />{sideLabel(r.side)}<span className={`rounded px-1.5 py-px text-[11px] font-semibold ${r.status === "closed" ? "bg-accent-soft text-accent-strong" : "bg-warn-bg text-warn"}`}>{l[`status_${r.status}`]}</span></span>
                  <span className={`text-right text-[11.5px] ${d < 0 ? "text-danger" : d <= 10 ? "text-warn" : "text-muted"}`}>{when} · {r.date}</span>
                </Link>
              );
            })}
            {p.compact && report.pending.length > 5 && <Link href={hrefFor("pending")} className="block py-2 text-center text-xs text-accent hover:underline">{l.viewAll}</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
