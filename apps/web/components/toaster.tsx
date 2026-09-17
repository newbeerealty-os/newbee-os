"use client";
// 右下角小提示：服务端 flash（layout 传进来）+ 客户端 toast() 事件。2.4 秒自动消失，不挡操作。
import { useEffect, useState } from "react";

export interface ToastMsg { id: number; text: string; tone: "ok" | "error" }
const EVENT = "nb:toast";

/** 客户端组件里直接调：toast("已复制") */
export function toast(text: string, tone: ToastMsg["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: Date.now(), text, tone } }));
}

export function Toaster({ initial, cookieName }: { initial: ToastMsg | null; cookieName: string }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  // 服务端来的 flash：显示一次，然后把 cookie 删掉，免得刷新又弹
  useEffect(() => {
    if (!initial) return;
    setMsg(initial);
    document.cookie = `${cookieName}=; path=/; max-age=0`;
  }, [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = (e: Event) => setMsg((e as CustomEvent<ToastMsg>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.tone === "error" ? 5000 : 2400);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center md:inset-x-auto md:bottom-6 md:right-6">
      <div key={msg.id} className={`toast-in flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${msg.tone === "error" ? "bg-danger text-white" : "bg-fg text-surface"}`}>
        <span aria-hidden>{msg.tone === "error" ? "✕" : "✓"}</span>{msg.text}
      </div>
    </div>
  );
}
