import { describe, it, expect } from 'vitest';
import { commission } from '../src/engines/commission';

describe('commission', () => {
  it('3% of 400,000 = 12,000；扣 broker flat 540 + 2% of GCI 240 → NCI 11,220', () => {
    const r = commission({ price: 400000, pct: 3, brokerFees: [{ name: 'Broker fee', type: 'flat', value: 540 }, { name: 'E&O', type: 'pct_of_gci', value: 2 }] });
    expect(r.gci).toBe(12000);
    expect(r.fees.map((f) => f.amount)).toEqual([540, 240]);
    expect(r.nci).toBe(11220);
  });
  it('referral 25% 先扣', () => {
    const r = commission({ price: 300000, pct: 3, referralPct: 25 });
    expect(r.fees[0]).toEqual({ name: 'Referral', amount: 2250 });
    expect(r.nci).toBe(6750);
  });
  it('cap 生效', () => {
    const r = commission({ price: 1000000, pct: 3, brokerFees: [{ name: 'Split', type: 'pct_of_gci', value: 10, cap: 1500 }] });
    expect(r.fees[0].amount).toBe(1500);
  });
});
