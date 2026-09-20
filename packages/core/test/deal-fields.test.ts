import { describe, it, expect } from 'vitest';
import { parseFieldInput } from '../src/schemas/deal-fields';

const ok = (key: string, raw: string) => { const r = parseFieldInput(key, raw); if (!r.ok) throw new Error(`expected ok for ${key}=${raw}: ${r.error}`); return r.columns; };
const bad = (key: string, raw: string) => { const r = parseFieldInput(key, raw); expect(r.ok, `${key}=${raw} should fail`).toBe(false); return r.ok ? '' : r.error; };

describe('parseFieldInput：按注册表里的类型解析，类型对不上就报错，绝不静默变 null', () => {
  it('days：10 / "10 days" / "10 天" → 10；小数 / 文字 → error', () => {
    expect(ok('option_period_days', '10 days').value_num).toBe(10);
    expect(ok('option_period_days', '10')).toEqual({ value_text: null, value_num: 10, value_date: null });
    expect(ok('survey_days', '5 天').value_num).toBe(5);
    expect(bad('option_period_days', 'abc')).toMatch(/option_period_days expects days/);
    expect(bad('option_period_days', '2.5')).toMatch(/days/);
  });
  it('money：$450,000 / 450000 / 45万 → 450000；乱字符 → error', () => {
    expect(ok('sales_price', '$450,000').value_num).toBe(450000);
    expect(ok('sales_price', '450000')).toEqual({ value_text: null, value_num: 450000, value_date: null });
    expect(ok('sales_price', '45万').value_num).toBe(450000);
    expect(ok('sales_price', '1.5 万').value_num).toBe(15000);
    expect(bad('sales_price', 'four hundred')).toMatch(/sales_price expects money/);
  });
  it('number：3 / 2.5；文字 → error', () => {
    expect(ok('commission_pct', '3').value_num).toBe(3);
    expect(ok('commission_pct', '2.5').value_num).toBe(2.5);
    expect(bad('commission_pct', '3%%')).toMatch(/number/);
  });
  it('date：只收 YYYY-MM-DD 且是真日期', () => {
    expect(ok('closing_date', '2026-11-30')).toEqual({ value_text: null, value_num: null, value_date: '2026-11-30' });
    expect(ok('effective_date', '2026-02-28').value_date).toBe('2026-02-28');
    expect(bad('closing_date', '11/30/2026')).toMatch(/closing_date expects date/);
    expect(bad('closing_date', '2026-02-30')).toMatch(/date/);
  });
  it('boolean：yes / no / true / false / 是 / 否 → "true" / "false" 存文本列', () => {
    expect(ok('hoa_yes_no', '是')).toEqual({ value_text: 'true', value_num: null, value_date: null });
    expect(ok('hoa_yes_no', 'no').value_text).toBe('false');
    expect(ok('appraisal_waiver', 'TRUE').value_text).toBe('true');
    expect(bad('hoa_yes_no', 'maybe')).toMatch(/boolean/);
  });
  it('text：原样去首尾空白；空 → error', () => {
    expect(ok('title_company', '  Capital Title ')).toEqual({ value_text: 'Capital Title', value_num: null, value_date: null });
    expect(ok('lender', 'Wells Fargo').value_text).toBe('Wells Fargo');
    expect(bad('title_company', '   ')).toMatch(/empty/);
  });
  it('list：逗号 / 顿号 / 分号拆开，去空去重，用 ", " 拼回', () => {
    expect(ok('buyer_names', 'A, B、C').value_text).toBe('A, B, C');
    expect(ok('seller_names', 'Zhang San；Li Si; Zhang San').value_text).toBe('Zhang San, Li Si');
    expect(bad('buyer_names', ', ,')).toMatch(/list/);
  });
  it('不在注册表里的 key 当 text', () => {
    expect(ok('some_custom_key', 'hello').value_text).toBe('hello');
  });
});
