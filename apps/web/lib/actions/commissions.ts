"use server";
// 佣金的写操作：保存（新建 / 编辑，同时算快照和状态）、删除、保存方案、重算本周期
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CommissionInputSchema, CommissionPlanSchema } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";
import { patchAgentSettings } from "@/lib/settings";
import { getPlan, loadCommissions, recompute, ytdBefore, effectiveDate, type CommissionRow } from "@/lib/commissions";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}
export async function saveCommission(id: string | null, formData: FormData) {
  const { supabase, userId } = await me();
  const input = CommissionInputSchema.parse(Object.fromEntries(formData.entries()));
  if (input.kind === "deal" && !input.deal_id) throw new Error("deal_id required for deal commission");
  if (input.kind === "referral") { input.deal_id = null; input.side = "referral"; }
  const back = String(formData.get("back") ?? "") || null;

  // 先落库再重算：重算要用到 deal 阶段等关联数据
  let recordId = id;
  if (recordId) {
    const { error } = await supabase.from("commissions").update({ ...input, fees: input.fees }).eq("id", recordId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("commissions").insert({ ...input, fees: input.fees, agent_id: userId }).select("id").single();
    if (error) throw new Error(error.message);
    recordId = data.id;
  }
  await recomputeOne(supabase, recordId!);
  revalidatePath("/commissions"); revalidatePath("/", "layout");
  redirect(back ?? `/commissions/${recordId}`);
}

async function recomputeOne(supabase: Awaited<ReturnType<typeof me>>["supabase"], id: string) {
  const [plan, rows] = await Promise.all([getPlan(), loadCommissions(supabase)]);
  const r = rows.find((x) => x.id === id);
  if (!r) return;
  const { computed, status } = recompute(r, plan, ytdBefore(plan, rows, r));
  const { error } = await supabase.from("commissions").update({ computed, status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** 交易阶段变了 / 方案变了 → 把相关记录重算一遍（按日期顺序，cap 进度才对） */
export async function recomputeAll(dealId?: string) {
  const { supabase } = await me();
  const [plan, rows] = await Promise.all([getPlan(), loadCommissions(supabase)]);
  // 按日期先后重算：前面的算完更新到 rows 里，后面的累计才对
  const targets = (dealId ? rows.filter((r) => r.deal_id === dealId) : rows).sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)) || a.created_at.localeCompare(b.created_at)).map((r) => r.id);
  for (const id of targets) {
    const r = rows.find((x) => x.id === id) as CommissionRow;
    const { computed, status } = recompute(r, plan, ytdBefore(plan, rows, r));
    r.computed = computed; r.status = status;
    await supabase.from("commissions").update({ computed, status }).eq("id", id);
  }
  revalidatePath("/commissions");
}

export async function deleteCommission(id: string, backTo?: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("commissions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/commissions");
  redirect(backTo || "/commissions");
}

export async function savePlan(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  const json = (k: string, fallback: unknown) => { try { return JSON.parse(String(raw[k] ?? "")); } catch { return fallback; } };
  const plan = CommissionPlanSchema.parse({ ...raw, modules: json("modules", undefined), recurringFees: json("recurringFees", []), splitTiers: json("splitTiers", []) });
  await patchAgentSettings({ commissionPlan: plan });
  await recomputeAll();
  revalidatePath("/settings/commission");
  revalidatePath("/commissions");
}
