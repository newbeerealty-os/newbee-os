// /deals —— 交易列表（按阶段分组）+ 新建交易
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, dueTone } from "@/components/ui";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["under_contract", "closing", "offer", "active", "pre", "lead", "closed", "terminated"];
const TYPES = ["seller", "buyer", "lease_listing", "lease_tenant", "property_mgmt"];

export default async function DealsPage() {
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const { data } = await supabase.from("deals").select("id,title,type,stage,addenda,created_at,milestones(key,label,due_date,status),tasks(id,done_at,deleted_at)").is("deleted_at", null).order("created_at", { ascending: false });
  type Row = { id: string; title: string; type: string; stage: string; addenda: string[]; milestones: { key: string; label: string; due_date: string | null; status: string }[]; tasks: { id: string; done_at: string | null; deleted_at: string | null }[] };
  const deals = (data ?? []) as unknown as Row[];

  const groups = STAGE_ORDER.map((s) => ({ stage: s, deals: deals.filter((d) => d.stage === s) })).filter((g) => g.deals.length);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("deals.title")}</h1>

      <Section title={t("deals.new")}>
        <form action={createDeal} className="flex flex-col gap-2 sm:flex-row">
          <input name="title" required placeholder={t("deals.titlePlaceholder")} className={inputCls} />
          <select name="type" className={`${inputCls} sm:w-32`} defaultValue="seller">
            {TYPES.map((k) => <option key={k} value={k}>{t(`type.${k}`)}</option>)}
          </select>
          <Button type="submit">{t("deals.create")}</Button>
        </form>
      </Section>

      {groups.length === 0 && <Empty>{t("deals.none")}</Empty>}

      {groups.map((g) => (
        <Section key={g.stage} title={`${t(`stage.${g.stage}`)} · ${g.deals.length}`}>
          <ul className="divide-y divide-zinc-100">
            {g.deals.map((d) => {
              const next = d.milestones.filter((m) => m.status === "pending" && m.due_date && m.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
              const open = d.tasks.filter((x) => !x.done_at && !x.deleted_at).length;
              return (
                <li key={d.id} className="py-2">
                  <Link href={`/deals/${d.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-800">{d.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-zinc-500">
                        <Badge>{t(`type.${d.type}`)}</Badge>
                        {d.addenda.map((a) => <Badge key={a} tone="blue">{a.replace(/_addendum$/, "")}</Badge>)}
                        <span>{t("deals.openTasks", { n: open })}</span>
                      </div>
                    </div>
                    {next ? (
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-zinc-500">{t("deals.next")} · {t.or(`ms.${next.key}`, next.label)}</div>
                        <Badge tone={dueTone(next.due_date, today)}>{next.due_date} · {relDays(next.due_date, today, t)}</Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">{t("deals.noNext")}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </div>
  );
}
