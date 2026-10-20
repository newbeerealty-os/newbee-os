NewBee OS 三端影子 v1.7（给 Claude Code 读的副本）

结构：
  index.html   壳：按 #web / #agent / #client 或右下角切换加载三端之一
  data.js      三端共用的示例数据（种子）
  shared.js    NBSync（三端一个数据库：localStorage 共享 + 跨标签页同步 + claude.ai db 云同步）· NBMsg（消息模型）
  score.js     v1.2 默认排序 + 重点关注：scoreDeal / scoreContact / scoreProperty（facts + 权重 → 分数 · 理由 · 分组）· 星标 / 手动顺序 / 上次打开（权重在 data.js 顶部 SCORE_CONFIG）
  roadmap.js   v1.3 路线图：四张路线图的定义（节点 · 线 · 分支 · 客户叫法 · 截止规则）· 阶段由进度算出（stageOf）· 完成 / 撤销 / 走通 / 终止 · 三端同一个渲染（横版 / 竖版 / 客户人话版）
  tours.js     v1.3 Tour：一个客户一次出行 · 现场（到了 / 走了 / 评分 / 语音）· 看房历史 · 目标房排队（拖动 / 菜单）
  offers.js    v1.3 Offer：一方签字的合同 · 逐条款谁提的 / 已同意 / 对方 counter · 多 Offer · 挂起 / 撤回 / 落选可再激活 · 对方签字 → 变合同
  work.js      v1.4 工作模型（决定 38–48）：NBToday 今天五块（需要你 / 有风险 / 在等对方 / 人情节点 / AI 已处理）· NBCommit 承诺表（谁答应了什么 · 催 · 兑现 → 解锁路线图）· NBVerify 节点核实（证据文件 + 字段）· NBNotify 通知四级 · NBPack 阶段包（每阶段只露该看的 tab）· NBCapture 记一下（离线 · 唯一号 · 不重复）· NBConflict 冲突卡（说法 vs 数据，点一下选哪个算数）· NBCall 打电话前一张卡
  phrases.js   v1.5 摘要语句（S1）：56 句 + 10 组的模板引擎（{{key}} · {{#if}}）· 每笔交易的隐藏 / 改字 / 临时加一句 · 两句合并 · 规矩（🔒 不进客户 App · 租房申请句不提受保护类别）
  comms.js     v1.5 邮件待归档 + 沟通时间线（E1a · E1b · 16b · 13f）：归到… / 忽略 / 忽略发件人 · 邮件 / 电话 / 微信 / 短信 / 记一下 / 会面 / 日历 / 看房 / 消息合成一条线 · 待回复 · AI 起草回复（T2）
  extract.js   v1.5 扫描件 · 手写 · 裁图 · 交叉校验（4b · 4h）：上传签好的合同建交易（三种样例）· 确认规矩 R-2 · 派生 · 中文人话摘要
  pinui.js     排序 / 星标的界面零件（三端共用）：星标 · 理由标签 · … 菜单 · 拖动 · 分组折叠
  msgui.js     消息界面组件与动作（三端共用）
  mcore.js     手机端公用核心（经纪人 App / 客户 App）
  web/         网站 OS：core.js · screens-*.js · messages.js · portal.js · ai.js · styles.css
  agent/       经纪人 App：app.js · styles.css
  client/      客户 App：app.js · styles.css

读法：先看 data.js 的 threads / messages 和 shared.js 的 NBMsg（v1.4 加了 decide：两位决策人各自答 · 不一致 → 需要商量），再看各端怎么用 NBMsgUI；今天页 / 承诺 / 核实 / 通知 / 阶段包 / 记一下 / 冲突卡都在 work.js；排序看 data.js 顶部的 SCORE_CONFIG + score.js（真实版 = packages/core 的三个纯函数）。
