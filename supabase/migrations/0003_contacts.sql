-- 0003_contacts · 联系人：organizations（公司）· contacts（人）· deal_parties（谁在这笔交易里扮演什么角色）
-- 设计稿：类型 = 身份（contacts.kind），角色 = 在某笔交易里的位置（deal_parties.role），分开存。

create type contact_kind as enum ('client','agent','broker','title_lending','vendor','tc','attorney','other');
create type org_kind as enum ('brokerage','title_company','lender','law_firm','vendor','hoa','property_management','other');
create type party_role as enum (
  'buyer','seller','tenant','landlord',
  'listing_agent','buyer_agent','listing_broker','buyer_broker','tc',
  'buyer_attorney','seller_attorney','escrow_officer','title_company','lender','loan_officer',
  'inspector','appraiser','surveyor','photographer','stager','contractor',
  'hoa','property_manager','referral','other'
);
create type party_side as enum ('ours','theirs','neutral');
create type contact_channel as enum ('phone','sms','email','wechat','whatsapp');
create type contact_language as enum ('zh','en');

-- ---------- organizations ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind org_kind not null default 'other',
  name text not null,
  phone text,
  email text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  license_no text,                  -- 经纪公司的 TREC broker 执照号
  primary_contact_id uuid,          -- → contacts，建完 contacts 再加外键
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index organizations_agent_kind on organizations (agent_id, kind) where deleted_at is null;
create trigger organizations_updated before update on organizations for each row execute function set_updated_at();

-- ---------- contacts ----------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind contact_kind not null default 'client',
  first_name text not null,
  last_name text not null default '',
  name_zh text,                     -- 中文名 / 称呼
  organization_id uuid references organizations(id) on delete set null,
  job_title text,
  email text,
  phone text,
  wechat text,
  preferred_channel contact_channel,
  preferred_language contact_language not null default 'zh',
  license_no text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  tags text[] not null default '{}',
  source text,
  referred_by_contact_id uuid references contacts(id) on delete set null,
  birthday date,
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index contacts_agent_kind on contacts (agent_id, kind) where deleted_at is null;
create index contacts_org on contacts (organization_id) where deleted_at is null;
create trigger contacts_updated before update on contacts for each row execute function set_updated_at();

alter table organizations add constraint organizations_primary_contact_fkey foreign key (primary_contact_id) references contacts(id) on delete set null;
alter table deals add constraint deals_primary_contact_fkey foreign key (primary_contact_id) references contacts(id) on delete set null;

-- ---------- deal_parties ----------
create table deal_parties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role party_role not null,
  side party_side not null default 'neutral',
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((contact_id is null) <> (organization_id is null))   -- 人或公司二选一
);
create unique index deal_parties_unique on deal_parties (deal_id, coalesce(contact_id, organization_id), role) where deleted_at is null;
create index deal_parties_deal on deal_parties (deal_id) where deleted_at is null;
create index deal_parties_contact on deal_parties (contact_id) where deleted_at is null;
create index deal_parties_org on deal_parties (organization_id) where deleted_at is null;
create trigger deal_parties_updated before update on deal_parties for each row execute function set_updated_at();

-- ---------- RLS：自己的行 ----------
alter table organizations enable row level security;
create policy "organizations own" on organizations for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table contacts enable row level security;
create policy "contacts own" on contacts for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

alter table deal_parties enable row level security;
create policy "deal_parties own" on deal_parties for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
