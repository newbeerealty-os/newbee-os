-- 0001_init · Week 1 六张核心表 + RLS + Storage
-- 只增不改：以后的改动写 0002_xxx.sql

create extension if not exists pgcrypto;

create type deal_type as enum ('seller','buyer','lease_listing','lease_tenant','property_mgmt');
create type deal_stage as enum ('lead','pre','active','offer','under_contract','closing','closed','terminated');
create type doc_status as enum ('uploaded','extracting','review','confirmed','failed');
create type ms_status as enum ('pending','done','overdue','na');

-- 通用 updated_at 触发器
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- agents ----------
create table agents (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  brokerage text,
  timezone text not null default 'America/Chicago',
  settings jsonb not null default '{}'::jsonb,   -- brokerFees、通知偏好、push 订阅等
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger agents_updated before update on agents for each row execute function set_updated_at();

-- 新用户登录后自动建 agents 行
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.agents (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- deals ----------
create table deals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  type deal_type not null,
  stage deal_stage not null default 'lead',
  title text not null,
  property_id uuid,                 -- Week 3 加 properties 表后补外键
  primary_contact_id uuid,          -- Week 3 加 contacts 表后补外键
  playbook_id uuid,                 -- Week 2 加 playbooks 表后补外键
  playbook_version int,
  addenda text[] not null default '{}',
  pinned boolean not null default false,
  closed_at date,
  terminated_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index deals_agent_stage on deals (agent_id, stage) where deleted_at is null;
create trigger deals_updated before update on deals for each row execute function set_updated_at();

-- ---------- documents ----------
create table documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  storage_path text not null,       -- {agent_id}/{deal_id}/{document_id}.pdf
  file_name text,
  doc_type text,
  page_count int,
  status doc_status not null default 'uploaded',
  extraction jsonb,                 -- 抽取原始结果（含 promptVersion、model、usage）
  error text,
  uploaded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index documents_deal on documents (deal_id) where deleted_at is null;
create trigger documents_updated before update on documents for each row execute function set_updated_at();

-- ---------- deal_fields（Key-Value 版本表）----------
create table deal_fields (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  key text not null,
  value_text text,
  value_num numeric(14,2),
  value_date date,
  source_doc_id uuid references documents(id) on delete set null,
  source_page int,
  source_quote text,
  confidence numeric(4,3),
  confirmed_at timestamptz,
  confirmed_by uuid,
  version int not null default 1,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deal_fields_current on deal_fields (deal_id, key) where superseded_at is null;
create trigger deal_fields_updated before update on deal_fields for each row execute function set_updated_at();

-- 当前值视图：每个 deal 每个 key 只取未被覆盖的那一行
create view deal_fields_current with (security_invoker = true) as
  select * from deal_fields where superseded_at is null;

-- ---------- milestones ----------
create table milestones (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  key text not null,
  label text not null,
  due_date date,
  due_time time,
  derived_from jsonb,
  status ms_status not null default 'pending',
  manual_override boolean not null default false,
  client_visible boolean not null default true,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, key)
);
create index milestones_agent_due on milestones (agent_id, due_date) where status = 'pending';
create trigger milestones_updated before update on milestones for each row execute function set_updated_at();

-- ---------- tasks ----------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,   -- null = 个人任务
  title text not null,
  stage text,
  due_date date,
  anchor_milestone_key text,
  offset_days int,
  playbook_rule_id text,
  assignee uuid,
  priority int not null default 0,
  done_at timestamptz,
  client_visible boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index tasks_agent_due on tasks (agent_id, due_date) where done_at is null and deleted_at is null;
create index tasks_deal_rule on tasks (deal_id, playbook_rule_id);
create trigger tasks_updated before update on tasks for each row execute function set_updated_at();

-- ---------- RLS：第 1 个月一条规则走天下（自己的行） ----------
alter table agents enable row level security;
create policy "agents self" on agents for all using (id = auth.uid()) with check (id = auth.uid());

alter table deals enable row level security;
create policy "deals own" on deals for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table documents enable row level security;
create policy "documents own" on documents for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table deal_fields enable row level security;
create policy "deal_fields own" on deal_fields for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table milestones enable row level security;
create policy "milestones own" on milestones for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table tasks enable row level security;
create policy "tasks own" on tasks for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ---------- Storage：私有 bucket，路径第一段必须是自己的 agent_id ----------
insert into storage.buckets (id, name, public) values ('deal-docs', 'deal-docs', false)
on conflict (id) do nothing;

create policy "deal-docs own read" on storage.objects for select
  using (bucket_id = 'deal-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "deal-docs own write" on storage.objects for insert
  with check (bucket_id = 'deal-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "deal-docs own delete" on storage.objects for delete
  using (bucket_id = 'deal-docs' and (storage.foldername(name))[1] = auth.uid()::text);
-- 文件路径约定：{agent_id}/{deal_id}/{document_id}.pdf
