// 翻译编辑页用的"场景树"：每条文案按 key 前缀归到 页面 › 区块，并说明它在哪里显示。key 本身不给用户看。
export interface SceneSection { id: string; zh: string; en: string; /** 哪些 key 前缀属于这个区块（按顺序匹配，先命中先用） */ prefixes: string[]; where: { zh: string; en: string } }
export interface Scene { id: string; zh: string; en: string; where: { zh: string; en: string }; sections: SceneSection[] }

const s = (id: string, zh: string, en: string, prefixes: string[], whereZh: string, whereEn: string): SceneSection => ({ id, zh, en, prefixes, where: { zh: whereZh, en: whereEn } });

export const SCENES: Scene[] = [
  { id: 'nav', zh: '左侧菜单', en: 'Sidebar', where: { zh: '左侧主菜单和收起后的图标栏', en: 'Left sidebar and its collapsed icon rail' }, sections: [
    s('items', '菜单项', 'Menu items', ['nav.'], '一级菜单名、展开 / 收起按钮', 'Top-level menu names, collapse / expand buttons'),
    s('locale', '语言切换', 'Language switch', ['locale.'], '菜单底部两面国旗旁的语言名', 'Language names next to the flags at the bottom of the menu'),
    s('feedback', '操作反馈', 'Feedback', ['flash.', 'error.'], '按钮按完右下角弹的"已保存 / 已删除"，以及出错页', 'The "Saved / Deleted" toast after a button press, and the error page'),
  ] },
  { id: 'today', zh: '今天', en: 'Today', where: { zh: '"今天"页面', en: 'The Today page' }, sections: [
    s('page', '页面文字', 'Page text', ['today.'], '标题、选项卡、空状态', 'Title, tabs, empty states'),
    s('rel', '相对日期', 'Relative dates', ['rel.'], '"3 天后 / 逾期 2 天 / 今天"这类日期标签，全站通用', '"in 3 days / 2 days overdue / today" labels, used everywhere'),
  ] },
  { id: 'deals', zh: '交易列表', en: 'Deals list', where: { zh: '"交易"列表页', en: 'The Deals list page' }, sections: [
    s('cols', '表头', 'Column headers', ['deals.col.'], '列表表头', 'Table column headers'),
    s('stats', '统计卡', 'Stat cards', ['deals.stat.'], '列表上方 4 张统计卡', 'The 4 stat cards above the list'),
    s('page', '页面文字', 'Page text', ['deals.'], '标题、搜索框、新建交易、空状态', 'Title, search box, new-deal form, empty states'),
  ] },
  { id: 'deal', zh: '交易详情', en: 'Deal detail', where: { zh: '一笔交易的详情页', en: 'A single deal page' }, sections: [
    s('tabs', '选项卡', 'Tabs', ['deal.tab.', 'tab.'], '详情页顶部的选项卡', 'Tabs across the top of the deal page'),
    s('stats', '概览统计卡', 'Overview stats', ['deal.stat.', 'deal.next3', 'deal.nothingNext'], '"概览"选项卡里的 4 张卡和"接下来"', 'The 4 cards and "Up next" on the Overview tab'),
    s('parties', '各方', 'Parties', ['parties.'], '"各方"选项卡：添加参与方表单、分组标题', 'Parties tab: add-party form, group headings'),
    s('page', '按钮与提示', 'Buttons & hints', ['deal.'], '文件 / 待确认 / 字段 / 里程碑 / 任务各选项卡里的按钮、提示、空状态', 'Buttons, hints and empty states on the Files / To-confirm / Fields / Milestones / Tasks tabs'),
  ] },
  { id: 'contacts', zh: '联系人列表', en: 'Contacts list', where: { zh: '"联系人"总表', en: 'The Contacts list page' }, sections: [
    s('cols', '表头', 'Column headers', ['contacts.col.'], '列表表头', 'Table column headers'),
    s('page', '页面文字', 'Page text', ['contacts.'], '标题、搜索框、表格 / 卡片切换、添加按钮、空状态', 'Title, search, table / cards toggle, add buttons, empty states'),
    s('tabs', '类型页签', 'Type tabs', ['contactTab.'], '总表顶部的类型页签，也是侧栏"联系人"的二级菜单', 'Type tabs on the list, also the sidebar sub-menu'),
  ] },
  { id: 'contact', zh: '联系人详情与表单', en: 'Contact detail & form', where: { zh: '一个人的详情页、添加 / 编辑表单', en: 'A contact page and the add / edit form' }, sections: [
    s('form', '表单字段名', 'Form field labels', ['contact.f.'], '添加 / 编辑联系人表单里每个输入框的标签，也是详情页"联系方式"里的行名', 'Labels of the add / edit form inputs, also row names in Contact details'),
    s('tabs', '选项卡', 'Tabs', ['contact.tab.'], '详情页选项卡', 'Tabs on the contact page'),
    s('page', '详情页文字', 'Detail page text', ['contact.'], '相关交易、相关联系人、紧密关系、备注、编辑 / 删除等', 'Related deals, related people, close relationships, notes, edit / delete'),
    s('photo', '照片与头像', 'Photos & avatar', ['photo.'], '头像裁剪器和照片库', 'Avatar cropper and photo gallery'),
  ] },
  { id: 'commissions', zh: '佣金', en: 'Commissions', where: { zh: '"佣金"列表、佣金明细 / 编辑页、交易详情的"佣金"选项卡', en: 'The Commissions list, the commission detail / edit page, the Commission tab on a deal' }, sections: [
    s('dash', '佣金总览', 'Overview', ['dash.'], '门户首页和佣金页顶部的四个环、月度柱、待收清单', 'The four rings, monthly bars and pending list on the home page and the top of Commissions'),
    s('cols', '表头与统计', 'Columns & stats', ['comm.col.', 'comm.stat.'], '列表表头、顶部统计卡', 'Table headers and stat cards'),
    s('form', '表单字段', 'Form fields', ['comm.f.'], '添加 / 编辑佣金的输入框', 'Inputs on the add / edit commission form'),
    s('breakdown', '明细', 'Breakdown', ['comm.r.'], '右侧实时算出来的逐项明细', 'The live breakdown on the right'),
    s('page', '页面文字', 'Page text', ['comm.'], '标题、筛选、按钮、cap 进度、空状态', 'Title, filters, buttons, cap progress, empty states'),
    s('labels', '分类与状态', 'Types & statuses', ['commKind.', 'commSide.', 'commStatus.'], '交易佣金 / 推荐费、卖方 / 买方…、预计 / 待收 / 已收…', 'Deal / referral, listing / buyer…, projected / pending / paid…'),
  ] },
  { id: 'plan', zh: '佣金方案', en: 'Commission plan', where: { zh: '设置 › 佣金方案', en: 'Settings › Commission plan' }, sections: [
    s('all', '方案设置', 'Plan settings', ['plan.', 'settings.commission'], '分成、cap、每笔费、加盟费、团队、月固定费', 'Split, cap, per-deal fees, royalty, team, monthly fees'),
  ] },
  { id: 'tasks', zh: '任务', en: 'Tasks', where: { zh: '"任务"页面和任务行', en: 'The Tasks page and task rows' }, sections: [
    s('page', '页面文字', 'Page text', ['tasks.', 'common.markDone', 'common.markUndone'], '标题、添加任务表单、勾选按钮', 'Title, add-task form, check buttons'),
  ] },
  { id: 'settings', zh: '设置', en: 'Settings', where: { zh: '"设置"里的语言和主题页', en: 'Language and Theme settings pages' }, sections: [
    s('theme', '主题名', 'Theme names', ['theme.'], '主题设置页 10 张主题卡的名字和一句话', 'Names and taglines of the 10 theme cards'),
    s('page', '设置页文字', 'Settings text', ['settings.', 'meta.'], '模式、位置、保存等', 'Modes, location, save, etc.'),
  ] },
  { id: 'login', zh: '登录页', en: 'Login page', where: { zh: '登录页', en: 'The login page' }, sections: [
    s('page', '登录页文字', 'Login text', ['login.'], '说明、按钮、发送结果', 'Hint, buttons, sent message'),
  ] },
  { id: 'common', zh: '通用', en: 'Common', where: { zh: '多个页面共用的按钮和词', en: 'Buttons and words shared by many pages' }, sections: [
    s('page', '通用按钮与词', 'Common buttons & words', ['common.'], '保存、删除、搜索、"- 所有 -"、页数等', 'Save, delete, search, "- ALL -", page counts, etc.'),
  ] },
  { id: 'labels', zh: '分类与标签', en: 'Categories & labels', where: { zh: '徽章、下拉选项、页签里的分类名', en: 'Category names in badges, dropdowns and tabs' }, sections: [
    s('stage', '交易阶段', 'Deal stages', ['stage.'], '交易阶段：列表徽章、侧栏二级菜单、改阶段下拉', 'Deal stages: list badges, sidebar sub-menu, change-stage dropdown'),
    s('type', '交易类型', 'Deal types', ['type.'], '卖方 / 买方 / 出租…', 'Seller / buyer / lease…'),
    s('docStatus', '文档状态', 'Document status', ['docStatus.'], '交易详情"文件"里的状态徽章', 'Status badges on the Files tab'),
    s('group', '字段分组', 'Field groups', ['group.'], '交易详情"字段"里的分组标题', 'Group headings on the Fields tab'),
    s('playbookStage', 'Playbook 阶段', 'Playbook stages', ['playbookStage.'], '交易详情"任务"里的阶段标题', 'Stage headings on the Tasks tab'),
    s('contactKind', '联系人类型', 'Contact types', ['contactKind.'], '联系人的类型徽章和表单下拉', 'Contact type badges and form dropdown'),
    s('orgKind', '公司类型', 'Company types', ['orgKind.'], '公司的类型徽章和表单下拉', 'Company type badges and form dropdown'),
    s('licenseType', '执照类型', 'License types', ['licenseType.'], '经纪人的执照类型', 'Agent license types'),
    s('partyRole', '交易角色', 'Party roles', ['partyRole.'], '一个人在某笔交易里的角色', "A person's role in a deal"),
    s('partySide', '我方 / 对方', 'Sides', ['partySide.'], '交易各方的分组', 'Party grouping'),
    s('relation', '紧密关系', 'Relationships', ['relation.'], '配偶 / 父母 / 子女…', 'Spouse / parent / child…'),
    s('channel', '联系方式', 'Channels', ['channel.'], '电话 / 短信 / 邮件 / 微信 / WhatsApp', 'Phone / SMS / email / WeChat / WhatsApp'),
    s('language', '首选语言', 'Preferred language', ['language.'], '联系人的首选语言', "Contact's preferred language"),
  ] },
  { id: 'field', zh: '合同字段名', en: 'Contract field names', where: { zh: '合同抽取出来的字段（成交价、过户日…）', en: 'Fields extracted from contracts (sales price, closing date…)' }, sections: [
    s('all', '字段名', 'Field names', ['field.'], '交易详情"待确认 / 字段"里的字段名、手动写入下拉', 'Field names on the To-confirm / Fields tabs and the manual-entry dropdown'),
  ] },
  { id: 'ms', zh: '里程碑名', en: 'Milestone names', where: { zh: '派生出来的关键日期', en: 'Derived key dates' }, sections: [
    s('all', '里程碑', 'Milestones', ['ms.'], '今天页、交易列表"下一节点"、交易详情"里程碑"', 'Today page, "next milestone" in the deals list, Milestones tab'),
  ] },
  { id: 'task', zh: 'Playbook 任务名', en: 'Playbook task names', where: { zh: '按 Playbook 自动生成的任务', en: 'Tasks generated from the Playbook' }, sections: [
    s('all', '任务', 'Tasks', ['task.'], '今天页、任务页、交易详情"任务"里的任务标题', 'Task titles on Today, Tasks and the deal Tasks tab'),
  ] },
];

export interface ScenePath { scene: Scene; section: SceneSection }

/** 一个 key 属于哪个场景 › 区块；找不到归到"通用"（不应发生，有测试兜着） */
export function sceneOf(key: string): ScenePath {
  for (const scene of SCENES) for (const section of scene.sections) if (section.prefixes.some((p) => key.startsWith(p))) return { scene, section };
  const common = SCENES.find((x) => x.id === 'common')!;
  return { scene: common, section: common.sections[0] };
}
