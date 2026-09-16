import type { Metadata, Viewport } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import { themeCss, resolveTheme, nextSunEvent, THEME_BY_ID } from "@newbee/core";
import { getLocale, getT } from "@/lib/i18n";
import { getThemeSettings } from "@/lib/settings";
import { ThemeAutoSwitch } from "@/components/theme-auto-switch";
import "./globals.css";

// 字体：标题 / 正文 Manrope，数据 DM Mono（next/font 自托管）；中文 MiSans 切片在 public/fonts/misans（见 scripts/fetch-misans.mjs）
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

const THEME_STYLE = themeCss();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: "NewBee OS",
    description: t("meta.description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "NewBee OS", statusBarStyle: "default" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = resolveTheme(await getThemeSettings(), new Date());
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: theme.tokens.side };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, settings] = await Promise.all([getLocale(), getThemeSettings()]);
  const now = new Date();
  const theme = resolveTheme(settings, now);
  const next = settings.mode === "auto" ? nextSunEvent(now, settings.lat, settings.lng) : null;

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} data-theme={theme.id} className={`${manrope.variable} ${dmMono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLE }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased" suppressHydrationWarning>
        {children}
        {next && <ThemeAutoSwitch switchAt={next.at.getTime()} switchTo={THEME_BY_ID[next.becomes === "day" ? settings.day : settings.night].id} />}
      </body>
    </html>
  );
}
