// Playbook 引擎：模板 + 里程碑 → 任务草稿；再和数据库里已有任务对账（不重建已完成的）。
import type { ExistingTask, Milestone, Playbook, TaskDraft } from '../types/domain';
import { addCalendarDays } from './dates';

/** 实例化：每条任务规则 → 一条任务草稿；requires 的 addendum 不在就跳过；锚点没日期就 dueDate=null */
export function instantiate(playbook: Playbook, milestones: Milestone[], addenda: string[] = []): TaskDraft[] {
  const ms = new Map(milestones.map((m) => [m.key, m]));
  const has = new Set(addenda);
  const drafts: TaskDraft[] = [];
  for (const t of playbook.tasks) {
    if (t.requires && !has.has(t.requires)) continue;
    const anchor = ms.get(t.anchor);
    const dueDate = anchor?.date ? addCalendarDays(anchor.date, t.offset) : null;
    drafts.push({
      playbookRuleId: t.id,
      stage: t.stage,
      title: t.title,
      dueDate,
      anchorMilestoneKey: t.anchor,
      offsetDays: t.offset,
      clientVisible: t.clientVisible ?? false,
    });
  }
  return drafts;
}

export interface ReconcileResult {
  create: TaskDraft[];
  update: { id: string; dueDate: string | null }[];
  keep: ExistingTask[];
}

/**
 * 对账规则：
 * - 已完成的任务永远 keep，不改到期日
 * - 未完成且到期日变了 → update
 * - 草稿里有、库里没有 → create
 * - 库里有、草稿里没有（模板删了 / addendum 没了）→ keep，不删（人工决定）
 */
export function reconcile(existing: ExistingTask[], drafts: TaskDraft[]): ReconcileResult {
  const byRule = new Map<string, ExistingTask>();
  for (const e of existing) if (e.playbookRuleId) byRule.set(e.playbookRuleId, e);
  const out: ReconcileResult = { create: [], update: [], keep: [] };
  const touched = new Set<string>();
  for (const d of drafts) {
    const e = byRule.get(d.playbookRuleId);
    if (!e) {
      out.create.push(d);
      continue;
    }
    touched.add(e.id);
    if (e.doneAt) out.keep.push(e);
    else if (e.dueDate !== d.dueDate) out.update.push({ id: e.id, dueDate: d.dueDate });
    else out.keep.push(e);
  }
  for (const e of existing) if (!touched.has(e.id)) out.keep.push(e);
  return out;
}

/** 当前阶段：第一个还有未完成任务的阶段；全部完成则最后一个阶段 */
export function currentStage(playbook: Playbook, tasks: { stage: string; doneAt: string | null }[]): string {
  for (const s of playbook.stages) if (tasks.some((t) => t.stage === s && !t.doneAt)) return s;
  return playbook.stages[playbook.stages.length - 1];
}
