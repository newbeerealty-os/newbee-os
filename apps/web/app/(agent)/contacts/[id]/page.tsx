// /contacts/[id] —— 一个人：左栏 资料 / 联系方式 / 紧密关系 / 备注；右栏 相关交易（按强度）/ 相关联系人（按强度）。?edit=1 进编辑。
import Link from "next/link";
import { notFound } from "next/navigation";
import { contactName, initials, CONTACT_TABS, CONTACT_RELATIONS, inverseRelation, rankDeals, rankRelated, type ContactRelation, type DealLike } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { todayISO, relDays } from "@/lib/format";
import { updateContact, deleteContact, createOrganizationInline, saveContactNotes, addContactLink, removeContactLink } from "@/lib/actions/contacts";
import { loadSuggestions } from "@/lib/contacts";
import { contactFormLabels, contactFormOptions, photoLabels } from "@/lib/contact-form-props";
import { avatarUrlsFor, signPaths } from "@/lib/avatars";
import { ContactFormClient } from "@/components/contact-form-client";
import { Section, Empty, Badge, Button, inputCls } from "@/components/ui";
import { PageHeader } from "@/components/page";
import { ContactAvatar, PhotoGallery, type PhotoItem } from "@/components/avatar";
import { StageBar, StageBadge } from "@/components/stage";
import { CopyButton } from "@/components/copy-button";
import { ChannelIcon } from "@/components/channel-icon";

export const dynamic = "force-dynamic";

type One<T> = T | T[] | null;
const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
type Person = { id: string; first_name: string; last_name: string; name_zh: string | null; kind: string; job_title: string | null; avatar_path?: string | null; avatar_photo_id?: string | null };
const P = "id,first_name,last_name,name_zh,kind,job_title,avatar_path,avatar_photo_id";
type Deal = { id: string; title: string; stage: string; type: string; updated_at: string };

export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const t = await getT();
  const today = todayISO();
  const now = new Date();

  const { data: c, error: cErr } = await supabase.from("contacts").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (cErr) throw new Error(`contact query failed: ${cErr.message}`);
  if (!c) notFound();
  const [{ data: orgRow }, { data: refRow }] = await Promise.all([
    c.organization_id ? supabase.from("organizations").select("id,name").eq("id", c.organization_id).maybeSingle() : Promise.resolve({ data: null }),
    c.referred_by_contact_id ? supabase.from("contacts").select(P).eq("id", c.referred_by_contact_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const org = orgRow as { id: string; name: string } | null;
  const referrer = refRow as Person | null;

  // 我参与的交易
  const { data: myParties, error: pErr } = await supabase.from("deal_parties").select("id,role,side,is_primary,deal_id,deals(id,title,stage,type,updated_at)").eq("contact_id", id).is("deleted_at", null);
  if (pErr) throw new Error(`deal_parties query failed: ${pErr.message}`);
  type MyParty = { id: string; role: string; side: string; is_primary: boolean; deal_id: string; deals: One<Deal> };
  const mine = ((myParties ?? []) as unknown as MyParty[]).map((p) => ({ ...p, deal: one(p.deals) })).filter((p) => p.deal) as (MyParty & { deal: Deal })[];
  const dealIds = [...new Set(mine.map((p) => p.deal_id))];
  const dealsById: Record<string, Deal> = Object.fromEntries(mine.map((p) => [p.deal_id, p.deal]));
  const rolesByDeal = new Map<string, string[]>();
  for (const p of mine) rolesByDeal.set(p.deal_id, [...(rolesByDeal.get(p.deal_id) ?? []), p.role]);
  const rankedDeals = rankDeals(Object.values(dealsById).map((d) => ({ ...d, updatedAt: d.updated_at })), now);

  // 这些交易的下一节点 / 同交易的其他人 / 紧密关系 / 编辑用的下拉
  const [{ data: ms }, { data: others }, { data: linksA }, { data: linksB }, { data: orgs }, { data: people }, suggestions] = await Promise.all([
    dealIds.length ? supabase.from("milestones").select("deal_id,key,label,due_date").in("deal_id", dealIds).eq("status", "pending").not("due_date", "is", null).gte("due_date", today).order("due_date") : Promise.resolve({ data: [] }),
    dealIds.length ? supabase.from("deal_parties").select(`deal_id,role,contact_id,contacts(${P})`).in("deal_id", dealIds).is("deleted_at", null).not("contact_id", "is", null).neq("contact_id", id) : Promise.resolve({ data: [] }),
    supabase.from("contact_links").select(`id,relation,related:contacts!contact_links_related_contact_id_fkey(${P})`).eq("contact_id", id).is("deleted_at", null),
    supabase.from("contact_links").select(`id,relation,related:contacts!contact_links_contact_id_fkey(${P})`).eq("related_contact_id", id).is("deleted_at", null),
    supabase.from("organizations").select("id,name,kind").is("deleted_at", null).order("name"),
    supabase.from("contacts").select(P).is("deleted_at", null).neq("id", id).order("first_name"),
    loadSuggestions(supabase),
  ]);
  // 照片 + 头像 URL（本人、相关人、紧密关系里的人一起签）
  const { data: photoRows } = await supabase.from("contact_photos").select("id,storage_path,file_name").eq("contact_id", id).is("deleted_at", null).order("created_at", { ascending: false });
  const photoRecs = (photoRows ?? []) as { id: string; storage_path: string; file_name: string | null }[];
  const signed = await signPaths(supabase, photoRecs.map((p) => p.storage_path));
  const photos: PhotoItem[] = photoRecs.map((p) => ({ id: p.id, url: signed.get(p.storage_path) ?? "", name: p.file_name })).filter((p) => p.url);
  const pl2 = photoLabels(t);
  const nextMs = new Map<string, { key: string; label: string; due_date: string }>();
  for (const m of (ms ?? []) as { deal_id: string; key: string; label: string; due_date: string }[]) if (!nextMs.has(m.deal_id)) nextMs.set(m.deal_id, m);

  // 相关联系人：同一交易里的人，不列服务商，按强度排
  type Other = { deal_id: string; role: string; contact_id: string; contacts: One<Person> };
  const otherRows = ((others ?? []) as unknown as Other[]).map((o) => ({ ...o, person: one(o.contacts) })).filter((o) => o.person && o.person.kind !== "vendor") as (Other & { person: Person })[];
  const personById = new Map(otherRows.map((o) => [o.contact_id, o.person]));
  const rolesOf = new Map<string, Map<string, string[]>>(); // contactId → dealId → roles
  for (const o of otherRows) { const m = rolesOf.get(o.contact_id) ?? new Map<string, string[]>(); m.set(o.deal_id, [...(m.get(o.deal_id) ?? []), o.role]); rolesOf.set(o.contact_id, m); }
  const dealLike: Record<string, DealLike> = Object.fromEntries(Object.entries(dealsById).map(([k, d]) => [k, { stage: d.stage, updatedAt: d.updated_at }]));
  const related = rankRelated(otherRows.map((o) => ({ contactId: o.contact_id, dealId: o.deal_id })), dealLike, now);

  // 紧密关系（两个方向合并；反向的关系要翻转）
  type LinkRow = { id: string; relation: ContactRelation; related: One<Person> };
  const links = [
    ...((linksA ?? []) as unknown as LinkRow[]).map((l) => ({ id: l.id, relation: l.relation, person: one(l.related) })),
    ...((linksB ?? []) as unknown as LinkRow[]).map((l) => ({ id: l.id, relation: inverseRelation(l.relation), person: one(l.related) })),
  ].filter((l) => l.person) as { id: string; relation: ContactRelation; person: Person }[];
  const linkedIds = new Set(links.map((l) => l.person.id));

  // 相关联系人卡片里也要显示他们各自的紧密关系
  const relatedIds = related.map((r) => r.contactId);
  const { data: relLinks } = relatedIds.length
    ? await supabase.from("contact_links").select("contact_id,related_contact_id,relation,a:contacts!contact_links_contact_id_fkey(id,first_name,last_name,name_zh,kind,job_title),b:contacts!contact_links_related_contact_id_fkey(id,first_name,last_name,name_zh,kind,job_title)").or(`contact_id.in.(${relatedIds.join(",")}),related_contact_id.in.(${relatedIds.join(",")})`).is("deleted_at", null)
    : { data: [] };
  type RL = { contact_id: string; related_contact_id: string; relation: ContactRelation; a: One<Person>; b: One<Person> };
  const linksFor = (cid: string) => ((relLinks ?? []) as unknown as RL[]).flatMap((l) => {
    if (l.contact_id === cid) { const p = one(l.b); return p ? [{ relation: l.relation, person: p }] : []; }
    if (l.related_contact_id === cid) { const p = one(l.a); return p ? [{ relation: inverseRelation(l.relation), person: p }] : []; }
    return [];
  });

  const avatarPeople: Person[] = [c as Person, ...(referrer ? [referrer] : []), ...links.map((l) => l.person), ...[...personById.values()]];
  const avatars = await avatarUrlsFor(supabase, avatarPeople.map((p) => ({ id: p.id, avatar_path: p.avatar_path ?? null, avatar_photo_id: p.avatar_photo_id ?? null })));
  const Av = ({ p, size, editable }: { p: Person; size: "sm" | "md" | "lg" | "xl"; editable?: boolean }) => (
    <ContactAvatar initials={initials(p.first_name, p.last_name)} avatarUrl={avatars.get(p.id)?.avatarUrl} photoUrl={avatars.get(p.id)?.photoUrl} size={size}
      editable={editable} contactId={editable ? p.id : undefined} photos={editable ? photos : []} l={editable ? pl2 : undefined} />
  );

  const name = contactName(c);
  const base = `/contacts/${id}`;
  const tabOf = CONTACT_TABS.find((x) => (x.kinds as string[]).includes(c.kind))?.id;
  const address = [c.address_line1, c.address_line2, [c.city, c.state, c.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const pl = (p: Person) => `${contactName(p)}${p.name_zh ? ` · ${p.name_zh}` : ""}`;
  const Row = ({ k, icon, children }: { k: string; icon?: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2"><dt className="flex w-20 shrink-0 items-center gap-1 pt-0.5 text-xs text-muted">{icon && <ChannelIcon kind={icon} className="h-3.5 w-3.5" />}{k}</dt><dd className="flex min-w-0 flex-wrap items-center gap-1">{children}</dd></div>
  );
  // 首选联系方式：放在“联系方式”卡片标题右侧
  const pref = c.preferred_channel as string | null;
  const PrefTag = () => pref ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">
      {t("contact.preferred")} · <ChannelIcon kind={pref} className="h-3 w-3" />{t(`channel.${pref}`)} · {t(`language.${c.preferred_language}`)}
    </span>
  ) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.contacts"), href: "/contacts" }, ...(tabOf ? [{ label: t(`contactTab.${tabOf}`), href: `/contacts?tab=${tabOf}` }] : []), { label: name }]}
        title={name}
        actions={
          <>
            <Link href={edit ? base : `${base}?edit=1`} className="flex h-10 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-chip">{edit ? t("contact.cancel") : t("contact.edit")}</Link>
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger-bg">{t("contact.delete")}</summary>
              <form action={deleteContact.bind(null, id)} className="absolute right-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-ui border border-line bg-surface p-3 text-sm shadow-xl">
                <p className="text-muted">{t("contact.deleteConfirm")}</p>
                <Button variant="danger" type="submit">{t("contact.delete")}</Button>
              </form>
            </details>
          </>
        }
      />

      {edit ? (
        <>
        <Section title={pl2.photos}>
          <PhotoGallery contactId={id} photos={photos} avatarPhotoId={c.avatar_photo_id ?? null} hasAvatar={!!c.avatar_path} l={pl2} />
        </Section>
        <Section title={t("contact.edit")}>
          <ContactFormClient l={contactFormLabels(t)} {...contactFormOptions(t)} orgs={(orgs ?? []) as { id: string; name: string; kind: string }[]}
            contacts={((people ?? []) as Person[]).map((p) => ({ value: p.id, label: contactName(p) }))}
            jobTitles={suggestions.jobTitles} tags={suggestions.tags} sources={suggestions.sources} values={{ ...c, tags: c.tags as string[] }}
            action={updateContact.bind(null, id)} submitLabel={t("contact.save")} createOrg={createOrganizationInline} />
        </Section>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          {/* 左栏 */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 rounded-ui border border-line bg-surface p-4">
              <Av p={c as Person} size="xl" editable />
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-fg">{name}{c.name_zh && <span className="ml-2 text-sm font-normal text-muted">{c.name_zh}</span>}</div>
                {(org || c.job_title) && <div className="truncate text-sm text-muted">{c.job_title}{c.job_title && org ? " · " : ""}{org && <Link href={`/contacts/org/${org.id}`} className="text-accent hover:underline">{org.name}</Link>}</div>}
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge tone="blue">{t(`contactKind.${c.kind}`)}</Badge>
                  {c.kind === "agent" && (c.license_type === "broker" || c.license_type === "broker_associate") && <Badge tone="blue">{t(`licenseType.${c.license_type}`)}</Badge>}
                  {(c.tags as string[]).map((x) => <Badge key={x}>{x}</Badge>)}
                </div>
              </div>
            </div>

            <Section title={t("contact.details")} right={<PrefTag />}>
              <dl className="flex flex-col gap-2 text-sm">
                {c.phone && <Row k={t("contact.f.phone")} icon="phone"><a href={`tel:${c.phone}`} className="rounded bg-chip px-2 py-0.5 font-mono hover:text-accent">{c.phone}</a><CopyButton text={c.phone} label={t("contact.copy")} doneLabel={t("contact.copied")} /></Row>}
                {c.email && <Row k={t("contact.f.email")} icon="email"><a href={`mailto:${c.email}`} className="truncate rounded bg-chip px-2 py-0.5 font-mono hover:text-accent">{c.email}</a><CopyButton text={c.email} label={t("contact.copy")} doneLabel={t("contact.copied")} /></Row>}
                {c.wechat && <Row k={t("contact.f.wechat")} icon="wechat"><span className="rounded bg-chip px-2 py-0.5 font-mono">{c.wechat}</span><CopyButton text={c.wechat} label={t("contact.copy")} doneLabel={t("contact.copied")} /></Row>}
                {address && <Row k={t("contact.f.address")}><span>{address}</span></Row>}
                {c.kind === "agent" && <Row k={t("contact.f.licenseType")}><span>{t(`licenseType.${c.license_type ?? "sales_agent"}`)}</span></Row>}
                {c.license_no && <Row k={t("contact.f.licenseNo")}><span className="font-mono">{c.license_no}</span></Row>}
                {c.source && <Row k={t("contact.f.source")}><span>{c.source}</span></Row>}
                {referrer && <Row k={t("contact.f.referredBy")}><Link href={`/contacts/${referrer.id}`} className="text-accent hover:underline">{pl(referrer)}</Link></Row>}
                {c.birthday && <Row k={t("contact.f.birthday")}><span className="font-mono">{c.birthday}</span></Row>}
              </dl>
            </Section>

            <Section title={t("contact.links")} right={<span className="font-mono text-xs text-muted">{links.length}</span>}>
              {links.length === 0 ? <Empty>{t("contact.noLinks")}</Empty> : (
                <ul className="divide-y divide-line">
                  {links.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 py-2">
                      <Av p={l.person} size="sm" />
                      <Link href={`/contacts/${l.person.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-fg hover:text-accent">{pl(l.person)}</Link>
                      <Badge tone="blue">{t(`relation.${l.relation}`)}</Badge>
                      <form action={removeContactLink.bind(null, id, l.id)}><button className="text-xs text-muted hover:text-danger">{t("contact.removeLink")}</button></form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addContactLink.bind(null, id)} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
                <label className="flex flex-col gap-1 text-xs text-muted">{t("contact.linkWho")}
                  <select name="related_contact_id" required defaultValue="" className={inputCls}><option value="" disabled>—</option>{((people ?? []) as Person[]).filter((p) => !linkedIds.has(p.id)).map((p) => <option key={p.id} value={p.id}>{pl(p)}</option>)}</select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">{t("contact.linkRelation")}
                  <select name="relation" defaultValue="spouse" className={inputCls}>{CONTACT_RELATIONS.map((r) => <option key={r} value={r}>{t(`relation.${r}`)}</option>)}</select>
                </label>
                <Button variant="ghost" type="submit">{t("contact.addLink")}</Button>
              </form>
            </Section>

            <Section title={t("contact.tab.notes")}>
              <form action={saveContactNotes.bind(null, id)} className="flex flex-col gap-2">
                <textarea name="notes" rows={5} defaultValue={c.notes ?? ""} className={`${inputCls} h-auto py-2`} />
                <div><Button variant="ghost" type="submit">{t("contact.notesSave")}</Button></div>
              </form>
            </Section>
          </div>

          {/* 右栏 */}
          <div className="flex flex-col gap-4">
            <Section title={t("contact.relatedDeals")} right={<span className="font-mono text-xs text-muted">{t("contact.relatedDealsCount", { n: rankedDeals.length })}</span>}>
              {rankedDeals.length === 0 ? <Empty>{t("contact.noDeals")}</Empty> : (
                <ul className="flex flex-col gap-2">
                  {rankedDeals.map((d) => { const nm = nextMs.get(d.id); return (
                    <li key={d.id}>
                      <Link href={`/deals/${d.id}`} className="flex gap-3 rounded-ui border border-line bg-surface p-3 hover:border-accent">
                        <StageBar stage={d.stage} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-fg">{d.title}</span>
                            <span className="flex gap-1">{(rolesByDeal.get(d.id) ?? []).map((r) => <Badge key={r} tone="blue">{t(`partyRole.${r}`)}</Badge>)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <StageBadge stage={d.stage} label={t(`stage.${d.stage}`)} />
                            <span>{t(`type.${d.type}`)}</span>
                            {nm && <span>{t("contact.nextMilestone")} · {t.or(`ms.${nm.key}`, nm.label)} · <span className="font-mono">{nm.due_date}</span> · {relDays(nm.due_date, today, t)}</span>}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ); })}
                </ul>
              )}
            </Section>

            <Section title={t("contact.relatedContacts")} right={<span className="text-xs text-muted">{t("contact.relatedVia")}</span>}>
              {related.length === 0 ? <Empty>{t("contact.noRelated")}</Empty> : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {related.map((r) => {
                    const p = personById.get(r.contactId)!;
                    const top = rankDeals(r.dealIds.map((did) => ({ ...dealsById[did], updatedAt: dealsById[did].updated_at })), now)[0];
                    const roles = rolesOf.get(r.contactId)?.get(top.id) ?? [];
                    const close = linksFor(r.contactId);
                    return (
                      <li key={r.contactId}>
                        <Link href={`/contacts/${p.id}`} className="flex h-full gap-3 rounded-ui border border-line bg-surface p-3 hover:border-accent">
                          <StageBar stage={top.stage} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Av p={p} size="sm" />
                              <span className="truncate text-sm font-semibold text-fg">{pl(p)}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">{roles.map((x) => <Badge key={x} tone="blue">{t(`partyRole.${x}`)}</Badge>)}<Badge>{t(`contactKind.${p.kind}`)}</Badge></div>
                            <div className="mt-1 truncate text-xs text-muted">{top.title}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted"><StageBadge stage={top.stage} label={t(`stage.${top.stage}`)} />{r.count > 1 && <span>{t("contact.sharedDeals", { n: r.count })}</span>}</div>
                            {close.length > 0 && <div className="mt-1 truncate text-[11.5px] text-muted">{close.map((x) => `${t(`relation.${x.relation}`)}：${contactName(x.person)}`).join(" · ")}</div>}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
