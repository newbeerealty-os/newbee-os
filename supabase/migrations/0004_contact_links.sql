-- 0004_contact_links · 联系人之间的紧密关系（夫妻 / 父母 / 子女 / 助理…）
-- 一对关系存一行；显示时另一方看到的是反向关系（parent ↔ child），由 core 的 inverseRelation 决定。
create type contact_relation as enum ('spouse','partner','parent','child','sibling','relative','friend','assistant','colleague','other');

create table contact_links (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  related_contact_id uuid not null references contacts(id) on delete cascade,
  relation contact_relation not null default 'other',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (contact_id <> related_contact_id)
);
create unique index contact_links_unique on contact_links (least(contact_id, related_contact_id), greatest(contact_id, related_contact_id)) where deleted_at is null;
create index contact_links_contact on contact_links (contact_id) where deleted_at is null;
create index contact_links_related on contact_links (related_contact_id) where deleted_at is null;
create trigger contact_links_updated before update on contact_links for each row execute function set_updated_at();

alter table contact_links enable row level security;
create policy "contact_links own" on contact_links for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
