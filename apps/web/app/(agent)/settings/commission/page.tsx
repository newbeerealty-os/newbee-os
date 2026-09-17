// /settings/commission —— Broker 收费方案（预设 + 模块开关）+ 本周期概览（cap 进度 / 固定费用）
import { recurringPerPeriod, PLAN_PRESET_IDS } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { money } from "@/lib/format";
import { getPlan, loadCommissions, ytdFor } from "@/lib/commissions";
import { savePlan } from "@/lib/actions/commissions";
import { SettingsTabs } from "@/components/settings-tabs";
import { PlanForm } from "@/components/plan-form";
import { PeriodCard } from "@/components/period-card";

export const dynamic = "force-dynamic";

export default async function CommissionPlanPage() {
  const supabase = await createClient();
  const [t, plan] = await Promise.all([getT(), getPlan()]);
  const rows = await loadCommissions(supabase);
  const ytd = ytdFor(plan, rows);
  const keys = ["presets", "presetApplied", "split", "splitPreCap", "splitPostCap", "cap", "capAmount", "capHint", "capYearStart", "perDeal", "perDealFee", "perDealFeeLease", "perDealFeePostCap", "perDealFeeCap", "perDealFeeAfterCap", "eoFee", "eoCap", "splitMode", "tiers.upTo", "tiers.last", "tiers.pct", "tiers.add", "tiers.hint", "royalty", "royaltyPct", "royaltyCap", "team", "teamPct", "teamCap", "teamBasis", "recurring", "recurringAdd", "recurringName", "recurringAmount", "recurringPeriod", "recurringTotal"] as const;
  const l: Record<string, string> = Object.fromEntries(keys.map((k) => [k, t(`plan.${k}`)]));
  for (const id of PLAN_PRESET_IDS) { l[`preset_${id}`] = t(`plan.preset.${id}`); l[`preset_${id}_desc`] = t(`plan.preset.${id}.desc`); }
  for (const p of ["monthly", "quarterly", "yearly"]) l[`period_${p}`] = t(`plan.period.${p}`);
  l.splitMode_flat = t("plan.splitMode.flat"); l.splitMode_tiers = t("plan.splitMode.tiers");
  l.teamBasis_gci = t("plan.teamBasis.gci"); l.teamBasis_after_broker = t("plan.teamBasis.after_broker");
  l.on = t("plan.module.on"); l.off = t("plan.module.off"); l.save = t("common.save"); l.remove = t("comm.delete");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <SettingsTabs active="/settings/commission" />
      <p className="text-sm text-muted">{t("plan.hint")}</p>
      <PeriodCard t={t} plan={plan} ytd={ytd} fixed={recurringPerPeriod(plan)} money={money} />
      <PlanForm initial={plan} l={l} action={savePlan} />
    </div>
  );
}
