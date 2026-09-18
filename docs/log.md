# 开发日志（每天 3 行：做了什么 · 卡在哪 · 明天第一件事）

## Day 0
- 做了：环境与账号（见 devplan 第 1 节）
- 卡在：
- 明天：Day 1 —— 解压骨架 → pnpm install → 连 Supabase → db push → 登录能进 Today

## Day 1（骨架已生成）
- 做了：monorepo 骨架；core 引擎 25 个测试全绿；web `next build` 通过；/login 200、未登录访问 /today 307→/login
- 卡在：Supabase 与 Anthropic 的 key 要你自己填（.env.local）；`pnpm gen:types` 要连上项目后才能跑
- 明天：Day 2 —— 真机登录 → 建交易 → 手填 3 个字段 → 派生 → /today 出现节点；然后上传第一份合同试抽取

## Day 2
- 做了：/deals 每笔交易标题下显示"未完成任务 N 个"（一条查询嵌 tasks，页面内计数）；真机验证显示 62 个；test 25/25、typecheck 通过
- 卡在：
- 明天：把 setField / confirmField 的类型判断收回 core（统一走 toFieldColumns + FIELD_BY_KEY），否则 "10 days" 这类输入会静默让 option_period_end 变 null

## Day 3
- 做了：中英双语全套——core 词典 + makeT + 覆盖测试（34/34）；ui_strings 表（0002 已上线）；cookie + agents.settings.locale 记住选择；导航/登录页切换按钮；5 个页面、字段名、里程碑、任务标题按 key 翻译显示（库里仍英文）；/settings/language 编辑页可改中英并恢复默认；真机手测通过
- 卡在：
- 明天：把 setField / confirmField 的类型判断收回 core（统一走 toFieldColumns + FIELD_BY_KEY）；之后加 buyer Playbook 时 i18n 测试会逼着补翻译

## Day 4（v0.2.0）
- 做了：主题（10 套、日出日落自动）· 导航方案 A（可收起侧栏 / 红圈 / 选项卡 / 搜索）· 字体 Manrope + DM Mono + MiSans · 联系人模块（人 / 公司 / 交易各方 / 紧密关系 / 详情页强度排序）· 22 个 commit，test 66/66，build 通过；版本说明见 docs/CHANGELOG.md，打 tag v0.2.0
- 卡在：
- 明天：抽取结果 → 联系人匹配建议；然后把 setField / confirmField 的类型判断收回 core

## Day 5
- 做了：佣金模块全套——0008_commissions 表（已 push、类型已生成）· core 引擎（GCI → 推荐费 → broker 分成 cap 前后 → 加盟费 → 团队 → 每笔费 → 自定义扣费 → NCI；按业绩阶梯分成、每笔费 / E&O 年度封顶；"截至这笔之前"按日期累计）· 设置 › 佣金方案（8 个预设 + 6 个模块开关，对照前 25 家经纪公司的分成方式）· /commissions 列表 / 新建 / 明细 · 交易详情"佣金"选项卡 · 联系人"推荐费"卡 · 侧栏"佣金" · 出租拆成放租 / 寻租；全站反馈机制（setFlash 提示贴按钮下方、Button 转圈、出错页）；MoneyInput 金额框（$ 格式 + "x 万"）；照片 / 头像；联系人详情 404 与若干表单修复。test 99 + 3，typecheck、build 通过
- 卡在：Jason 说的"家里的文件"没听明白，明天先问清楚
- 明天：首页佣金统计报告（本周期 GCI / NCI / 固定费用 / cap 进度）；抽取结果 → 联系人匹配建议；setField / confirmField 的类型判断收回 core

## Day 6
- 做了：交易详情"佣金"选项卡直接是表单（胶囊选记录、加另一边、删除）；编辑页保存按钮统一放卡片标题栏右侧；佣金总览（core 报表引擎 + 每主题预设图表色）上线到门户首页（紧凑版）和 /commissions（完整版）：时间段预设 / 自定义、类型胶囊、四张卡（笔数 / GCI 按状态、NCI 去哪儿了 + cap、买卖交易额 卖 / 买 / 买卖同时）横条 + 悬停金额占比、每月柱状（图例可开关）、待收清单；切页签不再跳顶。test 107 + 3，typecheck、build 通过
- 卡在：
- 明天：抽取结果 → 联系人匹配建议；setField / confirmField 的类型判断收回 core；"家里的文件"待问清
