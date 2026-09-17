// /settings/theme —— 白天 / 夜间各选一个主题；模式：按日出日落自动 / 一直白天 / 一直夜间；定位给日出日落用
import { DAY_THEMES, NIGHT_THEMES, resolveTheme, sunTimes, type Theme } from "@newbee/core";
import { saveTheme } from "@/lib/actions/theme";
import { getT } from "@/lib/i18n";
import { getThemeSettings } from "@/lib/settings";
import { Section, Button, Badge, inputCls } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { ThemeLivePreview, UseMyLocation } from "@/components/theme-form-client";

export const dynamic = "force-dynamic";

const MODES = ["auto", "day", "night"] as const;

function clock(d: Date | null, tz: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
}

/** 用主题自己的颜色画一张小样：侧栏条 + 标题 + 按钮 + 三个状态标签 */
function Swatch({ theme }: { theme: Theme }) {
  const k = theme.tokens;
  return (
    <div className="flex h-20 w-full overflow-hidden" style={{ background: k.bg, borderRadius: k.radius, border: `1px solid ${k.line}` }}>
      <div className="w-9 shrink-0" style={{ background: k.side, borderRight: `1px solid ${k.sideLine}` }}>
        <div className="mx-2 mt-2 h-1.5 rounded" style={{ background: k.sideActive }} />
        <div className="mx-2 mt-1.5 h-1.5 rounded" style={{ background: k.sideLine }} />
        <div className="mx-2 mt-1.5 h-1.5 rounded" style={{ background: k.sideLine }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded" style={{ background: k.text }} />
          <div className="h-4 w-10 rounded" style={{ background: k.accent }} />
        </div>
        <div className="h-8 rounded" style={{ background: k.surface, border: `1px solid ${k.line}` }} />
        <div className="flex gap-1">
          <span className="h-3 w-8 rounded-sm" style={{ background: k.okBg }} />
          <span className="h-3 w-8 rounded-sm" style={{ background: k.warnBg }} />
          <span className="h-3 w-8 rounded-sm" style={{ background: k.dangerBg }} />
        </div>
      </div>
    </div>
  );
}

export default async function ThemeSettingsPage() {
  const [t, settings] = await Promise.all([getT(), getThemeSettings()]);
  const now = new Date();
  const current = resolveTheme(settings, now);
  const tz = process.env.APP_TIMEZONE ?? "America/Chicago";
  const sun = sunTimes(now, settings.lat, settings.lng);

  const pick = (list: Theme[], name: "day" | "night", chosen: string) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((th) => (
        <label key={th.id} className="flex cursor-pointer flex-col gap-2 rounded-ui border border-line p-3 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-accent">
          <Swatch theme={th} />
          <div className="flex items-center gap-2">
            <input type="radio" name={name} value={th.id} defaultChecked={th.id === chosen} className="accent-accent" />
            <span className="text-sm font-medium text-fg">{t(`theme.${th.id}`)}</span>
            {th.id === current.id && <Badge tone="green">{t("settings.current")}</Badge>}
          </div>
          <span className="text-xs text-muted">{t(`theme.${th.id}.tagline`)}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <SettingsTabs active="/settings/theme" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{t("settings.themeHint")}</p>
        <span className="text-xs text-muted">{t("settings.nowUsing", { name: t(`theme.${current.id}`) })}</span>
      </div>

      <form action={saveTheme} className="flex flex-col gap-4">
        <Section title={t("settings.mode")} right={<Button type="submit">{t("common.save")}</Button>}>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 rounded-ui border border-line px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="mode" value={m} defaultChecked={settings.mode === m} className="accent-accent" />
                {t(`settings.mode.${m}`)}
              </label>
            ))}
          </div>
        </Section>

        <ThemeLivePreview>
          <div className="flex flex-col gap-4">
            <Section title={t("settings.dayThemes")}>{pick(DAY_THEMES, "day", settings.day)}</Section>
            <Section title={t("settings.nightThemes")}>{pick(NIGHT_THEMES, "night", settings.night)}</Section>
          </div>
        </ThemeLivePreview>

        <Section title={t("settings.location")} right={<span className="text-sm text-muted">{t("settings.sunToday", { rise: clock(sun.sunrise, tz), set: clock(sun.sunset, tz) })}</span>}>
          <p className="mb-3 text-xs text-muted">{t("settings.locationHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted">{t("settings.lat")}
              <input id="theme-lat" name="lat" type="number" step="0.0001" min="-90" max="90" defaultValue={settings.lat} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted">{t("settings.lng")}
              <input id="theme-lng" name="lng" type="number" step="0.0001" min="-180" max="180" defaultValue={settings.lng} className={inputCls} />
            </label>
            <UseMyLocation labels={{ idle: t("settings.useMyLocation"), busy: t("settings.locating"), failed: t("settings.locationFailed") }} />
          </div>
        </Section>

      </form>
    </div>
  );
}
