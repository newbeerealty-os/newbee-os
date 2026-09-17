// /deals —— 交易列表（?stage= 按阶段过滤）+ 顶部统计 + 新建交易
import Link from "next/link";
import { addCalendarDays, contactName, matchesQuery, sortRows, compareAddress, compareText, compareDate, compareNumber } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { DEAL_STAGES } from "@/lib/nav";
import { todayISO, relDays } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, dueTone } from "@/components/ui";
import { PageHeader, Stat, StatGrid, SortHeader, readSort } from "@/components/page";
import { StageBar, StageBadge } from "@/components/stage";
import { SearchBox } from "@/components/search-box";
import { DataTable } from "@/components/data-table";
import { getAgentSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TYPES = ["seller", "buyer", "lease_listing", "lease_tenant", "property_mgmt"];

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string; sort?: string; dir?: string }> }) {
  const sp = await searchParams;
  const { stage, q = "" } = sp;
  const { sort, dir } = readSort(sp);
  const stageFilter = DEAL_STAGES.includes(stage as (typeof DEAL_STAGES)[number]) ? stage! : null;
  const supabase = await createClient();
  const [t, agentSettings] = await Promise.all([getT(), getAgentSettings()]);
  const columnOrder = ((agentSettings.columns ?? {}) as Record<string, string[]>).deals;
  const today = todayISO();
  const horizon = addCalendarDays(today, 7);

  const [{ data }, { data: fv }, { data: pv }] = await Promise.all([
    supabase.from("deals").select("id,title,type,stage,addenda,created_at,priority,sort_at,milestones(key,label,due_date,status),tasks(id,done_at,deleted_at)").is("deleted_at", null).order("priority", { ascending: false }).order("sort_at", { ascending: false }),
    supabase.from("deal_fields_current").select("deal_id,key,value_text,value_num").not("confirmed_at", "is", null),
    supabase.from("deal_parties").select("deal_id,contacts(first_name,last_name,name_zh),organizations(name)").is("deleted_at", null),
  ]);
  type Row = { id: string; title: string; type: string; stage: string; addenda: string[]; milestones: { key: string; label: string; due_date: string | null; status: string }[]; tasks: { id: string; done_at: string | null; deleted_at: string | null }[] };
  const all = (data ?? []) as unknown as Row[];
  // 搜索索引：标题 + 已确认字段值（地址、金额…）+ 各方名字 + addenda
  const index = new Map<string, string[]>();
  const nums = new Map<string, number[]>();
  const push = (id: string, ...xs: (string | number | null | undefined)[]) => index.set(id, [...(index.get(id) ?? []), ...xs.filter((x) => x !== null && x !== undefined && x !== "").map(String)]);
  for (const d of all) push(d.id, d.title, ...d.addenda);
  const fieldRows = (fv ?? []) as { deal_id: string; key: string; value_text: string | null; value_num: number | null }[];
  for (const r of fieldRows) { push(r.deal_id, r.value_text, r.value_num); if (r.value_num !== null) nums.set(r.deal_id, [...(nums.get(r.deal_id) ?? []), r.value_num]); }
  type One<T> = T | T[] | null;
  const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  for (const p of (pv ?? []) as unknown as { deal_id: string; contacts: One<{ first_name: string; last_name: string; name_zh: string | null }>; organizations: One<{ name: string }> }[]) {
    const c = one(p.contacts); const o = one(p.organizations);
    push(p.deal_id, c ? contactName(c) : null, c?.name_zh, o?.name);
  }
  const needle = q.trim();
  const searchable = (id: string) => ({ text: (index.get(id) ?? []).join(" "), nums: nums.get(id) ?? [] });
  const hit = (id: string) => matchesQuery(needle, searchable(id));
  // 搜索候选：只在当前阶段范围内找（阶段页只列该阶段的交易；地址 / 相关人 / 金额都算 key），显示交易标题
  const inScope = stageFilter ? all.filter((d) => d.stage === stageFilter) : all;
  const searchItems = inScope.map((d) => ({ label: d.title, ...searchable(d.id) }));
  const filtered = all.filter((d) => (!stageFilter || d.stage === stageFilter) && hit(d.id));
  // 每行先算出下一节点和未完成数，再按表头排序（默认 = 数据库的显示优先级）
  const rows = filtered.map((d) => {
    const next = d.milestones.filter((m) => m.status === "pending" && m.due_date && m.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
    return { d, next, nextLabel: next ? t.or(`ms.${next.key}`, next.label) : null, open: d.tasks.filter((x) => !x.done_at && !x.deleted_at).length, stageLabel: stageFilter ? t(`type.${d.type}`) : t(`stage.${d.stage}`) };
  });
  const sorted = sort === "title" ? sortRows(rows, (r) => r.d.title, compareAddress, dir)
    : sort === "stage" ? sortRows(rows, (r) => r.stageLabel, compareText, dir)
    : sort === "next" ? sortRows(rows, (r) => r.nextLabel, compareText, dir)
    : sort === "date" ? sortRows(rows, (r) => r.next?.due_date ?? null, compareDate, dir)
    : sort === "open" ? sortRows(rows, (r) => r.open, compareNumber, dir)
    : rows;
  const deals = sorted.map((r) => r.d);
  const hp = { stage: stageFilter ?? undefined, q: q || undefined, sort: sp.sort, dir: sp.dir };

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
          <SearchBox placeholder={t("deals.search")} label={t("common.search")} allLabel={t("common.searchAll")} items={searchItems} />
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
          <DataTable table="deals" initialOrder={columnOrder} dragHint={t("common.dragColumn")}
            columns={[
              { id: "title", width: "1.6fr", header: <SortHeader col="title" label={t("deals.col.deal")} sort={sort} dir={dir} params={hp} /> },
              { id: "stage", width: "1fr", header: <SortHeader col="stage" label={stageFilter ? t("deals.col.type") : t("deals.col.stage")} sort={sort} dir={dir} params={hp} /> },
              { id: "next", width: "1.2fr", header: <SortHeader col="next" label={t("deals.col.next")} sort={sort} dir={dir} params={hp} /> },
              { id: "date", width: "1.4fr", header: <SortHeader col="date" label={t("deals.col.date")} sort={sort} dir={dir} params={hp} /> },
              { id: "open", width: ".6fr", align: "right", mobile: false, header: <SortHeader col="open" label={t("deals.col.open")} sort={sort} dir={dir} params={hp} align="right" /> },
            ]}
            rows={sorted.map(({ d, next, nextLabel, open }) => ({ key: d.id, href: `/deals/${d.id}`, cells: {
              title: <div className="flex min-w-0 gap-3"><StageBar stage={d.stage} /><div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{d.title}</div><div className="mt-0.5 flex flex-wrap gap-1 text-[11.5px] text-muted">{d.addenda.map((a) => <Badge key={a} tone="blue">{a.replace(/_addendum$/, "")}</Badge>)}<span className="md:hidden">{t("deals.openTasks", { n: open })}</span></div></div></div>,
              stage: <div className="flex gap-1"><Badge>{t(`type.${d.type}`)}</Badge>{!stageFilter && <StageBadge stage={d.stage} label={t(`stage.${d.stage}`)} />}</div>,
              next: <div className="truncate text-sm">{nextLabel ?? <span className="text-muted">{t("deals.noNext")}</span>}</div>,
              date: <div>{next && <Badge tone={dueTone(next.due_date, today)}>{next.due_date} · {relDays(next.due_date, today, t)}</Badge>}</div>,
              open: <div className="font-mono text-sm">{open}</div>,
            } }))} />
        )}
      </Section>
    </div>
  );
}
