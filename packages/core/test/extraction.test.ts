import { describe, it, expect } from 'vitest';
import { ExtractionResultSchema, dropUnknownKeys } from '../src/schemas/extraction';
import { needsReview, toFieldColumns } from '../src/ai/extract';

describe('extraction schema & review rules', () => {
  it('未注册 key 被丢弃', () => {
    const r = ExtractionResultSchema.parse({ docType: 'trec_1_4', addenda: ['hoa_addendum'], pages: 11, fields: [
      { key: 'sales_price', value: '400000', page: 1, quote: '$400,000', confidence: 0.99 },
      { key: 'made_up_key', value: 'x', page: 1, quote: '', confidence: 0.5 },
    ] });
    expect(dropUnknownKeys(r).fields.map((f) => f.key)).toEqual(['sales_price']);
  });
  it('数值 / 日期字段必须人工确认；文本高置信度可自动通过', () => {
    expect(needsReview({ key: 'sales_price', value: '400000', page: 1, quote: '', confidence: 0.99 })).toBe(true);
    expect(needsReview({ key: 'closing_date', value: '2026-11-30', page: 6, quote: '', confidence: 0.99 })).toBe(true);
    expect(needsReview({ key: 'title_company', value: 'Sample Title', page: 2, quote: '', confidence: 0.95 })).toBe(false);
    expect(needsReview({ key: 'title_company', value: 'Sample Title', page: 2, quote: '', confidence: 0.6 })).toBe(true);
  });
  it('toFieldColumns 按类型落到三列', () => {
    expect(toFieldColumns({ key: 'sales_price', value: '$400,000.00', page: 1, quote: '', confidence: 1 })).toEqual({ value_text: null, value_num: 400000, value_date: null });
    expect(toFieldColumns({ key: 'closing_date', value: '2026-11-30', page: 1, quote: '', confidence: 1 })).toEqual({ value_text: null, value_num: null, value_date: '2026-11-30' });
    expect(toFieldColumns({ key: 'buyer_names', value: 'A; B', page: 1, quote: '', confidence: 1 })).toEqual({ value_text: 'A; B', value_num: null, value_date: null });
  });
});
