// 佣金：合同价 × 比例 − 各项费用。费用表放 agents.settings.brokerFees，随 broker 政策改。
export type Fee = { name: string; amount: number };
export type FeeRule = { name: string; type: 'flat' | 'pct_of_gci' | 'pct_of_price'; value: number; cap?: number };

export interface CommissionInput {
  price: number;
  /** 百分比，如 3 表示 3% */
  pct: number;
  brokerFees?: FeeRule[];
  /** 推荐费占 GCI 的百分比 */
  referralPct?: number;
  /** 其他固定扣除（transaction fee 等） */
  extraFees?: Fee[];
}

export interface CommissionResult {
  gci: number;
  fees: Fee[];
  nci: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function commission(input: CommissionInput): CommissionResult {
  const gci = round2((input.price * input.pct) / 100);
  const fees: Fee[] = [];
  if (input.referralPct) fees.push({ name: 'Referral', amount: round2((gci * input.referralPct) / 100) });
  for (const r of input.brokerFees ?? []) {
    let amt = r.type === 'flat' ? r.value : r.type === 'pct_of_gci' ? (gci * r.value) / 100 : (input.price * r.value) / 100;
    if (r.cap !== undefined) amt = Math.min(amt, r.cap);
    fees.push({ name: r.name, amount: round2(amt) });
  }
  for (const f of input.extraFees ?? []) fees.push({ name: f.name, amount: round2(f.amount) });
  const nci = round2(gci - fees.reduce((s, f) => s + f.amount, 0));
  return { gci, fees, nci };
}
