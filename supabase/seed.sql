-- dev 样例数据。先在 dev 项目登录一次（产生 auth.users + agents 行），再把下面的 AGENT_ID 换成你的 uuid，
-- 在 SQL Editor 里整段执行。真实数据只进 prod，永远不要把真实客户写进 seed。
\set agent_id 'REPLACE_WITH_YOUR_AGENT_UUID'

insert into deals (id, agent_id, type, stage, title, addenda)
values ('11111111-1111-1111-1111-111111111111', :'agent_id', 'seller', 'under_contract', 'Seller · 1234 Sample Dr', '{financing_addendum,hoa_addendum}');

insert into deal_fields (deal_id, agent_id, key, value_text, value_num, value_date, confidence, confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'effective_date', null, null, '2026-09-01', 0.99, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'sales_price', null, 400000, null, 0.99, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'loan_amount', null, 320000, null, 0.97, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'earnest_money', null, 4000, null, 0.98, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'earnest_money_due_days', null, 3, null, 0.95, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'option_fee', null, 400, null, 0.96, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'option_period_days', null, 10, null, 0.93, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'buyer_approval_days', null, 21, null, 0.88, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'hoa_docs_delivery_days', null, 14, null, 0.81, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'closing_date', null, null, '2026-11-30', 0.99, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'title_company', 'Sample Title Co.', null, null, 0.95, now()),
  ('11111111-1111-1111-1111-111111111111', :'agent_id', 'buyer_agent', 'Sample Realty', null, null, 0.9, now());

-- 里程碑和任务由应用里"确认并派生"生成；这里只给一条个人任务
insert into tasks (agent_id, title, due_date) values (:'agent_id', '把 Wise Agent 的 5 套模板导出成 JSON', current_date + 3);
