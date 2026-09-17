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
