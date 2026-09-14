import { describe, it, expect } from 'vitest';
import { computeMilestones, diffMilestones } from '../src/engines/milestones';
import { SELLER_PLAYBOOK } from '../src/playbooks';

const base = {
  effective_date: '2026-09-01',
  earnest_money_due_days: 3,
  option_period_days: 10,
  buyer_approval_days: 21,
  survey_days: 5,
  objection_days: 5,
  hoa_docs_delivery_days: 14,
  closing_date: '2026-11-30',
};

describe('milestones (Seller playbook)', () => {
  it('从合同字段算出 Under Contract 段全部关键日期', () => {
    const ms = computeMilestones(base, SELLER_PLAYBOOK.milestones, { addenda: ['financing_addendum', 'hoa_addendum'] });
    const d = Object.fromEntries(ms.map((m) => [m.key, m.date]));
    expect(d.effective_date).toBe('2026-09-01');
    expect(d.em_due).toBe('2026-09-04');            // +3，周五，不顺延
    expect(d.option_period_end).toBe('2026-09-11'); // +10，周五
    expect(d.financing_deadline).toBe('2026-09-22');
    expect(d.survey_due).toBe('2026-09-06');
    expect(d.title_commitment_due).toBe('2026-09-21');
    expect(d.objection_deadline).toBe('2026-09-26');
    expect(d.hoa_docs_due).toBe('2026-09-15');
    expect(d.hoa_termination_end).toBe('2026-09-18');
    expect(d.closing).toBe('2026-11-30');
    expect(d.final_walkthrough).toBe('2026-11-29');
    expect(d.funding).toBe('2026-11-30');
    expect(ms.find((m) => m.key === 'option_period_end')?.time).toBe('17:00');
  });

  it('没有 HOA addendum 就不生成 HOA 里程碑', () => {
    const ms = computeMilestones(base, SELLER_PLAYBOOK.milestones, { addenda: ['financing_addendum'] });
    expect(ms.find((m) => m.key === 'hoa_docs_due')).toBeUndefined();
    expect(ms.find((m) => m.key === 'financing_deadline')?.date).toBe('2026-09-22');
  });

  it('缺锚点字段时 date 为 null，不报错', () => {
    const ms = computeMilestones({ effective_date: '2026-09-01', option_period_days: 7 }, SELLER_PLAYBOOK.milestones, {});
    expect(ms.find((m) => m.key === 'closing')?.date).toBeNull();
    expect(ms.find((m) => m.key === 'final_walkthrough')?.date).toBeNull();
    expect(ms.find((m) => m.key === 'option_period_end')?.date).toBe('2026-09-08');
  });

  it('Option 期落在周日顺延到周一 5PM', () => {
    const ms = computeMilestones({ effective_date: '2026-09-03', option_period_days: 10 }, SELLER_PLAYBOOK.milestones, {});
    expect(ms.find((m) => m.key === 'option_period_end')?.date).toBe('2026-09-14');
  });

  it('改 closing_date 只有 closing 相关的里程碑变化', () => {
    const before = computeMilestones(base, SELLER_PLAYBOOK.milestones, { addenda: ['hoa_addendum'] });
    const after = computeMilestones({ ...base, closing_date: '2026-12-05' }, SELLER_PLAYBOOK.milestones, { addenda: ['hoa_addendum'] });
    const diff = diffMilestones(before, after);
    expect(diff.changed.map((c) => c.key).sort()).toEqual(['closing', 'final_walkthrough', 'funding']);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });
});
