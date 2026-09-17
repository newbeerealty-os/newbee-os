"use client";
// 数据列表通用表格：表头可拖动换位（顺序存到账号设置，换设备一样），单元格由服务端渲染好传进来。
// 用法：<DataTable table="deals" columns=[{id,header,width,align}] rows=[{key,href,cells:{id:node}}] initialOrder=[…] />
import Link from "next/link";
import { useEffect, useState } from "react";
import { saveColumnOrder } from "@/lib/actions/columns";

export interface DataColumn { id: string; header: React.ReactNode; /** grid 宽度，如 "1.6fr" / "120px" */ width: string; align?: "right"; /** 手机上是否显示 */ mobile?: boolean }
export interface DataRow { key: string; href?: string; cells: Record<string, React.ReactNode> }

export function DataTable({ table, columns, rows, initialOrder, dragHint }: { table: string; columns: DataColumn[]; rows: DataRow[]; initialOrder?: string[]; dragHint: string }) {
  const ids = columns.map((c) => c.id);
  const normalize = (o: string[] | undefined) => { const kept = (o ?? []).filter((x) => ids.includes(x)); return [...kept, ...ids.filter((x) => !kept.includes(x))]; };
  const [order, setOrder] = useState<string[]>(() => normalize(initialOrder));
  useEffect(() => { setOrder(normalize(initialOrder)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initialOrder?.join(","), ids.join(",")]);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const cols = order.map((id) => columns.find((c) => c.id === id)!);
  const template = cols.map((c) => c.width).join(" ");

  function drop(target: string) {
    if (!drag || drag === target) { setDrag(null); setOver(null); return; }
    const next = order.filter((x) => x !== drag);
    next.splice(next.indexOf(target) + (order.indexOf(drag) < order.indexOf(target) ? 1 : 0), 0, drag);
    setOrder(next); setDrag(null); setOver(null);
    void saveColumnOrder(table, next);
  }

  return (
    <div className="-mx-4 -my-4">
      <div className="hidden gap-3 border-b border-line bg-chip/40 px-4 py-2 text-[11.5px] font-semibold text-muted md:grid" style={{ gridTemplateColumns: template }}>
        {cols.map((c) => (
          <div key={c.id} draggable title={dragHint}
            onDragStart={(e) => { setDrag(c.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); if (over !== c.id) setOver(c.id); }}
            onDragLeave={() => { if (over === c.id) setOver(null); }}
            onDrop={(e) => { e.preventDefault(); drop(c.id); }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            className={`flex cursor-grab items-center gap-1 rounded px-1 -mx-1 select-none active:cursor-grabbing ${c.align === "right" ? "justify-end" : ""} ${drag === c.id ? "opacity-40" : ""} ${over === c.id && drag && drag !== c.id ? "bg-accent-soft ring-1 ring-accent" : ""}`}>
            <span aria-hidden className="text-[10px] text-line-strong">⋮⋮</span>{c.header}
          </div>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const body = cols.map((c) => <div key={c.id} className={`min-w-0 ${c.align === "right" ? "md:text-right" : ""} ${c.mobile === false ? "hidden md:block" : ""}`}>{r.cells[c.id]}</div>);
          // 桌面：列模板跟表头一致（走 CSS 变量）；手机：单列堆叠
          const cls = "grid gap-1.5 px-4 py-3 hover:bg-chip/40 md:items-center md:gap-3 md:[grid-template-columns:var(--cols)]";
          const style = { "--cols": template } as React.CSSProperties;
          return <li key={r.key}>{r.href ? <Link href={r.href} className={cls} style={style}>{body}</Link> : <div className={cls} style={style}>{body}</div>}</li>;
        })}
      </ul>
    </div>
  );
}
