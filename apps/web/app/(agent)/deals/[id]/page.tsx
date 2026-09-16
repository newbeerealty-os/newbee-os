// /deals/[id] —— 一笔交易的全部：文件 → 待确认字段 → 当前字段 → 里程碑 → 任务
// 这一页就是"合同即数据"的闭环：上传 → 抽取 → 确认 → 派生。
import { notFound } from "next/navigation";
import { DEAL_FIELDS, FIELD_BY_KEY, ADDENDA } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { uploadDocument, extractDocument, confirmField, rejectField, setField, deriveDeal, setStage } from "@/lib/actions/deals";
import { getT } from "@/lib/i18n";
import { todayISO, relDays, money } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, TaskItem, dueTone, type TaskRow } from "@/components/ui";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "pre", "active", "offer", "under_contract", "closing", "closed", "terminated"];
const DOC_TONE: Record<string, "zinc" | "blue" | "green" | "amber" | "red"> = { uploaded: "zinc", extracting: "blue", review: "amber", confirmed: "green", failed: "red" };
const GROUPS = ["parties", "money", "dates", "property", "addenda", "commission", "lease"];

type FieldRow = { id: string; key: string; value_text: string | null; value_num: number | null; value_date: string | null; source_page: number | null; source_quote: string | null; confidence: number | null; confirmed_at: string | null; source_doc_id: string | null };
type DocRow = { id: string; file_name: string | null; doc_type: string | null; status: string; error: string | null; uploaded_at: string; page_count: number | null };
type MsRow = { id: string; key: string; label: string; due_date: string | null; due_time: string | null; status: string; client_visible: boolean };

function show(f: FieldRow): string {
  const def = FIELD_BY_KEY[f.key];
  if (f.value_date) return f.value_date;
  if (f.value_num !== null) return def?.type === "money" ? money(f.value_num) : String(f.value_num);
  return f.value_text ?? "—";
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();

  const { data: deal } = await supabase.from("deals").select("id,title,type,stage,addenda,created_at").eq("id", id).is("deleted_at", null).single();
  if (!deal) notFound();

  const [{ data: docs }, { data: fields }, { data: ms }, { data: ts }] = await Promise.all([
    supabase.from("documents").select("id,file_name,doc_type,status,error,uploaded_at,page_count").eq("deal_id", id).is("deleted_at", null).order("uploaded_at", { ascending: false }),
    supabase.from("deal_fields_current").select("id,key,value_text,value_num,value_date,source_page,source_quote,confidence,confirmed_at,source_doc_id").eq("deal_id", id),
    supabase.from("milestones").select("id,key,label,due_date,due_time,status,client_visible").eq("deal_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,stage,playbook_rule_id").eq("deal_id", id).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
  ]);
  const documents = (docs ?? []) as DocRow[];
  const allFields = (fields ?? []) as FieldRow[];
  const pending = allFields.filter((f) => !f.confirmed_at);
  const confirmed = allFields.filter((f) => f.confirmed_at);
  const milestones = (ms ?? []) as MsRow[];
  const tasks = (ts ?? []) as (TaskRow & { stage: string | null })[];
  const backTo = `/deals/${id}`;

  const stagesInTasks = Array.from(new Set(tasks.map((x) => x.stage ?? "")));
  const openCount = tasks.filter((x) => !x.done_at).length;
  const fieldLabel = (key: string) => t.or(`field.${key}`, FIELD_BY_KEY[key]?.label ?? key);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* 头部 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{deal.title}</h1>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone="blue">{t(`type.${deal.type}`)}</Badge>
            {(deal.addenda as string[]).map((a) => <Badge key={a}>{a}</Badge>)}
          </div>
        </div>
        <form action={setStage.bind(null, id)} className="flex items-center gap-2">
          <select name="stage" defaultValue={deal.stage} className={`${inputCls} w-36`}>
            {STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
          </select>
          <Button variant="ghost" type="submit">{t("deal.changeStage")}</Button>
        </form>
      </div>

      {/* 1. 文件 */}
      <Section title={`${t("deal.files")} · ${documents.length}`}>
        <form action={uploadDocument.bind(null, id)} className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input type="file" name="file" accept="application/pdf" required className="block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:text-sm" />
          <Button type="submit">{t("deal.uploadPdf")}</Button>
        </form>
        {documents.length === 0 ? (
          <Empty>{t("deal.uploadHint")}</Empty>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-zinc-800">{d.file_name ?? d.id}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <Badge tone={DOC_TONE[d.status] ?? "zinc"}>{t.or(`docStatus.${d.status}`, d.status)}</Badge>
                    {d.doc_type && <span>{d.doc_type}</span>}
                    {d.page_count && <span>{t("common.pages", { n: d.page_count })}</span>}
                    <span>{d.uploaded_at.slice(0, 10)}</span>
                  </div>
                  {d.error && <div className="mt-1 text-xs text-red-600">{d.error}</div>}
                </div>
                {(d.status === "uploaded" || d.status === "failed") && (
                  <form action={extractDocument.bind(null, id, d.id)}>
                    <Button variant="ghost" type="submit">{d.status === "failed" ? t("deal.retryExtract") : t("deal.extract")}</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 2. 待确认（抽取出来但还没点确认的） */}
      <Section title={`${t("deal.pending")} · ${pending.length}`} right={pending.length > 0 ? <Badge tone="amber">{t("deal.pendingHint")}</Badge> : undefined}>
        {pending.length === 0 ? (
          <Empty>{t("deal.noPending")}</Empty>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {pending.map((f) => (
              <li key={f.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-800">{fieldLabel(f.key)}</div>
                  <div className="text-xs text-zinc-500">
                    {f.source_page && <span>{t("deal.page", { n: f.source_page })} · </span>}
                    {t("deal.confidence", { n: f.confidence !== null ? Math.round(f.confidence * 100) : "—" })}
                  </div>
                </div>
                {f.source_quote && <blockquote className="mt-1 border-l-2 border-zinc-200 pl-2 text-xs text-zinc-500">“{f.source_quote}”</blockquote>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={confirmField.bind(null, id, f.id)} className="flex flex-1 items-center gap-2">
                    <input name="value" defaultValue={show(f) === "—" ? "" : f.value_date ?? (f.value_num !== null ? String(f.value_num) : f.value_text ?? "")} className={`${inputCls} max-w-xs`} />
                    <Button type="submit">{t("deal.confirm")}</Button>
                  </form>
                  <form action={rejectField.bind(null, id, f.id)}>
                    <Button variant="danger" type="submit">{t("deal.reject")}</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 3. 当前字段 */}
      <Section
        title={`${t("deal.fields")} · ${confirmed.length}`}
        right={
          <form action={deriveDeal.bind(null, id)}>
            <Button type="submit">{t("deal.derive")}</Button>
          </form>
        }
      >
        {confirmed.length === 0 ? (
          <Empty>{t("deal.noFields")}</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map((g) => {
              const rows = confirmed.filter((f) => FIELD_BY_KEY[f.key]?.group === g);
              if (!rows.length) return null;
              return (
                <div key={g}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t(`group.${g}`)}</div>
                  <dl className="divide-y divide-zinc-100 text-sm">
                    {rows.map((f) => (
                      <div key={f.id} className="flex justify-between gap-3 py-1">
                        <dt className="text-zinc-500">{fieldLabel(f.key)}</dt>
                        <dd className="text-right font-medium text-zinc-800">{show(f)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
        <form action={setField.bind(null, id)} className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row">
          <select name="key" className={`${inputCls} sm:w-64`} defaultValue="effective_date">
            {DEAL_FIELDS.map((f) => <option key={f.key} value={f.key}>{fieldLabel(f.key)} ({f.key})</option>)}
          </select>
          <input name="value" required placeholder={t("deal.valuePlaceholder")} className={inputCls} />
          <Button variant="ghost" type="submit">{t("deal.manualWrite")}</Button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">{t("deal.addendaHint", { list: ADDENDA.join(" · ") })}</p>
      </Section>

      {/* 4. 里程碑 */}
      <Section title={`${t("deal.milestones")} · ${milestones.length}`}>
        {milestones.length === 0 ? (
          <Empty>{t("deal.noMilestones")}</Empty>
        ) : (
          <ol className="relative ml-2 border-l border-zinc-200">
            {milestones.map((m) => (
              <li key={m.id} className="mb-3 ml-4">
                <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${m.due_date && m.due_date < today ? "bg-zinc-400" : "bg-[#1f5f8b]"}`} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-zinc-800">{t.or(`ms.${m.key}`, m.label)}{m.client_visible ? "" : <span className="ml-1 text-xs text-zinc-400">{t("common.internal")}</span>}</div>
                  {m.due_date ? (
                    <Badge tone={dueTone(m.due_date, today)}>{m.due_date}{m.due_time ? ` ${m.due_time.slice(0, 5)}` : ""} · {relDays(m.due_date, today, t)}</Badge>
                  ) : (
                    <Badge>{t("deal.missingAnchor")}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* 5. 任务（按阶段） */}
      <Section title={t("deal.tasks", { open: openCount, total: tasks.length })}>
        {tasks.length === 0 ? (
          <Empty>{t("deal.noTasks")}</Empty>
        ) : (
          stagesInTasks.map((s) => (
            <div key={s} className="mb-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{s ? t.or(`playbookStage.${s}`, s) : t("deal.otherStage")}</div>
              <ul className="divide-y divide-zinc-100">
                {tasks.filter((x) => (x.stage ?? "") === s).map((x) => <TaskItem key={x.id} task={x} today={today} backTo={backTo} t={t} />)}
              </ul>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}
