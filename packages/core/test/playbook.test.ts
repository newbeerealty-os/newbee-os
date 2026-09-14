import { describe, it, expect } from 'vitest';
import { computeMilestones } from '../src/engines/milestones';
import { instantiate, reconcile, currentStage } from '../src/engines/playbook';
import { PlaybookSchema } from '../src/schemas/playbook';
import { SELLER_PLAYBOOK } from '../src/playbooks';
import seller from '../playbooks/seller.json' with { type: 'json' };

const fields = { effective_date: '2026-09-01', earnest_money_due_days: 3, option_period_days: 10, closing_date: '2026-11-30', hoa_docs_delivery_days: 14, first_met: '2026-07-17', view_house_date: '2026-07-17', listing_date: '2026-07-26', offer_received_date: '2026-09-01' };

describe('playbook', () => {
  it('seller.json 通过 schema 校验（任务 id 唯一、锚点存在、阶段存在）', () => {
    expect(() => PlaybookSchema.parse(seller)).not.toThrow();
  });

  it('实例化：有 HOA addendum 时生成 HOA 任务，没有时不生成', () => {
    const msWith = computeMilestones(fields, SELLER_PLAYBOOK.milestones, { addenda: ['hoa_addendum'] });
    const withHoa = instantiate(SELLER_PLAYBOOK, msWith, ['hoa_addendum']);
    expect(withHoa.find((t) => t.playbookRuleId === 'uc-07')?.dueDate).toBe('2026-09-15');

    const msWithout = computeMilestones(fields, SELLER_PLAYBOOK.milestones, { addenda: [] });
    const without = instantiate(SELLER_PLAYBOOK, msWithout, []);
    expect(without.find((t) => t.playbookRuleId === 'uc-07')).toBeUndefined();
    expect(without.find((t) => t.playbookRuleId === 'uc-04')).toBeUndefined(); // lead paint
  });

  it('任务到期日 = 锚点 + 偏移（CDA = closing − 6 = 11/24）', () => {
    const ms = computeMilestones(fields, SELLER_PLAYBOOK.milestones, {});
    const drafts = instantiate(SELLER_PLAYBOOK, ms, []);
    expect(drafts.find((t) => t.playbookRuleId === 'uc-11')?.dueDate).toBe('2026-11-24');
    expect(drafts.find((t) => t.playbookRuleId === 'uc-02')?.dueDate).toBe('2026-09-04');
  });

  it('reconcile：已完成不动；到期变了更新；新的创建；库里多出来的保留', () => {
    const ms = computeMilestones(fields, SELLER_PLAYBOOK.milestones, {});
    const drafts = instantiate(SELLER_PLAYBOOK, ms, []);
    const existing = [
      { id: 'a', playbookRuleId: 'uc-01', title: 'x', dueDate: '2026-09-02', doneAt: '2026-09-02T10:00:00Z' },
      { id: 'b', playbookRuleId: 'uc-11', title: 'x', dueDate: '2026-11-10', doneAt: null },
      { id: 'c', playbookRuleId: 'old-99', title: 'x', dueDate: null, doneAt: null },
    ];
    const r = reconcile(existing, drafts);
    expect(r.keep.map((k) => k.id)).toContain('a');
    expect(r.keep.map((k) => k.id)).toContain('c');
    expect(r.update).toEqual([{ id: 'b', dueDate: '2026-11-24' }]);
    expect(r.create.length).toBe(drafts.length - 2);
  });

  it('currentStage：第一个还有未完成任务的阶段', () => {
    const stage = currentStage(SELLER_PLAYBOOK, [
      { stage: 'pre_listing', doneAt: 'x' },
      { stage: 'listing_appt', doneAt: 'x' },
      { stage: 'under_contract', doneAt: null },
    ]);
    expect(stage).toBe('under_contract');
  });
});
