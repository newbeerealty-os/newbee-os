// /contacts —— 联系人总表：人 + 公司一张表，按类型页签 / 搜索过滤，表格或卡片
import Link from "next/link";
import { CONTACT_TABS } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { loadContactRows, filterRows, loadSuggestions } from "@/lib/contacts";
import { createContact, createOrganization, createOrganizationInline } from "@/lib/actions/contacts";
import { contactFormLabels, contactFormOptions, defaultKindsForTab } from "@/lib/contact-form-props";
import { Section, Empty, Badge, inputCls, Button } from "@/components/ui";
import { PageHeader, Tabs } from "@/components/page";
import { InitialsAvatar } from "@/components/contact-forms";
import { ContactCreator } from "@/components/contact-form-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; view?: string }> }) {
  const { tab: rawTab, q = "", view = "table" } = await searchParams;
  const tab = CONTACT_TABS.some((x) => x.id === rawTab) ? rawTab! : null;
  const supabase = await createClient();
  const t = await getT();
  const [all, suggestions] = await Promise.all([loadContactRows(supabase, t), loadSuggestions(supabase)]);
  const rows = filterRows(all, tab, q);
  const orgs = all.filter((r) => r.isOrg).map((r) => ({ id: r.id, name: r.name, kind: r.kind }));
  const l = contactFormLabels(t);
  const opts = contactFormOptions(t);
  const defaults = defaultKindsForTab(tab);

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { tab, q: q || null, view: view === "cards" ? "cards" : null, ...patch };
    for (const [k, val] of Object.entries(merged)) if (val) p.set(k, val);
    const s = p.toString();
    return s ? `/contacts?${s}` : "/contacts";
  };
  const tabLabel = tab ? t(`contactTab.${tab}`) : t("contacts.all");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        crumbs={[{ label: t("nav.contacts"), href: "/contacts" }, { label: tabLabel }]}
        title={`${t("contacts.title")} · ${tabLabel}`}
        subnav={[{ href: qs({ tab: null }), label: t("contacts.all"), count: all.length, active: !tab }, ...CONTACT_TABS.map((x) => ({ href: qs({ tab: x.id }), label: t(`contactTab.${x.id}`), count: filterRows(all, x.id, "").length, active: tab === x.id }))]}
        actions={
          <>
            <div className="flex overflow-hidden rounded-md border border-line-strong text-sm">
              <Link href={qs({ view: null })} className={`px-3 py-2 ${view !== "cards" ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-chip"}`}>{t("contacts.viewTable")}</Link>
              <Link href={qs({ view: "cards" })} className={`px-3 py-2 ${view === "cards" ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:bg-chip"}`}>{t("contacts.viewCards")}</Link>
            </div>
            <form method="get" className="flex gap-1">
              {tab && <input type="hidden" name="tab" value={tab} />}
              {view === "cards" && <input type="hidden" name="view" value="cards" />}
              <input name="q" defaultValue={q} placeholder={t("contacts.search")} className={`${inputCls} w-64`} />
              <Button variant="ghost" type="submit">OK</Button>
            </form>
            <ContactCreator l={l}
              contact={{ l, ...opts, orgs, jobTitles: suggestions.jobTitles, tags: suggestions.tags, defaultKind: defaults.contact, action: createContact, submitLabel: t("contacts.add"), compact: true, createOrg: createOrganizationInline }}
              org={{ l, orgKindOptions: opts.orgKindOptions, defaultKind: defaults.org, action: createOrganization, submitLabel: t("contacts.addOrg"), compact: true }} />
          </>
        }
      />

      <div className="hidden md:block">
        <Tabs base={qs({ tab: null })} param="tab" active={tab ?? "all"} tabs={[{ id: "all", label: t("contacts.all"), count: all.length }, ...CONTACT_TABS.map((x) => ({ id: x.id, label: t(`contactTab.${x.id}`), count: filterRows(all, x.id, "").length }))]} />
      </div>

      {rows.length === 0 ? (
        <Section title={tabLabel}><Empty>{all.length === 0 ? t("contacts.none") : t("contacts.noMatch")}</Empty></Section>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.id} href={r.href} className="flex flex-col gap-2 rounded-ui border border-line bg-surface p-4 hover:border-accent">
              <div className="flex items-center gap-3">
                <InitialsAvatar text={r.initials} size="lg" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-fg">{r.name}</div>
                  <div className="truncate text-xs text-muted">{r.sub || r.kindLabel}{r.orgName ? ` · ${r.orgName}` : ""}</div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 font-mono text-xs text-fg">
                {r.email && <span className="truncate">{r.email}</span>}
                {r.phone && <span>{r.phone}</span>}
              </div>
              <div className="mt-auto flex items-center justify-between text-xs">
                <Badge tone={r.isOrg ? "zinc" : "blue"}>{r.kindLabel}</Badge>
                <span className="text-muted">{t("contacts.deals", { n: r.deals })}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Section title={tabLabel} right={<span className="font-mono text-xs text-muted">{rows.length}</span>}>
          <div className="-mx-4 -my-4">
            <div className="hidden grid-cols-[1.8fr_1.1fr_1.5fr_1.1fr_.9fr_.5fr] gap-3 border-b border-line bg-chip/40 px-4 py-2 text-[11.5px] font-semibold text-muted md:grid">
              <span>{t("contacts.col.name")}</span><span>{t("contacts.col.org")}</span><span>{t("contacts.col.email")}</span><span>{t("contacts.col.phone")}</span><span>{t("contacts.col.kind")}</span><span className="text-right">{t("contacts.col.deals")}</span>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="grid gap-1 px-4 py-2.5 hover:bg-chip/40 md:grid-cols-[1.8fr_1.1fr_1.5fr_1.1fr_.9fr_.5fr] md:items-center md:gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <InitialsAvatar text={r.initials} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-fg">{r.name}</div>
                        {r.sub && <div className="truncate text-[11.5px] text-muted">{r.sub}</div>}
                      </div>
                    </div>
                    <div className="truncate text-sm text-fg">{r.orgName ?? <span className="text-muted">—</span>}</div>
                    <div className="truncate font-mono text-xs">{r.email ?? <span className="text-muted">—</span>}</div>
                    <div className="font-mono text-xs">{r.phone ?? <span className="text-muted">—</span>}</div>
                    <div><Badge tone={r.isOrg ? "zinc" : "blue"}>{r.kindLabel}</Badge></div>
                    <div className="hidden text-right font-mono text-sm md:block">{r.deals}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
}
