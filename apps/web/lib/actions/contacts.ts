"use server";
// 联系人 / 公司 / 交易参与方的写操作。校验全部走 core 的 zod schema；失败直接抛（页面显示错误），不静默。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ContactInputSchema, OrganizationInputSchema, PartyInputSchema, roleSide, type DealType } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}
const obj = (fd: FormData) => Object.fromEntries(fd.entries());
const back = (fd: FormData, fallback: string) => String(fd.get("back") ?? "") || fallback;

// ---------- contacts ----------
export async function createContact(formData: FormData) {
  const { supabase, userId } = await me();
  const input = ContactInputSchema.parse(obj(formData));
  const { data, error } = await supabase.from("contacts").insert({ ...input, agent_id: userId }).select("id").single();
  if (error) throw error;
  revalidatePath("/contacts");
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const { supabase } = await me();
  const input = ContactInputSchema.parse(obj(formData));
  const { error } = await supabase.from("contacts").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function deleteContact(id: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("contacts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- organizations ----------
export async function createOrganization(formData: FormData) {
  const { supabase, userId } = await me();
  const input = OrganizationInputSchema.parse(obj(formData));
  const { data, error } = await supabase.from("organizations").insert({ ...input, agent_id: userId }).select("id").single();
  if (error) throw error;
  revalidatePath("/contacts");
  redirect(`/contacts/org/${data.id}`);
}

/** 联系人表单里"+ 添加公司"用：建完把 id 回给客户端，不跳转 */
export async function createOrganizationInline(input: { kind: string; name: string }): Promise<{ id: string; name: string; kind: string }> {
  const { supabase, userId } = await me();
  const parsed = OrganizationInputSchema.parse({ kind: input.kind, name: input.name });
  const { data, error } = await supabase.from("organizations").insert({ ...parsed, agent_id: userId }).select("id,name,kind").single();
  if (error) throw error;
  revalidatePath("/contacts");
  return data as { id: string; name: string; kind: string };
}

export async function updateOrganization(id: string, formData: FormData) {
  const { supabase } = await me();
  const input = OrganizationInputSchema.parse(obj(formData));
  const { error } = await supabase.from("organizations").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/contacts");
  revalidatePath(`/contacts/org/${id}`);
}

export async function deleteOrganization(id: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("organizations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- deal_parties ----------
/** who = "c:<uuid>" 或 "o:<uuid>"；side 留空 = 按角色和交易类型自动 */
export async function addParty(dealId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const who = String(formData.get("who") ?? "");
  const [kind, id] = who.split(":");
  const raw = obj(formData);
  const input = PartyInputSchema.parse({
    ...raw,
    contact_id: kind === "c" ? id : "",
    organization_id: kind === "o" ? id : "",
    side: raw.side || "neutral",
  });
  let side = input.side;
  if (!raw.side) {
    const { data: deal } = await supabase.from("deals").select("type").eq("id", dealId).single();
    if (deal) side = roleSide(input.role, deal.type as DealType);
  }
  const { error } = await supabase.from("deal_parties").insert({ ...input, side, agent_id: userId, deal_id: dealId });
  if (error) throw error;
  // 主客户：第一个标为 primary 的买方 / 卖方 / 租客 / 房东写进 deals.primary_contact_id
  if (input.is_primary && input.contact_id && ["buyer", "seller", "tenant", "landlord"].includes(input.role)) {
    await supabase.from("deals").update({ primary_contact_id: input.contact_id }).eq("id", dealId);
  }
  revalidatePath(back(formData, `/deals/${dealId}`));
}

export async function removeParty(dealId: string, partyId: string, backTo: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("deal_parties").update({ deleted_at: new Date().toISOString() }).eq("id", partyId);
  if (error) throw error;
  revalidatePath(backTo || `/deals/${dealId}`);
}
