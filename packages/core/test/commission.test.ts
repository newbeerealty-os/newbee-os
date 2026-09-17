import { describe, it, expect } from 'vitest';
import { computeCommission, CommissionPlanSchema, DEFAULT_PLAN, statusFromStage, capYearOf, COMMISSION_SIDES, COMMISSION_STATUSES, COMMISSION_KINDS } from '../src/engines/commission';
import { MESSAGES } from '../src/i18n';

// 典型方案：70/30，cap 16,000，每笔 540，cap 后每笔 250，E&O 45
const plan = CommissionPlanSchema.parse({ splitPreCap: 70, splitPostCap: 100, capAmount: 16000, capYearStart: '03-01', perDealFee: 540, perDealFeePostCap: 250, eoFee: 45 });
const deal = (over: Partial<Parameters<typeof computeCommission>[0]> = {}) => ({ kind: 'deal' as const, price: 450000, basis: 'pct' as const, pct: 3, flat: null, fees: [], ...over });

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
