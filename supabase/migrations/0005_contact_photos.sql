-- 0005_contact_photos · 联系人照片（多张）+ 头像（从某张照片裁出来的圆形小图）
create table contact_photos (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  storage_path text not null,       -- {agent_id}/{contact_id}/{photo_id}.{ext}
  file_name text,
  width int,
  height int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index contact_photos_contact on contact_photos (contact_id) where deleted_at is null;
create trigger contact_photos_updated before update on contact_photos for each row execute function set_updated_at();
alter table contact_photos enable row level security;
create policy "contact_photos own" on contact_photos for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- 头像：裁好的小图路径 + 来自哪张照片 + 裁剪参数（以后可以重新调）
alter table contacts
  add column avatar_path text,
  add column avatar_photo_id uuid references contact_photos(id) on delete set null,
  add column avatar_crop jsonb;

-- Storage：私有 bucket，路径第一段必须是自己的 agent_id（和 deal-docs 同规矩）
insert into storage.buckets (id, name, public) values ('contact-photos', 'contact-photos', false)
  on conflict (id) do nothing;
create policy "contact-photos own read" on storage.objects for select
  using (bucket_id = 'contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "contact-photos own write" on storage.objects for insert
  with check (bucket_id = 'contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "contact-photos own update" on storage.objects for update
  using (bucket_id = 'contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "contact-photos own delete" on storage.objects for delete
  using (bucket_id = 'contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);
