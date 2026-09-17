import { describe, it, expect } from 'vitest';
import { parseAmount, matchesQuery, nextSortDir, compareAddress, compareText, compareNumber, compareDate, sortRows } from '../src/search';

describe('matchesQuery', () => {
  const deal = { text: '1234 sample pl austin tx wang hua kelly wald republic title', nums: [450000, 5000, 300] };
  it('文字包含即命中（地址、人名、公司）', () => {
    expect(matchesQuery('sa', deal)).toBe(true);
    expect(matchesQuery('wang', deal)).toBe(true);
    expect(matchesQuery('WALD', deal)).toBe(true);
    expect(matchesQuery('zhang', deal)).toBe(false);
    expect(matchesQuery('', deal)).toBe(true);
  });
  it('金额：±1 万内命中；太小的数不按金额匹配', () => {
    expect(matchesQuery('455000', deal)).toBe(true);
    expect(matchesQuery('$445,000', deal)).toBe(true);
    expect(matchesQuery('461000', deal)).toBe(false);
    expect(matchesQuery('45', deal)).toBe(false); // 不是金额，文字里也没有
    expect(matchesQuery('12', deal)).toBe(true); // 文字里有 1234
  });
  it('parseAmount', () => {
    expect(parseAmount('450,000')).toBe(450000);
    expect(parseAmount('$450000.5')).toBe(450000.5);
    expect(parseAmount('45w')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('排序', () => {
  it('nextSortDir：asc → desc → null → asc', () => {
    expect(nextSortDir(null)).toBe('asc');
    expect(nextSortDir('asc')).toBe('desc');
    expect(nextSortDir('desc')).toBeNull();
  });
  it('地址按字符逐位比：1125 < 12353 < 1248；空的最后', () => {
    const r = ['1248 Oak', '1125 Elm', null, '12353 Pine'].sort(compareAddress);
    expect(r).toEqual(['1125 Elm', '12353 Pine', '1248 Oak', null]);
  });
  it('文字：中文按拼音、英文按首字母，混排', () => {
    expect(['上海', '北京', 'Austin', '广州'].sort(compareText)).toEqual(['Austin', '北京', '广州', '上海']);
  });
  it('数字按大小、日期按先后', () => {
    expect([10, 2, null, 33].sort(compareNumber)).toEqual([2, 10, 33, null]);
    expect(['2026-11-30', '2026-09-19', null, '2026-10-02'].sort(compareDate)).toEqual(['2026-09-19', '2026-10-02', '2026-11-30', null]);
  });
  it('sortRows：dir=null 原顺序；desc 反过来但空的仍在最后', () => {
    const rows = [{ n: 1 }, { n: 3 }, { n: null as number | null }, { n: 2 }];
    expect(sortRows(rows, (r) => r.n, compareNumber, null).map((r) => r.n)).toEqual([1, 3, null, 2]);
    expect(sortRows(rows, (r) => r.n, compareNumber, 'asc').map((r) => r.n)).toEqual([1, 2, 3, null]);
    expect(sortRows(rows, (r) => r.n, compareNumber, 'desc').map((r) => r.n)).toEqual([3, 2, 1, null]);
  });
});
