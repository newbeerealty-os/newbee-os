# 影子副本路由表（给 Claude Code 对文件名用）

影子版本见 `VERSION.txt` 第一行；每个文件干什么见 `README.txt`。
本文件只回答一个问题：**某个页面 = 哪个文件里的哪个函数**。新增 `web/screens-*.js` 文件或 `SCREENS.xxx` 页面时，先把这张表补上再动手。

- 网站三端壳：`index.html` 按 `#web` / `#agent` / `#client` 加载。
- 网站加载顺序（`index.html`）：`web/core.js` → `screens-deals.js` → `screens-crm.js` → `screens-vendors.js` → `screens-lease.js` → `screens-admin.js` → `screens-v1.js` → `messages.js` → `portal.js` → `ai.js`，再加 `msgui.js` · `pinui.js`。**后加载的会包住先加载的同名页面**。
- 路由：`#/<第一段>/<第二段>…` → `SCREENS[第一段]`，没有就 `SCREENS.notfound`，空 hash 默认 `#/today`（`web/core.js` 的 `route()` / `render()`）。

## 一、网站 OS（`web/`）

| 页面 | 路由 | 文件 | 函数 |
|---|---|---|---|
| 今天 | `#/today` | `web/screens-deals.js` | `SCREENS.today` |
| 交易（列表 / 详情 / 新建） | `#/deals`、`#/deals/<id>`、`#/deals/new` | `web/screens-deals.js` | `SCREENS.deals` |
| 消息 | `#/messages` | `web/messages.js` | `SCREENS.messages` |
| 联系人（列表 / 详情） | `#/contacts`、`#/contacts/<id>` | `web/screens-crm.js` | `SCREENS.contacts` |
| 联系人详情的 Vendor 卡 | 同上 | `web/screens-vendors.js` | `SCREENS.contacts`（包住 crm 的那个，`origContacts`） |
| 房源 | `#/properties` | `web/screens-crm.js` | `SCREENS.properties` |
| 看房模式（一场 Tour） | `#/showing`、`#/showing/<tourId>` | `web/screens-crm.js` | `SCREENS.showing` |
| CMA | `#/cma` | `web/screens-crm.js` | `SCREENS.cma` |
| 营销 | `#/marketing` | `web/screens-crm.js` | `SCREENS.marketing` |
| Open House 登记页（客人看） | `#/openhouse` | `web/screens-crm.js` | `SCREENS.openhouse` |
| 邮件侦测 | `#/inbox` | `web/screens-crm.js` | `SCREENS.inbox` |
| 沟通记录（微信） | `#/wechat` | `web/screens-crm.js` | `SCREENS.wechat` |
| 迁移 | `#/importer` | `web/screens-crm.js` | `SCREENS.importer` |
| 迁移页的 Wise Agent Vendor List | 同上 | `web/screens-vendors.js` | `SCREENS.importer`（包住 crm 的那个，`origImporter`） |
| 佣金 | `#/commission` | `web/screens-crm.js` | `SCREENS.commission` |
| Vendor | `#/vendors` | `web/screens-vendors.js` | `SCREENS.vendors` |
| 租赁交易 | `#/lease`、`#/lease/<id>` | `web/screens-lease.js` | `SCREENS.lease` |
| 看房（约看列表） | `#/showings` | `web/screens-v1.js` | `SCREENS.showings` |
| 合同进件 | `#/intake` | `web/screens-v1.js` | `SCREENS.intake` |
| 交易类型模板 | `#/templates` | `web/screens-v1.js` | `SCREENS.templates` |
| AI 自动化 | `#/automation` | `web/screens-v1.js` | `SCREENS.automation` |
| 租赁运营 | `#/rentals` | `web/screens-v1.js` | `SCREENS.rentals` |
| Broker 后台 | `#/broker` | `web/screens-admin.js` | `SCREENS.broker` |
| 设置 | `#/settings` | `web/screens-admin.js` | `SCREENS.settings` |
| 影子说明 | `#/about` | `web/screens-admin.js` | `SCREENS.about` |
| 登录 | `#/login` | `web/screens-admin.js` | `SCREENS.login` |
| 更多 | `#/more` | `web/screens-admin.js` | `SCREENS.more` |
| 404 | 其它 | `web/screens-admin.js` | `SCREENS.notfound` |
| 客户视图（门户） | `#/portal/<id>` | `web/portal.js` | `SCREENS.portal` |

没有 `SCREENS.xxx` 的两个：`web/core.js`（壳 · 路由 · 侧栏 · 计数 · 主题 · 文案 `t()`）、`web/ai.js`（AI 动作）。样式在 `web/styles.css`。

## 二、经纪人 App（`agent/app.js`）

底部五个 tab 见 `window.APP_TABS`：今日 · 交易 · 消息 · 看房 · 全部。

| 页面 | 函数 |
|---|---|
| 今日 | `SCREENS.today` |
| 交易（列表 / 详情；详情里的 tab 见 `TABS`：总览 · 字段 · 文件 · 路线图 · 任务 · 各方 · Vendor · Offer · 钱 · 沟通 · 在等对方 · 合规 · 修改记录 · 客户视图） | `SCREENS.deals` |
| 看房 | `SCREENS.showings` |
| 消息 | `SCREENS.messages` |
| 客户 | `SCREENS.clients` |
| 房源 | `SCREENS.properties` |
| 全部 | `SCREENS.more` |
| 通知 | `SCREENS.notify` |
| 404 | `SCREENS.notfound` |

## 三、客户 App（`client/app.js`）

底部五个 tab 见 `window.APP_TABS`：首页 · 房源 · 消息 · 进度 · 更多。

| 页面 | 函数 |
|---|---|
| 首页 | `SCREENS.home` |
| 房源 | `SCREENS.homes` |
| 进度（这笔交易） | `SCREENS.deal` |
| 文件 | `SCREENS.files` |
| 家人 | `SCREENS.family` |
| 看房 | `SCREENS.tour` |
| 消息 | `SCREENS.messages` |
| 更多 | `SCREENS.more` |
| 404 | `SCREENS.notfound` |

## 四、真实仓库对应关系

真实仓库现在只有网站：**经纪人 App 的样子 = 网站在手机宽度下的布局，客户 App 的样子 = 客户视图**。根目录那十个 js（`score` · `roadmap` · `tours` · `offers` · `work` · `phrases` · `comms` · `extract` · `propfile` · `lshow`）是 `packages/core` 该有的样子，移植时照它们的行为写纯函数 + 测试。
