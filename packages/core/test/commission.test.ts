import { describe, it, expect } from 'vitest';
import { computeCommission, CommissionPlanSchema, DEFAULT_PLAN, statusFromStage, capYearOf, applyPreset, recurringPerPeriod, PLAN_PRESET_IDS, COMMISSION_SIDES, COMMISSION_STATUSES, COMMISSION_KINDS, type YearToDate } from '../src/engines/commission';
const r2 = (n: number) => Math.round(n * 100) / 100;
import { MESSAGES } from '../src/i18n';

// 典型方案：70/30，cap 16,000，每笔 540，cap 后每笔 250，E&O 45
const plan = CommissionPlanSchema.parse({ splitPreCap: 70, splitPostCap: 100, capAmount: 16000, capYearStart: '03-01', perDealFee: 540, perDealFeePostCap: 250, eoFee: 45 });
const deal = (over: Partial<Parameters<typeof computeCommission>[0]> = {}) => ({ kind: 'deal' as const, side: 'listing' as const, price: 450000, basis: 'pct' as const, pct: 3, flat: null, fees: [], ...over });

describe('computeCommission：交易佣金', () => {
  it('cap 前：GCI 13,500 → broker 30% 4,050 → 每笔 540 + E&O 45 → NCI 8,865', () => {
    const r = computeCommission(deal(), plan, { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 });
    expect(r.gci).toBe(13500);
    expect(r.brokerSplit).toBe(4050);
    expect(r.lines.find((l) => l.id === 'perDealFee')?.amount).toBe(540);
    expect(r.lines.find((l) => l.id === 'eoFee')?.amount).toBe(45);
    expect(r.nci).toBe(8865);
    expect(r.capProgressAfter).toBe(4050);
    expect(r.capHit).toBe(false);
  });

  it('跨 cap：已付 14,000，只剩 2,000 → 这笔 broker 只拿 2,000，剩下按 100%；每笔费按 cap 后算', () => {
    const r = computeCommission(deal(), plan, { brokerPaid: 14000, royaltyPaid: 0, teamPaid: 0 });
    expect(r.brokerSplit).toBe(2000);
    expect(r.capHit).toBe(true);
    expect(r.capProgressAfter).toBe(16000);
    expect(r.lines.find((l) => l.id === 'perDealFee')?.amount).toBe(250);
    expect(r.nci).toBe(13500 - 2000 - 250 - 45);
  });

  it('cap 后：broker 0，每笔 250', () => {
    const r = computeCommission(deal(), plan, { brokerPaid: 16000, royaltyPaid: 0, teamPaid: 0 });
    expect(r.brokerSplit).toBe(0);
    expect(r.nci).toBe(13500 - 250 - 45);
  });

  it('固定额佣金 + 付出去的推荐费 25%（先于 broker 扣）', () => {
    const r = computeCommission(deal({ basis: 'flat', flat: 9000, referral_out_basis: 'pct', referral_out_pct: 25 }), plan, { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 });
    expect(r.gci).toBe(9000);
    expect(r.referralOut).toBe(2250);
    expect(r.brokerSplit).toBe(Math.round((9000 - 2250) * 0.3 * 100) / 100); // 2,025：broker 按扣掉推荐费后的净 GCI 抽
    expect(r.nci).toBe(9000 - 2250 - 2025 - 540 - 45);
  });

  it('加盟费 6% 封顶 3,000；团队 10% 按扣完 broker 后的净额', () => {
    const p = CommissionPlanSchema.parse({ ...plan, royaltyPct: 6, royaltyCap: 3000, teamPct: 10, teamBasis: 'after_broker' });
    const r = computeCommission(deal(), p, { brokerPaid: 0, royaltyPaid: 2900, teamPaid: 0 });
    expect(r.royalty).toBe(100); // 6% = 810，但只剩 100 的额度
    const afterBroker = 13500 - 4050 - 100;
    expect(r.team).toBe(Math.round(afterBroker * 0.1 * 100) / 100);
  });

  it('自定义扣费：固定 / 按 GCI 比例 / 按售价比例', () => {
    const r = computeCommission(deal({ fees: [{ name: 'TC', basis: 'flat', value: 300 }, { name: 'Other agent', basis: 'pct_of_gci', value: 10 }, { name: 'Marketing', basis: 'pct_of_price', value: 0.1 }] }), plan, { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 });
    expect(r.lines.filter((l) => l.custom).map((l) => l.amount)).toEqual([300, 1350, 450]);
  });

  it('推荐费收入：没有 broker 抽成以外的每笔费；broker 仍按方案抽', () => {
    const r = computeCommission({ kind: 'referral', price: 300000, basis: 'pct', pct: 3, flat: null, fees: [], referralInPct: 25 }, plan, { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 });
    expect(r.gci).toBe(2250); // 300,000 × 3% × 25%
    expect(r.brokerSplit).toBe(675);
    expect(r.lines.find((l) => l.id === 'perDealFee')).toBeUndefined();
    expect(r.nci).toBe(2250 - 675);
  });
});

describe('方案 / 状态 / 周期', () => {
  it('DEFAULT_PLAN 合法；坏输入回默认', () => {
    expect(CommissionPlanSchema.parse({})).toEqual(DEFAULT_PLAN);
    expect(CommissionPlanSchema.parse({ splitPreCap: 150 }).splitPreCap).toBe(DEFAULT_PLAN.splitPreCap);
  });
  it('statusFromStage', () => {
    expect(statusFromStage('under_contract', null)).toBe('pending');
    expect(statusFromStage('closing', null)).toBe('pending');
    expect(statusFromStage('closed', null)).toBe('closed');
    expect(statusFromStage('closed', '2026-09-01')).toBe('paid');
    expect(statusFromStage('terminated', null)).toBe('cancelled');
    expect(statusFromStage('active', null)).toBe('projected');
  });
  it('capYearOf：周期起点 03-01，2026-02-15 属于 2025-03-01 起的周期', () => {
    expect(capYearOf('2026-02-15', '03-01')).toEqual({ start: '2025-03-01', end: '2026-02-28' });
    expect(capYearOf('2026-09-16', '03-01')).toEqual({ start: '2026-03-01', end: '2027-02-28' });
    expect(capYearOf('2026-09-16', '01-01')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
  it('枚举都有中英文', () => {
    for (const s of COMMISSION_SIDES) expect(MESSAGES[`commSide.${s}`], s).toBeDefined();
    for (const s of COMMISSION_STATUSES) expect(MESSAGES[`commStatus.${s}`], s).toBeDefined();
    for (const k of COMMISSION_KINDS) expect(MESSAGES[`commKind.${k}`], k).toBeDefined();
  });
});

describe('方案模块开关 / 预设 / 固定周期费', () => {
  const ytd0 = { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 };
  it('模块关掉就当 0：关分成 + 关 cap → broker 0；关每笔费 → 没有 perDealFee / eoFee', () => {
    const p = CommissionPlanSchema.parse({ ...plan, modules: { split: false, cap: false, perDeal: false, royalty: false, team: false, recurring: false } });
    const r = computeCommission(deal(), p, ytd0);
    expect(r.brokerSplit).toBe(0);
    expect(r.capHit).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.nci).toBe(13500);
  });
  it('每笔费按类型：买卖 540，放租 / 寻租 / 托管 125', () => {
    const p = CommissionPlanSchema.parse({ modules: { split: false, cap: false, perDeal: true, royalty: false, team: false, recurring: false }, perDealFee: 540, perDealFeeLease: 125 });
    expect(computeCommission(deal({ side: 'listing' }), p, ytd0).nci).toBe(13500 - 540);
    expect(computeCommission(deal({ side: 'buyer' }), p, ytd0).nci).toBe(13500 - 540);
    expect(computeCommission(deal({ side: 'landlord', price: 2400, pct: 50 }), p, ytd0).nci).toBe(1200 - 125);
    expect(computeCommission(deal({ side: 'tenant', price: 2400, pct: 50 }), p, ytd0).nci).toBe(1200 - 125);
    expect(computeCommission(deal({ side: 'management', price: 2400, pct: 10 }), p, ytd0).nci).toBe(240 - 125);
  });
  it('预设：每笔固定费型 = 只开每笔费 540 / 125；年费型 = 只开固定周期费 3,000 / 年；KW 型开分成、cap、加盟费', () => {
    const a = applyPreset(DEFAULT_PLAN, 'perDeal');
    expect(a.modules).toEqual({ split: false, cap: false, perDeal: true, royalty: false, team: false, recurring: false });
    expect([a.perDealFee, a.perDealFeeLease]).toEqual([540, 125]);
    const b = applyPreset(DEFAULT_PLAN, 'annual');
    expect(b.modules.recurring).toBe(true);
    expect(b.modules.perDeal).toBe(false);
    expect(b.recurringFees).toEqual([{ name: 'Annual fee', amount: 3000, period: 'yearly' }]);
    const c = applyPreset(DEFAULT_PLAN, 'kw');
    expect(c.modules).toMatchObject({ split: true, cap: true, royalty: true });
    expect(computeCommission(deal(), c, ytd0).brokerSplit).toBe(4050);
    for (const id of PLAN_PRESET_IDS) expect(MESSAGES[`plan.preset.${id}`], id).toBeDefined();
  });
  it('固定周期费换算到一个周期：年 ×1、季 ×4、月 ×12；模块关了就是 0', () => {
    const p = CommissionPlanSchema.parse({ modules: { recurring: true }, recurringFees: [{ name: 'Annual', amount: 3000, period: 'yearly' }, { name: 'MLS', amount: 150, period: 'quarterly' }, { name: 'Desk', amount: 50, period: 'monthly' }] });
    expect(recurringPerPeriod(p)).toBe(3000 + 600 + 600);
    expect(recurringPerPeriod({ ...p, modules: { ...p.modules, recurring: false } })).toBe(0);
  });
  it('旧的 monthlyFees 自动迁成 recurringFees(monthly)；模块没写默认全开', () => {
    const p = CommissionPlanSchema.parse({ monthlyFees: [{ name: 'Tech', amount: 85 }] });
    expect(p.recurringFees).toEqual([{ name: 'Tech', amount: 85, period: 'monthly' }]);
    expect(p.modules).toEqual({ split: true, cap: true, perDeal: true, royalty: true, team: true, recurring: true });
  });
});

describe('按业绩阶梯分成 / 每笔费封顶 / E&O 封顶（前 25 家经纪公司的方式）', () => {
  const ytd = (over: Partial<YearToDate> = {}): YearToDate => ({ brokerPaid: 0, royaltyPaid: 0, teamPaid: 0, gciPaid: 0, perDealPaid: 0, eoPaid: 0, ...over });
  const tiered = CommissionPlanSchema.parse({
    modules: { split: true, cap: false, perDeal: false, royalty: false, team: false, recurring: false },
    splitMode: 'tiers', splitTiers: [{ upTo: 50000, pct: 60 }, { upTo: 100000, pct: 70 }, { upTo: null, pct: 80 }],
  });
  it('阶梯：按这笔之前的本周期 GCI 定档：0 → 60%，60,000 → 70%，120,000 → 80%', () => {
    expect(computeCommission(deal(), tiered, ytd()).brokerSplit).toBe(13500 * 0.4);
    expect(computeCommission(deal(), tiered, ytd({ gciPaid: 60000 })).brokerSplit).toBe(13500 * 0.3);
    expect(computeCommission(deal(), tiered, ytd({ gciPaid: 120000 })).brokerSplit).toBe(r2(13500 * 0.2));
    expect(computeCommission(deal(), tiered, ytd()).agentPct).toBe(60);
  });
  it('阶梯 + cap 同时开：档位比例当 cap 前比例，到 cap 后仍按 cap 后比例', () => {
    const p = CommissionPlanSchema.parse({ ...tiered, modules: { ...tiered.modules, cap: true }, capAmount: 5000, splitPostCap: 100 });
    const r = computeCommission(deal(), p, ytd({ brokerPaid: 4000 }));
    expect(r.brokerSplit).toBe(1000);
    expect(r.capHit).toBe(true);
  });
  it('阶梯表为空或模式是 flat → 用 splitPreCap', () => {
    const p = CommissionPlanSchema.parse({ ...tiered, splitMode: 'flat', splitPreCap: 75 });
    expect(computeCommission(deal(), p, ytd({ gciPaid: 999999 })).brokerSplit).toBe(13500 * 0.25);
    const q = CommissionPlanSchema.parse({ ...tiered, splitTiers: [] });
    expect(computeCommission(deal(), q, ytd()).agentPct).toBe(q.splitPreCap);
  });
  it('每笔费年度封顶（Fathom Max：$465 / 笔到 $9,000 后 $0）：差 100 就封顶时只收 100', () => {
    const p = CommissionPlanSchema.parse({ modules: { split: false, cap: false, perDeal: true, royalty: false, team: false, recurring: false }, perDealFee: 465, perDealFeeLease: 465, perDealFeeCap: 9000, perDealFeeAfterCap: 0 });
    expect(computeCommission(deal(), p, ytd()).lines.find((l) => l.id === 'perDealFee')?.amount).toBe(465);
    expect(computeCommission(deal(), p, ytd({ perDealPaid: 8900 })).lines.find((l) => l.id === 'perDealFee')?.amount).toBe(100);
    expect(computeCommission(deal(), p, ytd({ perDealPaid: 9000 })).lines.find((l) => l.id === 'perDealFee')).toBeUndefined();
  });
  it('封顶后改收另一个数（eXp cap 后 $250 / 笔，交满 $5,000 后 $75）', () => {
    const p = CommissionPlanSchema.parse({ modules: { split: true, cap: true, perDeal: true, royalty: false, team: false, recurring: false }, splitPreCap: 80, splitPostCap: 100, capAmount: 16000, perDealFee: 0, perDealFeePostCap: 250, perDealFeeCap: 5000, perDealFeeAfterCap: 75, eoFee: 60, eoCap: 750 });
    const capped = ytd({ brokerPaid: 16000 });
    expect(computeCommission(deal(), p, capped).lines.find((l) => l.id === 'perDealFee')?.amount).toBe(250);
    expect(computeCommission(deal(), p, ytd({ brokerPaid: 16000, perDealPaid: 5000 })).lines.find((l) => l.id === 'perDealFee')?.amount).toBe(75);
    // E&O $60 封顶 $750：已交 720 → 这笔 30；交满 → 没有
    expect(computeCommission(deal(), p, ytd({ eoPaid: 720 })).lines.find((l) => l.id === 'eoFee')?.amount).toBe(30);
    expect(computeCommission(deal(), p, ytd({ eoPaid: 750 })).lines.find((l) => l.id === 'eoFee')).toBeUndefined();
  });
  it('8 个预设都有文案，套上去能算出 eXp / KW / Real 的典型数', () => {
    for (const id of PLAN_PRESET_IDS) { expect(MESSAGES[`plan.preset.${id}`], id).toBeDefined(); expect(MESSAGES[`plan.preset.${id}.desc`], id).toBeDefined(); }
    const exp = applyPreset(DEFAULT_PLAN, 'exp');
    const r = computeCommission(deal(), exp, ytd());
    expect(r.brokerSplit).toBe(2700); // 20% of 13,500
    expect(r.lines.find((l) => l.id === 'eoFee')?.amount).toBe(60);
    const kw = applyPreset(DEFAULT_PLAN, 'kw');
    expect(computeCommission(deal(), kw, ytd()).royalty).toBe(810); // 6%
    const real = applyPreset(DEFAULT_PLAN, 'real');
    expect(computeCommission(deal(), real, ytd({ brokerPaid: 12000 })).lines.find((l) => l.id === 'perDealFee')?.amount).toBe(285);
    const t = applyPreset(DEFAULT_PLAN, 'tiered');
    expect(t.splitMode).toBe('tiers');
    expect(t.splitTiers.length).toBeGreaterThan(1);
  });
  it('旧的 YearToDate（没有 gciPaid 等）照常能算', () => {
    const r = computeCommission(deal(), plan, { brokerPaid: 0, royaltyPaid: 0, teamPaid: 0 });
    expect(r.nci).toBe(8865);
  });
});
