// 领域类型：所有引擎只认这些纯数据结构。日期一律 'YYYY-MM-DD' 字符串，时间另存。

export type ISODate = string; // 'YYYY-MM-DD'

export type DealType = 'seller' | 'buyer' | 'lease_listing' | 'lease_tenant' | 'property_mgmt';
export type DealStage = 'lead' | 'pre' | 'active' | 'offer' | 'under_contract' | 'closing' | 'closed' | 'terminated';

/** 交易字段的当前值（deal_fields 里 superseded_at is null 的行） */
export type FieldValue = string | number | boolean | ISODate | null;
export type FieldMap = Record<string, FieldValue>;

/** 里程碑规则（Playbook 里定义） */
export interface MilestoneRule {
  key: string;
  label: string;
  /** 'field:closing_date' 直接取字段；或另一个里程碑的 key */
  from: string;
  /** 数字，或 'field:option_period_days|10'（取字段，缺省 10） */
  offset?: number | string;
  unit?: 'calendar' | 'business';
  /** 落在周末 / 假日是否顺延到下一个工作日 */
  rollForward?: boolean;
  /** 'HH:mm'，如 Option 期 '17:00' */
  time?: string;
  /** 需要合同勾选了某个 addendum 才生成，如 'hoa_addendum' */
  requires?: string;
  clientVisible?: boolean;
}

export interface Milestone {
  key: string;
  label: string;
  date: ISODate | null;
  time?: string;
  derivedFrom: { from: string; offset: number; unit: 'calendar' | 'business'; rollForward: boolean };
  clientVisible: boolean;
}

/** Playbook 任务规则 */
export interface TaskRule {
  id: string;
  stage: string;
  title: string;
  /** 锚定的里程碑 key */
  anchor: string;
  /** 相对锚点的天数，负数 = 之前 */
  offset: number;
  requires?: string;
  clientVisible?: boolean;
  assignee?: string;
  trigger?: { type: 'draft_message' | 'notify'; template?: string };
}

export interface Playbook {
  name: string;
  dealType: DealType;
  version: number;
  stages: string[];
  milestones: MilestoneRule[];
  tasks: TaskRule[];
}

export interface TaskDraft {
  playbookRuleId: string;
  stage: string;
  title: string;
  dueDate: ISODate | null;
  anchorMilestoneKey: string;
  offsetDays: number;
  clientVisible: boolean;
}

/** 数据库里已有的任务（reconcile 输入） */
export interface ExistingTask {
  id: string;
  playbookRuleId: string | null;
  title: string;
  dueDate: ISODate | null;
  doneAt: string | null;
}

export interface Extracted {
  key: string;
  value: string;
  page: number;
  quote: string;
  confidence: number;
}

export interface ExtractionResult {
  docType: string;
  addenda: string[];
  fields: Extracted[];
  pages: number;
  notes?: string;
}
