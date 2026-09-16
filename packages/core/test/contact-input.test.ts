import { describe, it, expect } from 'vitest';
import { formatUsPhone, capitalizeName, emailCompletion, ORG_KINDS_FOR, JOB_TITLE_PRESETS, TAG_PRESETS, CONTACT_KINDS, rankSuggestions } from '../src/schemas/contacts';

describe('formatUsPhone', () => {
  it('10 位美国号码 → 3-3-4，边输边格式化', () => {
    expect(formatUsPhone('5125551234')).toBe('512-555-1234');
    expect(formatUsPhone('512')).toBe('512');
    expect(formatUsPhone('5125')).toBe('512-5');
    expect(formatUsPhone('512555')).toBe('512-555');
    expect(formatUsPhone('(512) 555-1234')).toBe('512-555-1234');
  });
  it('超过 10 位或 + 开头原样返回（国内手机 11 位不动）', () => {
    expect(formatUsPhone('15125551234')).toBe('15125551234');
    expect(formatUsPhone('+86 138 0013 8000')).toBe('+86 138 0013 8000');
    expect(formatUsPhone('13800138000')).toBe('13800138000');
    expect(formatUsPhone('512555123456')).toBe('512555123456');
  });
});

describe('capitalizeName', () => {
  it('每个词首字母大写，其余保留；中文不动', () => {
    expect(capitalizeName('kelly')).toBe('Kelly');
    expect(capitalizeName('mary ann')).toBe('Mary Ann');
    expect(capitalizeName("o'brien")).toBe("O'Brien");
    expect(capitalizeName('jean-luc')).toBe('Jean-Luc');
    expect(capitalizeName('McDonald')).toBe('McDonald');
    expect(capitalizeName('王')).toBe('王');
    expect(capitalizeName('')).toBe('');
  });
});

describe('emailCompletion', () => {
  it('@ 后有字母才补全，按高频域名前缀匹配', () => {
    expect(emailCompletion('1233@g')).toBe('mail.com');
    expect(emailCompletion('a@gm')).toBe('ail.com');
    expect(emailCompletion('a@y')).toBe('ahoo.com');
    expect(emailCompletion('a@1')).toBe('63.com');
    expect(emailCompletion('a@q')).toBe('q.com');
    expect(emailCompletion('a@gmail.com')).toBe('');
  });
  it('没有 @、@ 后为空、没有匹配 → 空', () => {
    expect(emailCompletion('abc')).toBe('');
    expect(emailCompletion('abc@')).toBe('');
    expect(emailCompletion('abc@zzz')).toBe('');
  });
});

describe('预设', () => {
  it('每个联系人类型都有公司类型映射、职位预设、标签预设', () => {
    for (const k of CONTACT_KINDS) {
      expect(ORG_KINDS_FOR[k], k).toBeDefined();
      expect(JOB_TITLE_PRESETS[k].length, k).toBeGreaterThan(0);
      expect(TAG_PRESETS[k].length, k).toBeGreaterThan(0);
    }
    expect(ORG_KINDS_FOR.title_lending).toEqual(['title_company', 'lender']);
  });
  it('rankSuggestions：用过的按次数优先，其后是没用过的预设，去重', () => {
    const r = rankSuggestions(['A', 'B', 'C'], { C: 3, B: 1, X: 2 });
    expect(r).toEqual(['C', 'X', 'B', 'A']);
  });
});
