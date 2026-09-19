"use server";
// 联系人照片：上传（多张）、删除；头像：从某张照片（或新上传的图）裁出圆形小图存起来
import { setFlash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/avatars";

async function me() {
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);
  if (!userId) redirect("/login");
  return { supabase, userId };
}
const ext = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg");

async function storePhoto(supabase: Awaited<ReturnType<typeof me>>["supabase"], userId: string, contactId: string, file: File): Promise<{ id: string; storage_path: string }> {
  const id = crypto.randomUUID();
  const path = `${userId}/${contactId}/${id}.${ext(file)}`;
  const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (upErr) throw new Error(`photo upload failed: ${upErr.message}`);
  const { error } = await supabase.from("contact_photos").insert({ id, agent_id: userId, contact_id: contactId, storage_path: path, file_name: file.name });
  if (error) throw error;
  return { id, storage_path: path };
}

export async function uploadContactPhotos(contactId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) await storePhoto(supabase, userId, contactId, f);
  await setFlash("uploaded");
  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteContactPhoto(contactId: string, photoId: string) {
  const { supabase } = await me();
  const { data: p } = await supabase.from("contact_photos").select("storage_path").eq("id", photoId).single();
  if (p) await supabase.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
  const { error } = await supabase.from("contact_photos").update({ deleted_at: new Date().toISOString() }).eq("id", photoId);
  if (error) throw error;
  // 如果删的是头像的来源，头像一起清掉
  await supabase.from("contacts").update({ avatar_path: null, avatar_photo_id: null, avatar_crop: null }).eq("id", contactId).eq("avatar_photo_id", photoId);
  await setFlash("deleted");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
}

/**
 * 设头像。formData：avatar = 裁好的圆形小图（webp/png，客户端 canvas 生成）；
 * photo_id = 来源照片（已上传的），或 original = 新上传的原图文件；crop = JSON 裁剪参数。
 */
export async function setContactAvatar(contactId: string, formData: FormData) {
  const { supabase, userId } = await me();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) throw new Error("avatar file missing");
  let photoId = String(formData.get("photo_id") ?? "") || null;
  const original = formData.get("original");
  if (!photoId && original instanceof File && original.size > 0) photoId = (await storePhoto(supabase, userId, contactId, original)).id;

  const avatarPath = `${userId}/${contactId}/avatar-${Date.now()}.${ext(avatar)}`;
  const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(avatarPath, avatar, { contentType: avatar.type || "image/webp", upsert: false });
  if (upErr) throw new Error(`avatar upload failed: ${upErr.message}`);

  const { data: prev } = await supabase.from("contacts").select("avatar_path").eq("id", contactId).single();
  let crop: unknown = null;
  try { crop = JSON.parse(String(formData.get("crop") ?? "null")); } catch { crop = null; }
  const { error } = await supabase.from("contacts").update({ avatar_path: avatarPath, avatar_photo_id: photoId, avatar_crop: crop }).eq("id", contactId);
  if (error) throw error;
  if (prev?.avatar_path) await supabase.storage.from(PHOTO_BUCKET).remove([prev.avatar_path]);
  await setFlash("saved");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
}

export async function removeContactAvatar(contactId: string) {
  const { supabase } = await me();
  const { data: prev } = await supabase.from("contacts").select("avatar_path").eq("id", contactId).single();
  const { error } = await supabase.from("contacts").update({ avatar_path: null, avatar_photo_id: null, avatar_crop: null }).eq("id", contactId);
  if (error) throw error;
  if (prev?.avatar_path) await supabase.storage.from(PHOTO_BUCKET).remove([prev.avatar_path]);
  await setFlash("saved");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
}
