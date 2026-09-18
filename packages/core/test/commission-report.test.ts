import { describe, it, expect } from 'vitest';
import { buildCommissionReport, periodRange, type ReportRow } from '../src/engines/commission-report';
import { THEMES, themeCss } from '../src/themes';

const row = (o: Partial<ReportRow>): ReportRow => ({ id: 'x', kind: 'deal', side: 'listing', status: 'paid', date: '2026-03-10', title: '1 Main St', price: 400000, gci: 12000, nci: 9000, lines: [{ id: 'brokerSplit', amount: 2400 }, { id: 'perDealFee', amount: 540 }, { id: 'eoFee', amount: 60 }], ...o });
const rows: ReportRow[] = [
  row({ id: 'a' }),
  row({ id: 'b', side: 'buyer', status: 'closed', date: '2026-05-02', gci: 9000, nci: 7000, lines: [{ id: 'referralOut', amount: 2000 }] }),
  row({ id: 'c', side: 'tenant', status: 'pending', date: '2026-09-20', price: 2400, gci: 1200, nci: 1075, lines: [{ id: 'perDealFee', amount: 125 }] }),
  row({ id: 'd', kind: 'referral', side: 'referral', status: 'projected', date: '2026-11-30', gci: 2250, nci: 2250, lines: [] }),
  row({ id: 'e', status: 'cancelled', date: '2026-06-01' }),
  row({ id: 'f', date: '2025-12-31' }), // 周期外
];

describe('佣金总览的数据', () => {
  const r = buildCommissionReport(rows, { from: '2026-01-01', to: '2026-12-31', sides: ['listing', 'buyer', 'landlord', 'tenant', 'referral'] });
  it('取消的和周期外的不算；按状态分桶', () => {
    expect(r.count.total).toBe(4);
    expect(r.count.byStatus).toEqual({ paid: 1, closed: 1, pending: 1, projected: 1 });
    expect(r.gci.total).toBe(12000 + 9000 + 1200 + 2250);
    expect(r.gci.byStatus.paid).toBe(12000);
    expect(r.nci.total).toBe(9000 + 7000 + 1075 + 2250);
  });
  it('GCI 去哪儿了：到手 + broker + 推荐费 + 每笔费（含 E&O）+ 加盟费 + 团队 + 其他', () => {
    expect(r.breakdown.nci).toBe(r.nci.total);
    expect(r.breakdown.brokerSplit).toBe(2400);
    expect(r.breakdown.referralOut).toBe(2000);
    expect(r.breakdown.perDeal).toBe(540 + 60 + 125);
    expect(r.breakdown.royalty).toBe(0);
    expect(r.paidRate).toBeCloseTo(r.nci.total / r.gci.total, 5);
  });
  it('按月：周期里每个月一格，按类型分', () => {
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[0].month).toBe('2026-01');
    expect(r.monthly[2].bySide.listing).toEqual({ n: 1, gci: 12000, nci: 9000 });
    expect(r.monthly[4].bySide.buyer?.nci).toBe(7000);
    expect(r.monthly[4].total.nci).toBe(7000);
  });
  it('待收：签约中 + 已成交未收，按日期先后', () => {
    expect(r.pending.map((p) => p.id)).toEqual(['b', 'c']);
    expect(r.pendingTotal).toBe(7000 + 1075);
  });
  it('类型过滤只留买方 → 只剩一笔', () => {
    const s = buildCommissionReport(rows, { from: '2026-01-01', to: '2026-12-31', sides: ['buyer'] });
    expect(s.count.total).toBe(1);
    expect(s.monthly.every((m) => Object.keys(m.bySide).every((k) => k === 'buyer'))).toBe(true);
  });
  it('periodRange：本月 / 本季 / 今年 / 近 12 个月 / 本周期（按方案起点）', () => {
    const t = '2026-09-18';
    expect(periodRange('month', t, '01-01')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodRange('quarter', t, '01-01')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(periodRange('year', t, '01-01')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodRange('m12', t, '01-01')).toEqual({ from: '2025-10-01', to: '2026-09-30' });
    expect(periodRange('period', t, '03-01')).toEqual({ from: '2026-03-01', to: '2027-02-28' });
  });
});

describe('每个主题都预设了图表颜色', () => {
  it('10 个主题各有 4 个状态色、5 个类型色、3 个扣除色，并进 CSS 变量', () => {
    for (const th of THEMES) {
      expect(th.tokens.viz.status).toHaveLength(4);
      expect(th.tokens.viz.sides).toHaveLength(5);
      expect(th.tokens.viz.ded).toHaveLength(3);
      for (const c of [...th.tokens.viz.status, ...th.tokens.viz.sides, ...th.tokens.viz.ded]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const css = themeCss();
    expect(css).toContain('--viz-status-1:');
    expect(css).toContain('--viz-side-5:');
    expect(css).toContain('--viz-ded-3:');
  });
});

describe('交易额合计', () => {
  it('按买 / 卖 / 租赁（放租 + 寻租 + 托管）分；推荐费不算（那是别人的交易）', () => {
    const r = buildCommissionReport(rows, { from: '2026-01-01', to: '2026-12-31', sides: ['listing', 'buyer', 'landlord', 'tenant', 'referral'] });
    expect(r.volume).toEqual({ total: 400000 + 400000 + 2400, sell: 400000, buy: 400000, lease: 2400 });
  });
});
