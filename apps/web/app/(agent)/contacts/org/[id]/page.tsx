// /contacts/org/[id] —— 一家公司：资料、这家公司的人、参与的交易；编辑与删除
import Link from "next/link";
import { notFound } from "next/navigation";
import { contactName, initials, CONTACT_TABS } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { updateOrganization, deleteOrganization } from "@/lib/actions/contacts";
import { Section, Empty, Badge, Button } from "@/components/ui";
import { PageHeader } from "@/components/page";
import { InitialsAvatar } from "@/components/contact-forms";
import { ContactAvatar } from "@/components/avatar";
import { avatarUrlsFor } from "@/lib/avatars";
import { ChannelIcon } from "@/components/channel-icon";
import { OrganizationFormClient } from "@/components/contact-form-client";
import { contactFormLabels, contactFormOptions } from "@/lib/contact-form-props";

export const dynamic = "force-dynamic";

export default async function OrganizationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const t = await getT();

  const { data: o, error: oErr } = await supabase.from("organizations").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (oErr) throw new Error(`organization query failed: ${oErr.message}`);
  if (!o) notFound();
  const [{ data: people }, { data: parties }] = await Promise.all([
    supabase.from("contacts").select("id,first_name,last_name,name_zh,job_title,email,phone,kind,avatar_path,avatar_photo_id").eq("organization_id", id).is("deleted_at", null).order("first_name"),
    supabase.from("deal_parties").select("id,role,side,deals(id,title,stage)").eq("organization_id", id).is("deleted_at", null),
  ]);
  type Person = { id: string; first_name: string; last_name: string; name_zh: string | null; job_title: string | null; email: string | null; phone: string | null; kind: string; avatar_path: string | null; avatar_photo_id: string | null };
  type Party = { id: string; role: string; side: string; deals: { id: string; title: string; stage: string } | { id: string; title: string; stage: string }[] | null };
  const staff = (people ?? []) as Person[];
  const avatars = await avatarUrlsFor(supabase, staff);
  const dealRows = ((parties ?? []) as unknown as Party[]).map((p) => ({ ...p, deal: Array.isArray(p.deals) ? p.deals[0] : p.deals })).filter((p) => p.deal);
  const base = `/contacts/org/${id}`;
  const tabOf = CONTACT_TABS.find((x) => (x.orgKinds as string[]).includes(o.kind))?.id;

  const rows: [React.ReactNode, React.ReactNode][] = [
    [t("contact.f.kind"), <Badge key="k">{t(`orgKind.${o.kind}`)}</Badge>],
    [<span key="ke" className="inline-flex items-center gap-1"><ChannelIcon kind="email" className="h-3.5 w-3.5" />{t("contact.f.email")}</span>, o.email ? <a key="e" href={`mailto:${o.email}`} className="font-mono text-accent hover:underline">{o.email}</a> : null],
    [<span key="kp" className="inline-flex items-center gap-1"><ChannelIcon kind="phone" className="h-3.5 w-3.5" />{t("contact.f.phone")}</span>, o.phone ? <a key="p" href={`tel:${o.phone}`} className="font-mono text-accent hover:underline">{o.phone}</a> : null],
    [t("contact.f.website"), o.website ? <a key="w" href={o.website.startsWith("http") ? o.website : `https://${o.website}`} target="_blank" rel="noreferrer" className="font-mono text-accent hover:underline">{o.website}</a> : null],
    [t("contact.f.licenseNo"), o.license_no ? <span key="l" className="font-mono">{o.license_no}</span> : null],
    [t("contact.f.address"), [o.address_line1, o.address_line2, [o.city, o.state, o.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null],
    [t("contact.f.primaryContact"), (() => { const p = staff.find((x) => x.id === o.primary_contact_id); return p ? <Link key="pc" href={`/contacts/${p.id}`} className="text-accent hover:underline">{contactName(p)}</Link> : null; })()],
    [t("contact.f.notes"), o.notes ? <span key="n" className="whitespace-pre-wrap">{o.notes}</span> : null],
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.contacts"), href: "/contacts" }, ...(tabOf ? [{ label: t(`contactTab.${tabOf}`), href: `/contacts?tab=${tabOf}` }] : []), { label: o.name }]}
        title={<span className="flex items-center gap-3"><InitialsAvatar text={initials(o.name)} /><span>{o.name}<span className="ml-2 text-base font-normal text-muted">{t("contacts.company")}</span></span></span>}
        actions={
          <>
            <Link href={edit ? base : `${base}?edit=1`} className="flex h-10 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-chip">{edit ? t("contact.cancel") : t("contact.edit")}</Link>
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger-bg">{t("contact.delete")}</summary>
              <form action={deleteOrganization.bind(null, id)} className="absolute right-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-ui border border-line bg-surface p-3 text-sm shadow-xl">
                <p className="text-muted">{t("contact.deleteConfirm")}</p>
                <Button variant="danger" type="submit">{t("contact.delete")}</Button>
              </form>
            </details>
          </>
        }
      />

      {edit ? (
        <Section title={t("contact.edit")}>
          <OrganizationFormClient l={contactFormLabels(t)} orgKindOptions={contactFormOptions(t).orgKindOptions} contacts={staff.map((p) => ({ value: p.id, label: contactName(p) }))} values={o} action={updateOrganization.bind(null, id)} submitLabel={t("contact.save")} />
        </Section>
      ) : (
        <>
          <Section title={t("contact.tab.profile")}>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {rows.filter(([, val]) => val !== null && val !== undefined && val !== "").map(([k, val], i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-fg">{val}</dd></div>
              ))}
            </dl>
          </Section>
          <Section title={t("contact.peopleInOrg")} right={<span className="font-mono text-sm text-muted">{staff.length}</span>}>
            {staff.length === 0 ? <Empty>{t("contact.noPeople")}</Empty> : (
              <ul className="divide-y divide-line">
                {staff.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/contacts/${p.id}`} className="flex items-center gap-2.5">
                      <ContactAvatar initials={initials(p.first_name, p.last_name)} avatarUrl={avatars.get(p.id)?.avatarUrl} photoUrl={avatars.get(p.id)?.photoUrl} size="sm" />
                      <span className="text-sm font-medium text-fg">{contactName(p)}</span>
                      {p.job_title && <span className="text-xs text-muted">{p.job_title}</span>}
                    </Link>
                    <div className="flex gap-3 font-mono text-xs text-muted">{p.email && <span>{p.email}</span>}{p.phone && <span>{p.phone}</span>}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title={t("contact.tab.deals")} right={<span className="font-mono text-sm text-muted">{dealRows.length}</span>}>
            {dealRows.length === 0 ? <Empty>{t("contact.noDeals")}</Empty> : (
              <ul className="divide-y divide-line">
                {dealRows.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/deals/${p.deal!.id}`} className="text-sm font-medium text-accent hover:underline">{p.deal!.title}</Link>
                    <div className="flex gap-1"><Badge tone="blue">{t(`partyRole.${p.role}`)}</Badge><Badge>{t(`stage.${p.deal!.stage}`)}</Badge></div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
