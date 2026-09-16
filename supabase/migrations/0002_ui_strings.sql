-- 0002_ui_strings · 界面文字的覆盖值（编辑页写，显示时覆盖 core 词典的默认值）
-- key 与 packages/core/src/i18n/messages.ts 的 key 一致；zh / en 为空 = 该语言用默认值。
create table ui_strings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  key text not null,
  zh text,
  en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (agent_id, key)
);
create trigger ui_strings_updated before update on ui_strings for each row execute function set_updated_at();

alter table ui_strings enable row level security;
create policy "ui_strings own" on ui_strings for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
