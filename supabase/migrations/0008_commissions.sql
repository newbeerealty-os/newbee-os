-- 0008_commissions · 佣金：交易佣金（挂交易，按 side 一条）+ 推荐费（挂人，无交易）
-- Broker 分成方案存 agents.settings.commissionPlan；单笔算好的明细存 computed（报表直接读）。
create type commission_kind as enum ('deal','referral');
create type commission_side as enum ('listing','buyer','landlord','tenant','management','referral');
create type commission_status as enum ('projected','pending','closed','paid','cancelled');
create type amount_basis as enum ('pct','flat');

create table commissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  kind commission_kind not null default 'deal',
  side commission_side not null,
  deal_id uuid references deals(id) on delete cascade,             -- 交易佣金
  contact_id uuid references contacts(id) on delete set null,      -- 推荐费：被推荐的客户；交易佣金可空
  partner_contact_id uuid references contacts(id) on delete set null,      -- 推荐给谁 / 从谁收（人）
  partner_org_id uuid references organizations(id) on delete set null,     -- 推荐给谁 / 从谁收（公司）
  price numeric(14,2),                     -- 售价 / 租金（推荐费 = 对方成交价）
  basis amount_basis not null default 'pct',
  pct numeric(7,3),                        -- 3 = 3%
  flat numeric(14,2),
  referral_out_basis amount_basis,         -- 付出去的推荐费
  referral_out_pct numeric(7,3),
  referral_out_flat numeric(14,2),
  referral_out_to_contact_id uuid references contacts(id) on delete set null,
  fees jsonb not null default '[]'::jsonb, -- 自定义扣费 [{name, basis: flat|pct_of_gci|pct_of_price, value}]
  status commission_status not null default 'projected',
  expected_at date,
  closed_at date,
  paid_at date,
  computed jsonb,                          -- core computeCommission 的快照
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((kind = 'deal' and deal_id is not null) or (kind = 'referral' and deal_id is null))
);
create index commissions_agent_status on commissions (agent_id, status, closed_at desc) where deleted_at is null;
create index commissions_deal on commissions (deal_id) where deleted_at is null;
create index commissions_contact on commissions (contact_id) where deleted_at is null;
create trigger commissions_updated before update on commissions for each row execute function set_updated_at();

alter table commissions enable row level security;
create policy "commissions own" on commissions for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
