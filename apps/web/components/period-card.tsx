// 本周期卡：cap 进度条（cap 模块开着才显示）+ 固定费用（固定周期费模块开着才显示）。两个都关就不渲染。
import type { CommissionPlan, Translator } from "@newbee/core";
import { Section } from "@/components/ui";

export function PeriodCard({ t, plan, ytd, fixed, money }: { t: Translator; plan: CommissionPlan; ytd: { brokerPaid: number; period: { start: string; end: string } }; fixed: number; money: (n: number) => string }) {
  const showCap = plan.modules.cap && plan.capAmount > 0;
  const showFixed = plan.modules.recurring && fixed > 0;
  if (!showCap && !showFixed) return null;
  const pct = showCap ? Math.min(100, Math.round((ytd.brokerPaid / plan.capAmount) * 100)) : 0;
  return (
    <Section title={t("comm.period")} right={<span className="font-mono text-sm text-muted">{t("comm.capPeriod", { start: ytd.period.start, end: ytd.period.end })}</span>}>
      <div className="flex flex-col gap-3">
        {showCap && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm"><span>{t("comm.cap")} · <span className="font-mono">{money(ytd.brokerPaid)} / {money(plan.capAmount)}</span></span><span className="text-muted">{pct}%{pct >= 100 && ` · ${t("comm.capHit")}`}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
        {showFixed && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span>{t("comm.stat.fixed")}</span>
            <span className="font-mono">{money(fixed)} <span className="text-xs text-muted">= {plan.recurringFees.map((f) => `${f.name} ${money(f.amount)} / ${t(`plan.period.${f.period}`)}`).join(" + ")}</span></span>
          </div>
        )}
      </div>
    </Section>
  );
}
