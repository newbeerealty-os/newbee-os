// 服务端专用：下载 PDF → Claude 抽取 → 写 documents.extraction + deal_fields（待确认）
// 被 /api/extract（Route Handler）和 extractDocument（Server Action）共用。绝不从浏览器 import。
import { extractContract, needsReview, toFieldColumns, FIELD_BY_KEY } from "@newbee/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExtractSummary {
  documentId: string;
  dealId: string;
  docType: string;
  fields: number;
  needsReview: number;
  addenda: string[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

/**
 * 跑一次抽取。supabase 传"带用户会话"的客户端即可（RLS 保证只能读写自己的行）。
 * 失败必须落 documents.status='failed' + error，绝不吞异常。
 */
export async function runExtraction(supabase: SupabaseClient, documentId: string, userId: string): Promise<ExtractSummary> {
  const { data: doc, error: dErr } = await supabase.from("documents").select("id,deal_id,agent_id,storage_path,status,doc_type").eq("id", documentId).single();
  if (dErr || !doc) throw new Error(`document not found: ${dErr?.message ?? documentId}`);
  if (doc.agent_id !== userId) throw new Error("forbidden");

  await supabase.from("documents").update({ status: "extracting", error: null }).eq("id", documentId);

  try {
    // 1) 下载 PDF
    const { data: blob, error: sErr } = await supabase.storage.from("deal-docs").download(doc.storage_path);
    if (sErr || !blob) throw new Error(`storage download failed: ${sErr?.message}`);
    const pdf = new Uint8Array(await blob.arrayBuffer());

    // 2) 抽取（服务端调用 Claude，key 在 env）
    const out = await extractContract(pdf, { docTypeHint: doc.doc_type ?? undefined });
    const r = out.result;

    // 3) 写 deal_fields：同一 key 之前"未确认"的行先作废，避免待确认列表重复
    const known = r.fields.filter((f) => FIELD_BY_KEY[f.key]);
    const keys = known.map((f) => f.key);
    if (keys.length) {
      await supabase.from("deal_fields").update({ superseded_at: new Date().toISOString() })
        .eq("deal_id", doc.deal_id).in("key", keys).is("superseded_at", null).is("confirmed_at", null);
    }
    let reviewCount = 0;
    const rows = known.map((f) => {
      const review = needsReview(f);
      if (review) reviewCount++;
      return {
        deal_id: doc.deal_id,
        agent_id: userId,
        key: f.key,
        ...toFieldColumns(f),
        source_doc_id: documentId,
        source_page: f.page,
        source_quote: f.quote,
        confidence: f.confidence,
        confirmed_at: review ? null : new Date().toISOString(),
        confirmed_by: review ? null : userId,
      };
    });
    if (rows.length) {
      const { error } = await supabase.from("deal_fields").insert(rows);
      if (error) throw new Error(`deal_fields insert failed: ${error.message}`);
    }

    // 4) addenda 并入 deals.addenda（并集）
    if (r.addenda.length) {
      const { data: deal } = await supabase.from("deals").select("addenda").eq("id", doc.deal_id).single();
      const merged = Array.from(new Set([...(deal?.addenda ?? []), ...r.addenda]));
      await supabase.from("deals").update({ addenda: merged }).eq("id", doc.deal_id);
    }

    // 5) 文档状态：有待确认 → review；全部自动确认 → confirmed
    await supabase.from("documents").update({
      status: reviewCount > 0 ? "review" : "confirmed",
      doc_type: r.docType,
      page_count: r.pages,
      extraction: { ...r, promptVersion: out.promptVersion, model: out.model, usage: out.usage, extractedAt: new Date().toISOString() },
      confirmed_at: reviewCount > 0 ? null : new Date().toISOString(),
    }).eq("id", documentId);

    return { documentId, dealId: doc.deal_id, docType: r.docType, fields: rows.length, needsReview: reviewCount, addenda: r.addenda, usage: out.usage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("documents").update({ status: "failed", error: msg.slice(0, 2000) }).eq("id", documentId);
    throw e;
  }
}
