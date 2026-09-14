# 开发日志（每天 3 行：做了什么 · 卡在哪 · 明天第一件事）

## Day 0
- 做了：环境与账号（见 devplan 第 1 节）
- 卡在：
- 明天：Day 1 —— 解压骨架 → pnpm install → 连 Supabase → db push → 登录能进 Today

## Day 1（骨架已生成）
- 做了：monorepo 骨架；core 引擎 25 个测试全绿；web `next build` 通过；/login 200、未登录访问 /today 307→/login
- 卡在：Supabase 与 Anthropic 的 key 要你自己填（.env.local）；`pnpm gen:types` 要连上项目后才能跑
- 明天：Day 2 —— 真机登录 → 建交易 → 手填 3 个字段 → 派生 → /today 出现节点；然后上传第一份合同试抽取
