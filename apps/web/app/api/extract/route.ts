// POST /api/extract  { documentId }
// 需要已登录会话（cookie）。给以后的 Storage webhook / 手机端调用；页面上直接用 Server Action extractDocument。
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runExtraction } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 120; // Vercel 上抽取一份 13 页合同约 20–40 秒

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let documentId: string | undefined;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) documentId = (await req.json())?.documentId;
  else documentId = String((await req.formData()).get("documentId") ?? "");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  try {
    const summary = await runExtraction(supabase, documentId, user.id);
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
