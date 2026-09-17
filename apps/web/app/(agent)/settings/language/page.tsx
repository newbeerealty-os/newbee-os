// /settings/language —— 图形化改文案：左边场景树（页面 › 区块），右边一张张卡片（当前文字 / 另一种语言 / 显示位置），
// 点开卡片改中英文。不显示 key。改动存 ui_strings，显示时覆盖代码默认值。
import Link from "next/link";
import { MESSAGES, SCENES, sceneOf, type Locale } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { saveUiString, resetUiString } from "@/lib/actions/ui-strings";
import { getT, getLocale } from "@/lib/i18n";
import { Button, Badge, inputCls } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { SearchBox } from "@/components/search-box";

export const dynamic = "force-dynamic";

type Override = { key: string; zh: string | null; en: string | null };

export default async function LanguageSettingsPage({ searchParams }: { searchParams: Promise<{ q?: string; scene?: string; section?: string; changed?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const changedOnly = sp.changed === "1";
  const supabase = await createClient();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const other: Locale = locale === "zh" ? "en" : "zh";
  const { data } = await supabase.from("ui_strings").select("key,zh,en").is("deleted_at", null);
  const overrides = new Map(((data ?? []) as Override[]).map((o) => [o.key, o]));
  const isChanged = (k: string) => { const o = overrides.get(k); return !!(o?.zh || o?.en); };
  const effective = (k: string, l: Locale) => overrides.get(k)?.[l] || MESSAGES[k][l];

  // 每条文案归到场景 › 区块
  const byScene = new Map<string, Map<string, string[]>>();
  for (const k of Object.keys(MESSAGES)) {
    const { scene, section } = sceneOf(k);
    const m = byScene.get(scene.id) ?? new Map<string, string[]>();
    m.set(section.id, [...(m.get(section.id) ?? []), k]);
    byScene.set(scene.id, m);
  }
  const changedCount = (keys: string[]) => keys.filter(isChanged).length;

  const scene = SCENES.find((x) => x.id === sp.scene) ?? (q ? null : SCENES[0]);
  const section = scene?.sections.find((x) => x.id === sp.section) ?? null;
  const needle = q.toLowerCase();
  let keys: string[] = q
    ? Object.keys(MESSAGES).filter((k) => [MESSAGES[k].zh, MESSAGES[k].en, overrides.get(k)?.zh, overrides.get(k)?.en].some((s) => s?.toLowerCase().includes(needle)))
    : scene ? (section ? byScene.get(scene.id)?.get(section.id) ?? [] : [...(byScene.get(scene.id)?.values() ?? [])].flat()) : [];
  if (changedOnly) keys = keys.filter(isChanged);

  const href = (p: { scene?: string; section?: string; changed?: boolean }) => {
    const u = new URLSearchParams();
    if (p.scene) u.set("scene", p.scene);
    if (p.section) u.set("section", p.section);
    if (p.changed ?? changedOnly) u.set("changed", "1");
    const s = u.toString();
    return s ? `/settings/language?${s}` : "/settings/language";
  };
  const L = (x: { zh: string; en: string }) => x[locale];
  const title = q ? `${t("settings.tr.results")} · ${keys.length}` : section ? `${L(scene!)} › ${L(section)}` : scene ? L(scene) : "";
  const where = q ? null : section ? L(section.where) : scene ? L(scene.where) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <SettingsTabs active="/settings/language" />
      <p className="text-sm text-muted">{t("settings.tr.intro")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder={t("settings.tr.search")} label={t("common.search")} allLabel={t("common.searchAll")} widthClass="w-72"
          items={Object.keys(MESSAGES).map((k) => ({ label: effective(k, locale), text: `${MESSAGES[k].zh} ${MESSAGES[k].en} ${overrides.get(k)?.zh ?? ""} ${overrides.get(k)?.en ?? ""}` }))} />
        <Link href={href({ scene: scene?.id, section: section?.id, changed: !changedOnly })} className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm ${changedOnly ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong text-fg hover:bg-chip"}`}>
          {t("settings.tr.changedOnly")}<Badge tone={changedOnly ? "blue" : "zinc"}>{overrides.size}</Badge>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* 场景树 */}
        <nav className="flex flex-col gap-0.5 rounded-ui border border-line bg-surface p-2 lg:sticky lg:top-4 lg:self-start">
          {SCENES.map((sc) => {
            const all = [...(byScene.get(sc.id)?.values() ?? [])].flat();
            const open = scene?.id === sc.id && !q;
            const ch = changedCount(all);
            return (
              <div key={sc.id}>
                <Link href={href({ scene: sc.id })} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${open && !section ? "bg-accent-soft font-semibold text-accent-strong" : open ? "font-semibold text-fg" : "text-fg hover:bg-chip"}`}>
                  <span className="flex-1 truncate">{L(sc)}</span>
                  {ch > 0 && <Badge tone="blue">{ch}</Badge>}
                  <span className="font-mono text-[11px] text-muted">{all.length}</span>
                </Link>
                {open && sc.sections.length > 1 && (
                  <div className="mb-1 ml-3 flex flex-col border-l border-line pl-1.5">
                    {sc.sections.map((se) => {
                      const ks = byScene.get(sc.id)?.get(se.id) ?? [];
                      if (!ks.length) return null;
                      const on = section?.id === se.id;
                      return (
                        <Link key={se.id} href={href({ scene: sc.id, section: se.id })} className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[13px] ${on ? "bg-accent-soft font-semibold text-accent-strong" : "text-muted hover:bg-chip hover:text-fg"}`}>
                          <span className="flex-1 truncate">{L(se)}</span>
                          {changedCount(ks) > 0 && <Badge tone="blue">{changedCount(ks)}</Badge>}
                          <span className="font-mono text-[11px] text-muted">{ks.length}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 卡片 */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {where && <span className="text-sm text-muted">{where}</span>}
          </div>
          {keys.length === 0 ? <p className="rounded-ui border border-line bg-surface py-8 text-center text-sm text-muted">{t("settings.tr.noResults")}</p> : (
            <ul className="flex flex-col gap-2">
              {keys.map((k) => {
                const o = overrides.get(k);
                const changed = isChanged(k);
                const { scene: sc, section: se } = sceneOf(k);
                return (
                  <li key={k}>
                    <details className={`group rounded-ui border bg-surface ${changed ? "border-accent/60" : "border-line"}`}>
                      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-fg">{effective(k, locale)}</span>
                            {changed && <Badge tone="blue">{t("settings.tr.changed")}</Badge>}
                          </div>
                          <div className="mt-0.5 text-sm text-muted">{effective(k, other)}</div>
                          {(q || !section) && <div className="mt-1 text-xs text-muted">{t("settings.tr.where")}：{L(sc)} › {L(se)} · {L(se.where)}</div>}
                        </div>
                        <span className="mt-1 text-xs text-muted transition-transform group-open:rotate-90">▶</span>
                      </summary>
                      <form action={saveUiString} className="grid gap-3 border-t border-line px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <input type="hidden" name="key" value={k} />
                        <label className="flex flex-col gap-1 text-xs text-muted">{t("settings.tr.zh")}
                          <input name="zh" defaultValue={effective(k, "zh")} className={inputCls} />
                          {o?.zh && <span>{t("settings.tr.defaultIs", { v: MESSAGES[k].zh })}</span>}
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-muted">{t("settings.tr.en")}
                          <input name="en" defaultValue={effective(k, "en")} className={inputCls} />
                          {o?.en && <span>{t("settings.tr.defaultIs", { v: MESSAGES[k].en })}</span>}
                        </label>
                        <div className="flex gap-1">
                          <Button type="submit">{t("common.save")}</Button>
                          {changed && <Button variant="danger" type="submit" formAction={resetUiString.bind(null, k)}>{t("common.reset")}</Button>}
                        </div>
                      </form>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
