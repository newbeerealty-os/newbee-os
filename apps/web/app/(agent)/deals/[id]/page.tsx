// /deals/[id] —— 一笔交易的全部，按选项卡：概览 / 文件 / 待确认 / 字段 / 里程碑 / 任务
// 上传 → 抽取 → 确认 → 派生 的闭环都在这一页。
import { notFound } from "next/navigation";
import Link from "next/link";
import { DEAL_FIELDS, FIELD_BY_KEY, ADDENDA, PARTY_ROLES, PARTY_SIDES, contactName, initials } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { uploadDocument, extractDocument, confirmField, rejectField, setField, deriveDeal, setStage } from "@/lib/actions/deals";
import { addParty, removeParty } from "@/lib/actions/contacts";
import { ContactAvatar } from "@/components/avatar";
import { avatarUrlsFor } from "@/lib/avatars";
import { getT } from "@/lib/i18n";
import { DEAL_STAGES } from "@/lib/nav";
import { todayISO, relDays, money } from "@/lib/format";
import { Section, Empty, Button, Badge, inputCls, TaskItem, dueTone, type TaskRow } from "@/components/ui";
import { PageHeader, Tabs, Stat, StatGrid } from "@/components/page";
import { StageBadge } from "@/components/stage";

export const dynamic = "force-dynamic";

const DOC_TONE: Record<string, "zinc" | "blue" | "green" | "amber" | "red"> = { uploaded: "zinc", extracting: "blue", review: "amber", confirmed: "green", failed: "red" };
const GROUPS = ["parties", "money", "dates", "property", "addenda", "commission", "lease"];
const TABS = ["overview", "parties", "files", "pending", "fields", "milestones", "tasks"] as const;

type FieldRow = { id: string; key: string; value_text: string | null; value_num: number | null; value_date: string | null; source_page: number | null; source_quote: string | null; confidence: number | null; confirmed_at: string | null; source_doc_id: string | null };
type DocRow = { id: string; file_name: string | null; doc_type: string | null; status: string; error: string | null; uploaded_at: string; page_count: number | null };
type MsRow = { id: string; key: string; label: string; due_date: string | null; due_time: string | null; status: string; client_visible: boolean };

function show(f: FieldRow): string {
  const def = FIELD_BY_KEY[f.key];
  if (f.value_date) return f.value_date;
  if (f.value_num !== null) return def?.type === "money" ? money(f.value_num) : String(f.value_num);
  return f.value_text ?? "—";
}

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const tab = (TABS as readonly string[]).includes(rawTab ?? "") ? rawTab! : "overview";
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();

  const { data: deal } = await supabase.from("deals").select("id,title,type,stage,addenda,created_at").eq("id", id).is("deleted_at", null).single();
  if (!deal) notFound();

  const [{ data: docs }, { data: fields }, { data: ms }, { data: ts }, { data: ps }, { data: cs }, { data: os }] = await Promise.all([
    supabase.from("documents").select("id,file_name,doc_type,status,error,uploaded_at,page_count").eq("deal_id", id).is("deleted_at", null).order("uploaded_at", { ascending: false }),
    supabase.from("deal_fields_current").select("id,key,value_text,value_num,value_date,source_page,source_quote,confidence,confirmed_at,source_doc_id").eq("deal_id", id),
    supabase.from("milestones").select("id,key,label,due_date,due_time,status,client_visible").eq("deal_id", id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select("id,title,due_date,done_at,deal_id,stage,playbook_rule_id").eq("deal_id", id).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("deal_parties").select("id,role,side,is_primary,notes,contact_id,organization_id,contacts(id,first_name,last_name,name_zh,email,phone,job_title,avatar_path,avatar_photo_id,organizations!contacts_organization_id_fkey(name)),organizations(id,name,email,phone)").eq("deal_id", id).is("deleted_at", null).order("created_at"),
    supabase.from("contacts").select("id,first_name,last_name,name_zh,kind").is("deleted_at", null).order("first_name"),
    supabase.from("organizations").select("id,name,kind").is("deleted_at", null).order("name"),
  ]);
  const documents = (docs ?? []) as DocRow[];
  const allFields = (fields ?? []) as FieldRow[];
  const pending = allFields.filter((f) => !f.confirmed_at);
  const confirmed = allFields.filter((f) => f.confirmed_at);
  const milestones = (ms ?? []) as MsRow[];
  const tasks = (ts ?? []) as (TaskRow & { stage: string | null })[];
  type One<T> = T | T[] | null;
  const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  type PartyRow = { id: string; role: string; side: string; is_primary: boolean; notes: string | null; contact_id: string | null; organization_id: string | null;
    contacts: One<{ id: string; first_name: string; last_name: string; name_zh: string | null; email: string | null; phone: string | null; job_title: string | null; avatar_path: string | null; avatar_photo_id: string | null; organizations: One<{ name: string }> }>;
    organizations: One<{ id: string; name: string; email: string | null; phone: string | null }> };
  const parties = ((ps ?? []) as unknown as PartyRow[]).map((p) => {
    const c = one(p.contacts); const o = one(p.organizations);
    return { ...p, name: c ? contactName(c) : o?.name ?? "", sub: c ? [c.name_zh, c.job_title, one(c.organizations)?.name].filter(Boolean).join(" · ") : t("contacts.company"),
      email: c?.email ?? o?.email ?? null, phone: c?.phone ?? o?.phone ?? null, href: c ? `/contacts/${c.id}` : o ? `/contacts/org/${o.id}` : "#", av: c ? initials(c.first_name, c.last_name) : initials(o?.name ?? "?"), person: c };
  });
  const partyAvatars = await avatarUrlsFor(supabase, parties.flatMap((p) => (p.person ? [{ id: p.person.id, avatar_path: p.person.avatar_path, avatar_photo_id: p.person.avatar_photo_id }] : [])));
  const people = (cs ?? []) as { id: string; first_name: string; last_name: string; name_zh: string | null; kind: string }[];
  const orgs = (os ?? []) as { id: string; name: string; kind: string }[];
  const base = `/deals/${id}`;
  const backTo = tab === "overview" ? base : `${base}?tab=${tab}`;

  const openTasks = tasks.filter((x) => !x.done_at);
  const fieldLabel = (key: string) => t.or(`field.${key}`, FIELD_BY_KEY[key]?.label ?? key);
  const field = (key: string) => confirmed.find((f) => f.key === key);
  const msByKey = (key: string) => milestones.find((m) => m.key === key);
  const msLabel = (m: MsRow) => t.or(`ms.${m.key}`, m.label);

  // 概览："接下来" = 未过期的待办里程碑 + 未完成任务，按日期取前 5
  const upcoming = [
    ...milestones.filter((m) => m.status === "pending" && m.due_date).map((m) => ({ kind: "ms" as const, id: m.id, label: msLabel(m), date: m.due_date!, time: m.due_time })),
    ...openTasks.filter((x) => x.due_date).map((x) => ({ kind: "task" as const, id: x.id, label: x.playbook_rule_id ? t.or(`task.${x.playbook_rule_id}`, x.title) : x.title, date: x.due_date!, time: null })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const price = field("sales_price");
  const optionEnd = msByKey("option_period_end");
  const closing = msByKey("closing");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.deals"), href: "/deals" }, { label: t(`stage.${deal.stage}`), href: `/deals?stage=${deal.stage}` }, { label: deal.title }]}
        title={<span className="flex flex-wrap items-center gap-2">{deal.title}<span className="text-muted">· {t(`type.${deal.type}`)}</span><StageBadge stage={deal.stage} label={t(`stage.${deal.stage}`)} /></span>}
        actions={
          <>
            <form action={setStage.bind(null, id)} className="flex items-center gap-2">
              <select name="stage" defaultValue={deal.stage} className={`${inputCls} w-36`}>
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
              </select>
              <Button variant="ghost" type="submit">{t("deal.changeStage")}</Button>
            </form>
            <form action={deriveDeal.bind(null, id)}><Button type="submit">{t("deal.derive")}</Button></form>
          </>
        }
      />
      {(deal.addenda as string[]).length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-1">{(deal.addenda as string[]).map((a) => <Badge key={a}>{a}</Badge>)}</div>
      )}

      <Tabs base={base} active={tab} tabs={[
        { id: "overview", label: t("tab.overview") },
        { id: "parties", label: t("deal.tab.parties"), count: parties.length },
        { id: "files", label: t("deal.files"), count: documents.length },
        { id: "pending", label: t("deal.pending"), count: pending.length },
        { id: "fields", label: t("deal.fields"), count: confirmed.length },
        { id: "milestones", label: t("deal.milestones"), count: milestones.length },
        { id: "tasks", label: t("deal.tab.tasks"), count: openTasks.length },
      ]} />

      {tab === "overview" && (
        <>
          <StatGrid>
            <Stat label={t("deal.stat.price")} value={price ? show(price) : "—"} />
            <Stat label={t("deal.stat.option")} value={optionEnd?.due_date ? optionEnd.due_date.slice(5) : "—"} sub={optionEnd?.due_date ? relDays(optionEnd.due_date, today, t) : undefined} tone={optionEnd?.due_date && optionEnd.due_date <= today ? "danger" : undefined} />
            <Stat label={t("deal.stat.closing")} value={closing?.due_date ? closing.due_date.slice(5) : "—"} sub={closing?.due_date ? relDays(closing.due_date, today, t) : undefined} />
            <Stat label={t("deal.stat.open")} value={openTasks.length} sub={`/ ${tasks.length}`} />
          </StatGrid>
          <Section title={t("deal.next3")} right={<span className="font-mono text-xs text-muted">{upcoming.length}</span>}>
            {upcoming.length === 0 ? <Empty>{t("deal.nothingNext")}</Empty> : (
              <ul className="divide-y divide-line">
                {upcoming.map((u) => (
                  <li key={u.kind + u.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate text-sm">{u.kind === "ms" ? "◆ " : "☐ "}{u.label}{u.time && <span className="ml-1 text-xs text-muted">{u.time.slice(0, 5)}</span>}</span>
                    <Badge tone={dueTone(u.date, today)}>{u.date} · {relDays(u.date, today, t)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      {tab === "parties" && (
        <Section title={t("deal.tab.parties")} right={<span className="font-mono text-xs text-muted">{parties.length}</span>}>
          {parties.length === 0 ? <Empty>{t("parties.none")}</Empty> : (
            <div className="flex flex-col gap-4">
              {PARTY_SIDES.map((side) => {
                const list = parties.filter((p) => p.side === side);
                if (!list.length) return null;
                return (
                  <div key={side}>
                    <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-muted">{t(`partySide.${side}`)}</div>
                    <ul className="divide-y divide-line">
                      {list.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                          <Link href={p.href} className="flex min-w-0 flex-1 items-center gap-2.5">
                            <ContactAvatar initials={p.av} avatarUrl={p.person ? partyAvatars.get(p.person.id)?.avatarUrl : null} photoUrl={p.person ? partyAvatars.get(p.person.id)?.photoUrl : null} size="sm" />
                            <span className="min-w-0"><span className="block truncate text-sm font-medium text-fg">{p.name}</span>{p.sub && <span className="block truncate text-[11.5px] text-muted">{p.sub}</span>}</span>
                          </Link>
                          <Badge tone="blue">{t(`partyRole.${p.role}`)}</Badge>
                          {p.is_primary && <Badge tone="green">{t("parties.primary")}</Badge>}
                          <span className="hidden gap-3 font-mono text-xs text-muted md:flex">{p.email && <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>}{p.phone && <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>}</span>
                          <form action={removeParty.bind(null, id, p.id, `${base}?tab=parties`)}><button className="text-xs text-muted hover:text-danger">{t("parties.remove")}</button></form>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <form action={addParty.bind(null, id)} className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1.6fr_1.2fr_1fr_auto_auto] sm:items-end">
            <input type="hidden" name="back" value={`${base}?tab=parties`} />
            <label className="flex flex-col gap-1 text-xs text-muted">{t("parties.who")}
              <select name="who" required className={inputCls} defaultValue="">
                <option value="" disabled>—</option>
                <optgroup label={t("contacts.person")}>{people.map((p) => <option key={p.id} value={`c:${p.id}`}>{contactName(p)}{p.name_zh ? ` · ${p.name_zh}` : ""}</option>)}</optgroup>
                <optgroup label={t("contacts.company")}>{orgs.map((o) => <option key={o.id} value={`o:${o.id}`}>{o.name}</option>)}</optgroup>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">{t("parties.role")}
              <select name="role" className={inputCls} defaultValue="buyer">{PARTY_ROLES.map((r) => <option key={r} value={r}>{t(`partyRole.${r}`)}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">{t("parties.side")}
              <select name="side" className={inputCls} defaultValue=""><option value="">{t("parties.autoSide")}</option>{PARTY_SIDES.map((sd) => <option key={sd} value={sd}>{t(`partySide.${sd}`)}</option>)}</select>
            </label>
            <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="is_primary" className="accent-accent" />{t("parties.primary")}</label>
            <Button type="submit">{t("parties.add")}</Button>
          </form>
        </Section>
      )}

      {tab === "files" && (
        <Section title={t("deal.files")}>
          <form action={uploadDocument.bind(null, id)} className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input type="file" name="file" accept="application/pdf" required className="block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-chip file:px-3 file:text-sm" />
            <Button type="submit">{t("deal.uploadPdf")}</Button>
          </form>
          {documents.length === 0 ? <Empty>{t("deal.uploadHint")}</Empty> : (
            <ul className="divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm text-fg">{d.file_name ?? d.id}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Badge tone={DOC_TONE[d.status] ?? "zinc"}>{t.or(`docStatus.${d.status}`, d.status)}</Badge>
                      {d.doc_type && <span>{d.doc_type}</span>}
                      {d.page_count && <span>{t("common.pages", { n: d.page_count })}</span>}
                      <span>{d.uploaded_at.slice(0, 10)}</span>
                    </div>
                    {d.error && <div className="mt-1 text-xs text-danger">{d.error}</div>}
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
      )}

      {tab === "pending" && (
        <Section title={t("deal.pending")} right={pending.length > 0 ? <Badge tone="amber">{t("deal.pendingHint")}</Badge> : undefined}>
          {pending.length === 0 ? <Empty>{t("deal.noPending")}</Empty> : (
            <ul className="divide-y divide-line">
              {pending.map((f) => (
                <li key={f.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium text-fg">{fieldLabel(f.key)}</div>
                    <div className="font-mono text-xs text-muted">
                      {f.source_page && <span>{t("deal.page", { n: f.source_page })} · </span>}
                      {t("deal.confidence", { n: f.confidence !== null ? Math.round(f.confidence * 100) : "—" })}
                    </div>
                  </div>
                  {f.source_quote && <blockquote className="mt-1 border-l-2 border-accent pl-2 text-xs italic text-muted">“{f.source_quote}”</blockquote>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={confirmField.bind(null, id, f.id)} className="flex flex-1 items-center gap-2">
                      <input name="value" defaultValue={show(f) === "—" ? "" : f.value_date ?? (f.value_num !== null ? String(f.value_num) : f.value_text ?? "")} className={`${inputCls} max-w-xs font-mono`} />
                      <Button type="submit">{t("deal.confirm")}</Button>
                    </form>
                    <form action={rejectField.bind(null, id, f.id)}><Button variant="danger" type="submit">{t("deal.reject")}</Button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "fields" && (
        <Section title={t("deal.fields")} right={<span className="font-mono text-xs text-muted">{confirmed.length}</span>}>
          {confirmed.length === 0 ? <Empty>{t("deal.noFields")}</Empty> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {GROUPS.map((g) => {
                const rows = confirmed.filter((f) => FIELD_BY_KEY[f.key]?.group === g);
                if (!rows.length) return null;
                return (
                  <div key={g}>
                    <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-accent">{t(`group.${g}`)}</div>
                    <dl className="divide-y divide-line text-sm">
                      {rows.map((f) => (
                        <div key={f.id} className="flex justify-between gap-3 py-1">
                          <dt className="text-muted">{fieldLabel(f.key)}</dt>
                          <dd className="text-right font-medium tabular-nums text-fg">{show(f)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
          <form action={setField.bind(null, id)} className="mt-4 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
            <select name="key" className={`${inputCls} sm:w-64`} defaultValue="effective_date">
              {DEAL_FIELDS.map((f) => <option key={f.key} value={f.key}>{fieldLabel(f.key)} ({f.key})</option>)}
            </select>
            <input name="value" required placeholder={t("deal.valuePlaceholder")} className={inputCls} />
            <Button variant="ghost" type="submit">{t("deal.manualWrite")}</Button>
          </form>
          <p className="mt-2 text-xs text-muted">{t("deal.addendaHint", { list: ADDENDA.join(" · ") })}</p>
        </Section>
      )}

      {tab === "milestones" && (
        <Section title={t("deal.milestones")} right={<span className="font-mono text-xs text-muted">{milestones.length}</span>}>
          {milestones.length === 0 ? <Empty>{t("deal.noMilestones")}</Empty> : (
            <ol className="relative ml-2 border-l border-line">
              {milestones.map((m) => (
                <li key={m.id} className="mb-3 ml-4">
                  <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${m.due_date && m.due_date < today ? "bg-muted" : "bg-accent"}`} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-fg">{msLabel(m)}{m.client_visible ? "" : <span className="ml-1 text-xs text-muted">{t("common.internal")}</span>}</div>
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
      )}

      {tab === "tasks" && (
        <Section title={t("deal.tasks", { open: openTasks.length, total: tasks.length })}>
          {tasks.length === 0 ? <Empty>{t("deal.noTasks")}</Empty> : (
            Array.from(new Set(tasks.map((x) => x.stage ?? ""))).map((s) => (
              <div key={s} className="mb-3">
                <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-muted">{s ? t.or(`playbookStage.${s}`, s) : t("deal.otherStage")}</div>
                <ul className="divide-y divide-line">
                  {tasks.filter((x) => (x.stage ?? "") === s).map((x) => <TaskItem key={x.id} task={x} today={today} backTo={backTo} t={t} />)}
                </ul>
              </div>
            ))
          )}
        </Section>
      )}
    </div>
  );
}
