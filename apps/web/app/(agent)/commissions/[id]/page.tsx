// /commissions/[id] —— 一条佣金：左输入 / 右明细（同新建），删除
import Link from "next/link";
import { notFound } from "next/navigation";
import { contactName } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { getPlan, loadCommission, loadCommissions, ytdBefore } from "@/lib/commissions";
import { commissionLabels, sideOptions, whatOf } from "@/lib/commission-props";
import { saveCommission, deleteCommission } from "@/lib/actions/commissions";
import { PageHeader } from "@/components/page";
import { Badge, Button } from "@/components/ui";
import { CommissionForm } from "@/components/commission-form";
import { COMMISSION_STATUS_TONE as STATUS_TONE } from "@/components/commission-list";

export const dynamic = "force-dynamic";

export default async function CommissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const [{ id }, { back }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [t, plan] = await Promise.all([getT(), getPlan()]);
  const r = await loadCommission(supabase, id);
  if (!r) notFound();
  const [all, { data: deals }, { data: contacts }, { data: orgs }] = await Promise.all([
    loadCommissions(supabase),
    supabase.from("deals").select("id,title").is("deleted_at", null).order("priority", { ascending: false }),
    supabase.from("contacts").select("id,first_name,last_name,name_zh").is("deleted_at", null).order("first_name"),
    supabase.from("organizations").select("id,name").is("deleted_at", null).order("name"),
  ]);
  const ytd = ytdBefore(plan, all, r);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.commissions"), href: "/commissions" }, { label: whatOf(r, t) }]}
        title={<span className="flex flex-wrap items-center gap-2">{whatOf(r, t)}<Badge tone={r.kind === "referral" ? "amber" : "blue"}>{r.kind === "referral" ? t("commKind.referral") : t(`commSide.${r.side}`)}</Badge><Badge tone={STATUS_TONE[r.status] ?? "zinc"}>{t(`commStatus.${r.status}`)}</Badge></span>}
        actions={
          <>
            {r.deal && <Link href={`/deals/${r.deal.id}?tab=commission`} className="flex h-10 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-chip">{t("comm.f.deal")}</Link>}
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger-bg">{t("comm.delete")}</summary>
              <form action={deleteCommission.bind(null, id, back ?? "/commissions")} className="absolute right-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-ui border border-line bg-surface p-3 text-sm shadow-xl">
                <p className="text-muted">{t("comm.deleteConfirm")}</p>
                <Button variant="danger" type="submit">{t("comm.delete")}</Button>
              </form>
            </details>
          </>
        } />
      <CommissionForm l={commissionLabels(t)} plan={plan} ytd={ytd} kind={r.kind} sideOptions={sideOptions(t)}
        dealOptions={((deals ?? []) as { id: string; title: string }[]).map((d) => ({ value: d.id, label: d.title }))}
        contactOptions={((contacts ?? []) as { id: string; first_name: string; last_name: string; name_zh: string | null }[]).map((c) => ({ value: c.id, label: `${contactName(c)}${c.name_zh ? ` · ${c.name_zh}` : ""}` }))}
        orgOptions={((orgs ?? []) as { id: string; name: string }[]).map((o) => ({ value: o.id, label: o.name }))}
        values={{ ...r, deal: undefined, contact: undefined, partner_contact: undefined, partner_org: undefined, computed: undefined, fees: undefined } as unknown as Record<string, string | number | null>}
        fees={r.fees} action={saveCommission.bind(null, id)} back={back} submitLabel={t("comm.save")} />
    </div>
  );
}
