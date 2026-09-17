// 佣金引擎：GCI → 推荐费付出 → broker 抽成（cap 前后拆段）→ 加盟费（年度封顶）→ 团队 → 每笔费 / E&O → 自定义扣费 → NCI。
// 方案（CommissionPlan）存 agents.settings.commissionPlan；本周期已付的 broker / 加盟 / 团队额由调用方从已 closed 记录汇总后传入。
import { z } from 'zod';

export const COMMISSION_KINDS = ['deal', 'referral'] as const;
export const COMMISSION_SIDES = ['listing', 'buyer', 'landlord', 'tenant', 'management', 'referral'] as const;
export const COMMISSION_STATUSES = ['projected', 'pending', 'closed', 'paid', 'cancelled'] as const;
export type CommissionKind = (typeof COMMISSION_KINDS)[number];
export type CommissionSide = (typeof COMMISSION_SIDES)[number];
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (d: number, max = 100) => z.coerce.number().min(0).max(max).catch(d);
const money = (d: number) => z.coerce.number().min(0).catch(d);

/** 方案的六个模块，关掉 = 计算时按 0；没写默认全开（老数据兼容） */
export const PLAN_MODULES = ['split', 'cap', 'perDeal', 'royalty', 'team', 'recurring'] as const;
export type PlanModule = (typeof PLAN_MODULES)[number];
const ModulesSchema = z.object({
  split: z.boolean().catch(true),
  cap: z.boolean().catch(true),
  perDeal: z.boolean().catch(true),
  royalty: z.boolean().catch(true),
  team: z.boolean().catch(true),
  recurring: z.boolean().catch(true),
}).catch({ split: true, cap: true, perDeal: true, royalty: true, team: true, recurring: true });

export const RECURRING_PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
export type RecurringPeriod = (typeof RECURRING_PERIODS)[number];
export const RecurringFeeSchema = z.object({ name: z.string().min(1), amount: z.coerce.number().min(0), period: z.enum(RECURRING_PERIODS).catch('monthly') });
export type RecurringFee = z.infer<typeof RecurringFeeSchema>;

/** Broker 分成方案 */
export const CommissionPlanSchema = z.preprocess((raw) => {
  // 旧字段 monthlyFees → recurringFees(monthly)
  if (raw && typeof raw === 'object' && !('recurringFees' in raw) && Array.isArray((raw as { monthlyFees?: unknown }).monthlyFees)) {
    const { monthlyFees, ...rest } = raw as { monthlyFees: { name: string; amount: number }[] };
    return { ...rest, recurringFees: monthlyFees.map((f) => ({ ...f, period: 'monthly' })) };
  }
  return raw;
}, z.object({
  modules: ModulesSchema,
  /** cap 前我拿的比例 */
  splitPreCap: pct(70),
  /** cap 后我拿的比例 */
  splitPostCap: pct(100),
  /** 每个周期 broker 抽成上限；0 = 没有 cap */
  capAmount: money(0),
  /** 周期起点 MM-DD（入职纪念日） */
  capYearStart: z.string().regex(/^\d{2}-\d{2}$/).catch('01-01'),
  /** 每笔固定费：买卖 / 出租（放租、寻租、托管）/ cap 后 */
  perDealFee: money(0),
  perDealFeeLease: money(0),
  perDealFeePostCap: money(0),
  /** 每笔 E&O */
  eoFee: money(0),
  /** 加盟费：% of GCI，年度封顶（0 = 无） */
  royaltyPct: pct(0),
  royaltyCap: money(0),
  /** 团队抽成：% + 封顶（0 = 无）+ 基数 */
  teamPct: pct(0),
  teamCap: money(0),
  teamBasis: z.enum(['gci', 'after_broker']).catch('after_broker'),
  /** 固定周期费（年费 / desk / tech / MLS …），不进单笔 NCI，进周期统计 */
  recurringFees: z.array(RecurringFeeSchema).catch([]),
}));
export type CommissionPlan = z.infer<typeof CommissionPlanSchema>;
export const DEFAULT_PLAN: CommissionPlan = CommissionPlanSchema.parse({});

/** 一键预设：把开关和典型数值填好，之后随便改 */
export const PLAN_PRESET_IDS = ['perDeal', 'annual', 'capSplit', 'splitOnly'] as const;
export type PlanPresetId = (typeof PLAN_PRESET_IDS)[number];
const OFF = { split: false, cap: false, perDeal: false, royalty: false, team: false, recurring: false };
export function applyPreset(plan: CommissionPlan, id: PlanPresetId): CommissionPlan {
  switch (id) {
    case 'perDeal': return { ...plan, modules: { ...OFF, perDeal: true }, perDealFee: 540, perDealFeeLease: 125, perDealFeePostCap: 0, eoFee: 0 };
    case 'annual': return { ...plan, modules: { ...OFF, recurring: true }, recurringFees: [{ name: 'Annual fee', amount: 3000, period: 'yearly' }] };
    case 'capSplit': return { ...plan, modules: { ...OFF, split: true, cap: true, perDeal: true, royalty: true }, splitPreCap: 70, splitPostCap: 100, capAmount: 16000, perDealFee: 540, perDealFeeLease: 540, perDealFeePostCap: 250, royaltyPct: 6, royaltyCap: 3000 };
    case 'splitOnly': return { ...plan, modules: { ...OFF, split: true }, splitPreCap: 70, splitPostCap: 70 };
  }
}

/** 固定周期费折算到一个周期（年）：年 ×1、季 ×4、月 ×12 */
export function recurringPerPeriod(plan: CommissionPlan): number {
  if (!plan.modules.recurring) return 0;
  return r2(plan.recurringFees.reduce((s, f) => s + f.amount * (f.period === 'yearly' ? 1 : f.period === 'quarterly' ? 4 : 12), 0));
}

/** 把关掉的模块折成 0，计算只看这个 */
export function effectivePlan(plan: CommissionPlan): CommissionPlan {
  const m = plan.modules;
  return {
    ...plan,
    splitPreCap: m.split ? plan.splitPreCap : 100,
    splitPostCap: m.split ? plan.splitPostCap : 100,
    capAmount: m.cap ? plan.capAmount : 0,
    perDealFee: m.perDeal ? plan.perDealFee : 0,
    perDealFeeLease: m.perDeal ? plan.perDealFeeLease : 0,
    perDealFeePostCap: m.perDeal ? plan.perDealFeePostCap : 0,
    eoFee: m.perDeal ? plan.eoFee : 0,
    royaltyPct: m.royalty ? plan.royaltyPct : 0,
    royaltyCap: m.royalty ? plan.royaltyCap : 0,
    teamPct: m.team ? plan.teamPct : 0,
    teamCap: m.team ? plan.teamCap : 0,
    recurringFees: m.recurring ? plan.recurringFees : [],
  };
}
const LEASE_SIDES: readonly string[] = ['landlord', 'tenant', 'management'];

export const CustomFeeSchema = z.object({ name: z.string().min(1), basis: z.enum(['flat', 'pct_of_gci', 'pct_of_price']), value: z.coerce.number().min(0) });
export type CustomFee = z.infer<typeof CustomFeeSchema>;

export interface CommissionRecordInput {
  kind: CommissionKind;
  /** 决定每笔费按买卖还是出租 */
  side?: CommissionSide | null;
  price: number | null;
  basis: 'pct' | 'flat';
  pct: number | null;
  flat: number | null;
  fees: CustomFee[];
  /** 付出去的推荐费（交易佣金） */
  referral_out_basis?: 'pct' | 'flat' | null;
  referral_out_pct?: number | null;
  referral_out_flat?: number | null;
  /** 收进来的推荐费比例（推荐费记录）：对方佣金 × 这个比例 = 我的 GCI */
  referralInPct?: number | null;
}

/** 本周期已经付掉的（从已 closed / paid 记录的 computed 汇总） */
export interface YearToDate { brokerPaid: number; royaltyPaid: number; teamPaid: number }

export interface CommissionLine { id: string; name: string; amount: number; custom?: boolean }
export interface CommissionResult {
  gci: number;
  referralOut: number;
  brokerSplit: number;
  /** broker 抽成里落在 cap 内 / cap 外的部分 */
  brokerPreCap: number;
  brokerPostCap: number;
  capHit: boolean;
  capProgressAfter: number;
  royalty: number;
  team: number;
  lines: CommissionLine[];
  totalDeductions: number;
  nci: number;
}

export function computeCommission(rec: CommissionRecordInput, rawPlan: CommissionPlan, ytd: YearToDate): CommissionResult {
  const plan = effectivePlan(rawPlan);
  const price = rec.price ?? 0;
  let gci = rec.basis === 'flat' ? (rec.flat ?? 0) : (price * (rec.pct ?? 0)) / 100;
  if (rec.kind === 'referral' && rec.referralInPct) gci = (gci * rec.referralInPct) / 100;
  gci = r2(gci);

  const referralOut = rec.kind === 'deal'
    ? r2(rec.referral_out_basis === 'flat' ? (rec.referral_out_flat ?? 0) : rec.referral_out_basis === 'pct' ? (gci * (rec.referral_out_pct ?? 0)) / 100 : 0)
    : 0;
  const netGci = gci - referralOut;

  // broker 抽成：cap 前按 (100 - splitPreCap)%，到 cap 后按 (100 - splitPostCap)%
  const brokerPctPre = (100 - plan.splitPreCap) / 100;
  const brokerPctPost = (100 - plan.splitPostCap) / 100;
  const capRemaining = plan.capAmount > 0 ? Math.max(0, plan.capAmount - ytd.brokerPaid) : Infinity;
  let brokerPreCap = 0, brokerPostCap = 0;
  const fullPre = netGci * brokerPctPre;
  if (fullPre <= capRemaining) brokerPreCap = fullPre;
  else {
    brokerPreCap = capRemaining;
    const gciCovered = brokerPctPre > 0 ? capRemaining / brokerPctPre : 0;
    brokerPostCap = Math.max(0, netGci - gciCovered) * brokerPctPost;
  }
  brokerPreCap = r2(brokerPreCap); brokerPostCap = r2(brokerPostCap);
  const brokerSplit = r2(brokerPreCap + brokerPostCap);
  const capProgressAfter = plan.capAmount > 0 ? r2(Math.min(plan.capAmount, ytd.brokerPaid + brokerPreCap)) : 0;
  const capHit = plan.capAmount > 0 && capProgressAfter >= plan.capAmount;

  // 加盟费（年度封顶）
  let royalty = plan.royaltyPct > 0 ? (netGci * plan.royaltyPct) / 100 : 0;
  if (plan.royaltyCap > 0) royalty = Math.min(royalty, Math.max(0, plan.royaltyCap - ytd.royaltyPaid));
  royalty = r2(royalty);

  // 团队
  const teamBase = plan.teamBasis === 'gci' ? netGci : netGci - brokerSplit - royalty;
  let team = plan.teamPct > 0 ? (teamBase * plan.teamPct) / 100 : 0;
  if (plan.teamCap > 0) team = Math.min(team, Math.max(0, plan.teamCap - ytd.teamPaid));
  team = r2(team);

  const lines: CommissionLine[] = [];
  if (referralOut) lines.push({ id: 'referralOut', name: 'referralOut', amount: referralOut });
  if (brokerSplit) lines.push({ id: 'brokerSplit', name: 'brokerSplit', amount: brokerSplit });
  if (royalty) lines.push({ id: 'royalty', name: 'royalty', amount: royalty });
  if (team) lines.push({ id: 'team', name: 'team', amount: team });
  if (rec.kind === 'deal') {
    const base = LEASE_SIDES.includes(rec.side ?? '') ? plan.perDealFeeLease : plan.perDealFee;
    const perDeal = capHit || capRemaining === 0 ? plan.perDealFeePostCap : base;
    if (perDeal) lines.push({ id: 'perDealFee', name: 'perDealFee', amount: r2(perDeal) });
    if (plan.eoFee) lines.push({ id: 'eoFee', name: 'eoFee', amount: r2(plan.eoFee) });
  }
  for (const f of rec.fees ?? []) {
    const amt = f.basis === 'flat' ? f.value : f.basis === 'pct_of_gci' ? (gci * f.value) / 100 : (price * f.value) / 100;
    lines.push({ id: `custom:${f.name}`, name: f.name, amount: r2(amt), custom: true });
  }
  const totalDeductions = r2(lines.reduce((s, l) => s + l.amount, 0));
  return { gci, referralOut, brokerSplit, brokerPreCap, brokerPostCap, capHit, capProgressAfter, royalty, team, lines, totalDeductions, nci: r2(gci - totalDeductions) };
}

/** 状态跟着交易阶段走；填了收到日期就是 paid */
export function statusFromStage(stage: string, paidAt: string | null): CommissionStatus {
  if (paidAt) return 'paid';
  if (stage === 'closed') return 'closed';
  if (stage === 'terminated') return 'cancelled';
  if (stage === 'under_contract' || stage === 'closing') return 'pending';
  return 'projected';
}

/** 某个日期属于哪个 cap 周期（起点 MM-DD） */
export function capYearOf(dateISO: string, startMMDD: string): { start: string; end: string } {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [sm, sd] = startMMDD.split('-').map(Number);
  const before = m < sm || (m === sm && d < sd);
  const startYear = before ? y - 1 : y;
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${startYear}-${pad(sm)}-${pad(sd)}`;
  // 周期结束 = 下一周期起点前一天
  const endDate = new Date(Date.UTC(startYear + 1, sm - 1, sd) - 86_400_000);
  const end = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}`;
  return { start, end };
}

// 表单输入（FormData → 记录）。空串一律当 null；金额去掉 $ , 空格
const formNum = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(/[$,\s]/g, ''))), z.number().finite().nullable());
const formStr = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : (v ?? null)), z.string().nullable());
const formUuid = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : (v ?? null)), z.string().uuid().nullable());
export const CommissionInputSchema = z.object({
  kind: z.enum(COMMISSION_KINDS),
  side: z.enum(COMMISSION_SIDES),
  deal_id: formUuid.default(null),
  contact_id: formUuid.default(null),
  partner_contact_id: formUuid.default(null),
  partner_org_id: formUuid.default(null),
  price: formNum.default(null),
  basis: z.enum(['pct', 'flat']).default('pct'),
  pct: formNum.default(null),
  flat: formNum.default(null),
  referral_out_basis: z.preprocess((v) => (v === '' ? null : (v ?? null)), z.enum(['pct', 'flat']).nullable()).default(null),
  referral_out_pct: formNum.default(null),
  referral_out_flat: formNum.default(null),
  referral_out_to_contact_id: formUuid.default(null),
  fees: z.preprocess((v) => { try { return typeof v === 'string' ? JSON.parse(v || '[]') : (v ?? []); } catch { return []; } }, z.array(CustomFeeSchema)).default([]),
  expected_at: formStr.default(null),
  closed_at: formStr.default(null),
  paid_at: formStr.default(null),
  notes: formStr.default(null),
});
export type CommissionInput = z.infer<typeof CommissionInputSchema>;

/** 按交易类型预选我方 side，以及双方代理时的"另一边"（托管没有另一边） */
export function sideForDealType(dealType: string): CommissionSide {
  switch (dealType) {
    case 'buyer': return 'buyer';
    case 'lease_listing': return 'landlord';
    case 'lease_tenant': return 'tenant';
    case 'property_mgmt': return 'management';
    default: return 'listing';
  }
}
export function otherSide(side: CommissionSide): CommissionSide | null {
  return side === 'listing' ? 'buyer' : side === 'buyer' ? 'listing' : side === 'landlord' ? 'tenant' : side === 'tenant' ? 'landlord' : null;
}
