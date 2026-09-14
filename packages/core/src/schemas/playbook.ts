import { z } from 'zod';

export const MilestoneRuleSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string(),
  from: z.string(),
  offset: z.union([z.number().int(), z.string()]).optional(),
  unit: z.enum(['calendar', 'business']).optional(),
  rollForward: z.boolean().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  requires: z.string().optional(),
  clientVisible: z.boolean().optional(),
});

export const TaskRuleSchema = z.object({
  id: z.string(),
  stage: z.string(),
  title: z.string(),
  anchor: z.string(),
  offset: z.number().int(),
  requires: z.string().optional(),
  clientVisible: z.boolean().optional(),
  assignee: z.string().optional(),
  trigger: z.object({ type: z.enum(['draft_message', 'notify']), template: z.string().optional() }).optional(),
});

export const PlaybookSchema = z
  .object({
    name: z.string(),
    dealType: z.enum(['seller', 'buyer', 'lease_listing', 'lease_tenant', 'property_mgmt']),
    version: z.number().int().positive(),
    stages: z.array(z.string()).min(1),
    milestones: z.array(MilestoneRuleSchema),
    tasks: z.array(TaskRuleSchema),
  })
  .superRefine((pb, ctx) => {
    const msKeys = new Set(pb.milestones.map((m) => m.key));
    const stages = new Set(pb.stages);
    const ids = new Set<string>();
    for (const t of pb.tasks) {
      if (ids.has(t.id)) ctx.addIssue({ code: 'custom', message: `duplicate task id ${t.id}` });
      ids.add(t.id);
      if (!msKeys.has(t.anchor)) ctx.addIssue({ code: 'custom', message: `task ${t.id} anchors unknown milestone ${t.anchor}` });
      if (!stages.has(t.stage)) ctx.addIssue({ code: 'custom', message: `task ${t.id} uses unknown stage ${t.stage}` });
    }
    for (const m of pb.milestones) {
      if (!m.from.startsWith('field:') && !msKeys.has(m.from)) ctx.addIssue({ code: 'custom', message: `milestone ${m.key} derives from unknown ${m.from}` });
    }
  });

export type PlaybookInput = z.input<typeof PlaybookSchema>;
