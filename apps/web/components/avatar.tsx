"use client";
// 联系人头像：有图显示图、没图显示首字母；悬停看原图；可编辑时点击进裁剪器（拖动 / 缩放 / 圆形裁剪）。
// 照片库：多张上传、选一张作头像、删除。裁剪在浏览器 canvas 里做，服务端只收裁好的小图。
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setContactAvatar, uploadContactPhotos, deleteContactPhoto, removeContactAvatar } from "@/lib/actions/photos";

export type PhotoL = Record<string, string>;
export interface PhotoItem { id: string; url: string; name: string | null }

const SIZES = { xs: "h-6 w-6 text-[9px]", sm: "h-7 w-7 text-[10.5px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-base", xl: "h-20 w-20 text-xl" };

export function ContactAvatar({ initials, avatarUrl, photoUrl, size = "md", editable, contactId, photos = [], l, className = "" }: {
  initials: string; avatarUrl?: string | null; photoUrl?: string | null; size?: keyof typeof SIZES;
  editable?: boolean; contactId?: string; photos?: PhotoItem[]; l?: PhotoL; className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const circle = (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft font-mono font-semibold text-accent-strong ring-1 ring-line ${SIZES[size]} ${className}`}>
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
  return (
    <span className="relative inline-flex shrink-0" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {editable && contactId && l ? (
        <button type="button" onClick={() => setEditing(true)} title={l.editAvatar} className="group relative rounded-full focus-visible:outline-2 focus-visible:outline-accent">
          {circle}
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">✎</span>
        </button>
      ) : circle}
      {hover && photoUrl && !editing && (
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-ui border border-line bg-surface p-1.5 shadow-xl">
          <img src={photoUrl} alt="" className="block max-h-[min(40vh,260px)] max-w-[min(60vw,260px)] rounded-md object-contain" />
        </span>
      )}
      {editing && contactId && l && <AvatarEditor contactId={contactId} photos={photos} l={l} onClose={() => setEditing(false)} />}
    </span>
  );
}

/** 裁剪器：圆形取景框 280px；图片可拖动、滚轮 / 滑块缩放；输出 256px webp */
export function AvatarEditor({ contactId, photos, l, initialPhoto, onClose }: { contactId: string; photos: PhotoItem[]; l: PhotoL; initialPhoto?: PhotoItem; onClose: () => void }) {
  const router = useRouter();
  const BOX = 280;
  const [src, setSrc] = useState<string | null>(initialPhoto?.url ?? null);
  const [photoId, setPhotoId] = useState<string | null>(initialPhoto?.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 载入图片：签名 URL 跨域，要 crossOrigin 才能导出 canvas
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => { const s = Math.max(BOX / i.width, BOX / i.height); setMinScale(s); setScale(s); setOff({ x: 0, y: 0 }); setImg(i); };
    i.onerror = () => setErr("image load failed");
    i.src = src;
  }, [src]);

  // 画取景框
  useEffect(() => {
    const cv = canvasRef.current; if (!cv || !img) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, BOX, BOX);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, BOX / 2 - w / 2 + off.x, BOX / 2 - h / 2 + off.y, w, h);
    // 圆外压暗
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.rect(0, 0, BOX, BOX); ctx.arc(BOX / 2, BOX / 2, BOX / 2 - 1, 0, Math.PI * 2, true); ctx.fill("evenodd"); ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(BOX / 2, BOX / 2, BOX / 2 - 1, 0, Math.PI * 2); ctx.stroke();
  }, [img, scale, off]);

  const clamp = (o: { x: number; y: number }, s = scale) => {
    if (!img) return o;
    const mx = Math.max(0, (img.width * s - BOX) / 2), my = Math.max(0, (img.height * s - BOX) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  const zoomTo = (s: number) => { const ns = Math.min(minScale * 6, Math.max(minScale, s)); setScale(ns); setOff((o) => clamp(o, ns)); };

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f); setPhotoId(null); setErr(null);
    setSrc(URL.createObjectURL(f));
  }

  async function save() {
    if (!img) return;
    setBusy(true); setErr(null);
    try {
      const out = document.createElement("canvas"); out.width = 256; out.height = 256;
      const ctx = out.getContext("2d")!;
      ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.clip();
      const k = 256 / BOX, w = img.width * scale * k, h = img.height * scale * k;
      ctx.drawImage(img, 128 - w / 2 + off.x * k, 128 - h / 2 + off.y * k, w, h);
      const blob: Blob = await new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", 0.9));
      const fd = new FormData();
      fd.set("avatar", new File([blob], "avatar.webp", { type: "image/webp" }));
      if (photoId) fd.set("photo_id", photoId); else if (file) fd.set("original", file);
      fd.set("crop", JSON.stringify({ scale, x: off.x, y: off.y, box: BOX }));
      await setContactAvatar(contactId, fd);
      router.refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="flex w-[min(92vw,560px)] flex-col gap-3 rounded-ui border border-line bg-surface p-4 shadow-2xl">
        <div className="flex items-center justify-between"><b className="text-sm font-semibold text-fg">{l.editAvatar}</b><button type="button" onClick={onClose} className="text-muted hover:text-fg">✕</button></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasRef} width={BOX} height={BOX} className={`touch-none rounded-md bg-chip ${img ? "cursor-grab active:cursor-grabbing" : ""}`}
              onPointerDown={(e) => { if (!img) return; (e.target as Element).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; }}
              onPointerMove={(e) => { if (!drag.current) return; setOff(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y })); }}
              onPointerUp={() => { drag.current = null; }}
              onWheel={(e) => { if (!img) return; e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.08 : 0.92)); }} />
            {img && <label className="flex w-full items-center gap-2 text-xs text-muted">{l.zoom}<input type="range" min={minScale} max={minScale * 6} step={0.001} value={scale} onChange={(e) => zoomTo(Number(e.target.value))} className="flex-1 accent-accent" /></label>}
            <span className="text-[11px] text-muted">{l.dragHint}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-chip">
              {l.chooseFile}<input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
            {photos.length > 0 && (
              <>
                <span className="text-[11px] text-muted">{l.orPick}</span>
                <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
                  {photos.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setPhotoId(p.id); setFile(null); setSrc(p.url); }}
                      className={`aspect-square overflow-hidden rounded-md border-2 ${photoId === p.id ? "border-accent" : "border-transparent hover:border-line-strong"}`}>
                      <img src={p.url} alt={p.name ?? ""} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {err && <p className="text-xs text-danger">{err}</p>}
            <div className="mt-auto flex gap-2">
              <button type="button" onClick={save} disabled={!img || busy} className="h-10 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50">{busy ? l.saving : l.use}</button>
              <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-md border border-line-strong px-3 text-sm font-medium text-fg hover:bg-chip">{l.cancel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 编辑页的照片库 */
export function PhotoGallery({ contactId, photos, avatarPhotoId, hasAvatar, l }: { contactId: string; photos: PhotoItem[]; avatarPhotoId: string | null; hasAvatar: boolean; l: PhotoL }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PhotoItem | null | "new">(null);
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try { const fd = new FormData(); for (const f of Array.from(files)) fd.append("photos", f); await uploadContactPhotos(contactId, fd); router.refresh(); }
    finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <label className={`flex h-10 cursor-pointer items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-strong ${busy ? "opacity-50" : ""}`}>
          {busy ? l.saving : l.upload}<input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
        <button type="button" onClick={() => setEditing("new")} className="h-10 rounded-md border border-line-strong px-3 text-sm font-medium text-fg hover:bg-chip">{l.editAvatar}</button>
        {hasAvatar && <button type="button" onClick={async () => { await removeContactAvatar(contactId); router.refresh(); }} className="h-10 rounded-md border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger-bg">{l.removeAvatar}</button>}
      </div>
      {photos.length === 0 ? <p className="py-4 text-center text-sm text-muted">{l.none}</p> : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((p) => (
            <div key={p.id} className={`group relative aspect-square overflow-hidden rounded-md border-2 ${p.id === avatarPhotoId ? "border-accent" : "border-line"}`}>
              <img src={p.url} alt={p.name ?? ""} className="h-full w-full object-cover" />
              {p.id === avatarPhotoId && <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-ink">{l.isAvatar}</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => setEditing(p)} className="rounded bg-surface/90 px-1.5 py-0.5 text-[10.5px] font-medium text-fg">{l.setAvatar}</button>
                <button type="button" onClick={async () => { await deleteContactPhoto(contactId, p.id); router.refresh(); }} className="rounded bg-surface/90 px-1.5 py-0.5 text-[10.5px] font-medium text-danger">{l.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <AvatarEditor contactId={contactId} photos={photos} l={l} initialPhoto={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
