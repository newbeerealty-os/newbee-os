// 给客户端表单准备文案和选项（服务端算，client 组件只收字符串）
import { CONTACT_KINDS, ORG_KINDS, CONTACT_CHANNELS, CONTACT_LANGUAGES, CONTACT_TABS, type Translator } from "@newbee/core";
import type { L, Opt } from "@/components/contact-form-client";

const KEYS = ["kind", "organization", "noOrganization", "firstName", "lastName", "nameZh", "jobTitle", "email", "phone", "wechat", "preferredChannel", "preferredLanguage", "licenseNo", "address", "address2", "city", "state", "zip", "tags", "source", "referredBy", "birthday", "notes", "name", "website", "primaryContact"] as const;

export function contactFormLabels(t: Translator): L {
  const l: L = {};
  for (const k of KEYS) l[k] = t(`contact.f.${k}`);
  for (const k of ["addOrgInline", "newOrgName", "orgCreate", "noOrgForKind", "commonTags", "emailTabHint", "unsaved", "unsavedSave", "unsavedDiscard", "unsavedCancel"]) l[k] = t(`contact.${k}`);
  l.addContactButton = t("contacts.add");
  l.addOrgButton = t("contacts.addOrg");
  return l;
}

export const contactFormOptions = (t: Translator) => ({
  kindOptions: CONTACT_KINDS.map((k): Opt => ({ value: k, label: t(`contactKind.${k}`) })),
  orgKindOptions: ORG_KINDS.map((k): Opt => ({ value: k, label: t(`orgKind.${k}`) })),
  channelOptions: CONTACT_CHANNELS.map((k): Opt => ({ value: k, label: t(`channel.${k}`) })),
  languageOptions: CONTACT_LANGUAGES.map((k): Opt => ({ value: k, label: t(`language.${k}`) })),
});

/** 当前页签 → 新建表单的默认类型 */
export function defaultKindsForTab(tab: string | null): { contact: string; org: string } {
  const def = CONTACT_TABS.find((x) => x.id === tab);
  if (!def) return { contact: "client", org: "brokerage" };
  return { contact: def.kinds[0] ?? (tab === "brokerage" ? "agent" : "other"), org: def.orgKinds[0] ?? (tab === "agent" || tab === "broker" || tab === "tc" ? "brokerage" : "other") };
}

export function photoLabels(t: Translator): L {
  const l: L = {};
  for (const k of ["photos", "upload", "none", "setAvatar", "isAvatar", "delete", "removeAvatar", "editAvatar", "chooseFile", "orPick", "dragHint", "zoom", "use", "saving", "cancel", "original"]) l[k] = t(`photo.${k}`);
  return l;
}
