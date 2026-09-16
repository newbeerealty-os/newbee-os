import { describe, it, expect } from 'vitest';
import { MESSAGES, makeT, isLocale, LOCALES } from '../src/i18n';
import { DEAL_FIELDS } from '../src/schemas/deal-fields';
import { SELLER_PLAYBOOK } from '../src/playbooks';

describe('i18n 词典', () => {
  it('每个 key 的 zh / en 都非空', () => {
    for (const [key, m] of Object.entries(MESSAGES)) {
      expect(m.zh?.trim(), `${key}.zh`).toBeTruthy();
      expect(m.en?.trim(), `${key}.en`).toBeTruthy();
    }
  });

  it('每个字段都有 field.<key>，en 和注册表 label 一致', () => {
    for (const f of DEAL_FIELDS) {
      expect(MESSAGES[`field.${f.key}`], `field.${f.key}`).toBeDefined();
      expect(MESSAGES[`field.${f.key}`].en).toBe(f.label);
    }
  });

  it('seller Playbook 的每个里程碑 / 任务 / 阶段都有翻译', () => {
    for (const m of SELLER_PLAYBOOK.milestones) {
      expect(MESSAGES[`ms.${m.key}`], `ms.${m.key}`).toBeDefined();
      expect(MESSAGES[`ms.${m.key}`].en).toBe(m.label);
    }
    for (const t of SELLER_PLAYBOOK.tasks) {
      expect(MESSAGES[`task.${t.id}`], `task.${t.id}`).toBeDefined();
      expect(MESSAGES[`task.${t.id}`].en).toBe(t.title);
    }
    for (const s of SELLER_PLAYBOOK.stages) expect(MESSAGES[`playbookStage.${s}`], `playbookStage.${s}`).toBeDefined();
  });

  it('枚举标签齐全', () => {
    for (const s of ['lead', 'pre', 'active', 'offer', 'under_contract', 'closing', 'closed', 'terminated']) expect(MESSAGES[`stage.${s}`]).toBeDefined();
    for (const s of ['seller', 'buyer', 'lease_listing', 'lease_tenant', 'property_mgmt']) expect(MESSAGES[`type.${s}`]).toBeDefined();
    for (const s of ['uploaded', 'extracting', 'review', 'confirmed', 'failed']) expect(MESSAGES[`docStatus.${s}`]).toBeDefined();
    for (const g of ['parties', 'money', 'dates', 'property', 'addenda', 'commission', 'lease']) expect(MESSAGES[`group.${g}`]).toBeDefined();
  });
});

describe('makeT', () => {
  it('按 locale 取值', () => {
    expect(makeT('zh')('nav.today')).toBe('今天');
    expect(makeT('en')('nav.today')).toBe('Today');
    expect(makeT('en').locale).toBe('en');
  });

  it('{n} 插值', () => {
    expect(makeT('zh')('rel.inDays', { n: 3 })).toBe('3 天后');
    expect(makeT('en')('rel.inDays', { n: 3 })).toBe('in 3 days');
  });

  it('覆盖值优先；覆盖值只影响给出的语言', () => {
    const t = makeT('zh', { 'nav.today': { zh: '首页' } });
    expect(t('nav.today')).toBe('首页');
    expect(makeT('en', { 'nav.today': { zh: '首页' } })('nav.today')).toBe('Today');
    // 空字符串的覆盖值当作没有
    expect(makeT('zh', { 'nav.today': { zh: '' } })('nav.today')).toBe('今天');
  });

  it('未知 key：t 返回 key 本身，t.or 返回 fallback，has 为 false', () => {
    const t = makeT('zh');
    expect(t('nope.x')).toBe('nope.x');
    expect(t.or('nope.x', 'Raw Title')).toBe('Raw Title');
    expect(t.or('ms.closing', 'Raw Title')).toBe('过户');
    expect(t.has('nope.x')).toBe(false);
    expect(t.has('ms.closing')).toBe(true);
  });

  it('isLocale / LOCALES', () => {
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(LOCALES).toEqual(['zh', 'en']);
  });
});
