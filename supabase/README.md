# supabase/

Day 1 在仓库根目录：
```
supabase login
supabase init            # 生成 config.toml（提交到 git）
supabase link --project-ref <newbee-dev 的 project ref>
supabase db push         # 应用 migrations/0001_init.sql
pnpm gen:types           # 生成 packages/core/src/types/database.ts
```
之后每加一个 migration：`supabase migration new <name>` → 写 SQL → `supabase db push` → `pnpm gen:types`。

seed.sql：登录一次后把里面的 AGENT_ID 换成你的 uuid，在 SQL Editor 执行。
