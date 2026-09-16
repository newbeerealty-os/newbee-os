import { describe, it, expect } from 'vitest';
import { STAGE_COLORS, DEAL_STAGES, stageWeight, dealStrength, rankDeals, rankRelated, CONTACT_RELATIONS, inverseRelation, SOURCE_PRESETS } from '../src/schemas/relations';
import { MESSAGES } from '../src/i18n';

const now = new Date('2026-09-16T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe('交易阶段颜色', () => {
  it('8 个阶段都有颜色，且每个关系都有中英文', () => {
    for (const s of DEAL_STAGES) expect(STAGE_COLORS[s]).toMatch(/^#[0-9a-f]{6}$/i);
    for (const r of CONTACT_RELATIONS) expect(MESSAGES[`relation.${r}`], r).toBeDefined();
    for (const s of SOURCE_PRESETS) expect(s.trim()).toBeTruthy();
  });
});

describe('强度：越初级的阶段越强，越近的越强', () => {
  it('stageWeight 单调：lead > … > closing > closed > terminated', () => {
    const w = DEAL_STAGES.map(stageWeight);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1]);
  });

  it('同阶段：最近更新的排前面；不同阶段：阶段优先于时间', () => {
    const a = { id: 'a', stage: 'under_contract', updatedAt: daysAgo(30) };
    const b = { id: 'b', stage: 'under_contract', updatedAt: daysAgo(1) };
    const c = { id: 'c', stage: 'closed', updatedAt: daysAgo(0) };
    const d = { id: 'd', stage: 'lead', updatedAt: daysAgo(400) };
    expect(rankDeals([a, b, c, d], now).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
    expect(dealStrength(b, now)).toBeGreaterThan(dealStrength(a, now));
  });

  it('close 很久的交易强度接近下限', () => {
    expect(dealStrength({ stage: 'closed', updatedAt: daysAgo(900) }, now)).toBeLessThan(dealStrength({ stage: 'closed', updatedAt: daysAgo(10) }, now));
    expect(dealStrength({ stage: 'terminated', updatedAt: daysAgo(900) }, now)).toBe(0);
  });
});

describe('rankRelated：同一交易里的相关人，按叠加强度 + 出现次数排', () => {
  it('出现在两笔交易里的人 > 只出现在一笔更强交易里的人（当次数足够）', () => {
    const deals = { d1: { stage: 'closed', updatedAt: daysAgo(200) }, d2: { stage: 'closed', updatedAt: daysAgo(300) }, d3: { stage: 'active', updatedAt: daysAgo(2) } };
    const pairs = [
      { contactId: 'x', dealId: 'd1' }, { contactId: 'x', dealId: 'd2' }, // x：两笔旧的
      { contactId: 'y', dealId: 'd3' }, // y：一笔在市
      { contactId: 'z', dealId: 'd2' }, // z：一笔旧的
    ];
    const r = rankRelated(pairs, deals, now);
    expect(r.map((x) => x.contactId)).toEqual(['y', 'x', 'z']);
    expect(r[1].count).toBe(2);
  });
});

describe('inverseRelation', () => {
  it('父母 ↔ 子女；对称关系不变', () => {
    expect(inverseRelation('parent')).toBe('child');
    expect(inverseRelation('child')).toBe('parent');
    expect(inverseRelation('spouse')).toBe('spouse');
    expect(inverseRelation('assistant')).toBe('colleague');
  });
});
