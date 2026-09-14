# ADR 0001 · 架构基线（2026-09）

状态：已采纳

决策：pnpm monorepo；packages/core 只放纯 TypeScript 业务逻辑（类型 / zod / 引擎 / AI prompt），apps/web 是 Next.js（App Router + Tailwind），后端全部用 Supabase（Postgres + Auth + Storage），AI 只在服务端调用（第 1 个月走 Next.js Route Handler，Edge Functions 留给定时任务）。

理由：网站与 App 共用数据库和逻辑；Windows + Claude Code 上 Next.js 的迭代最快；Supabase 的 RLS 天然区分经纪人 / 客户。

代价：Route Handler 有执行时长上限（Vercel 免费档 60s 左右）；长 PDF 抽取若超时需改为异步（Week 2 前评估）。

什么时候重新评估：抽取超时；出现第二个用户；Edge Functions 需要复用 core。
