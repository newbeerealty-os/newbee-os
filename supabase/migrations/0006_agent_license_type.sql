-- 0006_agent_license_type · Broker 不再是联系人分类，改成经纪人的执照类型；所属经纪公司复用 contacts.organization_id
create type license_type as enum ('sales_agent','broker','broker_associate');
alter table contacts add column license_type license_type not null default 'sales_agent';

-- 旧数据：分类 Broker → 经纪人 + 执照类型 broker
update contacts set license_type = 'broker' where kind = 'broker';

-- 换掉 contact_kind（Postgres 不能 drop enum value）
alter type contact_kind rename to contact_kind_old;
create type contact_kind as enum ('client','agent','title_lending','vendor','tc','attorney','other');
alter table contacts alter column kind drop default;
alter table contacts alter column kind type contact_kind
  using (case when kind::text = 'broker' then 'agent' else kind::text end)::contact_kind;
alter table contacts alter column kind set default 'client';
drop type contact_kind_old;
