// 佣金：读方案、读记录、算本周期已付（cap 进度）。计算本身在 core（computeCommission）。
import type { SupabaseClient } from "@supabase/supabase-js";
import { CommissionPlanSchema, computeCommission, capYearOf, statusFromStage, type CommissionPlan, type CommissionSide, type CommissionResult, type CustomFee, type YearToDate } from "@newbee/core";
import { getAgentSettings } from "@/lib/settings";
import { todayISO } from "@/lib/format";

export async function getPlan(): Promise<CommissionPlan> {
  return CommissionPlanSchema.parse((await getAgentSettings()).commissionPlan ?? {});
}

export interface CommissionRow {
  id: string; kind: "deal" | "referral"; side: string; deal_id: string | null; contact_id: string | null;
  partner_contact_id: string | null; partner_org_id: string | null;
  price: number | null; basis: "pct" | "flat"; pct: number | null; flat: number | null;
  referral_out_basis: "pct" | "flat" | null; referral_out_pct: number | null; referral_out_flat: number | null; referral_out_to_contact_id: string | null;
  fees: CustomFee[]; status: string; expected_at: string | null; closed_at: string | null; paid_at: string | null;
  computed: CommissionResult | null; notes: string | null; created_at: string;
  deal: { id: string; title: string; stage: string; type: string; closed_at: string | null } | null;
  contact: { id: string; first_name: string; last_name: string; name_zh: string | null } | null;
  partner_contact: { id: string; first_name: string; last_name: string } | null;
  partner_org: { id: string; name: string } | null;
}

const SELECT = "id,kind,side,deal_id,contact_id,partner_contact_id,partner_org_id,price,basis,pct,flat,referral_out_basis,referral_out_pct,referral_out_flat,referral_out_to_contact_id,fees,status,expected_at,closed_at,paid_at,computed,notes,created_at,deal:deals(id,title,stage,type,closed_at),contact:contacts!commissions_contact_id_fkey(id,first_name,last_name,name_zh),partner_contact:contacts!commissions_partner_contact_id_fkey(id,first_name,last_name),partner_org:organizations(id,name)";
const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);
const norm = (r: Record<string, unknown>): CommissionRow => ({ ...(r as unknown as CommissionRow), deal: one(r.deal as never), contact: one(r.contact as never), partner_contact: one(r.partner_contact as never), partner_org: one(r.partner_org as never), fees: (r.fees as CustomFee[]) ?? [] });

export async function loadCommissions(supabase: SupabaseClient, filter?: { dealId?: string; contactId?: string }): Promise<CommissionRow[]> {
  let q = supabase.from("commissions").select(SELECT).is("deleted_at", null).order("closed_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (filter?.dealId) q = q.eq("deal_id", filter.dealId);
  if (filter?.contactId) q = q.or(`contact_id.eq.${filter.contactId},partner_contact_id.eq.${filter.contactId},referral_out_to_contact_id.eq.${filter.contactId}`);
  const { data, error } = await q;
  if (error) throw new Error(`commissions query failed: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(norm);
}

export async function loadCommission(supabase: SupabaseClient, id: string): Promise<CommissionRow | null> {
  const { data, error } = await supabase.from("commissions").select(SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`commission query failed: ${error.message}`);
  return data ? norm(data as Record<string, unknown>) : null;
}

/** 记录的"生效日期"：成交日 → 交易的 closed_at → 预计成交 → 创建日 */
export const effectiveDate = (r: CommissionRow) => r.closed_at ?? r.deal?.closed_at?.slice(0, 10) ?? r.expected_at ?? r.created_at.slice(0, 10);

/** 截至某一天的本周期累计：只算已成交 / 已收、且排在这一天之前的记录（同一天按 created_at 先后），编辑时不把自己算进去。
 *  cap 进度和阶梯档位都靠这个"之前"——一笔 3 月成交的不能被 9 月成交的顶到 cap 后。 */
export function ytdFor(plan: CommissionPlan, rows: CommissionRow[], excludeId?: string, asOf = todayISO(), beforeCreated?: string): YearToDate & { period: { start: string; end: string } } {
  const period = capYearOf(asOf, plan.capYearStart);
  const acc = { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0, gciPaid: 0, perDealPaid: 0, eoPaid: 0 };
  for (const r of rows) {
    if (r.id === excludeId || !r.computed) continue;
    if (r.status !== "closed" && r.status !== "paid") continue;
    const d = effectiveDate(r);
    if (d < period.start || d > period.end) continue;
    if (d > asOf || (d === asOf && beforeCreated !== undefined && r.created_at >= beforeCreated)) continue;
    acc.brokerPaid += r.computed.brokerPreCap ?? 0;
    acc.royaltyPaid += r.computed.royalty ?? 0;
    acc.teamPaid += r.computed.team ?? 0;
    acc.gciPaid += r.computed.gci ?? 0;
    for (const ln of r.computed.lines ?? []) { if (ln.id === "perDealFee") acc.perDealPaid += ln.amount; if (ln.id === "eoFee") acc.eoPaid += ln.amount; }
  }
  return { ...acc, period };
}

/** 重算某条记录时用的累计：截至它自己的日期 */
export const ytdBefore = (plan: CommissionPlan, rows: CommissionRow[], r: CommissionRow) => ytdFor(plan, rows, r.id, effectiveDate(r), r.created_at);

/** 重算一条记录的快照与状态 */
export function recompute(r: CommissionRow, plan: CommissionPlan, ytd: YearToDate) {
  const computed = computeCommission({
    kind: r.kind, side: r.side as CommissionSide, price: r.price, basis: r.basis, pct: r.pct, flat: r.flat, fees: r.fees,
    referral_out_basis: r.referral_out_basis, referral_out_pct: r.referral_out_pct, referral_out_flat: r.referral_out_flat,
    referralInPct: r.kind === "referral" ? r.referral_out_pct : null,
  }, plan, ytd);
  const status = r.kind === "deal" && r.deal ? statusFromStage(r.deal.stage, r.paid_at) : r.paid_at ? "paid" : r.closed_at ? "closed" : r.status === "cancelled" ? "cancelled" : "pending";
  return { computed, status };
}
