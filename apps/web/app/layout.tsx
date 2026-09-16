import type { Metadata, Viewport } from "next";
import { getLocale, getT } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: "NewBee OS",
    description: t("meta.description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "NewBee OS", statusBarStyle: "default" },
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1f5f8b" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body className="min-h-dvh bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
