// 联系人 / 公司的表单（新建和编辑共用）。纯服务端渲染，字段名和 core 的 zod schema 一致。
import { CONTACT_KINDS, ORG_KINDS, CONTACT_CHANNELS, CONTACT_LANGUAGES, type Translator } from "@newbee/core";
import { Button, inputCls } from "@/components/ui";

export type OrgOption = { id: string; name: string };
export type ContactOption = { id: string; name: string };

const F = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1 text-xs text-muted ${className}`}>{label}{children}</label>
);
const v = (x: string | null | undefined) => x ?? "";

export function ContactForm({ t, action, orgs, contacts = [], values, submitLabel, compact = false }: {
  t: Translator; action: (formData: FormData) => void | Promise<void>; orgs: OrgOption[]; contacts?: ContactOption[];
  values?: Partial<Record<string, string | string[] | null>>; submitLabel: string; compact?: boolean;
}) {
  const g = (k: string) => { const x = values?.[k]; return Array.isArray(x) ? x.join(", ") : v(x); };
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <F label={t("contact.f.kind")}><select name="kind" defaultValue={g("kind") || "client"} className={inputCls}>{CONTACT_KINDS.map((k) => <option key={k} value={k}>{t(`contactKind.${k}`)}</option>)}</select></F>
      <F label={t("contact.f.organization")}><select name="organization_id" defaultValue={g("organization_id")} className={inputCls}><option value="">{t("contact.f.noOrganization")}</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></F>
      <F label={t("contact.f.firstName")}><input name="first_name" required defaultValue={g("first_name")} className={inputCls} /></F>
      <F label={t("contact.f.lastName")}><input name="last_name" defaultValue={g("last_name")} className={inputCls} /></F>
      <F label={t("contact.f.nameZh")}><input name="name_zh" defaultValue={g("name_zh")} className={inputCls} /></F>
      <F label={t("contact.f.jobTitle")}><input name="job_title" defaultValue={g("job_title")} className={inputCls} /></F>
      <F label={t("contact.f.email")}><input name="email" type="email" defaultValue={g("email")} className={`${inputCls} font-mono`} /></F>
      <F label={t("contact.f.phone")}><input name="phone" type="tel" defaultValue={g("phone")} className={`${inputCls} font-mono`} /></F>
      <F label={t("contact.f.wechat")}><input name="wechat" defaultValue={g("wechat")} className={`${inputCls} font-mono`} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label={t("contact.f.preferredChannel")}><select name="preferred_channel" defaultValue={g("preferred_channel")} className={inputCls}><option value="">—</option>{CONTACT_CHANNELS.map((c) => <option key={c} value={c}>{t(`channel.${c}`)}</option>)}</select></F>
        <F label={t("contact.f.preferredLanguage")}><select name="preferred_language" defaultValue={g("preferred_language") || "zh"} className={inputCls}>{CONTACT_LANGUAGES.map((l) => <option key={l} value={l}>{t(`language.${l}`)}</option>)}</select></F>
      </div>
      <F label={t("contact.f.tags")} className="sm:col-span-2"><input name="tags" defaultValue={g("tags")} className={inputCls} /></F>
      {!compact && (
        <>
          <F label={t("contact.f.licenseNo")}><input name="license_no" defaultValue={g("license_no")} className={`${inputCls} font-mono`} /></F>
          <F label={t("contact.f.source")}><input name="source" defaultValue={g("source")} className={inputCls} /></F>
          <F label={t("contact.f.referredBy")}><select name="referred_by_contact_id" defaultValue={g("referred_by_contact_id")} className={inputCls}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label={t("contact.f.birthday")}><input name="birthday" type="date" defaultValue={g("birthday")} className={inputCls} /></F>
          <F label={t("contact.f.address")} className="sm:col-span-2"><input name="address_line1" defaultValue={g("address_line1")} className={inputCls} /></F>
          <F label={t("contact.f.address2")} className="sm:col-span-2"><input name="address_line2" defaultValue={g("address_line2")} className={inputCls} /></F>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <F label={t("contact.f.city")}><input name="city" defaultValue={g("city")} className={inputCls} /></F>
            <F label={t("contact.f.state")}><input name="state" defaultValue={g("state") || "TX"} className={inputCls} /></F>
            <F label={t("contact.f.zip")}><input name="zip" defaultValue={g("zip")} className={`${inputCls} font-mono`} /></F>
          </div>
          <F label={t("contact.f.notes")} className="sm:col-span-2"><textarea name="notes" rows={4} defaultValue={g("notes")} className={`${inputCls} h-auto py-2`} /></F>
        </>
      )}
      <div className="sm:col-span-2"><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}

export function OrganizationForm({ t, action, contacts = [], values, submitLabel, compact = false }: {
  t: Translator; action: (formData: FormData) => void | Promise<void>; contacts?: ContactOption[];
  values?: Partial<Record<string, string | null>>; submitLabel: string; compact?: boolean;
}) {
  const g = (k: string) => v(values?.[k]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <F label={t("contact.f.kind")}><select name="kind" defaultValue={g("kind") || "brokerage"} className={inputCls}>{ORG_KINDS.map((k) => <option key={k} value={k}>{t(`orgKind.${k}`)}</option>)}</select></F>
      <F label={t("contact.f.name")}><input name="name" required defaultValue={g("name")} className={inputCls} /></F>
      <F label={t("contact.f.email")}><input name="email" type="email" defaultValue={g("email")} className={`${inputCls} font-mono`} /></F>
      <F label={t("contact.f.phone")}><input name="phone" type="tel" defaultValue={g("phone")} className={`${inputCls} font-mono`} /></F>
      {!compact && (
        <>
          <F label={t("contact.f.website")}><input name="website" defaultValue={g("website")} className={`${inputCls} font-mono`} /></F>
          <F label={t("contact.f.licenseNo")}><input name="license_no" defaultValue={g("license_no")} className={`${inputCls} font-mono`} /></F>
          <F label={t("contact.f.primaryContact")} className="sm:col-span-2"><select name="primary_contact_id" defaultValue={g("primary_contact_id")} className={inputCls}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label={t("contact.f.address")} className="sm:col-span-2"><input name="address_line1" defaultValue={g("address_line1")} className={inputCls} /></F>
          <F label={t("contact.f.address2")} className="sm:col-span-2"><input name="address_line2" defaultValue={g("address_line2")} className={inputCls} /></F>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <F label={t("contact.f.city")}><input name="city" defaultValue={g("city")} className={inputCls} /></F>
            <F label={t("contact.f.state")}><input name="state" defaultValue={g("state") || "TX"} className={inputCls} /></F>
            <F label={t("contact.f.zip")}><input name="zip" defaultValue={g("zip")} className={`${inputCls} font-mono`} /></F>
          </div>
          <F label={t("contact.f.notes")} className="sm:col-span-2"><textarea name="notes" rows={4} defaultValue={g("notes")} className={`${inputCls} h-auto py-2`} /></F>
        </>
      )}
      <div className="sm:col-span-2"><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}

/** 头像圆：首字母 */
export function InitialsAvatar({ text, size = "md" }: { text: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-7 w-7 text-[10.5px]" : "h-9 w-9 text-xs";
  return <span className={`grid shrink-0 place-items-center rounded-full bg-accent-soft font-mono font-semibold text-accent-strong ${cls}`}>{text}</span>;
}
