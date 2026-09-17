"use client";
// 按钮：放在 <form> 里做提交时自带"进行中"态（转圈 + 禁用），按下去一定有反应。
import { useFormStatus } from "react-dom";

export type ButtonVariant = "primary" | "ghost" | "danger";
export const BUTTON_CLS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  ghost: "border border-line-strong text-fg hover:bg-chip",
  danger: "border border-danger/40 text-danger hover:bg-danger-bg",
};

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`${className} animate-spin`} aria-hidden><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
}

export function Button({ children, variant = "primary", type = "submit", disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  const busy = pending && type === "submit";
  return (
    <button {...rest} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium disabled:opacity-50 ${BUTTON_CLS[variant]} ${rest.className ?? ""}`}>
      {busy && <Spinner />}{children}
    </button>
  );
}
