"use client";
// 复制到剪贴板的小按钮（电话 / 邮箱旁边用）
import { useState } from "react";

export function CopyButton({ text, label, doneLabel }: { text: string; label: string; doneLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title={label} aria-label={label}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* 剪贴板不可用就算了 */ } }}
      className={`ml-1 rounded px-1.5 py-0.5 text-[10.5px] ${done ? "bg-ok-bg text-ok" : "bg-chip text-muted hover:text-fg"}`}>
      {done ? doneLabel : "⧉"}
    </button>
  );
}
