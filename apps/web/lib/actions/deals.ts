"use server";
// Server Actions：UI 只调这里；业务规则全部来自 @newbee/core
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeMilestones, instantiate, reconcile, BUILTIN_PLAYBOOKS, type FieldMap, type DealType } from "@newbee/core";
import { createClient } from "@/lib/supabase/server";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createDeal(formData: FormData) {
  const { supabase, userId } = await me();
  const type = String(formData.get("type") ?? "seller") as DealType;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("title required");
  const { data, error } = await supabase.from("deals").insert({ agent_id: userId, type, title, stage: "lead" }).select("id").single();
  if (error) throw error;
  redirect(`/deals/${data.id}`);
}

/** 上传合同：存 Storage → 插 documents（status=uploaded）。抽取由 /api/extract 触发（Day 3） */
export async function uploadDocument(dealId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("no file");
  const docId = crypto.randomUUID();
  const path = `${userId}/${dealId}/${docId}.pdf`;
  const { error: upErr } = await supabase.storage.from("deal-docs").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;
  const { error } = await supabase.from("documents").insert({ id: docId, deal_id: dealId, agent_id: userId, storage_path: path, file_name: file.name, status: "uploaded" });
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
}

/** 手动写一个字段（Week 1 没有抽取时也能跑通日期引擎） */
export async function setField(dealId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const key = String(formData.get("key"));
  const raw = String(formData.get("value") ?? "").trim();
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const num = Number(raw.replace(/[^0-9.-]/g, ""));
  const row = {
    deal_id: dealId,
    agent_id: userId,
    key,
    value_text: isDate || Number.isFinite(num) && raw !== "" && /^[\d.,$-]+$/.test(raw) ? null : raw,
    value_num: !isDate && raw !== "" && /^[\d.,$-]+$/.test(raw) && Number.isFinite(num) ? num : null,
    value_date: isDate ? raw : null,
    confidence: 1,
    confirmed_at: new Date().toISOString(),
    confirmed_by: userId,
  };
  await supabase.from("deal_fields").update({ superseded_at: new Date().toISOString() }).eq("deal_id", dealId).eq("key", key).is("superseded_at", null);
  const { error } = await supabase.from("deal_fields").insert(row);
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
}

/** 确认并派生：当前字段 → 里程碑 → 任务（reconcile 保留已完成） */
export async function deriveDeal(dealId: string) {
  const { supabase, userId } = await me();
  const { data: deal, error: dErr } = await supabase.from("deals").select("id,type,addenda").eq("id", dealId).single();
  if (dErr || !deal) throw dErr ?? new Error("deal not found");
  const { data: rows } = await supabase.from("deal_fields_current").select("key,value_text,value_num,value_date").eq("deal_id", dealId).not("confirmed_at", "is", null);
  const fields: FieldMap = {};
  for (const r of rows ?? []) fields[r.key] = r.value_date ?? r.value_num ?? r.value_text ?? null;

  const playbook = BUILTIN_PLAYBOOKS[deal.type] ?? BUILTIN_PLAYBOOKS.seller; // Day 10 起从 playbooks 表读
  const addenda: string[] = deal.addenda ?? [];
  const milestones = computeMilestones(fields, playbook.milestones, { addenda });

  // milestones：upsert by (deal_id, key)
  const msRows = milestones.map((m) => ({ deal_id: dealId, agent_id: userId, key: m.key, label: m.label, due_date: m.date, due_time: m.time ?? null, derived_from: m.derivedFrom, client_visible: m.clientVisible }));
  const { error: mErr } = await supabase.from("milestones").upsert(msRows, { onConflict: "deal_id,key" });
  if (mErr) throw mErr;

  // tasks：reconcile
  const drafts = instantiate(playbook, milestones, addenda);
  const { data: existing } = await supabase.from("tasks").select("id,playbook_rule_id,title,due_date,done_at").eq("deal_id", dealId).is("deleted_at", null);
  const r = reconcile((existing ?? []).map((t) => ({ id: t.id, playbookRuleId: t.playbook_rule_id, title: t.title, dueDate: t.due_date, doneAt: t.done_at })), drafts);
  if (r.create.length) {
    const { error } = await supabase.from("tasks").insert(r.create.map((d) => ({ deal_id: dealId, agent_id: userId, title: d.title, stage: d.stage, due_date: d.dueDate, anchor_milestone_key: d.anchorMilestoneKey, offset_days: d.offsetDays, playbook_rule_id: d.playbookRuleId, client_visible: d.clientVisible })));
    if (error) throw error;
  }
  for (const u of r.update) await supabase.from("tasks").update({ due_date: u.dueDate }).eq("id", u.id);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/today");
  console.info(`[derive] deal=${dealId} milestones=${milestones.length} created=${r.create.length} updated=${r.update.length}`);
}

/** 触发抽取（同步等待；13 页合同约 20–40 秒）。也可 POST /api/extract */
export async function extractDocument(dealId: string, docId: string) {
  const { supabase, userId } = await me();
  const { runExtraction } = await import("@/lib/extract");
  try {
    await runExtraction(supabase, docId, userId);
  } finally {
    revalidatePath(`/deals/${dealId}`);
  }
}

/** 确认一个待确认字段（可顺手改值） */
export async function confirmField(dealId: string, fieldId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const edited = String(formData.get("value") ?? "").trim();
  const { data: f } = await supabase.from("deal_fields").select("id,key,value_text,value_num,value_date").eq("id", fieldId).single();
  if (!f) throw new Error("field not found");
  const patch: Record<string, unknown> = { confirmed_at: new Date().toISOString(), confirmed_by: userId };
  if (edited) {
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(edited);
    const isNum = /^[\d.,$-]+$/.test(edited) && Number.isFinite(Number(edited.replace(/[^0-9.-]/g, "")));
    patch.value_date = isDate ? edited : null;
    patch.value_num = !isDate && isNum ? Number(edited.replace(/[^0-9.-]/g, "")) : null;
    patch.value_text = isDate || isNum ? null : edited;
    patch.confidence = 1;
  }
  // 同 key 其他"已确认"的旧行作废
  await supabase.from("deal_fields").update({ superseded_at: new Date().toISOString() }).eq("deal_id", dealId).eq("key", f.key).neq("id", fieldId).is("superseded_at", null);
  const { error } = await supabase.from("deal_fields").update(patch).eq("id", fieldId);
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
}

/** 拒绝一个待确认字段（作废，不派生） */
export async function rejectField(dealId: string, fieldId: string) {
  const { supabase } = await me();
  const { error } = await supabase.from("deal_fields").update({ superseded_at: new Date().toISOString() }).eq("id", fieldId);
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
}

export async function setStage(dealId: string, formData: FormData) {
  const { supabase } = await me();
  const stage = String(formData.get("stage") ?? "");
  if (!stage) return;
  const { error } = await supabase.from("deals").update({ stage }).eq("id", dealId);
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

export async function toggleTask(taskId: string, done: boolean, backTo = "/today") {
  const { supabase } = await me();
  const { error } = await supabase.from("tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", taskId);
  if (error) throw error;
  revalidatePath(backTo);
  revalidatePath("/today");
}

export async function addTask(formData: FormData) {
  const { supabase, userId } = await me();
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due_date") ?? "") || null;
  const dealId = String(formData.get("deal_id") ?? "") || null;
  if (!title) return;
  const { error } = await supabase.from("tasks").insert({ agent_id: userId, deal_id: dealId, title, due_date: due });
  if (error) throw error;
  revalidatePath("/tasks");
  revalidatePath("/today");
}
