// 佣金表单 / 列表要用的文案与选项（服务端算，客户端只收字符串）
import { COMMISSION_SIDES, COMMISSION_STATUSES, contactName, type Translator } from "@newbee/core";
import type { L, Opt } from "@/components/commission-form";
import type { CommissionRow } from "@/lib/commissions";

export function commissionLabels(t: Translator): L {
  const l: L = {};
  for (const k of ["deal", "side", "price", "amount", "referralOut", "referralOutTo", "fees", "addFee", "feeName", "client", "partner", "partnerOrg", "referralIn", "expectedAt", "closedAt", "paidAt", "notes"]) l[k] = t(`comm.f.${k}`);
  for (const k of ["gci", "referralOut", "brokerSplit", "brokerPre", "brokerPost", "royalty", "team", "perDealFee", "eoFee", "total", "nci", "capAfter"]) l[`r_${k}`] = t(`comm.r.${k}`);
  for (const k of ["flat", "pct_of_gci", "pct_of_price"]) l[`feeBasis_${k}`] = t(`comm.f.feeBasis.${k}`);
  l.capHit = t("comm.capHit");
  return l;
}

export const sideOptions = (t: Translator): Opt[] => COMMISSION_SIDES.map((s) => ({ value: s, label: t(`commSide.${s}`) }));
export const statusOptions = (t: Translator): Opt[] => COMMISSION_STATUSES.map((s) => ({ value: s, label: t(`commStatus.${s}`) }));

/** 列表 / 卡片里一条记录的"是什么"：交易标题 或 客户名 */
export function whatOf(r: CommissionRow, t: Translator): string {
  if (r.kind === "deal") return r.deal?.title ?? "—";
  const who = r.contact ? contactName(r.contact) : "";
  const to = r.partner_contact ? contactName(r.partner_contact) : r.partner_org?.name ?? "";
  return [who, to].filter(Boolean).join(" → ") || t("commKind.referral");
}

/** 同一交易有 listing + buyer 两条 → 标"双方" */
export function isBothSides(r: CommissionRow, all: CommissionRow[]): boolean {
  if (r.kind !== "deal" || !r.deal_id) return false;
  const sides = new Set(all.filter((x) => x.deal_id === r.deal_id).map((x) => x.side));
  return (sides.has("listing") && sides.has("buyer")) || (sides.has("landlord") && sides.has("tenant"));
}
