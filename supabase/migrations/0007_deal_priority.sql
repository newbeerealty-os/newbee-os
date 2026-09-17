-- 0007_deal_priority · 交易显示优先级：priority（0–100，只由阶段决定）+ sort_at（同优先级内按时间倒序）
-- 触发器在每次插入 / 更新时自动算，列表只需 order by priority desc, sort_at desc。
-- 分数表和 packages/core/src/schemas/relations.ts 的 STAGE_PRIORITY 保持一致。
alter table deals
  add column priority int not null default 0,
  add column sort_at timestamptz not null default now();

create or replace function deals_set_priority() returns trigger language plpgsql as $$
begin
  new.priority := case new.stage
    when 'lead' then 100
    when 'pre' then 90
    when 'active' then 80
    when 'offer' then 70
    when 'under_contract' then 60
    when 'closing' then 50
    when 'closed' then 20
    when 'terminated' then 0
    else 0 end;
  new.sort_at := case new.stage
    when 'closed' then coalesce(new.closed_at, new.updated_at, now())
    when 'terminated' then coalesce(new.terminated_at, new.updated_at, now())
    else coalesce(new.updated_at, now()) end;
  return new;
end $$;

-- 放在 set_updated_at 之后跑（触发器按名字字母序执行：deals_updated < deals_zz_priority）
create trigger deals_zz_priority before insert or update on deals for each row execute function deals_set_priority();

-- 回填已有交易
update deals set updated_at = updated_at;

create index deals_priority on deals (agent_id, priority desc, sort_at desc) where deleted_at is null;
