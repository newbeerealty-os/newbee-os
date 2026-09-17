"use client";
// 设置 › 佣金方案：一键预设 + 六个模块开关（关掉的折叠、计算按 0）+ 固定周期费列表。保存走 server action。
import { useState } from "react";
import { Button } from "@/components/button";
import { applyPreset, recurringPerPeriod, PLAN_PRESET_IDS, PLAN_MODULES, RECURRING_PERIODS, type CommissionPlan, type PlanModule, type PlanPresetId, type RecurringFee } from "@newbee/core";

export type PlanLabels = Record<string, string>;
const inputCls = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const toNum = (s: string) => { const n = Number(String(s).replace(/[$,\s%]/g, "")); return Number.isFinite(n) ? n : 0; };

export function PlanForm({ initial, l, action }: { initial: CommissionPlan; l: PlanLabels; action: (fd: FormData) => Promise<void> }) {
  const [plan, setPlan] = useState<CommissionPlan>(initial);
  const [applied, setApplied] = useState<PlanPresetId | null>(null);
  const set = <K extends keyof CommissionPlan>(k: K, v: CommissionPlan[K]) => setPlan((p) => ({ ...p, [k]: v }));
  const toggle = (m: PlanModule) => setPlan((p) => ({ ...p, modules: { ...p.modules, [m]: !p.modules[m] } }));
  const num = (k: keyof CommissionPlan, step = "1") => (
    <input value={String(plan[k] ?? "")} inputMode="decimal" step={step} onChange={(e) => set(k, toNum(e.target.value) as never)} className={`${inputCls} font-mono`} />
  );
  const F = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <label className="flex flex-col gap-1 text-xs text-muted">{label}{children}{hint && <span className="text-[11px]">{hint}</span>}</label>
  );
  // 一个模块 = 标题行带开关，关掉时正文折叠
  const Mod = ({ id, title, children }: { id: PlanModule; title: string; children: React.ReactNode }) => {
    const on = plan.modules[id];
    return (
      <section className={`rounded-ui border bg-surface ${on ? "border-line" : "border-dashed border-line-strong"}`}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className={`text-sm font-semibold ${on ? "" : "text-muted"}`}>{title}</span>
          <button type="button" role="switch" aria-checked={on} onClick={() => toggle(id)} className="flex items-center gap-2 text-sm text-muted">
            <span>{on ? l.on : l.off}</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-accent" : "bg-chip"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
          </button>
        </div>
        {on && <div className="border-t border-line px-4 py-3">{children}</div>}
      </section>
    );
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* 序列化：数值直接 hidden，模块和周期费走 JSON */}
      <input type="hidden" name="modules" value={JSON.stringify(plan.modules)} />
      <input type="hidden" name="recurringFees" value={JSON.stringify(plan.recurringFees.filter((f) => f.name.trim()))} />
      <input type="hidden" name="splitTiers" value={JSON.stringify(plan.splitTiers)} />
      {(["splitMode", "splitPreCap", "splitPostCap", "capAmount", "capYearStart", "perDealFee", "perDealFeeLease", "perDealFeePostCap", "perDealFeeCap", "perDealFeeAfterCap", "eoFee", "eoCap", "royaltyPct", "royaltyCap", "teamPct", "teamCap", "teamBasis"] as const).map((k) => <input key={k} type="hidden" name={k} value={String(plan[k])} />)}

      <section className="rounded-ui border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5"><span className="text-sm font-semibold">{l.presets}</span>{applied && <span className="text-sm text-ok">{l.presetApplied}</span>}</div>
        <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_PRESET_IDS.map((id) => (
            <button key={id} type="button" onClick={() => { setPlan((p) => applyPreset(p, id)); setApplied(id); }}
              className={`flex min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-md border px-3 py-2 text-left hover:border-accent ${applied === id ? "border-accent bg-accent-soft" : "border-line-strong"}`}>
              <span className="text-sm font-medium text-fg">{l[`preset_${id}`]}</span>
              <span className="text-xs leading-snug text-muted">{l[`preset_${id}_desc`]}</span>
            </button>
          ))}
        </div>
      </section>

      <Mod id="perDeal" title={l.perDeal}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <F label={l.perDealFee}>{num("perDealFee")}</F>
          <F label={l.perDealFeeLease}>{num("perDealFeeLease")}</F>
          {plan.modules.cap && <F label={l.perDealFeePostCap}>{num("perDealFeePostCap")}</F>}
          <F label={l.perDealFeeCap}>{num("perDealFeeCap")}</F>
          {plan.modules.perDeal && plan.perDealFeeCap > 0 && <F label={l.perDealFeeAfterCap}>{num("perDealFeeAfterCap")}</F>}
          <F label={l.eoFee}>{num("eoFee")}</F>
          <F label={l.eoCap}>{num("eoCap")}</F>
        </div>
      </Mod>
      <Mod id="recurring" title={l.recurring}>
        <RecurringFeesEditor rows={plan.recurringFees} onChange={(rows) => set("recurringFees", rows)} l={l} />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{l.recurringTotal.replace("{amount}", fmt(recurringPerPeriod(plan)))}</span>
          <label className="flex items-center gap-2">{l.capYearStart}<input value={plan.capYearStart} onChange={(e) => set("capYearStart", e.target.value)} placeholder="01-01" className={`${inputCls} w-24 font-mono`} /></label>
        </div>
      </Mod>
      <Mod id="split" title={l.split}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">{l.splitMode}
            <div className="flex overflow-hidden rounded-md border border-line-strong">
              {(["flat", "tiers"] as const).map((m) => <button key={m} type="button" onClick={() => set("splitMode", m)} className={`h-8 px-3 text-sm ${plan.splitMode === m ? "bg-accent text-accent-ink" : "bg-surface text-fg hover:bg-chip"}`}>{l[`splitMode_${m}`]}</button>)}
            </div>
          </div>
          {plan.splitMode === "tiers" ? (
            <TiersEditor rows={plan.splitTiers} onChange={(rows) => set("splitTiers", rows)} l={l} />
          ) : (
            <F label={l.splitPreCap}>{num("splitPreCap", "0.5")}</F>
          )}
          {plan.modules.cap && <F label={l.splitPostCap}>{num("splitPostCap", "0.5")}</F>}
        </div>
      </Mod>
      <Mod id="cap" title={l.cap}>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label={l.capAmount} hint={l.capHint}>{num("capAmount")}</F>
          <F label={l.capYearStart}><input value={plan.capYearStart} onChange={(e) => set("capYearStart", e.target.value)} placeholder="01-01" className={`${inputCls} font-mono`} /></F>
        </div>
      </Mod>
      <div className="grid gap-4 sm:grid-cols-2">
        <Mod id="royalty" title={l.royalty}>
          <div className="grid gap-3">
            <F label={l.royaltyPct}>{num("royaltyPct", "0.1")}</F>
            <F label={l.royaltyCap}>{num("royaltyCap")}</F>
          </div>
        </Mod>
        <Mod id="team" title={l.team}>
          <div className="grid gap-3">
            <F label={l.teamPct}>{num("teamPct", "0.5")}</F>
            <F label={l.teamCap}>{num("teamCap")}</F>
            <F label={l.teamBasis}>
              <select value={plan.teamBasis} onChange={(e) => set("teamBasis", e.target.value as CommissionPlan["teamBasis"])} className={inputCls}><option value="after_broker">{l.teamBasis_after_broker}</option><option value="gci">{l.teamBasis_gci}</option></select>
            </F>
          </div>
        </Mod>
      </div>
      <div><Button className="px-4">{l.save}</Button></div>
    </form>
  );
}

type Tier = CommissionPlan["splitTiers"][number];
function TiersEditor({ rows, onChange, l }: { rows: Tier[]; onChange: (rows: Tier[]) => void; l: PlanLabels }) {
  const upd = (i: number, patch: Partial<Tier>) => onChange(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const list = rows.length ? rows : [{ upTo: null, pct: 70 }];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1.4fr_1fr_auto] gap-2 text-xs text-muted"><span>{l["tiers.upTo"]}</span><span>{l["tiers.pct"]}</span><span className="w-5" /></div>
      {list.map((r, i) => (
        <div key={i} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2">
          {i === list.length - 1
            ? <span className="px-1 text-sm text-muted">{l["tiers.last"]}</span>
            : <input value={r.upTo ?? ""} inputMode="decimal" onChange={(e) => upd(i, { upTo: toNum(e.target.value) })} className={`${inputCls} font-mono`} />}
          <input value={r.pct} inputMode="decimal" onChange={(e) => upd(i, { pct: toNum(e.target.value) })} className={`${inputCls} font-mono`} />
          <button type="button" disabled={list.length <= 1} onClick={() => onChange(list.filter((_, j) => j !== i).map((x, j, a) => (j === a.length - 1 ? { ...x, upTo: null } : x)))} className="w-5 text-muted hover:text-danger disabled:opacity-30">✕</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { const last = list[list.length - 1]; onChange([...list.slice(0, -1), { upTo: (list.length > 1 ? (list[list.length - 2].upTo ?? 0) : 0) + 50000, pct: last.pct }, { upTo: null, pct: Math.min(100, last.pct + 10) }]); }} className="text-sm text-accent hover:underline">{l["tiers.add"]}</button>
        <span className="text-xs text-muted">{l["tiers.hint"]}</span>
      </div>
    </div>
  );
}

function RecurringFeesEditor({ rows, onChange, l }: { rows: RecurringFee[]; onChange: (rows: RecurringFee[]) => void; l: PlanLabels }) {
  const upd = (i: number, patch: Partial<RecurringFee>) => onChange(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-2 text-xs text-muted"><span>{l.recurringName}</span><span>{l.recurringAmount}</span><span>{l.recurringPeriod}</span><span className="w-5" /></div>}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-2">
          <input value={r.name} placeholder={l.recurringName} onChange={(e) => upd(i, { name: e.target.value })} className={inputCls} />
          <input value={r.amount} inputMode="decimal" placeholder={l.recurringAmount} onChange={(e) => upd(i, { amount: toNum(e.target.value) })} className={`${inputCls} font-mono`} />
          <select value={r.period} onChange={(e) => upd(i, { period: e.target.value as RecurringFee["period"] })} className={inputCls}>{RECURRING_PERIODS.map((p) => <option key={p} value={p}>{l[`period_${p}`]}</option>)}</select>
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="w-5 text-muted hover:text-danger" title={l.remove}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { name: "", amount: 0, period: "yearly" }])} className="self-start text-sm text-accent hover:underline">{l.recurringAdd}</button>
    </div>
  );
}

export { PLAN_MODULES };
