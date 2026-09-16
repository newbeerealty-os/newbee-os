// /contacts/[id] —— 一个人：资料 / 交易 / 备注；编辑与删除
import Link from "next/link";
import { notFound } from "next/navigation";
import { contactName, initials, CONTACT_TABS } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { updateContact, deleteContact } from "@/lib/actions/contacts";
import { Section, Empty, Badge, Button } from "@/components/ui";
import { PageHeader, Tabs } from "@/components/page";
import { ContactForm, InitialsAvatar } from "@/components/contact-forms";

export const dynamic = "force-dynamic";
const TABS = ["profile", "deals", "notes"] as const;

export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; edit?: string }> }) {
  const [{ id }, { tab: rawTab, edit }] = await Promise.all([params, searchParams]);
  const tab = (TABS as readonly string[]).includes(rawTab ?? "") ? rawTab! : "profile";
  const supabase = await createClient();
  const t = await getT();

  const { data: c } = await supabase.from("contacts").select("*, organizations!contacts_organization_id_fkey(id,name), referrer:contacts!contacts_referred_by_contact_id_fkey(id,first_name,last_name,name_zh)").eq("id", id).is("deleted_at", null).single();
  if (!c) notFound();
  const org = (Array.isArray(c.organizations) ? c.organizations[0] : c.organizations) as { id: string; name: string } | null;
  const referrer = (Array.isArray(c.referrer) ? c.referrer[0] : c.referrer) as { id: string; first_name: string; last_name: string; name_zh: string | null } | null;

  const [{ data: parties }, { data: orgs }, { data: people }] = await Promise.all([
    supabase.from("deal_parties").select("id,role,side,is_primary,deals(id,title,stage,type)").eq("contact_id", id).is("deleted_at", null),
    supabase.from("organizations").select("id,name").is("deleted_at", null).order("name"),
    supabase.from("contacts").select("id,first_name,last_name,name_zh").is("deleted_at", null).neq("id", id).order("first_name"),
  ]);
  type Party = { id: string; role: string; side: string; is_primary: boolean; deals: { id: string; title: string; stage: string; type: string } | { id: string; title: string; stage: string; type: string }[] | null };
  const dealRows = ((parties ?? []) as unknown as Party[]).map((p) => ({ ...p, deal: Array.isArray(p.deals) ? p.deals[0] : p.deals })).filter((p) => p.deal);

  const name = contactName(c);
  const base = `/contacts/${id}`;
  const tabOf = CONTACT_TABS.find((x) => (x.kinds as string[]).includes(c.kind))?.id;
  const rows: [string, React.ReactNode][] = [
    [t("contact.f.kind"), <Badge key="k" tone="blue">{t(`contactKind.${c.kind}`)}</Badge>],
    [t("contact.f.nameZh"), c.name_zh],
    [t("contact.f.organization"), org ? <Link key="o" href={`/contacts/org/${org.id}`} className="text-accent hover:underline">{org.name}</Link> : null],
    [t("contact.f.jobTitle"), c.job_title],
    [t("contact.f.email"), c.email ? <a key="e" href={`mailto:${c.email}`} className="font-mono text-accent hover:underline">{c.email}</a> : null],
    [t("contact.f.phone"), c.phone ? <a key="p" href={`tel:${c.phone}`} className="font-mono text-accent hover:underline">{c.phone}</a> : null],
    [t("contact.f.wechat"), c.wechat ? <span key="w" className="font-mono">{c.wechat}</span> : null],
    [t("contact.f.preferredChannel"), c.preferred_channel ? t(`channel.${c.preferred_channel}`) : null],
    [t("contact.f.preferredLanguage"), t(`language.${c.preferred_language}`)],
    [t("contact.f.licenseNo"), c.license_no ? <span key="l" className="font-mono">{c.license_no}</span> : null],
    [t("contact.f.address"), [c.address_line1, c.address_line2, [c.city, c.state, c.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null],
    [t("contact.f.tags"), c.tags?.length ? <span key="t" className="flex flex-wrap gap-1">{(c.tags as string[]).map((x) => <Badge key={x}>{x}</Badge>)}</span> : null],
    [t("contact.f.source"), c.source],
    [t("contact.f.referredBy"), referrer ? <Link key="r" href={`/contacts/${referrer.id}`} className="text-accent hover:underline">{contactName(referrer)}</Link> : null],
    [t("contact.f.birthday"), c.birthday],
    [t("contact.f.lastContacted"), c.last_contacted_at ? String(c.last_contacted_at).slice(0, 10) : null],
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.contacts"), href: "/contacts" }, ...(tabOf ? [{ label: t(`contactTab.${tabOf}`), href: `/contacts?tab=${tabOf}` }] : []), { label: name }]}
        title={<span className="flex items-center gap-3"><InitialsAvatar text={initials(c.first_name, c.last_name)} /><span>{name}{c.name_zh && <span className="ml-2 text-base font-normal text-muted">{c.name_zh}</span>}</span></span>}
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
        <Section title={t("contact.edit")}>
          <ContactForm t={t} action={updateContact.bind(null, id)} orgs={(orgs ?? []) as { id: string; name: string }[]}
            contacts={((people ?? []) as { id: string; first_name: string; last_name: string; name_zh: string | null }[]).map((p) => ({ id: p.id, name: contactName(p) }))}
            values={{ ...c, tags: c.tags as string[] }} submitLabel={t("contact.save")} />
        </Section>
      ) : (
        <>
          <Tabs base={base} active={tab} tabs={[{ id: "profile", label: t("contact.tab.profile") }, { id: "deals", label: t("contact.tab.deals"), count: dealRows.length }, { id: "notes", label: t("contact.tab.notes") }]} />
          {tab === "profile" && (
            <Section title={t("contact.tab.profile")}>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {rows.filter(([, val]) => val !== null && val !== undefined && val !== "").map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-fg">{val}</dd></div>
                ))}
              </dl>
            </Section>
          )}
          {tab === "deals" && (
            <Section title={t("contact.tab.deals")} right={<span className="font-mono text-xs text-muted">{dealRows.length}</span>}>
              {dealRows.length === 0 ? <Empty>{t("contact.noDeals")}</Empty> : (
                <ul className="divide-y divide-line">
                  {dealRows.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/deals/${p.deal!.id}`} className="text-sm font-medium text-accent hover:underline">{p.deal!.title}</Link>
                      <div className="flex gap-1"><Badge tone="blue">{t(`partyRole.${p.role}`)}</Badge><Badge>{t(`partySide.${p.side}`)}</Badge><Badge>{t(`stage.${p.deal!.stage}`)}</Badge>{p.is_primary && <Badge tone="green">{t("parties.primary")}</Badge>}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
          {tab === "notes" && (
            <Section title={t("contact.tab.notes")}>
              {c.notes ? <p className="whitespace-pre-wrap text-sm">{c.notes}</p> : <Empty>{t("contact.noNotes")}</Empty>}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
