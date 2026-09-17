// /settings/language —— 所见即所得：每个页面一个复刻，点页面上的文字就改中英文。复刻和编辑逻辑在 components/i18n-wysiwyg.tsx。
import { SCENES } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT, getLocale } from "@/lib/i18n";
import { SettingsTabs } from "@/components/settings-tabs";
import { I18nWysiwyg, type Overrides } from "@/components/i18n-wysiwyg";

export const dynamic = "force-dynamic";

export default async function LanguageSettingsPage() {
  const supabase = await createClient();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const { data } = await supabase.from("ui_strings").select("key,zh,en").is("deleted_at", null);
  const overrides: Overrides = {};
  for (const r of (data ?? []) as { key: string; zh: string | null; en: string | null }[]) overrides[r.key] = { zh: r.zh, en: r.en };
  const sc = (id: string) => SCENES.find((s) => s.id === id)?.[locale] ?? id;
  const tabNames: Record<string, string> = { nav: sc("nav"), today: sc("today"), deals: sc("deals"), deal: sc("deal"), contacts: sc("contacts"), contact: sc("contact"), form: t("contacts.add"), tasks: sc("tasks"), settings: sc("settings"), login: sc("login"), field: sc("field"), ms: sc("ms"), task: sc("task") };
  const labels = { hint: t("settings.tr.hint"), hidden: t("settings.tr.hidden"), other: t("settings.tr.other"), changedOnly: t("settings.tr.changedOnly"), zh: t("settings.tr.zh"), en: t("settings.tr.en"), defaultIs: t("settings.tr.defaultIs"), sample: t("settings.tr.sample"), save: t("settings.tr.save"), cancel: t("settings.tr.cancel"), reset: t("settings.tr.reset") };
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <SettingsTabs active="/settings/language" />
      <I18nWysiwyg overrides={overrides} locale={locale} labels={labels} tabNames={tabNames} />
    </div>
  );
}
