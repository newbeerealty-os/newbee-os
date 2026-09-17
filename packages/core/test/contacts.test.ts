import { describe, it, expect } from 'vitest';
import { CONTACT_KINDS, ORG_KINDS, PARTY_ROLES, PARTY_SIDES, CONTACT_TABS, LICENSE_TYPES, ContactInputSchema, OrganizationInputSchema, PartyInputSchema, initials, contactName, roleSide } from '../src/schemas/contacts';
import { MESSAGES } from '../src/i18n';

describe('contacts 枚举与词典', () => {
  it('每个类型 / 角色 / 方向 / 页签都有中英文', () => {
    for (const k of CONTACT_KINDS) expect(MESSAGES[`contactKind.${k}`], `contactKind.${k}`).toBeDefined();
    for (const k of ORG_KINDS) expect(MESSAGES[`orgKind.${k}`], `orgKind.${k}`).toBeDefined();
    for (const r of PARTY_ROLES) expect(MESSAGES[`partyRole.${r}`], `partyRole.${r}`).toBeDefined();
    for (const s of PARTY_SIDES) expect(MESSAGES[`partySide.${s}`], `partySide.${s}`).toBeDefined();
    for (const tab of CONTACT_TABS) expect(MESSAGES[`contactTab.${tab.id}`], `contactTab.${tab.id}`).toBeDefined();
    for (const l of LICENSE_TYPES) expect(MESSAGES[`licenseType.${l}`], `licenseType.${l}`).toBeDefined();
    expect(CONTACT_KINDS).not.toContain('broker');
    expect(CONTACT_TABS.map((x) => x.id)).not.toContain('broker');
  });

  it('页签覆盖全部人类型和公司类型，且不重复', () => {
    const kinds = CONTACT_TABS.flatMap((t) => t.kinds);
    const orgs = CONTACT_TABS.flatMap((t) => t.orgKinds);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(new Set(orgs).size).toBe(orgs.length);
    for (const k of CONTACT_KINDS) expect(kinds).toContain(k);
    for (const k of ORG_KINDS) expect(orgs).toContain(k);
  });
});

describe('contacts 表单校验', () => {
  it('ContactInput：去空白、空字符串变 null、tags 按逗号 / 顿号拆', () => {
    const c = ContactInputSchema.parse({ kind: 'client', first_name: ' Hua ', last_name: 'Wang', name_zh: '', email: ' ', phone: '(972) 654-3552', tags: '首购, 中文优先、微信' });
    expect(c.first_name).toBe('Hua');
    expect(c.name_zh).toBeNull();
    expect(c.email).toBeNull();
    expect(c.phone).toBe('(972) 654-3552');
    expect(c.tags).toEqual(['首购', '中文优先', '微信']);
    expect(c.preferred_language).toBe('zh');
    expect(c.license_type).toBe('sales_agent');
    expect(ContactInputSchema.parse({ kind: 'agent', first_name: 'A', license_type: 'broker' }).license_type).toBe('broker');
  });

  it('ContactInput：邮箱格式错 / 没名字 / 类型不对 → 报错', () => {
    expect(() => ContactInputSchema.parse({ kind: 'client', first_name: 'A', email: 'nope' })).toThrow();
    expect(() => ContactInputSchema.parse({ kind: 'client', first_name: '  ' })).toThrow();
    expect(() => ContactInputSchema.parse({ kind: 'ghost', first_name: 'A' })).toThrow();
  });

  it('OrganizationInput / PartyInput', () => {
    expect(OrganizationInputSchema.parse({ kind: 'title_company', name: ' Republic Title ' }).name).toBe('Republic Title');
    expect(() => OrganizationInputSchema.parse({ kind: 'title_company', name: '' })).toThrow();
    const p = PartyInputSchema.parse({ contact_id: '4d3b6a8e-0000-4000-8000-000000000001', role: 'buyer', side: 'ours', is_primary: 'on' });
    expect(p.is_primary).toBe(true);
    expect(p.organization_id).toBeNull();
    expect(() => PartyInputSchema.parse({ role: 'buyer' })).toThrow(); // 人或公司二选一
  });
});

describe('展示辅助', () => {
  it('initials：英文取名姓首字母，中文取前两个字，公司取前两个词', () => {
    expect(initials('Kelly', 'Wald')).toBe('KW');
    expect(initials('王', '姐')).toBe('王姐');
    expect(initials('Republic Title')).toBe('RT');
    expect(initials('Goodwin & Company')).toBe('G&');
    expect(initials('TDRealty')).toBe('TD');
  });

  it('contactName：英文名 + 可选中文名', () => {
    expect(contactName({ first_name: 'Hua', last_name: 'Wang', name_zh: '王姐' })).toBe('Hua Wang');
    expect(contactName({ first_name: 'Hua', last_name: '', name_zh: null })).toBe('Hua');
  });

  it('roleSide：角色默认在哪一方（卖方交易里 listing 侧是我方）', () => {
    expect(roleSide('seller', 'seller')).toBe('ours');
    expect(roleSide('buyer', 'seller')).toBe('theirs');
    expect(roleSide('buyer_agent', 'buyer')).toBe('ours');
    expect(roleSide('escrow_officer', 'seller')).toBe('neutral');
  });
});
