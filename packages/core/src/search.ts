// 列表页的搜索与排序规则（纯函数，服务端和客户端共用）。
// 搜索：文字包含即命中；纯数字当金额，±1 万内命中。
// 排序：地址按字符逐位比（1125 < 12353 < 1248）；文字按拼音 / 首字母；日期按先后；数字按大小；空值永远在最后。

export const AMOUNT_TOLERANCE = 10_000;
/** 只有这么大的数才当金额（避免 "12" 这种被当成金额） */
const AMOUNT_MIN = 1000;

export function parseAmount(q: string): number | null {
  const s = q.trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export interface Searchable {
  /** 所有可搜的文字拼在一起（小写与否无所谓） */
  text: string;
  /** 金额类数值（成交价、贷款额、定金…） */
  nums?: number[];
}

export function matchesQuery(q: string, s: Searchable): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (s.text.toLowerCase().includes(needle)) return true;
  const n = parseAmount(needle);
  if (n !== null && n >= AMOUNT_MIN) return (s.nums ?? []).some((x) => Math.abs(x - n) <= AMOUNT_TOLERANCE);
  return false;
}

// ---------- 排序 ----------
export type SortDir = 'asc' | 'desc' | null;
/** 表头点击：升序 → 降序 → 恢复默认 → 升序… */
export function nextSortDir(d: SortDir): SortDir {
  return d === null ? 'asc' : d === 'asc' ? 'desc' : null;
}

const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base' });
type Nullable<T> = T | null | undefined;
const empty = (v: unknown) => v === null || v === undefined || v === '';
/** 空值放最后；返回 undefined 表示两边都非空，交给具体比较 */
function nulls(a: unknown, b: unknown): number | undefined {
  const ea = empty(a), eb = empty(b);
  if (ea && eb) return 0;
  if (ea) return 1;
  if (eb) return -1;
  return undefined;
}

/** 地址：字符逐位比（数字当字符），不分大小写 */
export function compareAddress(a: Nullable<string>, b: Nullable<string>): number {
  const n = nulls(a, b); if (n !== undefined) return n;
  const x = a!.toLowerCase(), y = b!.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}
const startsHan = (s: string) => /^[㐀-鿿]/.test(s.trim());
/** 文字：英文按首字母、中文按拼音；英文在前、中文在后（真正按拼音首字母混排需要拼音表，暂不做） */
export function compareText(a: Nullable<string>, b: Nullable<string>): number {
  const n = nulls(a, b); if (n !== undefined) return n;
  const ha = startsHan(a!), hb = startsHan(b!);
  if (ha !== hb) return ha ? 1 : -1;
  return collator.compare(a!, b!);
}
export function compareNumber(a: Nullable<number>, b: Nullable<number>): number {
  const n = nulls(a, b); if (n !== undefined) return n;
  return a! - b!;
}
/** ISO 日期 / 时间字符串：字典序 = 时间序 */
export function compareDate(a: Nullable<string>, b: Nullable<string>): number {
  const n = nulls(a, b); if (n !== undefined) return n;
  return a! < b! ? -1 : a! > b! ? 1 : 0;
}

/** dir=null 保持传入顺序（默认顺序）；升序 / 降序只对非空值生效，空值永远在最后 */
export function sortRows<T, V>(rows: T[], key: (r: T) => V, cmp: (a: V, b: V) => number, dir: SortDir): T[] {
  if (!dir) return rows;
  const nonEmpty = rows.filter((r) => !empty(key(r)));
  const empties = rows.filter((r) => empty(key(r)));
  nonEmpty.sort((a, b) => cmp(key(a), key(b)));
  if (dir === 'desc') nonEmpty.reverse();
  return [...nonEmpty, ...empties];
}
