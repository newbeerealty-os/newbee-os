// 合同抽取：只在服务端调用（API key 绝不进浏览器）。
// 返回 zod 校验过的结果；调用方负责写 documents.extraction / deal_fields。
import Anthropic from '@anthropic-ai/sdk';
import { ExtractionResultSchema, EXTRACTION_TOOL_INPUT_SCHEMA, dropUnknownKeys } from '../schemas/extraction';
import { FIELD_BY_KEY } from '../schemas/deal-fields';
import type { Extracted, ExtractionResult } from '../types/domain';
import { EXTRACT_PROMPT_VERSION, EXTRACT_SYSTEM_PROMPT, EXTRACT_USER_INSTRUCTION } from './prompts/extract-contract';

export interface ExtractOptions {
  apiKey?: string;
  /** 默认读 ANTHROPIC_MODEL_EXTRACT */
  model?: string;
  /** 文档类型提示（如已知是 amendment） */
  docTypeHint?: string;
  maxTokens?: number;
}

export interface ExtractOutcome {
  result: ExtractionResult;
  promptVersion: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

export async function extractContract(pdf: Uint8Array | Buffer, opts: ExtractOptions = {}): Promise<ExtractOutcome> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const model = opts.model ?? process.env.ANTHROPIC_MODEL_EXTRACT ?? 'claude-sonnet-4-5';
  const client = new Anthropic({ apiKey });
  const data = Buffer.from(pdf).toString('base64');

  const res = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 6000,
    system: [{ type: 'text', text: EXTRACT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [
      {
        name: 'save_extraction',
        description: '保存从文件中抽取的结构化字段',
        input_schema: EXTRACTION_TOOL_INPUT_SCHEMA as unknown as Anthropic.Tool['input_schema'],
      },
    ],
    tool_choice: { type: 'tool', name: 'save_extraction' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: opts.docTypeHint ? `${EXTRACT_USER_INSTRUCTION}（提示：这份文件可能是 ${opts.docTypeHint}）` : EXTRACT_USER_INSTRUCTION },
        ],
      },
    ],
  });

  const tool = res.content.find((b) => b.type === 'tool_use');
  if (!tool || tool.type !== 'tool_use') throw new Error('model returned no tool_use block');
  const parsed = dropUnknownKeys(ExtractionResultSchema.parse(tool.input));

  const u = res.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null };
  return {
    result: parsed,
    promptVersion: EXTRACT_PROMPT_VERSION,
    model,
    usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: u.cache_read_input_tokens ?? 0 },
  };
}

/** 数值 / 日期 / 天数 / 金额字段，或置信度 < 0.9 → 必须人工确认 */
export function needsReview(f: Extracted, threshold = 0.9): boolean {
  const def = FIELD_BY_KEY[f.key];
  if (!def) return true;
  if (['number', 'money', 'days', 'date'].includes(def.type)) return true;
  return f.confidence < threshold;
}

/** 把抽取值转成 deal_fields 的三列（text / num / date），由调用方落库 */
export function toFieldColumns(f: Extracted): { value_text: string | null; value_num: number | null; value_date: string | null } {
  const def = FIELD_BY_KEY[f.key];
  const t = def?.type ?? 'text';
  if (t === 'money' || t === 'number' || t === 'days') {
    const n = Number(String(f.value).replace(/[^0-9.-]/g, ''));
    return { value_text: null, value_num: Number.isFinite(n) ? n : null, value_date: null };
  }
  if (t === 'date') return { value_text: null, value_num: null, value_date: /^\d{4}-\d{2}-\d{2}$/.test(f.value) ? f.value : null };
  return { value_text: f.value, value_num: null, value_date: null };
}
