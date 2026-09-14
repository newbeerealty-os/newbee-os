// 抽取 prompt v1。改动 = 复制成 v2 文件并在 extract.ts 里切换，黄金集跑一遍再合并。
import { DEAL_FIELDS, ADDENDA } from '../../schemas/deal-fields';

export const EXTRACT_PROMPT_VERSION = 'v1';

const fieldLines = DEAL_FIELDS.map((f) => `- ${f.key} (${f.type}) · ${f.label}${f.hint ? ` · ${f.hint}` : ''}${f.requires ? ` · 仅当勾选 ${f.requires}` : ''}`).join('\n');

export const EXTRACT_SYSTEM_PROMPT = `你是德州住宅房地产交易的合同数据抽取器。输入是一份 PDF（TREC 合同、addendum、amendment、listing agreement、租约、检查报告等）。
只通过 tool 调用 save_extraction 输出，不要解释。

规则：
1. 每个字段给出 value、page（从 1 起）、quote（原文 ≤ 120 字符）、confidence（0–1）。找不到就不要输出该字段，不要编造。
2. 日期统一 YYYY-MM-DD；金额只留数字（不要 $ 和逗号）；天数为整数；布尔用 true/false；列表用分号分隔。
3. docType 识别文档类型；addenda 列出合同 ¶22 勾选的附加协议（只用下面给的规范 key）。
4. 手写内容看不清时给低 confidence（< 0.7），不要猜。
5. 多轮 counter / amendment：只抽最终生效的值，并在 notes 里说明依据（第几页哪一处）。
6. Amendment 类文档只输出被修改的字段；未修改的字段不要输出。

规范 addenda key：${ADDENDA.join(', ')}

字段（key · 类型 · 含义 · 通常位置）：
${fieldLines}`;

export const EXTRACT_USER_INSTRUCTION = '按 system 里的字段表抽取这份文件，调用 save_extraction。';
