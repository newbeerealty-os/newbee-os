// /commissions/new?kind=deal|referral&deal=…&side=… —— 新建佣金 / 推荐费。交易佣金的售价、比例从已确认字段带出
import { contactName, sideForDealType, type CustomFee } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { getPlan, loadCommissions, ytdFor } from "@/lib/commissions";
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
  const [all, { data: deals }, { data: contacts }, { data: orgs }] = await Promise.all([
    loadCommissions(supabase),
    supabase.from("deals").select("id,title,type,stage").is("deleted_at", null).order("priority", { ascending: false }).order("sort_at", { ascending: false }),
    supabase.from("contacts").select("id,first_name,last_name,name_zh").is("deleted_at", null).order("first_name"),
    supabase.from("organizations").select("id,name").is("deleted_at", null).order("name"),
  ]);
  const ytd = ytdFor(plan, all);

  // 从交易带值：售价、比例、side
  const values: Record<string, string | number | null> = { deal_id: sp.deal ?? "", side: sp.side ?? "", contact_id: sp.contact ?? "" };
  let prefillHint: string | undefined;
  if (sp.deal) {
    const deal = (deals ?? []).find((d: { id: string }) => d.id === sp.deal) as { type: string } | undefined;
    const { data: fields } = await supabase.from("deal_fields_current").select("key,value_num").eq("deal_id", sp.deal).not("confirmed_at", "is", null).in("key", ["sales_price", "commission_pct", "rent"]);
    const fv = Object.fromEntries(((fields ?? []) as { key: string; value_num: number | null }[]).map((x) => [x.key, x.value_num]));
    values.price = fv.sales_price ?? fv.rent ?? null;
    values.pct = fv.commission_pct ?? 3;
    if (!values.side && deal) values.side = sideForDealType(deal.type);
    if (fv.sales_price || fv.commission_pct) prefillHint = t("comm.fromDeal");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.commissions"), href: "/commissions" }, { label: kind === "referral" ? t("comm.newReferral") : t("comm.new") }]} title={kind === "referral" ? t("comm.newReferral") : t("comm.new")} />
      <CommissionForm l={commissionLabels(t)} plan={plan} ytd={ytd} kind={kind} sideOptions={sideOptions(t)}
        dealOptions={((deals ?? []) as { id: string; title: string }[]).map((d) => ({ value: d.id, label: d.title }))}
        contactOptions={((contacts ?? []) as { id: string; first_name: string; last_name: string; name_zh: string | null }[]).map((c) => ({ value: c.id, label: `${contactName(c)}${c.name_zh ? ` · ${c.name_zh}` : ""}` }))}
        orgOptions={((orgs ?? []) as { id: string; name: string }[]).map((o) => ({ value: o.id, label: o.name }))}
        values={values} fees={[] as CustomFee[]} action={saveCommission.bind(null, null)} back={sp.back} submitLabel={t("comm.save")} prefillHint={prefillHint} />
    </div>
  );
}
