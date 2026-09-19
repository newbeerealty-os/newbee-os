-- 每个页面都要的"开机数据"一次取回：账号设置、姓名、翻译覆盖、侧栏计数。
-- 原来是 7–8 次往返（每次 ~80ms），现在 1 次。security invoker：仍走 RLS，只看得到自己的。
create or replace function app_bootstrap(p_today date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'name', (select name from agents where id = auth.uid()),
    'settings', (select settings from agents where id = auth.uid()),
    'ui_strings', (
      select coalesce(jsonb_agg(jsonb_build_object('key', key, 'zh', zh, 'en', en)), '[]'::jsonb)
      from ui_strings where agent_id = auth.uid() and deleted_at is null
    ),
    'deals_by_stage', (
      select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb)
      from (select stage, count(*) as n from deals where agent_id = auth.uid() and deleted_at is null group by stage) s
    ),
    'tasks', (
      select jsonb_build_object(
        'deal', count(*) filter (where deal_id is not null),
        'personal', count(*) filter (where deal_id is null),
        'today', count(*) filter (where due_date = p_today)
      )
      from tasks where agent_id = auth.uid() and done_at is null and deleted_at is null
    ),
    'ms_today', (select count(*) from milestones where agent_id = auth.uid() and status = 'pending' and due_date = p_today),
    'contacts_by_kind', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind, count(*) as n from contacts where agent_id = auth.uid() and deleted_at is null group by kind) s
    ),
    'orgs_by_kind', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind, count(*) as n from organizations where agent_id = auth.uid() and deleted_at is null group by kind) s
    )
  );
$$;

grant execute on function app_bootstrap(date) to authenticated;
