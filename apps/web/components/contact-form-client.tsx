"use client";
// 联系人 / 公司表单（客户端）：类型→公司列表联动、下拉底部固定"+ 添加公司"、邮箱域名灰字补全（Tab）、
// 姓名首字母大写、美国号码 3-3-4、职位候选层、常用标签可点选、未保存提示。文案由服务端算好传进来。
import { useMemo, useRef, useState } from "react";
import { ORG_KINDS_FOR, formatUsPhone, capitalizeName, type ContactKind } from "@newbee/core";
import { EmailInput } from "@/components/email-input";

export type Opt = { value: string; label: string };
export type OrgOpt = { id: string; name: string; kind: string };
export type L = Record<string, string>;

const inputCls = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm";
const F = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1 text-xs text-muted ${className}`}>{label}{children}</label>
);
const Btn = ({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) => (
  <button {...rest} className={`h-10 rounded-md px-3 text-sm font-medium disabled:opacity-50 ${variant === "primary" ? "bg-accent text-accent-ink hover:bg-accent-strong" : variant === "danger" ? "border border-danger/40 text-danger hover:bg-danger-bg" : "border border-line-strong text-fg hover:bg-chip"} ${rest.className ?? ""}`}>{children}</button>
);

/** 电话：10 位美国号码自动 3-3-4 */
export function PhoneInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return <input name={name} type="tel" value={value} onChange={(e) => onChange(formatUsPhone(e.target.value))} autoComplete="off" className={`${inputCls} font-mono`} />;
}

/** 可选可输：候选层用网站主题色；↑↓ 选，Enter 确认，Esc 关 */
export function SuggestInput({ name, defaultValue = "", options, onChange }: { name: string; defaultValue?: string; options: string[]; onChange?: () => void }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const q = value.trim().toLowerCase();
  const list = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 12);
  const pick = (x: string) => { setValue(x); setOpen(false); onChange?.(); };
  return (
    <div className="relative">
      <input name={name} value={value} autoComplete="off" onChange={(e) => { setValue(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => (i + 1) % list.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => (i - 1 + list.length) % list.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(list[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className={inputCls} />
      {open && list.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-xl">
          {list.map((x, i) => (
            <li key={x} role="option" aria-selected={i === hi} onMouseDown={(e) => { e.preventDefault(); pick(x); }} onMouseEnter={() => setHi(i)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${i === hi ? "bg-accent-soft text-accent-strong" : "text-fg"} ${x === value ? "font-semibold" : ""}`}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 所属公司：只列当前类型对应的公司，列表滚动，底部固定"+ 添加公司"，可当场新建 */
function OrgPicker({ l, kind, orgs, value, onChange, orgKindOptions, onCreate }: {
  l: L; kind: ContactKind; orgs: OrgOpt[]; value: string; onChange: (id: string) => void; orgKindOptions: Opt[];
  onCreate: (input: { kind: string; name: string }) => Promise<OrgOpt>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const allowed = ORG_KINDS_FOR[kind] ?? [];
  const [newKind, setNewKind] = useState<string>(allowed[0] ?? "other");
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => orgs.filter((o) => (allowed as string[]).includes(o.kind)), [orgs, allowed]);
  const current = orgs.find((o) => o.id === value);

  async function create() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    try {
      const o = await onCreate({ kind: newKind, name: newName.trim() });
      onChange(o.id); setNewName(""); setCreating(false); setOpen(false);
    } finally { setBusy(false); }
  }
  const startCreate = () => { setNewKind(allowed[0] ?? "other"); setCreating(true); };

  return (
    <div className="relative">
      <input type="hidden" name="organization_id" value={value} />
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className={`${inputCls} flex items-center justify-between text-left ${current ? "" : "text-muted"}`}>
        <span className="truncate">{current?.name ?? l.noOrganization}</span><span className="text-[10px] text-muted">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 flex flex-col rounded-md border border-line bg-surface shadow-xl">
          {!creating ? (
            <>
              <div role="listbox" className="max-h-48 overflow-y-auto py-1">
                <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-chip ${!value ? "text-accent" : "text-muted"}`}>{l.noOrganization}</button>
                {list.length === 0 && <div className="px-3 py-2 text-xs text-muted">{l.noOrgForKind}</div>}
                {list.map((o) => (
                  <button key={o.id} type="button" role="option" aria-selected={o.id === value} onClick={() => { onChange(o.id); setOpen(false); }}
                    className={`block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-chip ${o.id === value ? "font-semibold text-accent" : "text-fg"}`}>{o.name}</button>
                ))}
              </div>
              <button type="button" onClick={startCreate} className="border-t border-line px-3 py-2 text-left text-sm font-medium text-accent hover:bg-chip">{l.addOrgInline}</button>
            </>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              <F label={l.newOrgName}><input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }} className={inputCls} /></F>
              <F label={l.kind}><select value={newKind} onChange={(e) => setNewKind(e.target.value)} className={inputCls}>{orgKindOptions.filter((o) => (allowed as string[]).includes(o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
              <div className="flex gap-2"><Btn type="button" onClick={create} disabled={busy || !newName.trim()}>{l.orgCreate}</Btn><Btn type="button" variant="ghost" onClick={() => setCreating(false)}>{l.unsavedCancel}</Btn></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface ContactFormProps {
  l: L; kindOptions: Opt[]; orgKindOptions: Opt[]; channelOptions: Opt[]; languageOptions: Opt[]; licenseTypeOptions: Opt[];
  orgs: OrgOpt[]; contacts?: Opt[]; jobTitles: Record<string, string[]>; tags: Record<string, string[]>; sources: string[];
  values?: Record<string, string | string[] | null | undefined>; defaultKind?: string;
  action: (formData: FormData) => void | Promise<void>; submitLabel: string; compact?: boolean;
  createOrg: (input: { kind: string; name: string }) => Promise<OrgOpt>;
  onDirty?: () => void; formRef?: React.RefObject<HTMLFormElement | null>; formId?: string;
}

export function ContactFormClient(p: ContactFormProps) {
  const v = (k: string) => { const x = p.values?.[k]; return Array.isArray(x) ? x.join(", ") : x ?? ""; };
  const [kind, setKind] = useState<ContactKind>((v("kind") || p.defaultKind || "client") as ContactKind);
  const [orgs, setOrgs] = useState<OrgOpt[]>(p.orgs);
  const [orgId, setOrgId] = useState(v("organization_id"));
  const [first, setFirst] = useState(v("first_name"));
  const [last, setLast] = useState(v("last_name"));
  const [email, setEmail] = useState(v("email"));
  const [phone, setPhone] = useState(v("phone"));
  const [tags, setTags] = useState(v("tags"));
  const tagInput = useRef<HTMLInputElement>(null);
  const dirty = () => p.onDirty?.();
  const tagList = tags.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
  const toggleTag = (x: string) => { setTags((tagList.includes(x) ? tagList.filter((y) => y !== x) : [...tagList, x]).join(", ")); dirty(); tagInput.current?.focus(); };

  return (
    <form ref={p.formRef} id={p.formId} action={p.action} onChange={dirty} className="grid gap-3 sm:grid-cols-2">
      <F label={p.l.kind}><select name="kind" value={kind} onChange={(e) => { setKind(e.target.value as ContactKind); setOrgId(""); }} className={inputCls}>{p.kindOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
      <F label={p.l.organization}><OrgPicker l={p.l} kind={kind} orgs={orgs} value={orgId} onChange={(id) => { setOrgId(id); dirty(); }} orgKindOptions={p.orgKindOptions}
        onCreate={async (input) => { const o = await p.createOrg(input); setOrgs((xs) => [...xs, o].sort((a, b) => a.name.localeCompare(b.name))); return o; }} /></F>
      <F label={p.l.firstName}><input name="first_name" required value={first} onChange={(e) => setFirst(capitalizeName(e.target.value))} autoComplete="off" className={inputCls} /></F>
      <F label={p.l.lastName}><input name="last_name" value={last} onChange={(e) => setLast(capitalizeName(e.target.value))} autoComplete="off" className={inputCls} /></F>
      <F label={p.l.nameZh}><input name="name_zh" defaultValue={v("name_zh")} className={inputCls} /></F>
      {kind === "agent" ? (
        <div className="grid grid-cols-2 gap-3">
          <F label={p.l.jobTitle}><SuggestInput key={kind} name="job_title" defaultValue={v("job_title")} options={p.jobTitles[kind] ?? []} onChange={dirty} /></F>
          <F label={p.l.licenseType}><select name="license_type" defaultValue={v("license_type") || "sales_agent"} className={inputCls}>{p.licenseTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
        </div>
      ) : (
        <F label={p.l.jobTitle}><SuggestInput key={kind} name="job_title" defaultValue={v("job_title")} options={p.jobTitles[kind] ?? []} onChange={dirty} /></F>
      )}
      <F label={p.l.email}><EmailInput name="email" value={email} onChange={setEmail} hint={p.l.emailTabHint} inputClassName={`${inputCls} font-mono`} textClassName="font-mono text-sm" /></F>
      <F label={p.l.phone}><PhoneInput name="phone" value={phone} onChange={setPhone} /></F>
      <F label={p.l.wechat}><input name="wechat" defaultValue={v("wechat")} className={`${inputCls} font-mono`} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label={p.l.preferredChannel}><select name="preferred_channel" defaultValue={v("preferred_channel") || "wechat"} className={inputCls}>{p.channelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
        <F label={p.l.preferredLanguage}><select name="preferred_language" defaultValue={v("preferred_language") || "zh"} className={inputCls}>{p.languageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
      </div>
      {p.compact && <F label={p.l.source} className="sm:col-span-2"><SuggestInput name="source" defaultValue={v("source")} options={p.sources} onChange={dirty} /></F>}
      <div className="flex flex-col gap-1 sm:col-span-2">
        <F label={p.l.tags}><input ref={tagInput} name="tags" value={tags} onChange={(e) => setTags(e.target.value)} autoComplete="off" className={inputCls} /></F>
        <div className="flex max-h-[26px] flex-wrap items-center gap-x-1.5 gap-y-4 overflow-hidden">
          <span className="shrink-0 text-[11px] text-muted">{p.l.commonTags}</span>
          {(p.tags[kind] ?? []).map((x) => { const on = tagList.includes(x); return (
            <button key={x} type="button" onClick={() => toggleTag(x)} aria-pressed={on}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11.5px] ${on ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface text-fg hover:border-accent hover:text-accent"}`}>{x}</button>
          ); })}
        </div>
      </div>
      {!p.compact && (
        <>
          <F label={p.l.licenseNo}><input name="license_no" defaultValue={v("license_no")} className={`${inputCls} font-mono`} /></F>
          <F label={p.l.source}><SuggestInput name="source" defaultValue={v("source")} options={p.sources} onChange={dirty} /></F>
          <F label={p.l.referredBy}><select name="referred_by_contact_id" defaultValue={v("referred_by_contact_id")} className={inputCls}><option value="">—</option>{(p.contacts ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></F>
          <F label={p.l.birthday}><input name="birthday" type="date" defaultValue={v("birthday")} className={inputCls} /></F>
          <F label={p.l.address} className="sm:col-span-2"><input name="address_line1" defaultValue={v("address_line1")} className={inputCls} /></F>
          <F label={p.l.address2} className="sm:col-span-2"><input name="address_line2" defaultValue={v("address_line2")} className={inputCls} /></F>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <F label={p.l.city}><input name="city" defaultValue={v("city")} className={inputCls} /></F>
            <F label={p.l.state}><input name="state" defaultValue={v("state") || "TX"} className={inputCls} /></F>
            <F label={p.l.zip}><input name="zip" defaultValue={v("zip")} className={`${inputCls} font-mono`} /></F>
          </div>
          <F label={p.l.notes} className="sm:col-span-2"><textarea name="notes" rows={4} defaultValue={v("notes")} className={`${inputCls} h-auto py-2`} /></F>
        </>
      )}
      <div className="sm:col-span-2"><Btn type="submit">{p.submitLabel}</Btn></div>
    </form>
  );
}

export interface OrganizationFormProps {
  l: L; orgKindOptions: Opt[]; contacts?: Opt[]; values?: Record<string, string | null | undefined>; defaultKind?: string;
  action: (formData: FormData) => void | Promise<void>; submitLabel: string; compact?: boolean;
  onDirty?: () => void; formRef?: React.RefObject<HTMLFormElement | null>; formId?: string;
}

export function OrganizationFormClient(p: OrganizationFormProps) {
  const v = (k: string) => p.values?.[k] ?? "";
  const [email, setEmail] = useState(v("email"));
  const [phone, setPhone] = useState(v("phone"));
  return (
    <form ref={p.formRef} id={p.formId} action={p.action} onChange={() => p.onDirty?.()} className="grid gap-3 sm:grid-cols-2">
      <F label={p.l.kind}><select name="kind" defaultValue={v("kind") || p.defaultKind || "brokerage"} className={inputCls}>{p.orgKindOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></F>
      <F label={p.l.name}><input name="name" required defaultValue={v("name")} className={inputCls} /></F>
      <F label={p.l.email}><EmailInput name="email" value={email} onChange={setEmail} hint={p.l.emailTabHint} inputClassName={`${inputCls} font-mono`} textClassName="font-mono text-sm" /></F>
      <F label={p.l.phone}><PhoneInput name="phone" value={phone} onChange={setPhone} /></F>
      {!p.compact && (
        <>
          <F label={p.l.website}><input name="website" defaultValue={v("website")} className={`${inputCls} font-mono`} /></F>
          <F label={p.l.licenseNo}><input name="license_no" defaultValue={v("license_no")} className={`${inputCls} font-mono`} /></F>
          <F label={p.l.primaryContact} className="sm:col-span-2"><select name="primary_contact_id" defaultValue={v("primary_contact_id")} className={inputCls}><option value="">—</option>{(p.contacts ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></F>
          <F label={p.l.address} className="sm:col-span-2"><input name="address_line1" defaultValue={v("address_line1")} className={inputCls} /></F>
          <F label={p.l.address2} className="sm:col-span-2"><input name="address_line2" defaultValue={v("address_line2")} className={inputCls} /></F>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <F label={p.l.city}><input name="city" defaultValue={v("city")} className={inputCls} /></F>
            <F label={p.l.state}><input name="state" defaultValue={v("state") || "TX"} className={inputCls} /></F>
            <F label={p.l.zip}><input name="zip" defaultValue={v("zip")} className={`${inputCls} font-mono`} /></F>
          </div>
          <F label={p.l.notes} className="sm:col-span-2"><textarea name="notes" rows={4} defaultValue={v("notes")} className={`${inputCls} h-auto py-2`} /></F>
        </>
      )}
      <div className="sm:col-span-2"><Btn type="submit">{p.submitLabel}</Btn></div>
    </form>
  );
}

/** 列表页右上角的两个按钮 + 弹出面板：同时只开一个；切换时如有未保存内容先问 */
export function ContactCreator({ l, contact, org }: { l: L; contact: Omit<ContactFormProps, "onDirty" | "formRef" | "formId">; org: Omit<OrganizationFormProps, "onDirty" | "formRef" | "formId"> }) {
  type Panel = "contact" | "org";
  const [open, setOpen] = useState<Panel | null>(null);
  const [dirty, setDirty] = useState<Record<Panel, boolean>>({ contact: false, org: false });
  const [ask, setAsk] = useState<Panel | null | undefined>(undefined); // 想切到哪个；undefined = 没在问
  const refs = { contact: useRef<HTMLFormElement>(null), org: useRef<HTMLFormElement>(null) };

  function go(target: Panel | null) {
    if (open && open !== target && dirty[open]) { setAsk(target); return; }
    setOpen(target === open ? null : target);
  }
  // 询问框里的目标可能是 null（= 关闭），所以 ask 用 undefined 表示"没在问"

  function discard() { if (open) setDirty((d) => ({ ...d, [open]: false })); setOpen(ask ?? null); setAsk(undefined); }
  // 保存：提交表单；成功后服务端会跳转到新建的记录，面板随之消失（失败会报错、面板留着）
  function save() { if (open) refs[open].current?.requestSubmit(); setAsk(undefined); }

  const btn = (panel: Panel, label: string, primary: boolean) => (
    <button type="button" onClick={() => go(panel)} aria-expanded={open === panel}
      className={`flex h-10 items-center rounded-md px-3 text-sm font-medium ${primary ? "bg-accent text-accent-ink hover:bg-accent-strong" : "border border-line-strong bg-surface text-fg hover:bg-chip"} ${open === panel ? "ring-2 ring-accent/40" : ""}`}>{label}</button>
  );

  return (
    <div className="relative flex gap-2">
      {btn("org", l.addOrgButton, false)}
      {btn("contact", l.addContactButton, true)}
      {open && <div className="fixed inset-0 z-10" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); go(null); }} aria-hidden />}
      {open && (
        <div className={`absolute right-0 top-12 z-20 rounded-ui border border-line bg-surface p-4 shadow-xl ${open === "contact" ? "w-[min(92vw,640px)]" : "w-[min(92vw,520px)]"}`}>
          {open === "contact"
            ? <ContactFormClient key="contact" {...contact} formRef={refs.contact} formId="new-contact" onDirty={() => setDirty((d) => ({ ...d, contact: true }))} />
            : <OrganizationFormClient key="org" {...org} formRef={refs.org} formId="new-org" onDirty={() => setDirty((d) => ({ ...d, org: true }))} />}
        </div>
      )}
      {ask !== undefined && (
        <div className="absolute right-0 top-12 z-30 flex w-80 flex-col gap-3 rounded-ui border-2 border-accent bg-surface p-4 text-sm shadow-xl">
          <p>{l.unsaved}</p>
          <div className="flex gap-2">
            <Btn type="button" onClick={save}>{l.unsavedSave}</Btn>
            <Btn type="button" variant="danger" onClick={discard}>{l.unsavedDiscard}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setAsk(undefined)}>{l.unsavedCancel}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
