import { daysUntil } from "@newbee/core";

export function todayISO(tz = process.env.APP_TIMEZONE ?? "America/Chicago"): string {
  // 用本地时区的"今天"，避免 UTC 半夜提前一天
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function relDays(date: string | null, today: string): string {
  if (!date) return "未定";
  const n = daysUntil(date, today);
  if (n === 0) return "今天";
  if (n === 1) return "明天";
  if (n < 0) return `逾期 ${-n} 天`;
  return `${n} 天后`;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
