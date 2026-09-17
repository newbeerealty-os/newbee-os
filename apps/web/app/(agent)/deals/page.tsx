// /deals —— 交易列表（?stage= 按阶段过滤）+ 顶部统计 + 新建交易
import Link from "next/link";
import { addCalendarDays, contactName } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { DEAL_STAGES } from "@/lib/nav";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, dueTone } from "@/components/ui";
import { PageHeader, Stat, StatGrid } from "@/components/page";
import { StageBar, StageBadge } from "@/components/stage";

export const dynamic = "force-dynamic";

const TYPES = ["seller", "buyer", "lease_listing", "lease_tenant", "property_mgmt"];

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string }> }) {
  const { stage, q = "" } = await searchParams;
  const stageFilter = DEAL_STAGES.includes(stage as (typeof DEAL_STAGES)[number]) ? stage! : null;
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const horizon = addCalendarDays(today, 7);

  const [{ data }, { data: fv }, { data: pv }] = await Promise.all([
    supabase.from("deals").select("id,title,type,stage,addenda,created_at,milestones(key,label,due_date,status),tasks(id,done_at,deleted_at)").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("deal_fields_current").select("deal_id,value_text,value_num").not("confirmed_at", "is", null),
    supabase.from("deal_parties").select("deal_id,contacts(first_name,last_name,name_zh),organizations(name)").is("deleted_at", null),
  ]);
  type Row = { id: string; title: string; type: string; stage: string; addenda: string[]; milestones: { key: string; label: string; due_date: string | null; status: string }[]; tasks: { id: string; done_at: string | null; deleted_at: string | null }[] };
  const all = (data ?? []) as unknown as Row[];
  // 搜索索引：标题 + 已确认字段值（地址、金额…）+ 各方名字 + addenda
  const index = new Map<string, string[]>();
  const push = (id: string, ...xs: (string | number | null | undefined)[]) => index.set(id, [...(index.get(id) ?? []), ...xs.filter((x) => x !== null && x !== undefined && x !== "").map(String)]);
  for (const d of all) push(d.id, d.title, ...d.addenda);
  for (const r of (fv ?? []) as { deal_id: string; value_text: string | null; value_num: number | null }[]) push(r.deal_id, r.value_text, r.value_num);
  type One<T> = T | T[] | null;
  const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  for (const p of (pv ?? []) as unknown as { deal_id: string; contacts: One<{ first_name: string; last_name: string; name_zh: string | null }>; organizations: One<{ name: string }> }[]) {
    const c = one(p.contacts); const o = one(p.organizations);
    push(p.deal_id, c ? contactName(c) : null, c?.name_zh, o?.name);
  }
  const needle = q.trim().toLowerCase();
  const hit = (id: string) => !needle || (index.get(id) ?? []).join(" ").toLowerCase().includes(needle);
  const deals = all.filter((d) => (!stageFilter || d.stage === stageFilter) && hit(d.id));

  // 统计只看当前过滤范围
  const pendingMs = deals.flatMap((d) => d.milestones.filter((m) => m.status === "pending" && m.due_date));
  const stats = {
    week: pendingMs.filter((m) => m.due_date! >= today && m.due_date! <= horizon).length,
    overdue: pendingMs.filter((m) => m.due_date! < today).length,
    open: deals.reduce((n, d) => n + d.tasks.filter((x) => !x.done_at && !x.deleted_at).length, 0),
  };
  const byStage: Record<string, number> = {};
  for (const d of all) byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;
  const subnav = [
    { href: "/deals", label: t("deals.stageAll"), count: all.length, active: !stageFilter },
    ...DEAL_STAGES.map((s) => ({ href: `/deals?stage=${s}`, label: t(`stage.${s}`), count: byStage[s] ?? 0, active: stageFilter === s })),
  ];
  const title = stageFilter ? `${t("deals.title")} · ${t(`stage.${stageFilter}`)}` : `${t("deals.title")} · ${t("deals.stageAll")}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader crumbs={[{ label: t("nav.deals"), href: "/deals" }, { label: stageFilter ? t(`stage.${stageFilter}`) : t("deals.stageAll") }]} title={title} subnav={subnav}
        actions={
          <>
          <form method="get" className="flex gap-1">
            {stageFilter && <input type="hidden" name="stage" value={stageFilter} />}
            <input name="q" defaultValue={q} placeholder={t("deals.search")} className={`${inputCls} w-64`} />
            <Button variant="ghost" type="submit">OK</Button>
          </form>
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong">{t("deals.new")}</summary>
            <form action={createDeal} className="absolute right-0 z-10 mt-2 flex w-[min(90vw,380px)] flex-col gap-2 rounded-ui border border-line bg-surface p-3 shadow-xl">
              <input name="title" required placeholder={t("deals.titlePlaceholder")} className={inputCls} />
              <select name="type" className={inputCls} defaultValue="seller">
                {TYPES.map((k) => <option key={k} value={k}>{t(`type.${k}`)}</option>)}
              </select>
              <Button type="submit">{t("deals.create")}</Button>
            </form>
          </details>
          </>
        } />

      <StatGrid>
        <Stat label={t("deals.stat.count")} value={deals.length} />
        <Stat label={t("deals.stat.week")} value={stats.week} tone={stats.week ? "warn" : undefined} />
        <Stat label={t("deals.stat.overdue")} value={stats.overdue} tone={stats.overdue ? "danger" : undefined} />
        <Stat label={t("deals.stat.open")} value={stats.open} />
      </StatGrid>

      <Section title={title} right={<span className="font-mono text-sm text-muted">{deals.length}</span>}>
        {deals.length === 0 ? (
          <Empty>{needle ? t("common.noMatch") : stageFilter ? t("deals.noneInStage") : t("deals.none")}</Empty>
        ) : (
          <div className="-mx-4 -my-4">
            <div className="hidden grid-cols-[1.6fr_1fr_1.2fr_1.4fr_.6fr] gap-3 border-b border-line bg-chip/40 px-4 py-2 text-[11.5px] font-semibold text-muted md:grid">
              <span>{t("deals.col.deal")}</span><span>{stageFilter ? t("deals.col.type") : t("deals.col.stage")}</span><span>{t("deals.col.next")}</span><span>{t("deals.col.date")}</span><span className="text-right">{t("deals.col.open")}</span>
            </div>
            <ul className="divide-y divide-line">
              {deals.map((d) => {
                const next = d.milestones.filter((m) => m.status === "pending" && m.due_date && m.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
                const open = d.tasks.filter((x) => !x.done_at && !x.deleted_at).length;
                return (
                  <li key={d.id}>
                    <Link href={`/deals/${d.id}`} className="grid gap-1.5 px-4 py-3 hover:bg-chip/40 md:grid-cols-[1.6fr_1fr_1.2fr_1.4fr_.6fr] md:items-center md:gap-3">
                      <div className="flex min-w-0 gap-3"><StageBar stage={d.stage} /><div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-fg">{d.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[11.5px] text-muted">
                          {d.addenda.map((a) => <Badge key={a} tone="blue">{a.replace(/_addendum$/, "")}</Badge>)}
                          <span className="md:hidden">{t("deals.openTasks", { n: open })}</span>
                        </div>
                      </div></div>
                      <div className="flex gap-1">
                        <Badge>{t(`type.${d.type}`)}</Badge>
                        {!stageFilter && <StageBadge stage={d.stage} label={t(`stage.${d.stage}`)} />}
                      </div>
                      <div className="truncate text-sm">{next ? t.or(`ms.${next.key}`, next.label) : <span className="text-muted">{t("deals.noNext")}</span>}</div>
                      <div>{next && <Badge tone={dueTone(next.due_date, today)}>{next.due_date} · {relDays(next.due_date, today, t)}</Badge>}</div>
                      <div className="hidden text-right font-mono text-sm md:block">{open}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>
    </div>
  );
}
