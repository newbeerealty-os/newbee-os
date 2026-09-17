"use client";
// 金额输入框（全站统一）：聚焦时是裸数字方便改，离开后显示 $450,000；一万以上右侧灰字标"45 万"（英文 450K）。
// value / onChange 走字符串（用户敲的原文），需要数值的地方用 core 的 parseMoney。
import { useState } from "react";
import { parseMoney, formatMoneyInput, describeAmount } from "@newbee/core";

export const moneyInputCls = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm";

function pageLocale(): "zh" | "en" {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("en") ? "en" : "zh";
}

export function MoneyInput({ value, onChange, name, placeholder, className = "", disabled, autoFocus }: {
  value: string; onChange: (raw: string) => void; name?: string; placeholder?: string; className?: string; disabled?: boolean; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const n = parseMoney(value);
  const shown = focused ? value : formatMoneyInput(n);
  const hint = describeAmount(n, pageLocale());
  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={n ?? ""} />}
      <input value={shown} inputMode="decimal" placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.\-]/g, ""))}
        className={`${moneyInputCls} font-mono ${hint && !focused ? "pr-16" : ""}`} />
      {hint && !focused && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{hint}</span>}
    </div>
  );
}
