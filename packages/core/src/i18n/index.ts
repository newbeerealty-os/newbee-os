// t()：纯函数，不知道 cookie / DB。调用方负责决定 locale 和取覆盖值。
// 回退链：覆盖值[locale] → 默认[locale] → 默认 en → fallback（t.or）→ key
import { MESSAGES, type Message } from './messages';

export * from './messages';
export * from './scenes';

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh';

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export type Overrides = Record<string, Partial<Message>>;
export type Vars = Record<string, string | number>;

export interface Translator {
  (key: string, vars?: Vars): string;
  /** 词典里没有这个 key 时用 fallback（如库里存的英文原文） */
  or(key: string, fallback: string, vars?: Vars): string;
  has(key: string): boolean;
  locale: Locale;
}

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function nonEmpty(s: string | undefined): s is string {
  return typeof s === 'string' && s.trim() !== '';
}

export function makeT(locale: Locale, overrides: Overrides = {}): Translator {
  const lookup = (key: string): string | undefined => {
    const o = overrides[key]?.[locale];
    if (nonEmpty(o)) return o;
    const m = MESSAGES[key];
    if (!m) return undefined;
    return nonEmpty(m[locale]) ? m[locale] : m.en;
  };
  const t = ((key: string, vars?: Vars) => interpolate(lookup(key) ?? key, vars)) as Translator;
  t.or = (key, fallback, vars) => interpolate(lookup(key) ?? fallback, vars);
  t.has = (key) => lookup(key) !== undefined;
  t.locale = locale;
  return t;
}
