// 交易阶段配色（全站唯一出处）、相关交易 / 相关联系人的强度排序、紧密关系、联系人来源预设。
import type { DealStage } from '../types/domain';

export const DEAL_STAGES: DealStage[] = ['lead', 'pre', 'active', 'offer', 'under_contract', 'closing', 'closed', 'terminated'];

/** 阶段颜色：中饱和度，深浅主题上都能当 4px 色条和圆点用。要改颜色只改这里。 */
export const STAGE_COLORS: Record<DealStage, string> = {
  lead: '#94a3b8',
  pre: '#a78bfa',
  active: '#38bdf8',
  offer: '#fbbf24',
  under_contract: '#f97316',
  closing: '#22c55e',
  closed: '#64748b',
  terminated: '#ef4444',
};

// ---------- 强度：叠加式。阶段越初级越强；越近越强；（相关人再加出现次数） ----------
const STAGE_WEIGHT: Record<DealStage, number> = { lead: 70, pre: 60, active: 50, offer: 40, under_contract: 30, closing: 20, closed: 5, terminated: 0 };
export function stageWeight(stage: string): number {
  return STAGE_WEIGHT[stage as DealStage] ?? 0;
}

const DAY = 86_400_000;
/** 时间线分：今天 10 分，线性衰减，365 天以上 0 分 */
export function recencyScore(updatedAt: string | Date, now: Date): number {
  const days = Math.max(0, (now.getTime() - new Date(updatedAt).getTime()) / DAY);
  return Math.max(0, 10 * (1 - days / 365));
}

export interface DealLike { stage: string; updatedAt: string | Date }
export function dealStrength(d: DealLike, now: Date): number {
  return stageWeight(d.stage) + recencyScore(d.updatedAt, now);
}

export function rankDeals<T extends DealLike>(deals: T[], now: Date): T[] {
  return [...deals].sort((a, b) => dealStrength(b, now) - dealStrength(a, now));
}

export interface RelatedPair { contactId: string; dealId: string }
export interface RelatedRank { contactId: string; strength: number; count: number; dealIds: string[] }

/** 同一交易里出现过的人：每笔共同交易的强度叠加 + 出现次数 × 5 */
export function rankRelated(pairs: RelatedPair[], deals: Record<string, DealLike>, now: Date): RelatedRank[] {
  const acc = new Map<string, RelatedRank>();
  for (const p of pairs) {
    const d = deals[p.dealId];
    if (!d) continue;
    const r = acc.get(p.contactId) ?? { contactId: p.contactId, strength: 0, count: 0, dealIds: [] };
    if (!r.dealIds.includes(p.dealId)) {
      r.dealIds.push(p.dealId);
      r.count += 1;
      r.strength += dealStrength(d, now) + 5;
    }
    acc.set(p.contactId, r);
  }
  return [...acc.values()].sort((a, b) => b.strength - a.strength || b.count - a.count);
}

// ---------- 紧密关系 ----------
export const CONTACT_RELATIONS = ['spouse', 'partner', 'parent', 'child', 'sibling', 'relative', 'friend', 'assistant', 'colleague', 'other'] as const;
export type ContactRelation = (typeof CONTACT_RELATIONS)[number];

/** A 对 B 是 relation，那 B 对 A 是什么 */
export function inverseRelation(r: ContactRelation): ContactRelation {
  const inv: Partial<Record<ContactRelation, ContactRelation>> = { parent: 'child', child: 'parent', assistant: 'colleague' };
  return inv[r] ?? r;
}

// ---------- 联系人来源 ----------
export const SOURCE_PRESETS = ['推荐', '老客户', '交易', 'Zillow', 'Realtor.com', 'Redfin', '开放日', '微信群', '小红书', '朋友', '社交媒体', '网站', '陌拜', '活动 / 展会', 'Google'];
