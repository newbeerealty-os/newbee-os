import { describe, it, expect } from 'vitest';
import { addCalendarDays, addBusinessDays, rollForward, usFederalHolidays, applyRule, isWeekend, daysUntil } from '../src/engines/dates';

describe('dates engine', () => {
  const H = usFederalHolidays(2026);

  it('日历天：9/1 + 10 = 9/11', () => {
    expect(addCalendarDays('2026-09-01', 10)).toBe('2026-09-11');
  });
  it('跨月跨年', () => {
    expect(addCalendarDays('2026-12-28', 5)).toBe('2027-01-02');
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('周末判断：2026-09-12 是周六', () => {
    expect(isWeekend('2026-09-12')).toBe(true);
    expect(isWeekend('2026-09-14')).toBe(false);
  });
  it('联邦假日：2026 Labor Day = 9/7，Thanksgiving = 11/26，7/4 观察日 = 7/3（周五）', () => {
    expect(H).toContain('2026-09-07');
    expect(H).toContain('2026-11-26');
    expect(H).toContain('2026-07-03');
  });
  it('顺延：落在周六 → 下周一；落在 Labor Day → 9/8', () => {
    expect(rollForward('2026-09-12', H)).toBe('2026-09-14');
    expect(rollForward('2026-09-07', H)).toBe('2026-09-08');
  });
  it('工作日：9/3(四) + 3 个工作日 = 9/9（跳过周末和 Labor Day）', () => {
    expect(addBusinessDays('2026-09-03', 3, H)).toBe('2026-09-09');
  });
  it('负工作日：9/9 − 3 个工作日 = 9/3', () => {
    expect(addBusinessDays('2026-09-09', -3, H)).toBe('2026-09-03');
  });
  it('applyRule：Option 期 10 天落在周五则不动；落在周六则顺延', () => {
    expect(applyRule('2026-09-01', { offset: 10, unit: 'calendar', rollForward: true }, H)).toBe('2026-09-11');
    expect(applyRule('2026-09-02', { offset: 10, unit: 'calendar', rollForward: true }, H)).toBe('2026-09-14');
  });
  it('daysUntil', () => {
    expect(daysUntil('2026-09-11', '2026-09-10')).toBe(1);
    expect(daysUntil('2026-09-08', '2026-09-10')).toBe(-2);
  });
});
