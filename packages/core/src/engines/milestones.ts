// 里程碑引擎：字段 + 规则 → 全部关键日期。任一锚点变了整表重算，再用 diff 找出变化。
import type { FieldMap, ISODate, Milestone, MilestoneRule } from '../types/domain';
import { applyRule, holidaysAround, isISODate } from './dates';

export interface ComputeOptions {
  /** 合同勾选的 addenda（规则里 requires 用） */
  addenda?: string[];
  /** 不传则按锚点年份自动生成联邦假日 */
  holidays?: ISODate[];
}

function resolveOffset(offset: number | string | undefined, fields: FieldMap): number | null {
  if (offset === undefined) return 0;
  if (typeof offset === 'number') return offset;
  // 'field:option_period_days|10'
  const m = /^field:([a-z0-9_]+)(?:\|(-?\d+))?$/.exec(offset);
  if (!m) throw new Error(`bad offset expression: ${offset}`);
  const raw = fields[m[1]];
  if (raw === null || raw === undefined || raw === '') return m[2] !== undefined ? Number(m[2]) : null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return m[2] !== undefined ? Number(m[2]) : null;
  return Math.trunc(n);
}

/**
 * 按规则依赖顺序解析（规则可引用字段或其他里程碑，顺序无关）。
 * 缺锚点或缺 addendum 的规则输出 date=null（保留 key，UI 可显示"未定"）；requires 不满足的规则直接跳过。
 */
export function computeMilestones(fields: FieldMap, rules: MilestoneRule[], opts: ComputeOptions = {}): Milestone[] {
  const addenda = new Set(opts.addenda ?? []);
  const active = rules.filter((r) => !r.requires || addenda.has(r.requires));
  const byKey = new Map(active.map((r) => [r.key, r]));
  const done = new Map<string, Milestone>();
  const visiting = new Set<string>();

  const anchorDate = (from: string): ISODate | null => {
    if (from.startsWith('field:')) {
      const v = fields[from.slice(6)];
      return isISODate(v) ? v : null;
    }
    const dep = byKey.get(from);
    if (!dep) return null;
    return resolve(dep).date;
  };

  const resolve = (rule: MilestoneRule): Milestone => {
    const cached = done.get(rule.key);
    if (cached) return cached;
    if (visiting.has(rule.key)) throw new Error(`circular milestone rule: ${rule.key}`);
    visiting.add(rule.key);

    const base = anchorDate(rule.from);
    const offset = resolveOffset(rule.offset, fields);
    const unit = rule.unit ?? 'calendar';
    const roll = rule.rollForward ?? false;
    let date: ISODate | null = null;
    if (base && offset !== null) {
      const holidays = opts.holidays ?? holidaysAround(base);
      date = applyRule(base, { offset, unit, rollForward: roll }, holidays);
    }
    const ms: Milestone = {
      key: rule.key,
      label: rule.label,
      date,
      time: rule.time,
      derivedFrom: { from: rule.from, offset: offset ?? 0, unit, rollForward: roll },
      clientVisible: rule.clientVisible ?? true,
    };
    visiting.delete(rule.key);
    done.set(rule.key, ms);
    return ms;
  };

  return active.map(resolve);
}

export interface MilestoneDiff {
  added: Milestone[];
  removed: string[];
  changed: { key: string; before: ISODate | null; after: ISODate | null }[];
}

export function diffMilestones(before: Milestone[], after: Milestone[]): MilestoneDiff {
  const b = new Map(before.map((m) => [m.key, m]));
  const a = new Map(after.map((m) => [m.key, m]));
  const added = after.filter((m) => !b.has(m.key));
  const removed = before.filter((m) => !a.has(m.key)).map((m) => m.key);
  const changed = after
    .filter((m) => b.has(m.key) && b.get(m.key)!.date !== m.date)
    .map((m) => ({ key: m.key, before: b.get(m.key)!.date, after: m.date }));
  return { added, removed, changed };
}
