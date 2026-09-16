// 日出日落：给"按日出日落自动切换主题"用。NOAA 简化算法（精度约 ±2 分钟，够用）。
// 全部用 UTC Date；纬度北正南负，经度东正西负。

export interface SunTimes {
  /** 极夜时为 null */
  sunrise: Date | null;
  /** 极昼时为 null */
  sunset: Date | null;
  /** 当天的太阳正午（极昼极夜时用来定"白天"的中心） */
  noon: Date;
  polar: 'day' | 'night' | null;
}

const DAY_MS = 86_400_000;
const J2000 = 2_451_545.0;
const UNIX_EPOCH_JD = 2_440_587.5;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const jdToDate = (jd: number) => new Date((jd - UNIX_EPOCH_JD) * DAY_MS);

/** 某个 UTC 日期（取其所在 UTC 日）在给定经纬度的日出日落 */
export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const jd0 = Math.floor(date.getTime() / DAY_MS) + UNIX_EPOCH_JD; // 当日 0h UTC
  const n = Math.round(jd0 - J2000);
  const jStar = n - lng / 360; // 平太阳正午
  const M = ((357.5291 + 0.98560028 * jStar) % 360 + 360) % 360;
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = J2000 + jStar + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lambda));
  const decl = Math.asin(Math.sin(rad(lambda)) * Math.sin(rad(23.4397)));
  const cosOmega = (Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * Math.sin(decl)) / (Math.cos(rad(lat)) * Math.cos(decl));
  const noon = jdToDate(jTransit);
  if (cosOmega >= 1) return { sunrise: null, sunset: null, noon, polar: 'night' };
  if (cosOmega <= -1) return { sunrise: null, sunset: null, noon, polar: 'day' };
  const omega = deg(Math.acos(cosOmega));
  return { sunrise: jdToDate(jTransit - omega / 360), sunset: jdToDate(jTransit + omega / 360), noon, polar: null };
}

/** 前一天 / 当天 / 后一天的日出日落（跨 UTC 午夜的时区需要看邻天） */
function around(now: Date, lat: number, lng: number): SunTimes[] {
  return [-1, 0, 1].map((d) => sunTimes(new Date(now.getTime() + d * DAY_MS), lat, lng));
}

export function isDaytime(now: Date, lat: number, lng: number): boolean {
  const t = now.getTime();
  const days = around(now, lat, lng);
  for (const s of days) {
    if (s.polar === 'day') {
      // 极昼日：正午前后各 12 小时都算白天
      if (Math.abs(t - s.noon.getTime()) <= DAY_MS / 2) return true;
      continue;
    }
    if (s.polar === 'night') continue;
    if (t >= s.sunrise!.getTime() && t < s.sunset!.getTime()) return true;
  }
  return false;
}

export interface SunEvent {
  at: Date;
  becomes: 'day' | 'night';
}

/** 下一次白天/夜晚切换的时刻。极昼极夜时返回 24 小时后再查一次。 */
export function nextSunEvent(now: Date, lat: number, lng: number): SunEvent {
  const t = now.getTime();
  const events: SunEvent[] = [];
  for (const s of around(now, lat, lng)) {
    if (s.polar) continue;
    events.push({ at: s.sunrise!, becomes: 'day' }, { at: s.sunset!, becomes: 'night' });
  }
  const next = events.filter((e) => e.at.getTime() > t).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  if (next) return next;
  return { at: new Date(t + DAY_MS), becomes: isDaytime(now, lat, lng) ? 'day' : 'night' };
}
