import { z } from 'zod';
import { ADDENDA, FIELD_BY_KEY } from './deal-fields';

export const ExtractedFieldSchema = z.object({
  key: z.string(),
  value: z.string().min(1),
  page: z.number().int().min(1),
  quote: z.string().max(200).default(''),
  confidence: z.number().min(0).max(1),
});

export const ExtractionResultSchema = z.object({
  docType: z.enum(['trec_1_4', 'amendment', 'financing_addendum', 'hoa_addendum', 'listing_agreement', 'buyer_rep', 'lease', 'inspection_report', 'appraisal', 'title_commitment', 'other']),
  addenda: z.array(z.enum(ADDENDA)).default([]),
  fields: z.array(ExtractedFieldSchema),
  pages: z.number().int().min(1),
  notes: z.string().optional(),
});

export type ExtractionResultParsed = z.infer<typeof ExtractionResultSchema>;

/** 丢掉未注册的 key，避免模型自由发挥污染 deal_fields */
export function dropUnknownKeys(r: ExtractionResultParsed): ExtractionResultParsed {
  return { ...r, fields: r.fields.filter((f) => FIELD_BY_KEY[f.key]) };
}

/** JSON Schema，给 Anthropic tool_use 用（与上面的 zod 保持一致） */
export const EXTRACTION_TOOL_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['docType', 'addenda', 'fields', 'pages'],
  properties: {
    docType: { type: 'string', enum: ['trec_1_4', 'amendment', 'financing_addendum', 'hoa_addendum', 'listing_agreement', 'buyer_rep', 'lease', 'inspection_report', 'appraisal', 'title_commitment', 'other'] },
    addenda: { type: 'array', items: { type: 'string', enum: [...ADDENDA] } },
    pages: { type: 'integer', minimum: 1 },
    notes: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'value', 'page', 'quote', 'confidence'],
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          page: { type: 'integer', minimum: 1 },
          quote: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;
