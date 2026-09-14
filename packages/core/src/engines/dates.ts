// 日期引擎：唯一允许做"第 N 天"计算的地方。
// 全部用 'YYYY-MM-DD' 字符串，避免时区问题；时刻（如 17:00）另存。
import { addDays as dfAddDays, format, getDay, parseISO, isValid } from 'date-fns';
import type { ISODate } from '../types/domain';

export function toISO(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}
export function fromISO(s: ISODate): Date {
  const d = parseISO(s);
  if (!isValid(d)) throw new Error(`invalid ISO date: ${s}`);
  return d;
}
export function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s));
}

export function isWeekend(d: ISODate): boolean {
  const day = getDay(fromISO(d));
  return day === 0 || day === 6;
}

/** 某个日期若落在周末，按联邦规则挪到观察日（周六→周五，周日→周一） */
function observed(d: Date): Date {
  const day = getDay(d);
  if (day === 6) return dfAddDays(d, -1);
  if (day === 0) return dfAddDays(d, 1);
  return d;
}
function nthWeekdayOfMonth(year: number, month0: number, weekday: number, n: number): Date {
  const first = new Date(year, month0, 1);
  const delta = (weekday - getDay(first) + 7) % 7;
  return new Date(year, month0, 1 + delta + (n - 1) * 7);
}
function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  const last = new Date(year, month0 + 1, 0);
  const delta = (getDay(last) - weekday + 7) % 7;
  return new Date(year, month0, last.getDate() - delta);
}

/** 美国联邦假日（含观察日）。Title 公司 / 银行按这个休。 */
export function usFederalHolidays(year: number): ISODate[] {
  const list: Date[] = [
    observed(new Date(year, 0, 1)), // New Year's Day
    nthWeekdayOfMonth(year, 0, 1, 3), // MLK Day
    nthWeekdayOfMonth(year, 1, 1, 3), // Presidents' Day
    lastWeekdayOfMonth(year, 4, 1), // Memorial Day
    observed(new Date(year, 5, 19)), // Juneteenth
    observed(new Date(year, 6, 4)), // Independence Day
    nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day
    nthWeekdayOfMonth(year, 9, 1, 2), // Columbus Day
    observed(new Date(year, 10, 11)), // Veterans Day
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving
    observed(new Date(year, 11, 25)), // Christmas
  ];
  return list.map(toISO);
}

export function isHoliday(d: ISODate, holidays: readonly ISODate[]): boolean {
  return holidays.includes(d);
}
export function isBusinessDay(d: ISODate, holidays: readonly ISODate[]): boolean {
  return !isWeekend(d) && !isHoliday(d, holidays);
}

export function addCalendarDays(d: ISODate, n: number): ISODate {
  return toISO(dfAddDays(fromISO(d), n));
}

/** 加 N 个工作日（n 可为负）；n = 0 返回原日期 */
export function addBusinessDays(d: ISODate, n: number, holidays: readonly ISODate[]): ISODate {
  let cur = d;
  const step = n >= 0 ? 1 : -1;
  let left = Math.abs(n);
  while (left > 0) {
    cur = addCalendarDays(cur, step);
    if (isBusinessDay(cur, holidays)) left -= 1;
  }
  return cur;
}

/** 落在周末 / 假日 → 顺延到下一个工作日 */
export function rollForward(d: ISODate, holidays: readonly ISODate[]): ISODate {
  let cur = d;
  while (!isBusinessDay(cur, holidays)) cur = addCalendarDays(cur, 1);
  return cur;
}

export interface DateRule {
  offset: number;
  unit?: 'calendar' | 'business';
  rollForward?: boolean;
}

/** 从锚点日期按规则算出目标日期 */
export function applyRule(base: ISODate, rule: DateRule, holidays: readonly ISODate[]): ISODate {
  const unit = rule.unit ?? 'calendar';
  let out = unit === 'business' ? addBusinessDays(base, rule.offset, holidays) : addCalendarDays(base, rule.offset);
  if (rule.rollForward) out = rollForward(out, holidays);
  return out;
}

/** 给日期引擎用的假日表：覆盖锚点前后各一年即可 */
export function holidaysAround(d: ISODate): ISODate[] {
  const y = fromISO(d).getFullYear();
  return [...usFederalHolidays(y - 1), ...usFederalHolidays(y), ...usFederalHolidays(y + 1)];
}

/** 距今天还有几天（负数 = 已过） */
export function daysUntil(target: ISODate, today: ISODate): number {
  const ms = fromISO(target).getTime() - fromISO(today).getTime();
  return Math.round(ms / 86_400_000);
}
