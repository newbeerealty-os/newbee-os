// 主题注册表：纯数据。5 个白天 + 5 个夜间；界面颜色全部走这些 token（CSS 变量），不写死。
// 主题名 / 一句话在 i18n 词典（theme.<id> / theme.<id>.tagline）。id 永不改名。
import { z } from 'zod';
import { isDaytime } from './engines/sun';

export type ThemeMode = 'day' | 'night';

export interface ThemeTokens {
  bg: string; surface: string; line: string; lineStrong: string; text: string; muted: string; chip: string; input: string;
  accent: string; accentInk: string; accentSoft: string; accentStrong: string;
  side: string; sideLine: string; sideText: string; sideMuted: string; sideHover: string; sideActive: string; sideActiveText: string;
  ok: string; okBg: string; warn: string; warnBg: string; danger: string; dangerBg: string; info: string; infoBg: string;
  /** 圆角（px） */
  radius: number;
}

export interface Theme {
  id: string;
  mode: ThemeMode;
  /** 给选择器用的 5 个代表色 */
  swatch: string[];
  tokens: ThemeTokens;
}

export const THEMES: Theme[] = [
  // ---------- 白天 ----------
  { id: 'blueprint', mode: 'day', swatch: ['#14315c', '#eef2f7', '#1f8fd6', '#ffffff', '#1e7f4f'], tokens: {
    bg: '#eef2f7', surface: '#ffffff', line: '#d3dbe6', lineStrong: '#aab6c8', text: '#14315c', muted: '#5b6b85', chip: '#e2e8f1', input: '#ffffff',
    accent: '#1f8fd6', accentInk: '#ffffff', accentSoft: '#dcefff', accentStrong: '#0f6db0',
    side: '#14315c', sideLine: '#24467a', sideText: '#dbe6f5', sideMuted: '#8fa6c9', sideHover: '#1b3d70', sideActive: '#1f8fd6', sideActiveText: '#ffffff',
    ok: '#1e7f4f', okBg: '#dcf3e6', warn: '#9a6400', warnBg: '#fff1cf', danger: '#b93232', dangerBg: '#fde3e3', info: '#0f6db0', infoBg: '#dcefff', radius: 4 } },
  { id: 'porcelain', mode: 'day', swatch: ['#fbfaf7', '#f3f1eb', '#1f5a46', '#1a1a1a', '#8a5a00'], tokens: {
    bg: '#fbfaf7', surface: '#ffffff', line: '#e6e2d9', lineStrong: '#c9c3b6', text: '#1a1a1a', muted: '#6f6a60', chip: '#efece5', input: '#ffffff',
    accent: '#1f5a46', accentInk: '#ffffff', accentSoft: '#e2efe8', accentStrong: '#174535',
    side: '#f3f1eb', sideLine: '#e2ddd2', sideText: '#1a1a1a', sideMuted: '#7a7468', sideHover: '#ebe8e0', sideActive: '#1f5a46', sideActiveText: '#ffffff',
    ok: '#1f5a46', okBg: '#e2efe8', warn: '#8a5a00', warnBg: '#f7ecd2', danger: '#a12f2f', dangerBg: '#f6dede', info: '#2f5f8a', infoBg: '#e3edf6', radius: 2 } },
  { id: 'sandstone', mode: 'day', swatch: ['#f3efe8', '#2b2f36', '#4a6fa5', '#fffdf9', '#2e7d5b'], tokens: {
    bg: '#f3efe8', surface: '#fffdf9', line: '#e4ded3', lineStrong: '#c9c1b2', text: '#2b2f36', muted: '#6c7078', chip: '#ebe6dc', input: '#ffffff',
    accent: '#4a6fa5', accentInk: '#ffffff', accentSoft: '#e1e9f5', accentStrong: '#365688',
    side: '#2b2f36', sideLine: '#3a3f48', sideText: '#eceae4', sideMuted: '#9a9ea8', sideHover: '#353a43', sideActive: '#4a6fa5', sideActiveText: '#ffffff',
    ok: '#2e7d5b', okBg: '#ddf0e6', warn: '#8f5f0b', warnBg: '#fbecc9', danger: '#b23a3a', dangerBg: '#f8dddd', info: '#365688', infoBg: '#e1e9f5', radius: 12 } },
  { id: 'steel', mode: 'day', swatch: ['#ffffff', '#f4f6f8', '#0e7c86', '#1f2933', '#1f7a4d'], tokens: {
    bg: '#f4f6f8', surface: '#ffffff', line: '#e1e6ec', lineStrong: '#bcc6d2', text: '#1f2933', muted: '#62727f', chip: '#e9eef3', input: '#ffffff',
    accent: '#0e7c86', accentInk: '#ffffff', accentSoft: '#d8f0f2', accentStrong: '#0a5f67',
    side: '#ffffff', sideLine: '#e1e6ec', sideText: '#1f2933', sideMuted: '#7a8792', sideHover: '#f1f4f7', sideActive: '#d8f0f2', sideActiveText: '#0a5f67',
    ok: '#1f7a4d', okBg: '#dcf2e6', warn: '#9a6200', warnBg: '#fff0cc', danger: '#b7353a', dangerBg: '#fbe2e3', info: '#0a5f67', infoBg: '#d8f0f2', radius: 8 } },
  { id: 'ivory', mode: 'day', swatch: ['#faf8f2', '#23262b', '#a88a3d', '#ffffff', '#2f6b4f'], tokens: {
    bg: '#faf8f2', surface: '#ffffff', line: '#e8e3d6', lineStrong: '#cfc6b1', text: '#23262b', muted: '#766f60', chip: '#efeadf', input: '#ffffff',
    accent: '#a88a3d', accentInk: '#ffffff', accentSoft: '#f2eadb', accentStrong: '#7d6527',
    side: '#23262b', sideLine: '#33373e', sideText: '#ece8dd', sideMuted: '#9c978b', sideHover: '#2c3037', sideActive: '#a88a3d', sideActiveText: '#ffffff',
    ok: '#2f6b4f', okBg: '#e0eee6', warn: '#8a5f0b', warnBg: '#f7ebcf', danger: '#a33333', dangerBg: '#f5dddd', info: '#4a5d7a', infoBg: '#e6ebf3', radius: 4 } },
  // ---------- 夜间 ----------
  { id: 'obsidian', mode: 'night', swatch: ['#0f1420', '#161d2b', '#c9a35b', '#e6e9ef', '#6cc38a'], tokens: {
    bg: '#0f1420', surface: '#161d2b', line: '#232c3d', lineStrong: '#34405a', text: '#e6e9ef', muted: '#8b95a8', chip: '#232c3d', input: '#0f1420',
    accent: '#c9a35b', accentInk: '#14110a', accentSoft: '#33301f', accentStrong: '#e2c079',
    side: '#0b0f18', sideLine: '#1c2434', sideText: '#d5dae3', sideMuted: '#7d879a', sideHover: '#141b28', sideActive: '#c9a35b', sideActiveText: '#14110a',
    ok: '#6cc38a', okBg: '#16301f', warn: '#e6b45c', warnBg: '#3a2c12', danger: '#ef7c7c', dangerBg: '#3b1a1a', info: '#7fb3e6', infoBg: '#172a40', radius: 6 } },
  { id: 'graphite', mode: 'night', swatch: ['#1c1c1e', '#26262a', '#d08a5b', '#f2efe9', '#7fcb9a'], tokens: {
    bg: '#1c1c1e', surface: '#26262a', line: '#323236', lineStrong: '#46464c', text: '#f2efe9', muted: '#9c9a94', chip: '#343438', input: '#1c1c1e',
    accent: '#d08a5b', accentInk: '#1c1208', accentSoft: '#3b2a1f', accentStrong: '#e8a677',
    side: '#151517', sideLine: '#262629', sideText: '#e8e5df', sideMuted: '#8a8882', sideHover: '#202023', sideActive: '#2b2b30', sideActiveText: '#d08a5b',
    ok: '#7fcb9a', okBg: '#1f3328', warn: '#e5b566', warnBg: '#3a2e18', danger: '#f08080', dangerBg: '#3c1f1f', info: '#8fb8e0', infoBg: '#22303c', radius: 10 } },
  { id: 'jade', mode: 'night', swatch: ['#0b1512', '#12211c', '#3fbf9a', '#e9c56a', '#e3f1ea'], tokens: {
    bg: '#0b1512', surface: '#12211c', line: '#1d3129', lineStrong: '#2c4a3e', text: '#e3f1ea', muted: '#7fa392', chip: '#1d3129', input: '#0b1512',
    accent: '#3fbf9a', accentInk: '#04110c', accentSoft: '#163a30', accentStrong: '#6fdcbb',
    side: '#07100d', sideLine: '#152720', sideText: '#d4e6dc', sideMuted: '#6f9483', sideHover: '#0f1d17', sideActive: '#163a30', sideActiveText: '#6fdcbb',
    ok: '#6fdcbb', okBg: '#163a30', warn: '#e9c56a', warnBg: '#3a3116', danger: '#ff8a80', dangerBg: '#3d1c1c', info: '#7cc4e0', infoBg: '#14303a', radius: 8 } },
  { id: 'indigo', mode: 'night', swatch: ['#12122b', '#1a1a3d', '#7c6cff', '#4fd1c5', '#e9e9ff'], tokens: {
    bg: '#12122b', surface: '#1a1a3d', line: '#27275a', lineStrong: '#3a3a7a', text: '#e9e9ff', muted: '#9a9ccb', chip: '#27275a', input: '#12122b',
    accent: '#7c6cff', accentInk: '#ffffff', accentSoft: '#2a2560', accentStrong: '#a89dff',
    side: '#0d0d22', sideLine: '#202050', sideText: '#dcdcf8', sideMuted: '#8385b8', sideHover: '#16163a', sideActive: '#7c6cff', sideActiveText: '#ffffff',
    ok: '#4fd1c5', okBg: '#123b3a', warn: '#f2c14e', warnBg: '#3d3316', danger: '#ff6b8a', dangerBg: '#421b2a', info: '#8fb3ff', infoBg: '#1e2a55', radius: 6 } },
  { id: 'deepsea', mode: 'night', swatch: ['#071a2b', '#0d2740', '#ffb347', '#e6f0f8', '#5ad4a0'], tokens: {
    bg: '#071a2b', surface: '#0d2740', line: '#173550', lineStrong: '#25496a', text: '#e6f0f8', muted: '#86a3bd', chip: '#173550', input: '#071a2b',
    accent: '#ffb347', accentInk: '#1b1204', accentSoft: '#3b2f14', accentStrong: '#ffc978',
    side: '#041221', sideLine: '#112a42', sideText: '#d8e6f2', sideMuted: '#7591ab', sideHover: '#0a2136', sideActive: '#ffb347', sideActiveText: '#1b1204',
    ok: '#5ad4a0', okBg: '#12382b', warn: '#ffb347', warnBg: '#3b2f14', danger: '#ff7b7b', dangerBg: '#3f1d22', info: '#7fc0ff', infoBg: '#123252', radius: 10 } },
];

export const THEME_BY_ID: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const DAY_THEMES = THEMES.filter((t) => t.mode === 'day');
export const NIGHT_THEMES = THEMES.filter((t) => t.mode === 'night');

/** agents.settings.theme 的形状。lat/lng 给"按日出日落自动"用，默认 Austin, TX。 */
export const ThemeSettingsSchema = z.object({
  mode: z.enum(['auto', 'day', 'night']).default('auto'),
  day: z.string().refine((id) => THEME_BY_ID[id]?.mode === 'day').catch('porcelain'),
  night: z.string().refine((id) => THEME_BY_ID[id]?.mode === 'night').catch('obsidian'),
  lat: z.number().min(-90).max(90).catch(30.2672),
  lng: z.number().min(-180).max(180).catch(-97.7431),
});
export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;
export const DEFAULT_THEME_SETTINGS: ThemeSettings = ThemeSettingsSchema.parse({});

/** 任何输入（settings 里可能没有 / 是坏数据）→ 合法的 ThemeSettings */
export function parseThemeSettings(raw: unknown): ThemeSettings {
  const r = ThemeSettingsSchema.safeParse(raw ?? {});
  return r.success ? r.data : DEFAULT_THEME_SETTINGS;
}

/** 此刻该用哪个主题 */
export function resolveTheme(s: ThemeSettings, now: Date): Theme {
  const day = s.mode === 'day' ? true : s.mode === 'night' ? false : isDaytime(now, s.lat, s.lng);
  return THEME_BY_ID[day ? s.day : s.night];
}

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** 全部主题的 CSS：[data-theme="id"] { --bg: …; } 。放在根 layout 的 <style> 里，一处为准。 */
export function themeCss(): string {
  return THEMES.map((t) => {
    const vars = Object.entries(t.tokens).map(([k, v]) => `--${kebab(k)}:${typeof v === 'number' ? `${v}px` : v}`).join(';');
    return `[data-theme="${t.id}"]{color-scheme:${t.mode === 'night' ? 'dark' : 'light'};${vars}}`;
  }).join('\n');
}
