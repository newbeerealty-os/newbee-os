"use client";
// 主题设置页的两个客户端小件：选主题时立刻预览（改 data-theme，不保存）；"用我的位置"填经纬度。
import { useState } from "react";

export function ThemeLivePreview({ children }: { children: React.ReactNode }) {
  return (
    <div onChange={(e) => {
      const el = e.target as HTMLInputElement;
      if (el.type === "radio" && (el.name === "day" || el.name === "night") && el.checked) document.documentElement.dataset.theme = el.value;
    }}>
      {children}
    </div>
  );
}

export function UseMyLocation({ labels }: { labels: { idle: string; busy: string; failed: string } }) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  function locate() {
    if (!navigator.geolocation) { setState("failed"); return; }
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const set = (id: string, v: number) => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) el.value = v.toFixed(4); };
        set("theme-lat", pos.coords.latitude);
        set("theme-lng", pos.coords.longitude);
        setState("idle");
      },
      () => setState("failed"),
      { timeout: 10_000 },
    );
  }
  return (
    <button type="button" onClick={locate} disabled={state === "busy"} className="h-10 rounded-md border border-line-strong px-3 text-sm font-medium text-fg hover:bg-chip disabled:opacity-50">
      {state === "busy" ? labels.busy : state === "failed" ? labels.failed : labels.idle}
    </button>
  );
}
