// 联系人总表的数据：人 + 公司合成一种行，按页签 / 搜索过滤；交易数从 deal_parties 数出来。
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_TABS, contactName, initials, type Translator } from "@newbee/core";

export interface ContactRow {
  id: string;
  isOrg: boolean;
  href: string;
  name: string;
  /** 姓名下的小字：中文名 / 职位 / 标签，或公司类型 */
  sub: string;
  initials: string;
  kind: string;
  kindLabel: string;
  orgName: string | null;
  email: string | null;
  phone: string | null;
  deals: number;
  search: string;
}

export type ContactRecord = {
  id: string; kind: string; first_name: string; last_name: string; name_zh: string | null; organization_id: string | null; job_title: string | null;
  email: string | null; phone: string | null; wechat: string | null; tags: string[]; organizations: { name: string } | { name: string }[] | null;
};
export type OrgRecord = { id: string; kind: string; name: string; email: string | null; phone: string | null };

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

export async function loadContactRows(supabase: SupabaseClient, t: Translator): Promise<ContactRow[]> {
  const [{ data: cs }, { data: os }, { data: ps }] = await Promise.all([
    supabase.from("contacts").select("id,kind,first_name,last_name,name_zh,organization_id,job_title,email,phone,wechat,tags,organizations!contacts_organization_id_fkey(name)").is("deleted_at", null).order("first_name"),
    supabase.from("organizations").select("id,kind,name,email,phone").is("deleted_at", null).order("name"),
    supabase.from("deal_parties").select("contact_id,organization_id,deal_id").is("deleted_at", null),
  ]);
  const dealsOf = new Map<string, Set<string>>();
  for (const p of (ps ?? []) as { contact_id: string | null; organization_id: string | null; deal_id: string }[]) {
    const k = p.contact_id ?? p.organization_id!;
    dealsOf.set(k, (dealsOf.get(k) ?? new Set()).add(p.deal_id));
  }
  const people = ((cs ?? []) as unknown as ContactRecord[]).map((c): ContactRow => {
    const name = contactName(c);
    const orgName = one(c.organizations)?.name ?? null;
    const sub = [c.name_zh, c.job_title, ...c.tags].filter(Boolean).join(" · ");
    return {
      id: c.id, isOrg: false, href: `/contacts/${c.id}`, name, sub, initials: initials(c.first_name, c.last_name),
      kind: c.kind, kindLabel: t(`contactKind.${c.kind}`), orgName, email: c.email, phone: c.phone, deals: dealsOf.get(c.id)?.size ?? 0,
      search: [name, c.name_zh, c.email, c.phone, c.wechat, orgName, c.job_title, ...c.tags].filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const orgs = ((os ?? []) as OrgRecord[]).map((o): ContactRow => ({
    id: o.id, isOrg: true, href: `/contacts/org/${o.id}`, name: o.name, sub: `${t("contacts.company")} · ${t(`orgKind.${o.kind}`)}`, initials: initials(o.name),
    kind: o.kind, kindLabel: t(`orgKind.${o.kind}`), orgName: null, email: o.email, phone: o.phone, deals: dealsOf.get(o.id)?.size ?? 0,
    search: [o.name, o.email, o.phone].filter(Boolean).join(" ").toLowerCase(),
  }));
  return [...people, ...orgs].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterRows(rows: ContactRow[], tab: string | null, q: string): ContactRow[] {
  const def = CONTACT_TABS.find((x) => x.id === tab);
  const needle = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (def && !(r.isOrg ? (def.orgKinds as string[]).includes(r.kind) : (def.kinds as string[]).includes(r.kind))) return false;
    return !needle || r.search.includes(needle);
  });
}
