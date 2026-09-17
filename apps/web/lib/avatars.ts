// 联系人头像 / 照片的签名 URL（bucket 私有，1 小时有效）。列表页一次批量签，避免 N 次往返。
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "contact-photos";
const TTL = 60 * 60;

export async function signPaths(supabase: SupabaseClient, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const uniq = [...new Set(paths.filter((p): p is string => !!p))];
  const out = new Map<string, string>();
  if (!uniq.length) return out;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(uniq, TTL);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export interface AvatarUrls { avatarUrl: string | null; photoUrl: string | null }

/** 给一批联系人（有 avatar_path / avatar_photo_id）算出头像和原图 URL */
export async function avatarUrlsFor(supabase: SupabaseClient, rows: { id: string; avatar_path: string | null; avatar_photo_id: string | null }[]): Promise<Map<string, AvatarUrls>> {
  const photoIds = [...new Set(rows.map((r) => r.avatar_photo_id).filter((x): x is string => !!x))];
  const { data: photos } = photoIds.length ? await supabase.from("contact_photos").select("id,storage_path").in("id", photoIds) : { data: [] };
  const photoPath = new Map(((photos ?? []) as { id: string; storage_path: string }[]).map((p) => [p.id, p.storage_path]));
  const signed = await signPaths(supabase, [...rows.map((r) => r.avatar_path), ...photoPath.values()]);
  const out = new Map<string, AvatarUrls>();
  for (const r of rows) {
    const orig = r.avatar_photo_id ? photoPath.get(r.avatar_photo_id) : undefined;
    out.set(r.id, { avatarUrl: r.avatar_path ? signed.get(r.avatar_path) ?? null : null, photoUrl: orig ? signed.get(orig) ?? null : null });
  }
  return out;
}
