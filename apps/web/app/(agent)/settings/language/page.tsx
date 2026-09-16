// /settings/language —— 逐条改中英文。代码默认值来自 core 词典；改动存 ui_strings，显示时覆盖。
import { MESSAGES, messageNamespace } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { saveUiString, resetUiString } from "@/lib/actions/ui-strings";
import { getT } from "@/lib/i18n";
import { Section, Button, Badge, inputCls } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { PageHeader } from "@/components/page";

export const dynamic = "force-dynamic";

type Override = { key: string; zh: string | null; en: string | null };

export default async function LanguageSettingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const t = await getT();
  const { data } = await supabase.from("ui_strings").select("key,zh,en").is("deleted_at", null);
  const overrides = new Map(((data ?? []) as Override[]).map((o) => [o.key, o]));

  const needle = q.trim().toLowerCase();
  const keys = Object.keys(MESSAGES).filter((k) => {
    if (!needle) return true;
    const m = MESSAGES[k];
    const o = overrides.get(k);
    return [k, m.zh, m.en, o?.zh, o?.en].some((s) => s?.toLowerCase().includes(needle));
  });
  const byNs = new Map<string, string[]>();
  for (const k of keys) byNs.set(messageNamespace(k), [...(byNs.get(messageNamespace(k)) ?? []), k]);
  const stale = Array.from(overrides.keys()).filter((k) => !MESSAGES[k]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.settings") }, { label: t("settings.language") }]} title={t("settings.language")} />
      <SettingsTabs active="/settings/language" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{t("settings.languageHint")}</p>
        <span className="text-xs text-muted">{t("settings.count", { n: keys.length })}</span>
      </div>

      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("settings.filter")} className={inputCls} />
        <Button variant="ghost" type="submit">OK</Button>
      </form>

      {Array.from(byNs.entries()).map(([ns, list]) => (
        <Section key={ns} title={`${ns} · ${list.length}`}>
          <ul className="divide-y divide-line">
            {list.map((k) => {
              const m = MESSAGES[k];
              const o = overrides.get(k);
              const overridden = !!(o?.zh || o?.en);
              return (
                <li key={k} className={`py-2 ${overridden ? "bg-warn-bg/50" : ""}`}>
                  <form action={saveUiString} className="flex flex-col gap-1 sm:flex-row sm:items-start">
                    <input type="hidden" name="key" value={k} />
                    <div className="min-w-0 sm:w-56 sm:shrink-0">
                      <code className="text-xs text-fg">{k}</code>
                      {overridden && <Badge tone="amber">{t("settings.overridden")}</Badge>}
                    </div>
                    <div className="flex-1">
                      <input name="zh" defaultValue={o?.zh ?? ""} placeholder={m.zh} className={inputCls} />
                      {overridden && <div className="mt-0.5 text-xs text-muted">{t("settings.default")}: {m.zh}</div>}
                    </div>
                    <div className="flex-1">
                      <input name="en" defaultValue={o?.en ?? ""} placeholder={m.en} className={inputCls} />
                      {overridden && <div className="mt-0.5 text-xs text-muted">{t("settings.default")}: {m.en}</div>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" type="submit">{t("common.save")}</Button>
                      {overridden && <Button variant="danger" type="submit" formAction={resetUiString.bind(null, k)}>{t("common.reset")}</Button>}
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      {stale.length > 0 && (
        <Section title={`${t("settings.stale")} · ${stale.length}`}>
          <ul className="divide-y divide-line">
            {stale.map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 py-2">
                <code className="text-xs text-muted">{k}</code>
                <form action={resetUiString.bind(null, k)}>
                  <Button variant="danger" type="submit">{t("common.delete")}</Button>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
