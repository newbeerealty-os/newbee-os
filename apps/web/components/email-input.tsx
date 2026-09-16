"use client";
// 邮箱输入框（全站通用）：输入 @ 后按高频邮箱域名灰字补全，Tab / → 接受。
// 有灰字时输入框自己的文字透明、整行由覆盖层统一画，避免重影；覆盖层和输入框字号一致（.mobile-16）。
import { emailCompletion } from "@newbee/core";

export function EmailInput({ name, value, onChange, hint, className = "", inputClassName = "", textClassName = "text-sm", ...rest }: {
  name: string; value: string; onChange: (v: string) => void; hint: string; className?: string; inputClassName: string; textClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name" | "className">) {
  const ghost = emailCompletion(value);
  return (
    <div className={`relative ${className}`}>
      <input {...rest} name={name} type="email" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={rest.autoComplete ?? "off"} spellCheck={false}
        onKeyDown={(e) => { if (ghost && (e.key === "Tab" || e.key === "ArrowRight")) { e.preventDefault(); onChange(value + ghost); } }}
        className={`${inputClassName} ${ghost ? "text-transparent caret-fg" : ""}`} />
      {ghost && (
        <div aria-hidden className={`mobile-16 pointer-events-none absolute inset-0 flex items-center px-3 ${textClassName}`}>
          <span className="whitespace-pre text-fg">{value}</span><span className="whitespace-pre text-muted">{ghost}</span>
          <span className="ml-auto rounded bg-chip px-1.5 py-0.5 font-sans text-[10px] text-muted">{hint}</span>
        </div>
      )}
    </div>
  );
}
