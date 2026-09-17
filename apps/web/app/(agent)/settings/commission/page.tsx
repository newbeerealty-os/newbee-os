// /settings/commission —— Broker 分成方案 + 本周期 cap 进度
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { money } from "@/lib/format";
import { getPlan, loadCommissions, ytdFor } from "@/lib/commissions";
import { savePlan } from "@/lib/actions/commissions";
import { Section, Button, inputCls } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { MonthlyFeesEditor } from "@/components/commission-form";

export const dynamic = "force-dynamic";

export default async function CommissionPlanPage() {
  const supabase = await createClient();
  const [t, plan] = await Promise.all([getT(), getPlan()]);
  const rows = await loadCommissions(supabase);
  const ytd = ytdFor(plan, rows);
  const pct = plan.capAmount > 0 ? Math.min(100, Math.round((ytd.brokerPaid / plan.capAmount) * 100)) : 0;
  const F = ({ label, name, value, step = "1", className = "" }: { label: string; name: string; value: number | string; step?: string; className?: string }) => (
    <label className={`flex flex-col gap-1 text-xs text-muted ${className}`}>{label}<input name={name} type={typeof value === "number" ? "number" : "text"} step={step} min={typeof value === "number" ? 0 : undefined} defaultValue={value} className={`${inputCls} font-mono`} /></label>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <SettingsTabs active="/settings/commission" />
      <p className="text-sm text-muted">{t("plan.hint")}</p>

      <Section title={t("comm.cap")} right={<span className="font-mono text-sm text-muted">{t("comm.capPeriod", { start: ytd.period.start, end: ytd.period.end })}</span>}>
        {plan.capAmount > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm"><span className="font-mono">{money(ytd.brokerPaid)} / {money(plan.capAmount)}</span><span className="text-muted">{pct}%{pct >= 100 && ` · ${t("comm.capHit")}`}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
          </div>
        ) : <p className="text-sm text-muted">{t("comm.capNone")}</p>}
      </Section>

      <form action={savePlan} className="flex flex-col gap-4">
        <Section title={t("plan.split")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label={t("plan.splitPreCap")} name="splitPreCap" value={plan.splitPreCap} step="0.5" />
            <F label={t("plan.splitPostCap")} name="splitPostCap" value={plan.splitPostCap} step="0.5" />
            <F label={t("plan.capAmount")} name="capAmount" value={plan.capAmount} />
            <F label={t("plan.capYearStart")} name="capYearStart" value={plan.capYearStart} />
          </div>
        </Section>
        <Section title={t("plan.perDeal")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <F label={t("plan.perDealFee")} name="perDealFee" value={plan.perDealFee} />
            <F label={t("plan.perDealFeePostCap")} name="perDealFeePostCap" value={plan.perDealFeePostCap} />
            <F label={t("plan.eoFee")} name="eoFee" value={plan.eoFee} />
          </div>
        </Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={t("plan.royalty")}>
            <div className="grid gap-3">
              <F label={t("plan.royaltyPct")} name="royaltyPct" value={plan.royaltyPct} step="0.1" />
              <F label={t("plan.royaltyCap")} name="royaltyCap" value={plan.royaltyCap} />
            </div>
          </Section>
          <Section title={t("plan.team")}>
            <div className="grid gap-3">
              <F label={t("plan.teamPct")} name="teamPct" value={plan.teamPct} step="0.5" />
              <F label={t("plan.teamCap")} name="teamCap" value={plan.teamCap} />
              <label className="flex flex-col gap-1 text-xs text-muted">{t("plan.teamBasis")}
                <select name="teamBasis" defaultValue={plan.teamBasis} className={inputCls}><option value="after_broker">{t("plan.teamBasis.after_broker")}</option><option value="gci">{t("plan.teamBasis.gci")}</option></select>
              </label>
            </div>
          </Section>
        </div>
        <Section title={t("plan.monthly")}>
          <MonthlyFeesEditor initial={plan.monthlyFees} labels={{ add: t("plan.monthlyAdd"), name: t("plan.monthlyName"), amount: t("plan.monthlyAmount"), remove: t("comm.delete") }} />
        </Section>
        <div><Button type="submit">{t("common.save")}</Button></div>
      </form>
    </div>
  );
}
