// 文档分类：只看前 1–2 页文本，用便宜的模型。
import Anthropic from '@anthropic-ai/sdk';

export const DOC_TYPES = ['trec_1_4', 'amendment', 'financing_addendum', 'hoa_addendum', 'listing_agreement', 'buyer_rep', 'lease', 'inspection_report', 'appraisal', 'title_commitment', 'other'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export async function classifyDocument(firstPagesText: string, opts: { apiKey?: string; model?: string } = {}): Promise<DocType> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const model = opts.model ?? process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5';
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model,
    max_tokens: 100,
    system: '你是德州房地产文件分类器。根据文本判断文档类型，只调用 tool。',
    tools: [{ name: 'set_type', description: '文档类型', input_schema: { type: 'object', required: ['docType'], properties: { docType: { type: 'string', enum: [...DOC_TYPES] } } } }],
    tool_choice: { type: 'tool', name: 'set_type' },
    messages: [{ role: 'user', content: firstPagesText.slice(0, 6000) }],
  });
  const tool = res.content.find((b) => b.type === 'tool_use');
  const t = tool && tool.type === 'tool_use' ? (tool.input as { docType?: string }).docType : undefined;
  return (DOC_TYPES as readonly string[]).includes(t ?? '') ? (t as DocType) : 'other';
}
