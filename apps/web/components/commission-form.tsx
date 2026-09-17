"use client";
// 佣金表单：左边输入（$ / % 切换、推荐费付出、自定义扣费），右边实时明细（core computeCommission）。
import { useMemo, useState } from "react";
import { Button } from "@/components/button";
import { MoneyInput } from "@/components/money-input";
import { Section } from "@/components/ui";
import { computeCommission, type CommissionPlan, type CommissionSide, type CustomFee, type YearToDate } from "@newbee/core";

export type Opt = { value: string; label: string };
export type L = Record<string, string>;
const inputCls = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const toNum = (s: string) => { const n = Number(String(s).replace(/[$,\s%]/g, "")); return Number.isFinite(n) ? n : 0; };

// 小组件放在表单组件外面：定义在渲染函数里的组件每次渲染都是"新组件"，输入框会一打字就失焦
const F = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => <label className={`flex flex-col gap-1 text-xs text-muted ${className}`}>{label}{children}</label>;
const Row = ({ label, amount, sub, strong, neg }: { label: string; amount: number; sub?: string; strong?: boolean; neg?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? "border-t border-line pt-2 text-base font-semibold" : "text-sm"}`}><span className={strong ? "" : "text-muted"}>{label}{sub && <span className="ml-1 text-xs text-muted">{sub}</span>}</span><span className={`font-mono ${neg ? "text-danger" : ""}`}>{neg ? `(${fmt(amount)})` : fmt(amount)}</span></div>
);

/** $ / % 切换的金额输入 */
function AmountInput({ basis, onBasis, value, onValue, name, l }: { basis: "pct" | "flat"; onBasis: (b: "pct" | "flat") => void; value: string; onValue: (v: string) => void; name: string; l: L }) {
  return (
    <div className="flex gap-1">
      <input type="hidden" name={`${name}_basis`} value={basis} />
      <input type="hidden" name={basis === "pct" ? `${name}_pct` : `${name}_flat`} value={value} />
      {basis === "flat"
        ? <MoneyInput value={value} onChange={onValue} className="flex-1" />
        : <input value={value} onChange={(e) => onValue(e.target.value)} inputMode="decimal" className={`${inputCls} font-mono`} />}
      <div className="flex shrink-0 overflow-hidden rounded-md border border-line-strong">
        {(["flat", "pct"] as const).map((b) => <button key={b} type="button" onClick={() => onBasis(b)} className={`w-9 text-sm font-medium ${basis === b ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-chip"}`}>{b === "flat" ? "$" : "%"}</button>)}
      </div>
    </div>
  );
}

export interface CommissionFormProps {
  l: L; plan: CommissionPlan; ytd: YearToDate;
  kind: "deal" | "referral";
  sideOptions: Opt[]; dealOptions: Opt[]; contactOptions: Opt[]; orgOptions: Opt[];
  values: Record<string, string | number | null | undefined>;
  /** 放在交易详情里时交易已定：不显示下拉，只读一行 */
  lockDeal?: { id: string; label: string };
  /** 编辑模式："删除"（确认后执行），放在标题栏 */
  deleteAction?: () => Promise<void>; deleteLabels?: { delete: string; confirm: string };
  /** 卡片：标题 + 标题栏右侧内容（保存按钮总在最右）+ 标题栏下方的一行（比如胶囊页签） */
  card: { title: string; right?: React.ReactNode; above?: React.ReactNode };
  fees: CustomFee[];
  action: (formData: FormData) => void | Promise<void>;
  back?: string;
  submitLabel: string;
  prefillHint?: string;
}

export function CommissionForm(p: CommissionFormProps) {
  const v = (k: string) => { const x = p.values[k]; return x === null || x === undefined ? "" : String(x); };
  const [side, setSide] = useState(v("side") || (p.kind === "referral" ? "referral" : "listing"));
  const [dealId, setDealId] = useState(v("deal_id"));
  const [price, setPrice] = useState(v("price"));
  const [basis, setBasis] = useState<"pct" | "flat">((v("basis") as "pct" | "flat") || "pct");
  const [amount, setAmount] = useState(basis === "flat" ? v("flat") : v("pct") || "3");
  const [roBasis, setRoBasis] = useState<"pct" | "flat">((v("referral_out_basis") as "pct" | "flat") || "pct");
  const [ro, setRo] = useState(roBasis === "flat" ? v("referral_out_flat") : v("referral_out_pct"));
  const [fees, setFees] = useState<CustomFee[]>(p.fees);
  const [paidAt, setPaidAt] = useState(v("paid_at"));

  const result = useMemo(() => computeCommission({
    kind: p.kind, side: side as CommissionSide, price: toNum(price), basis, pct: basis === "pct" ? toNum(amount) : null, flat: basis === "flat" ? toNum(amount) : null, fees,
    referral_out_basis: p.kind === "deal" && ro ? roBasis : null, referral_out_pct: roBasis === "pct" ? toNum(ro) : null, referral_out_flat: roBasis === "flat" ? toNum(ro) : null,
    referralInPct: p.kind === "referral" ? toNum(ro) || null : null,
  }, p.plan, p.ytd), [p.kind, side, price, basis, amount, fees, ro, roBasis, p.plan, p.ytd]);

  const lineLabel = (id: string, name: string) => (id.startsWith("custom:") ? name : p.l[`r_${id}`] ?? name);

  return (
    <form action={p.action}>
      <Section title={p.card.title} right={
        <>
          {p.card.right}
          {p.deleteAction && p.deleteLabels && (
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center px-2 text-sm text-muted hover:text-danger">{p.deleteLabels.delete}</summary>
              <div className="absolute right-0 top-12 z-10 flex w-72 flex-col gap-2 rounded-ui border border-line bg-surface p-3 text-sm shadow-xl">
                <p className="text-muted">{p.deleteLabels.confirm}</p>
                <Button variant="danger" type="button" onClick={() => p.deleteAction!()}>{p.deleteLabels.delete}</Button>
              </div>
            </details>
          )}
          <Button>{p.submitLabel}</Button>
        </>
      }>
      {p.card.above}
      <div className={`grid gap-4 lg:grid-cols-[1fr_1fr] ${p.card.above ? "border-t border-line pt-4" : ""}`}>
      <input type="hidden" name="kind" value={p.kind} />
      {p.back && <input type="hidden" name="back" value={p.back} />}
      <input type="hidden" name="fees" value={JSON.stringify(fees)} />
      <input type="hidden" name="price" value={price} />
      <div className="flex flex-col gap-3">
        {p.kind === "deal" ? (
          <>
            {p.lockDeal
              ? <F label={p.l.deal}><input type="hidden" name="deal_id" value={p.lockDeal.id} /><div className={`${inputCls} flex items-center bg-chip text-muted`}>{p.lockDeal.label}</div></F>
              : <F label={p.l.deal}><select name="deal_id" value={dealId} onChange={(e) => setDealId(e.target.value)} required className={inputCls}><option value="" disabled>—</option>{p.dealOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>}
            <F label={p.l.side}><select name="side" value={side} onChange={(e) => setSide(e.target.value)} className={inputCls}>{p.sideOptions.filter((o) => o.value !== "referral").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
          </>
        ) : (
          <>
            <input type="hidden" name="side" value="referral" />
            <F label={p.l.client}><select name="contact_id" defaultValue={v("contact_id")} className={inputCls}><option value="">—</option>{p.contactOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
            <div className="grid grid-cols-2 gap-3">
              <F label={p.l.partner}><select name="partner_contact_id" defaultValue={v("partner_contact_id")} className={inputCls}><option value="">—</option>{p.contactOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
              <F label={p.l.partnerOrg}><select name="partner_org_id" defaultValue={v("partner_org_id")} className={inputCls}><option value="">—</option>{p.orgOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
            </div>
          </>
        )}
        {p.prefillHint && <p className="text-xs text-muted">{p.prefillHint}</p>}
        <div className="grid grid-cols-[1.3fr_1fr] gap-3">
          <F label={p.l.price}><MoneyInput value={price} onChange={setPrice} /></F>
          <F label={p.l.amount}><AmountInput basis={basis} onBasis={(b) => { setBasis(b); }} value={amount} onValue={setAmount} name="x" l={p.l} /></F>
        </div>
        <input type="hidden" name="basis" value={basis} /><input type="hidden" name="pct" value={basis === "pct" ? amount : ""} /><input type="hidden" name="flat" value={basis === "flat" ? amount : ""} />
        {p.kind === "deal" ? (
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <F label={p.l.referralOut}><AmountInput basis={roBasis} onBasis={setRoBasis} value={ro} onValue={setRo} name="referral_out" l={p.l} /></F>
            <F label={p.l.referralOutTo}><select name="referral_out_to_contact_id" defaultValue={v("referral_out_to_contact_id")} className={inputCls}><option value="">—</option>{p.contactOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
          </div>
        ) : (
          <F label={p.l.referralIn}><div className="flex items-center gap-2"><input value={ro} onChange={(e) => setRo(e.target.value)} inputMode="decimal" className={`${inputCls} font-mono`} /><span className="text-sm text-muted">%</span></div><input type="hidden" name="referral_out_basis" value="pct" /><input type="hidden" name="referral_out_pct" value={ro} /></F>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted"><span>{p.l.fees}</span><button type="button" onClick={() => setFees([...fees, { name: "", basis: "flat", value: 0 }])} className="text-accent hover:underline">{p.l.addFee}</button></div>
          {fees.map((f, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
              <input value={f.name} placeholder={p.l.feeName} onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} />
              <select value={f.basis} onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, basis: e.target.value as CustomFee["basis"] } : x)))} className={inputCls}>{(["flat", "pct_of_gci", "pct_of_price"] as const).map((b) => <option key={b} value={b}>{p.l[`feeBasis_${b}`]}</option>)}</select>
              {f.basis === "flat"
                ? <MoneyInput value={String(f.value)} onChange={(raw) => setFees(fees.map((x, j) => (j === i ? { ...x, value: toNum(raw) } : x)))} />
                : <input value={f.value} inputMode="decimal" onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, value: toNum(e.target.value) } : x)))} className={`${inputCls} font-mono`} />}
              <button type="button" onClick={() => setFees(fees.filter((_, j) => j !== i))} className="text-muted hover:text-danger">✕</button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <F label={p.l.expectedAt}><input type="date" name="expected_at" defaultValue={v("expected_at")} className={inputCls} /></F>
          <F label={p.l.closedAt}><input type="date" name="closed_at" defaultValue={v("closed_at")} className={inputCls} /></F>
          <F label={p.l.paidAt}><input type="date" name="paid_at" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} /></F>
        </div>
        <F label={p.l.notes}><textarea name="notes" rows={2} defaultValue={v("notes")} className={`${inputCls} h-auto py-2`} /></F>
      </div>

      <div className="flex flex-col rounded-ui bg-chip/50 p-4">
        <Row label={p.l.r_gci} amount={result.gci} strong />
        {result.lines.map((ln) => <Row key={ln.id} label={lineLabel(ln.id, ln.name)} amount={ln.amount} neg sub={ln.id === "brokerSplit" ? [p.l.r_agentPct.replace("{pct}", String(result.agentPct)), result.brokerPostCap > 0 ? `${p.l.r_brokerPre} ${fmt(result.brokerPreCap)} · ${p.l.r_brokerPost} ${fmt(result.brokerPostCap)}` : ""].filter(Boolean).join(" · ") : undefined} />)}
        <Row label={p.l.r_total} amount={result.totalDeductions} neg />
        <Row label={p.l.r_nci} amount={result.nci} strong />
        {p.plan.capAmount > 0 && (
          <div className="mt-3 border-t border-line pt-3 text-xs text-muted">
            <div className="flex justify-between"><span>{p.l.r_capAfter}</span><span className="font-mono">{fmt(result.capProgressAfter)} / {fmt(p.plan.capAmount)}{result.capHit && ` · ${p.l.capHit}`}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (result.capProgressAfter / p.plan.capAmount) * 100)}%` }} /></div>
          </div>
        )}
      </div>
      </div>
      </Section>
    </form>
  );
}

