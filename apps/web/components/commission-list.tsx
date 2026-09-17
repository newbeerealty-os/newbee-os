// 交易详情 / 联系人详情里的佣金小表：日期 · 类型 · 售价 · GCI · NCI · 状态，点行进明细
import Link from "next/link";
import type { Translator } from "@newbee/core";
import { money } from "@/lib/format";
import { effectiveDate, type CommissionRow } from "@/lib/commissions";
import { whatOf } from "@/lib/commission-props";
import { Badge } from "@/components/ui";

export const COMMISSION_STATUS_TONE: Record<string, "zinc" | "blue" | "green" | "amber" | "red"> = { projected: "zinc", pending: "amber", closed: "blue", paid: "green", cancelled: "red" };

export function CommissionMiniList({ rows, t, backTo, showWhat }: { rows: CommissionRow[]; t: Translator; backTo: string; showWhat?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/commissions/${r.id}?back=${encodeURIComponent(backTo)}`} className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 hover:bg-chip">
            <span className="font-mono text-xs text-muted">{effectiveDate(r)}</span>
            <Badge tone={r.kind === "referral" ? "amber" : "blue"}>{r.kind === "referral" ? t("commKind.referral") : t(`commSide.${r.side}`)}</Badge>
            {showWhat && <span className="min-w-0 flex-1 truncate text-sm font-medium">{whatOf(r, t)}</span>}
            <span className="ml-auto font-mono text-sm text-muted">{r.price ? money(r.price) : "—"}</span>
            <span className="font-mono text-sm">{money(r.computed?.gci ?? 0)}</span>
            <span className="font-mono text-sm font-semibold">{money(r.computed?.nci ?? 0)}</span>
            <Badge tone={COMMISSION_STATUS_TONE[r.status] ?? "zinc"}>{t(`commStatus.${r.status}`)}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** 交易详情"佣金"选项卡顶部的胶囊页签：每条记录一个，选中的实心；末尾"+ 加另一边 / 添加佣金" */
export function CommissionChips({ rows, selectedId, hrefOf, addHref, addLabel, t }: { rows: CommissionRow[]; selectedId: string | null; hrefOf: (r: CommissionRow) => string; addHref: string; addLabel: string; t: Translator }) {
  const chip = "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium";
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
      {rows.map((r) => {
        const on = r.id === selectedId;
        const pct = r.basis === "pct" && r.pct !== null ? `${r.pct}%` : r.flat !== null ? money(r.flat) : "";
        return (
          <Link key={r.id} href={hrefOf(r)} aria-current={on ? "page" : undefined} className={`${chip} ${on ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface text-fg hover:bg-chip"}`}>
            <span className={`h-2 w-2 rounded-full ${on ? "bg-accent-ink" : "bg-line-strong"}`} />
            {r.kind === "referral" ? t("commKind.referral") : t(`commSide.${r.side}`)}{pct && <span className={`font-mono ${on ? "opacity-85" : "text-muted"}`}>· {pct}</span>}
            <span className="font-mono">· {money(r.computed?.nci ?? 0)}</span>
            <span className={on ? "opacity-85" : "text-muted"}>· {t(`commStatus.${r.status}`)}</span>
          </Link>
        );
      })}
      <Link href={addHref} aria-current={selectedId === null ? "page" : undefined} className={`${chip} border-dashed ${selectedId === null ? "border-accent text-accent" : "border-line-strong text-muted hover:text-fg"}`}>+ {addLabel}</Link>
    </div>
  );
}
