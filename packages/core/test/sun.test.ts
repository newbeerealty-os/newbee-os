import { describe, it, expect } from 'vitest';
import { sunTimes, isDaytime, nextSunEvent } from '../src/engines/sun';

// Austin, TX（默认定位）。参考值来自 NOAA 日出日落表，允许 ±12 分钟误差（算法本身精度约 ±2 分钟）。
const AUSTIN = { lat: 30.2672, lng: -97.7431 };
const minutesApart = (a: Date | null, iso: string) => Math.abs((a!.getTime() - Date.parse(iso)) / 60000);

describe('sunTimes', () => {
  it('夏至：Austin 日出 ≈ 06:29 CDT，日落 ≈ 20:36 CDT', () => {
    const s = sunTimes(new Date('2026-06-21T12:00:00Z'), AUSTIN.lat, AUSTIN.lng);
    expect(minutesApart(s.sunrise, '2026-06-21T11:29:00Z')).toBeLessThan(12);
    expect(minutesApart(s.sunset, '2026-06-22T01:36:00Z')).toBeLessThan(12);
  });

  it('冬至：Austin 日出 ≈ 07:22 CST，日落 ≈ 17:35 CST', () => {
    const s = sunTimes(new Date('2026-12-21T12:00:00Z'), AUSTIN.lat, AUSTIN.lng);
    expect(minutesApart(s.sunrise, '2026-12-21T13:22:00Z')).toBeLessThan(12);
    expect(minutesApart(s.sunset, '2026-12-21T23:35:00Z')).toBeLessThan(12);
  });

  it('极昼 / 极夜返回 null（Tromsø 夏至无日落，冬至无日出）', () => {
    expect(sunTimes(new Date('2026-06-21T12:00:00Z'), 69.65, 18.96).sunset).toBeNull();
    expect(sunTimes(new Date('2026-12-21T12:00:00Z'), 69.65, 18.96).sunrise).toBeNull();
  });
});

describe('isDaytime / nextSunEvent', () => {
  it('Austin 中午是白天，晚上 10 点是夜里', () => {
    expect(isDaytime(new Date('2026-09-16T17:00:00Z'), AUSTIN.lat, AUSTIN.lng)).toBe(true); // 12:00 CDT
    expect(isDaytime(new Date('2026-09-17T03:00:00Z'), AUSTIN.lat, AUSTIN.lng)).toBe(false); // 22:00 CDT
  });

  it('跨 UTC 午夜：Austin 晚上 8 点（UTC 次日 01:00）在夏天仍是白天', () => {
    expect(isDaytime(new Date('2026-06-22T01:00:00Z'), AUSTIN.lat, AUSTIN.lng)).toBe(true);
  });

  it('下一次切换：中午之后是日落 → night；夜里之后是日出 → day', () => {
    const a = nextSunEvent(new Date('2026-09-16T17:00:00Z'), AUSTIN.lat, AUSTIN.lng);
    expect(a.becomes).toBe('night');
    expect(a.at.getTime()).toBeGreaterThan(Date.parse('2026-09-16T17:00:00Z'));
    expect(a.at.getTime()).toBeLessThan(Date.parse('2026-09-17T02:00:00Z'));
    const b = nextSunEvent(new Date('2026-09-17T03:00:00Z'), AUSTIN.lat, AUSTIN.lng);
    expect(b.becomes).toBe('day');
    expect(b.at.getTime()).toBeLessThan(Date.parse('2026-09-17T13:00:00Z'));
  });

  it('极昼时 isDaytime = true，且 nextSunEvent 仍能给出一个未来时刻', () => {
    const now = new Date('2026-06-21T12:00:00Z');
    expect(isDaytime(now, 69.65, 18.96)).toBe(true);
    expect(nextSunEvent(now, 69.65, 18.96).at.getTime()).toBeGreaterThan(now.getTime());
  });
});
