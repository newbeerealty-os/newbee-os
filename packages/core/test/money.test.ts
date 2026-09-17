import { describe, it, expect } from 'vitest';
import { parseMoney, formatMoneyInput, describeAmount } from '../src/money';

describe('金额输入框格式', () => {
  it('parseMoney：去掉 $ , 空格；空 / 半截返回 null', () => {
    expect(parseMoney('$450,000')).toBe(450000);
    expect(parseMoney(' 1,234.5 ')).toBe(1234.5);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('-')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney(540)).toBe(540);
  });
  it('formatMoneyInput：整数不带分，有小数带两位', () => {
    expect(formatMoneyInput(450000)).toBe('$450,000');
    expect(formatMoneyInput(1234.5)).toBe('$1,234.50');
    expect(formatMoneyInput(0)).toBe('$0');
    expect(formatMoneyInput(null)).toBe('');
  });
  it('describeAmount：一万以上才说，中文按万，英文按 K / M', () => {
    expect(describeAmount(9999, 'zh')).toBe('');
    expect(describeAmount(10000, 'zh')).toBe('1 万');
    expect(describeAmount(13500, 'zh')).toBe('1.35 万');
    expect(describeAmount(450000, 'zh')).toBe('45 万');
    expect(describeAmount(12_000_000, 'zh')).toBe('1,200 万');
    expect(describeAmount(13500, 'en')).toBe('13.5K');
    expect(describeAmount(450000, 'en')).toBe('450K');
    expect(describeAmount(1_350_000, 'en')).toBe('1.35M');
  });
});
