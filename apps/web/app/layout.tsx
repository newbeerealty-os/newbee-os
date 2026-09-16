import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_SC, JetBrains_Mono } from "next/font/google";
import { themeCss, resolveTheme, nextSunEvent, THEME_BY_ID } from "@newbee/core";
import { getLocale, getT } from "@/lib/i18n";
import { getThemeSettings } from "@/lib/settings";
import { ThemeAutoSwitch } from "@/components/theme-auto-switch";
import "./globals.css";

// 字体：英文 Inter、中文思源黑体、数据 JetBrains Mono；next/font 自托管，不走 Google 运行时请求
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoSc = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-noto-sc", display: "swap", preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

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
    <html lang={locale === "zh" ? "zh-CN" : "en"} data-theme={theme.id} className={`${inter.variable} ${notoSc.variable} ${jetbrains.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLE }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {children}
        {next && <ThemeAutoSwitch switchAt={next.at.getTime()} switchTo={THEME_BY_ID[next.becomes === "day" ? settings.day : settings.night].id} />}
      </body>
    </html>
  );
}
