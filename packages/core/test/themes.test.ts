import { describe, it, expect } from 'vitest';
import { THEMES, DAY_THEMES, NIGHT_THEMES, parseThemeSettings, resolveTheme, themeCss, THEME_BY_ID } from '../src/themes';
import { MESSAGES } from '../src/i18n';

describe('themes', () => {
  it('5 个白天 + 5 个夜间，id 唯一，每个都有 i18n 名字和一句话', () => {
    expect(DAY_THEMES.length).toBe(5);
    expect(NIGHT_THEMES.length).toBe(5);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(10);
    for (const t of THEMES) {
      expect(MESSAGES[`theme.${t.id}`], `theme.${t.id}`).toBeDefined();
      expect(MESSAGES[`theme.${t.id}.tagline`], `theme.${t.id}.tagline`).toBeDefined();
      expect(t.swatch.length).toBe(5);
    }
  });

  it('parseThemeSettings：空 / 坏数据 → 默认；白天位填了夜间主题 → 回默认', () => {
    expect(parseThemeSettings(undefined)).toEqual({ mode: 'auto', day: 'porcelain', night: 'obsidian', lat: 30.2672, lng: -97.7431 });
    expect(parseThemeSettings({ mode: 'bogus', day: 'obsidian', lat: 999 })).toEqual({ mode: 'auto', day: 'porcelain', night: 'obsidian', lat: 30.2672, lng: -97.7431 });
    expect(parseThemeSettings({ mode: 'night', day: 'steel', night: 'jade', lat: 31.2, lng: 121.5 })).toEqual({ mode: 'night', day: 'steel', night: 'jade', lat: 31.2, lng: 121.5 });
  });

  it('resolveTheme：day / night 固定；auto 看 Austin 的日出日落', () => {
    const s = parseThemeSettings({ day: 'steel', night: 'jade' });
    expect(resolveTheme({ ...s, mode: 'day' }, new Date('2026-09-17T03:00:00Z')).id).toBe('steel');
    expect(resolveTheme({ ...s, mode: 'night' }, new Date('2026-09-16T17:00:00Z')).id).toBe('jade');
    expect(resolveTheme(s, new Date('2026-09-16T17:00:00Z')).id).toBe('steel'); // 12:00 CDT
    expect(resolveTheme(s, new Date('2026-09-17T03:00:00Z')).id).toBe('jade'); // 22:00 CDT
  });

  it('themeCss：每个主题一条 [data-theme] 规则，含 color-scheme 和全部 token', () => {
    const css = themeCss();
    for (const t of THEMES) expect(css).toContain(`[data-theme="${t.id}"]{color-scheme:${t.mode === 'night' ? 'dark' : 'light'};`);
    expect(css).toContain(`--accent-ink:${THEME_BY_ID.obsidian.tokens.accentInk}`);
    expect(css).toContain('--radius:6px');
  });
});
