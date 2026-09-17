// 金额输入框的格式：敲的时候是裸数字，离开后显示 $450,000；一万以上另给一句"45 万"（中文）/ "450K"（英文）
export function parseMoney(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const t = s.replace(/[$,\s]/g, '').replace(/万$/, '');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** $450,000；有小数才带两位 */
export function formatMoneyInput(n: number | null): string {
  if (n === null) return '';
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 }).format(n);
}

/** 一万以上的口语说法：zh → "45 万" / "1.35 万" / "1,200 万"；en → "450K" / "1.35M"。不到一万返回空串 */
export function describeAmount(n: number | null, locale: 'zh' | 'en'): string {
  if (n === null || Math.abs(n) < 10000) return '';
  const trim = (x: number, d: number) => Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
  if (locale === 'zh') {
    const wan = n / 10000;
    return `${trim(wan, wan >= 100 ? 0 : 2)} 万`;
  }
  return Math.abs(n) >= 1_000_000 ? `${trim(n / 1_000_000, 2)}M` : `${trim(n / 1000, n >= 100_000 ? 0 : 1)}K`;
}
