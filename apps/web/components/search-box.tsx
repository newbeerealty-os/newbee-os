"use client";
// 列表页搜索框：软跳转（只换 ?q=，侧栏不刷新）；边输入边出本页数据的候选；↑↓ 选、Enter 搜、点候选 = 填入并搜。
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SearchBox({ placeholder, label, suggestions, param = "q", widthClass = "w-64" }: { placeholder: string; label: string; suggestions: string[]; param?: string; widthClass?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param) ?? "";
  const [q, setQ] = useState(current);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  useEffect(() => { setQ(current); }, [current]);

  const needle = q.trim().toLowerCase();
  const list = needle ? suggestions.filter((s) => s.toLowerCase().includes(needle)).slice(0, 8) : [];

  function go(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value.trim()) next.set(param, value.trim()); else next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="relative flex gap-1">
      <input name={param} value={q} autoComplete="off" placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => (i + 1) % list.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => (i - 1 + list.length) % list.length); }
          else if (e.key === "Enter") { e.preventDefault(); setQ(list[hi]); go(list[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className={`h-10 rounded-md border border-line-strong bg-surface px-3 text-sm ${widthClass}`} />
      <button type="submit" className="h-10 rounded-md border border-line-strong px-3 text-sm font-medium text-fg hover:bg-chip">{label}</button>
      {open && list.length > 0 && (
        <ul role="listbox" className="absolute left-0 top-11 z-20 max-h-64 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-xl" style={{ minWidth: "16rem" }}>
          {list.map((s, i) => (
            <li key={s} role="option" aria-selected={i === hi} onMouseDown={(e) => { e.preventDefault(); setQ(s); go(s); }} onMouseEnter={() => setHi(i)}
              className={`cursor-pointer truncate px-3 py-1.5 text-sm ${i === hi ? "bg-accent-soft text-accent-strong" : "text-fg"}`}>{s}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
