// 联系人：枚举（和 0003_contacts.sql 的 enum 一一对应，永不改名）、表单校验、展示辅助。
// 类型 = 身份（contacts.kind）；角色 = 在某笔交易里的位置（deal_parties.role）。
import { z } from 'zod';
import type { DealType } from '../types/domain';

export const CONTACT_KINDS = ['client', 'agent', 'broker', 'title_lending', 'vendor', 'tc', 'attorney', 'other'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const ORG_KINDS = ['brokerage', 'title_company', 'lender', 'law_firm', 'vendor', 'hoa', 'property_management', 'other'] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const PARTY_ROLES = [
  'buyer', 'seller', 'tenant', 'landlord',
  'listing_agent', 'buyer_agent', 'listing_broker', 'buyer_broker', 'tc',
  'buyer_attorney', 'seller_attorney', 'escrow_officer', 'title_company', 'lender', 'loan_officer',
  'inspector', 'appraiser', 'surveyor', 'photographer', 'stager', 'contractor',
  'hoa', 'property_manager', 'referral', 'other',
] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export const PARTY_SIDES = ['ours', 'theirs', 'neutral'] as const;
export type PartySide = (typeof PARTY_SIDES)[number];

export const CONTACT_CHANNELS = ['phone', 'sms', 'email', 'wechat', 'whatsapp'] as const;
export const CONTACT_LANGUAGES = ['zh', 'en'] as const;

/** 总表顶部页签：每个页签 = 若干人类型 + 若干公司类型 */
export interface ContactTab { id: string; kinds: ContactKind[]; orgKinds: OrgKind[] }
export const CONTACT_TABS: ContactTab[] = [
  { id: 'client', kinds: ['client'], orgKinds: [] },
  { id: 'agent', kinds: ['agent'], orgKinds: [] },
  { id: 'brokerage', kinds: [], orgKinds: ['brokerage'] },
  { id: 'broker', kinds: ['broker'], orgKinds: [] },
  { id: 'title_lending', kinds: ['title_lending'], orgKinds: ['title_company', 'lender'] },
  { id: 'vendor', kinds: ['vendor'], orgKinds: ['vendor'] },
  { id: 'tc', kinds: ['tc'], orgKinds: [] },
  { id: 'attorney', kinds: ['attorney'], orgKinds: ['law_firm'] },
  { id: 'other', kinds: ['other'], orgKinds: ['hoa', 'property_management', 'other'] },
];

// ---------- 表单校验（FormData 进来的都是字符串） ----------
const blankToNull = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v ?? null), z.string().nullable());
const optionalUuid = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v ?? null), z.string().uuid().nullable());
const tagsField = z.preprocess((v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  return v.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
}, z.array(z.string()));
const checkbox = z.preprocess((v) => v === true || v === 'on' || v === 'true' || v === '1', z.boolean());

export const ContactInputSchema = z.object({
  kind: z.enum(CONTACT_KINDS),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().default(''),
  name_zh: blankToNull.default(null),
  organization_id: optionalUuid.default(null),
  job_title: blankToNull.default(null),
  email: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v ?? null), z.string().email().nullable()).default(null),
  phone: blankToNull.default(null),
  wechat: blankToNull.default(null),
  preferred_channel: z.preprocess((v) => (v === '' ? null : v ?? null), z.enum(CONTACT_CHANNELS).nullable()).default(null),
  preferred_language: z.enum(CONTACT_LANGUAGES).default('zh'),
  license_no: blankToNull.default(null),
  address_line1: blankToNull.default(null),
  address_line2: blankToNull.default(null),
  city: blankToNull.default(null),
  state: blankToNull.default(null),
  zip: blankToNull.default(null),
  tags: tagsField.default([]),
  source: blankToNull.default(null),
  referred_by_contact_id: optionalUuid.default(null),
  birthday: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v ?? null), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).default(null),
  notes: blankToNull.default(null),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export const OrganizationInputSchema = z.object({
  kind: z.enum(ORG_KINDS),
  name: z.string().trim().min(1),
  phone: blankToNull.default(null),
  email: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v ?? null), z.string().email().nullable()).default(null),
  website: blankToNull.default(null),
  address_line1: blankToNull.default(null),
  address_line2: blankToNull.default(null),
  city: blankToNull.default(null),
  state: blankToNull.default(null),
  zip: blankToNull.default(null),
  license_no: blankToNull.default(null),
  primary_contact_id: optionalUuid.default(null),
  notes: blankToNull.default(null),
});
export type OrganizationInput = z.infer<typeof OrganizationInputSchema>;

export const PartyInputSchema = z.object({
  contact_id: optionalUuid.default(null),
  organization_id: optionalUuid.default(null),
  role: z.enum(PARTY_ROLES),
  side: z.enum(PARTY_SIDES).default('neutral'),
  is_primary: checkbox.default(false),
  notes: blankToNull.default(null),
}).refine((p) => (p.contact_id === null) !== (p.organization_id === null), { message: 'contact_id or organization_id, exactly one' });
export type PartyInput = z.infer<typeof PartyInputSchema>;

// ---------- 表单里的预设与输入辅助 ----------
/** 选了联系人类型后，所属公司下拉只列这些公司类型 */
export const ORG_KINDS_FOR: Record<ContactKind, OrgKind[]> = {
  client: ['other', 'property_management', 'hoa', 'vendor'],
  agent: ['brokerage'],
  broker: ['brokerage'],
  title_lending: ['title_company', 'lender'],
  vendor: ['vendor'],
  tc: ['brokerage', 'other'],
  attorney: ['law_firm'],
  other: ['hoa', 'property_management', 'other', 'vendor', 'brokerage'],
};

/** 房地产交易里常见的职位，按类型；用得多的会排到前面（rankSuggestions） */
export const JOB_TITLE_PRESETS: Record<ContactKind, string[]> = {
  client: ['Investor', 'Homeowner', 'Engineer', 'Physician', 'Business Owner', 'Retired'],
  agent: ['Realtor', 'Listing Agent', "Buyer's Agent", 'Broker Associate', 'Team Lead', 'Leasing Agent'],
  broker: ['Broker', 'Managing Broker', 'Designated Broker', 'Broker / Owner'],
  title_lending: ['Escrow Officer', 'Escrow Assistant', 'Closer', 'Title Examiner', 'Business Development', 'Loan Officer', 'Mortgage Broker', 'Loan Processor', 'Underwriter'],
  vendor: ['Home Inspector', 'Appraiser', 'Surveyor', 'Photographer', 'Stager', 'General Contractor', 'Handyman', 'Roofer', 'HVAC Technician', 'Plumber', 'Electrician', 'Cleaner', 'Mover', 'Landscaper', 'Insurance Agent', 'Pest Control'],
  tc: ['Transaction Coordinator', 'Listing Coordinator', 'Closing Coordinator'],
  attorney: ['Real Estate Attorney', 'Paralegal', 'Legal Assistant'],
  other: ['HOA Manager', 'Property Manager', 'Community Manager', 'Leasing Agent', 'Assistant'],
};

export const TAG_PRESETS: Record<ContactKind, string[]> = {
  client: ['首购', '换房', '投资客', '现金', 'VA', 'FHA', '中文优先', '微信联系', '老客户', '推荐来源', 'Zillow', '开放日', '急', '观望'],
  agent: ['合作过', '好沟通', '双语', '团队', '对方经纪'],
  broker: ['自己公司', '对方公司', '双语'],
  title_lending: ['常用', '中文服务', '快', '远程签约', '双语'],
  vendor: ['常用', '靠谱', '便宜', '中文服务', '周末可约', '有执照'],
  tc: ['自己的', '对方的', '双语'],
  attorney: ['常用', '中文服务', '双语'],
  other: ['HOA', '物业', '介绍人', '亲友'],
};

/** 高频邮箱域名（前缀匹配，先命中先用） */
export const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'qq.com', '163.com', '126.com', 'live.com', 'aol.com', 'msn.com', 'me.com', 'foxmail.com', 'sina.com', 'protonmail.com'];

/** 输入 "1233@g" → 返回还没打的部分 "mail.com"；不该补全时返回 '' */
export function emailCompletion(value: string): string {
  const at = value.lastIndexOf('@');
  if (at === -1) return '';
  const typed = value.slice(at + 1).toLowerCase();
  if (!typed) return '';
  const hit = EMAIL_DOMAINS.find((d) => d.startsWith(typed) && d !== typed);
  return hit ? hit.slice(typed.length) : '';
}

/** 美国号码（正好 10 位）→ 3-3-4，边输边格式化；超过 10 位或带 + 的原样返回 */
export function formatUsPhone(raw: string): string {
  const s = raw.trim();
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length > 10) return digits;
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join('-');
}

/** 每个词（含 - 和 ' 分隔）首字母大写，其余保留（McDonald 不动） */
export function capitalizeName(s: string): string {
  return s.replace(/(^|[\s'-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** 用过的按次数降序 → 没用过的预设按原顺序；去重 */
export function rankSuggestions(presets: string[], used: Record<string, number>): string[] {
  const usedSorted = Object.entries(used).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const out: string[] = [];
  for (const x of [...usedSorted, ...presets]) if (!out.includes(x)) out.push(x);
  return out;
}

// ---------- 展示辅助 ----------
const isCjk = (s: string) => /[㐀-鿿]/.test(s);

/** 头像首字母：英文取名姓首字母；中文取前两个字；公司取前两个词的首字符 */
export function initials(first: string, last = ''): string {
  const f = first.trim();
  const l = last.trim();
  if (l) return isCjk(f + l) ? (f + l).slice(0, 2) : `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
  if (isCjk(f)) return f.slice(0, 2);
  const words = f.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return f.slice(0, 2).toUpperCase();
}

export function contactName(c: { first_name: string; last_name: string | null; name_zh?: string | null }): string {
  return [c.first_name, c.last_name].filter((s) => s && s.trim()).join(' ').trim();
}

/** 角色在这种交易里默认属于哪一方：卖方交易里 listing 侧是我方，买方交易里 buyer 侧是我方 */
export function roleSide(role: PartyRole, dealType: DealType): PartySide {
  const sellerSide: PartyRole[] = ['seller', 'landlord', 'listing_agent', 'listing_broker', 'seller_attorney'];
  const buyerSide: PartyRole[] = ['buyer', 'tenant', 'buyer_agent', 'buyer_broker', 'buyer_attorney'];
  const weAreSeller = dealType === 'seller' || dealType === 'lease_listing' || dealType === 'property_mgmt';
  if (sellerSide.includes(role)) return weAreSeller ? 'ours' : 'theirs';
  if (buyerSide.includes(role)) return weAreSeller ? 'theirs' : 'ours';
  return 'neutral';
}
