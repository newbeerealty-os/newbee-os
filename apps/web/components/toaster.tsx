"use client";
// 操作提示：服务端 flash（layout 传进来）+ 客户端 toast() 事件。2.4 秒自动消失，不挡操作。
// 位置：优先贴在刚按过的按钮下面（按下时记住按钮位置）；按钮不在屏幕上就放到内容区（侧栏右边）正中间。
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ToastMsg { id: number; text: string; tone: "ok" | "error" }
const EVENT = "nb:toast";
const ANCHOR_KEY = "nb:anchor";
interface Anchor { x: number; y: number; w: number; t: number }

/** 客户端组件里直接调：toast("已复制") */
export function toast(text: string, tone: ToastMsg["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: Date.now(), text, tone } }));
}

function remember(el: Element | null) {
  const btn = el?.closest("button, [role=button], input[type=submit]") as HTMLElement | null;
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  try { sessionStorage.setItem(ANCHOR_KEY, JSON.stringify({ x: r.left + r.width / 2, y: r.bottom, w: r.width, t: Date.now() } satisfies Anchor)); } catch { /* 存不了就用居中 */ }
}
function readAnchor(): Anchor | null {
  try { const a = JSON.parse(sessionStorage.getItem(ANCHOR_KEY) ?? "null") as Anchor | null; return a && Date.now() - a.t < 15000 ? a : null; } catch { return null; }
}

export function Toaster({ initial, cookieName }: { initial: ToastMsg | null; cookieName: string }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // 记住最后按的按钮（点击 / 回车提交都算）
  useEffect(() => {
    const onClick = (e: MouseEvent) => remember(e.target as Element);
    const onSubmit = (e: SubmitEvent) => remember(e.submitter ?? document.activeElement);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("submit", onSubmit, true); };
  }, []);

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

  // 算位置：按钮下方 8px 居中；不在视口里 → 内容区正中
  useLayoutEffect(() => {
    if (!msg) { setPos(null); return; }
    const w = box.current?.offsetWidth ?? 160, h = box.current?.offsetHeight ?? 36;
    const vw = window.innerWidth, vh = window.innerHeight;
    const a = readAnchor();
    let left: number, top: number;
    if (a && a.y >= 0 && a.y + h + 8 <= vh) { left = a.x - w / 2; top = a.y + 8; }
    else {
      const m = document.querySelector("main")?.getBoundingClientRect();
      left = (m ? m.left + m.width / 2 : vw / 2) - w / 2;
      top = vh / 2 - h / 2;
    }
    setPos({ left: Math.max(8, Math.min(left, vw - w - 8)), top: Math.max(8, Math.min(top, vh - h - 8)) });
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" ref={box} style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
      className={`toast-in pointer-events-none fixed z-50 flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium shadow-lg ${msg.tone === "error" ? "bg-danger text-white" : "bg-fg text-surface"}`}>
      <span aria-hidden>{msg.tone === "error" ? "✕" : "✓"}</span>{msg.text}
    </div>
  );
}
