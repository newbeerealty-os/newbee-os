"use client";
// 所见即所得的翻译编辑器：每个页面一个"复刻"，复刻里的每段文字都是 <T k> —— 点中弹出中 / 英两个框，Enter 保存、Esc 取消。
// 复刻在 i18n-replicas.tsx；用"收集器"跑一遍就知道哪些 key 被放进了页面，没放的自动进"其他"页签（测试保证这一页为空）。
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MESSAGES, sceneOf, type Locale } from "@newbee/core";
import { saveUiString, resetUiString } from "@/lib/actions/ui-strings";
import { REPLICAS, ORDER, placedKeys, type TFn } from "@/components/i18n-replicas";

export type Overrides = Record<string, { zh?: string | null; en?: string | null }>;
type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

export function I18nWysiwyg({ overrides, locale, labels, tabNames }: { overrides: Overrides; locale: Locale; labels: Record<string, string>; tabNames: Record<string, string> }) {
  const router = useRouter();
  const [ov, setOv] = useState<Overrides>(overrides);
  useEffect(() => { setOv(overrides); }, [overrides]);
  const [page, setPage] = useState(ORDER[0]);
  const [dim, setDim] = useState(false);
  const [editing, setEditing] = useState<{ k: string; x: number; y: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const placed = useMemo(placedKeys, []);
  const others = useMemo(() => { const all = new Set(ORDER.flatMap((id) => [...placed[id]])); return Object.keys(MESSAGES).filter((k) => !all.has(k)); }, [placed]);

  const eff = (k: string, l: Locale) => (ov[k]?.[l] || MESSAGES[k]?.[l] || k);
  const isChanged = (k: string) => !!(ov[k]?.zh || ov[k]?.en);
  const changedCount = Object.keys(MESSAGES).filter(isChanged).length;

  const T: TFn = (k, vars) => (
    <span data-k={k} onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const hr = host.current!.getBoundingClientRect(); setEditing({ k, x: Math.max(0, Math.min(r.left - hr.left, hr.width - 340)), y: r.bottom - hr.top + 6 }); }}
      className={`cursor-pointer rounded-sm border-b-[1.5px] transition-colors hover:bg-accent/15 ${isChanged(k) ? "border-accent" : "border-dashed border-transparent hover:border-accent"} ${editing?.k === k ? "bg-accent/20" : ""} ${dim && !isChanged(k) ? "opacity-35" : ""}`}>
      {fill(eff(k, locale), vars)}
    </span>
  );

  async function save(k: string, zh: string, en: string) {
    const fd = new FormData(); fd.set("key", k); fd.set("zh", zh); fd.set("en", en);
    await saveUiString(fd);
    const d = MESSAGES[k];
    setOv((o) => ({ ...o, [k]: { zh: zh.trim() && zh.trim() !== d.zh ? zh.trim() : null, en: en.trim() && en.trim() !== d.en ? en.trim() : null } }));
    setEditing(null); router.refresh();
  }
  async function reset(k: string) { await resetUiString(k); setOv((o) => ({ ...o, [k]: {} })); setEditing(null); router.refresh(); }

  const tabs = [...ORDER, ...(others.length ? ["other"] : [])];
  return (
    <div className="flex flex-col gap-3" onClick={() => setEditing(null)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{labels.hint}</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setDim(!dim)} className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm ${dim ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong text-fg hover:bg-chip"}`}>{labels.changedOnly}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] ${dim ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>{changedCount}</span></button>
      </div>
      <div className="-mx-1 flex gap-0.5 overflow-x-auto overflow-y-hidden px-1 shadow-[inset_0_-1px_0_var(--line)]">
        {tabs.map((id) => { const n = id === "other" ? others.length : placed[id].size; const c = (id === "other" ? others : [...placed[id]]).filter(isChanged).length; return (
          <button key={id} type="button" onClick={() => { setPage(id); setEditing(null); }} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13.5px] font-medium ${page === id ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}>
            {id === "other" ? labels.other : tabNames[id] ?? id}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${c ? "bg-accent text-accent-ink" : "bg-chip text-muted"}`}>{c ? `${c}/${n}` : n}</span>
          </button>); })}
      </div>
      <div ref={host} className="relative rounded-ui border border-line bg-bg p-4">
        {page === "other"
          ? <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{others.map((k) => <span key={k}>{T(k)} <span className="text-xs text-muted">· {(() => { const { scene, section } = sceneOf(k); return `${scene[locale]} › ${section[locale]}`; })()}</span></span>)}</div>
          : REPLICAS[page](T, labels.hidden)}
        {editing && (() => { const k = editing.k; const { scene, section } = sceneOf(k); return (
          <div className="absolute z-30 flex w-[330px] flex-col gap-2 rounded-ui border border-line-strong bg-surface p-3 shadow-2xl" style={{ left: editing.x, top: editing.y }} onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter") { e.preventDefault(); const f = e.currentTarget; save(k, (f.querySelector("[name=zh]") as HTMLInputElement).value, (f.querySelector("[name=en]") as HTMLInputElement).value); } }}>
            <div className="text-xs text-muted">{scene[locale]} › {section[locale]} · {section.where[locale]}</div>
            <label className="flex flex-col gap-1 text-xs text-muted">{labels.zh}<input name="zh" autoFocus defaultValue={eff(k, "zh")} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg" />{ov[k]?.zh && <span>{fill(labels.defaultIs, { v: MESSAGES[k].zh })}</span>}</label>
            <label className="flex flex-col gap-1 text-xs text-muted">{labels.en}<input name="en" defaultValue={eff(k, "en")} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg" />{ov[k]?.en && <span>{fill(labels.defaultIs, { v: MESSAGES[k].en })}</span>}</label>
            {MESSAGES[k].zh.includes("{") && <span className="text-[11px] text-muted">{labels.sample}: {MESSAGES[k].zh}</span>}
            <div className="flex justify-end gap-1">
              {isChanged(k) && <button type="button" onClick={() => reset(k)} className="h-8 rounded-md border border-danger/40 px-2.5 text-xs font-medium text-danger hover:bg-danger-bg">{labels.reset}</button>}
              <button type="button" onClick={() => setEditing(null)} className="h-8 rounded-md border border-line-strong px-2.5 text-xs font-medium text-fg hover:bg-chip">{labels.cancel}</button>
              <button type="button" onClick={(e) => { const f = e.currentTarget.closest("div.absolute")!; save(k, (f.querySelector("[name=zh]") as HTMLInputElement).value, (f.querySelector("[name=en]") as HTMLInputElement).value); }} className="h-8 rounded-md bg-accent px-2.5 text-xs font-medium text-accent-ink hover:bg-accent-strong">{labels.save}</button>
            </div>
          </div>); })()}
      </div>
    </div>
  );
}
