// /commissions/new?kind=deal|referral&deal=…&side=… —— 新建佣金 / 推荐费。交易佣金的售价、比例从已确认字段带出
import type { CustomFee } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { getPlan, loadCommissions, loadCommissionOptions, prefillFromDeal, ytdFor } from "@/lib/commissions";
import { commissionLabels, sideOptions } from "@/lib/commission-props";
import { saveCommission } from "@/lib/actions/commissions";
import { PageHeader } from "@/components/page";
import { CommissionForm } from "@/components/commission-form";

export const dynamic = "force-dynamic";

export default async function NewCommissionPage({ searchParams }: { searchParams: Promise<{ kind?: string; deal?: string; side?: string; contact?: string; back?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "referral" ? "referral" : "deal";
  const supabase = await createClient();
  const [t, plan] = await Promise.all([getT(), getPlan()]);
  const [all, options] = await Promise.all([loadCommissions(supabase), loadCommissionOptions(supabase)]);
  const ytd = ytdFor(plan, all);

  // 从交易带值：售价、比例、side
  let values: Record<string, string | number | null> = { deal_id: sp.deal ?? "", side: sp.side ?? "", contact_id: sp.contact ?? "" };
  let prefillHint: string | undefined;
  if (sp.deal) {
    const { data: deal } = await supabase.from("deals").select("type").eq("id", sp.deal).maybeSingle();
    const pre = await prefillFromDeal(supabase, sp.deal, deal?.type ?? "seller", sp.side);
    values = { ...values, ...pre.values };
    if (pre.prefilled) prefillHint = t("comm.fromDeal");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.commissions"), href: "/commissions" }, { label: kind === "referral" ? t("comm.newReferral") : t("comm.new") }]} title={kind === "referral" ? t("comm.newReferral") : t("comm.new")} />
      <CommissionForm l={commissionLabels(t)} plan={plan} ytd={ytd} kind={kind} sideOptions={sideOptions(t)}
        {...options}
        values={values} fees={[] as CustomFee[]} action={saveCommission.bind(null, null)} back={sp.back} submitLabel={t("comm.save")} prefillHint={prefillHint} />
    </div>
  );
}
