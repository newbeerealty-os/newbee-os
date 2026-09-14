// Key-Value 字段注册表 —— 整个系统的"宪法"。key 永不改名。
// type 决定抽取后是否必须人工确认（number / date / days 一律进待确认）。

export type FieldType = 'text' | 'number' | 'money' | 'days' | 'date' | 'boolean' | 'list';

export interface FieldDef {
  key: string;
  type: FieldType;
  label: string;
  group: 'parties' | 'money' | 'dates' | 'property' | 'addenda' | 'commission' | 'lease';
  /** 通常出现的位置，给抽取 prompt 用 */
  hint?: string;
  /** 依赖某个 addendum 才会存在 */
  requires?: string;
}

export const DEAL_FIELDS: FieldDef[] = [
  // 各方
  { key: 'buyer_names', type: 'list', label: 'Buyer(s)', group: 'parties', hint: '¶1' },
  { key: 'seller_names', type: 'list', label: 'Seller(s)', group: 'parties', hint: '¶1' },
  { key: 'listing_agent', type: 'text', label: 'Listing Agent', group: 'parties', hint: 'Broker Information 页' },
  { key: 'buyer_agent', type: 'text', label: 'Buyer Agent', group: 'parties', hint: 'Broker Information 页' },
  { key: 'listing_brokerage', type: 'text', label: 'Listing Brokerage', group: 'parties', hint: 'Broker Information 页' },
  { key: 'buyer_brokerage', type: 'text', label: 'Buyer Brokerage', group: 'parties', hint: 'Broker Information 页' },
  { key: 'title_company', type: 'text', label: 'Title Company', group: 'parties', hint: '¶6 / 末页' },
  { key: 'escrow_officer', type: 'text', label: 'Escrow Officer', group: 'parties' },
  { key: 'lender', type: 'text', label: 'Lender', group: 'parties', hint: 'Third Party Financing Addendum' },
  // 价格与资金
  { key: 'sales_price', type: 'money', label: 'Sales Price (3C)', group: 'money', hint: '¶3C' },
  { key: 'cash_portion', type: 'money', label: 'Cash Portion (3A)', group: 'money', hint: '¶3A' },
  { key: 'loan_amount', type: 'money', label: 'Loan Amount (3B)', group: 'money', hint: '¶3B' },
  { key: 'loan_type', type: 'text', label: 'Loan Type', group: 'money', hint: 'Financing Addendum（Conventional / FHA / VA / Cash）' },
  { key: 'seller_concessions', type: 'money', label: 'Seller Concessions', group: 'money', hint: '¶12A(1)(b)' },
  { key: 'earnest_money', type: 'money', label: 'Earnest Money', group: 'money', hint: '¶5' },
  { key: 'earnest_money_due_days', type: 'days', label: 'EM Due (days)', group: 'money', hint: '¶5，通常 3' },
  { key: 'additional_earnest_money', type: 'money', label: 'Additional Earnest Money', group: 'money', hint: '¶5' },
  { key: 'option_fee', type: 'money', label: 'Option Fee', group: 'money', hint: '¶5' },
  { key: 'option_period_days', type: 'days', label: 'Option Period (days)', group: 'money', hint: '¶5' },
  { key: 'buyer_approval_days', type: 'days', label: 'Buyer Approval (days)', group: 'money', hint: 'Financing Addendum ¶2A', requires: 'financing_addendum' },
  { key: 'appraisal_waiver', type: 'boolean', label: 'Appraisal Waiver', group: 'money', requires: 'appraisal_addendum' },
  // 日期（非合同字段：手填或从邮件 / 短信抽取）
  { key: 'first_met', type: 'date', label: 'First Met', group: 'dates', hint: '非合同字段' },
  { key: 'view_house_date', type: 'date', label: 'View House / Listing Appointment', group: 'dates', hint: '非合同字段' },
  { key: 'listing_date', type: 'date', label: 'Listing Date', group: 'dates', hint: 'Listing Agreement / MLS' },
  { key: 'offer_received_date', type: 'date', label: 'Offer Received', group: 'dates', hint: '非合同字段' },
  // 日期（合同字段）
  { key: 'effective_date', type: 'date', label: 'Effective Date', group: 'dates', hint: '末页 Effective Date' },
  { key: 'closing_date', type: 'date', label: 'Closing Date', group: 'dates', hint: '¶9A' },
  { key: 'possession', type: 'text', label: 'Possession', group: 'dates', hint: '¶10' },
  { key: 'survey_days', type: 'days', label: 'Survey Delivery (days)', group: 'dates', hint: '¶6C' },
  { key: 'objection_days', type: 'days', label: 'Objection Period (days)', group: 'dates', hint: '¶6D' },
  { key: 'hoa_docs_delivery_days', type: 'days', label: 'HOA Docs Delivery (days)', group: 'dates', hint: 'HOA Addendum ¶A', requires: 'hoa_addendum' },
  { key: 'hoa_termination_days', type: 'days', label: 'HOA Termination (days)', group: 'dates', hint: 'HOA Addendum ¶A', requires: 'hoa_addendum' },
  { key: 'lead_paint_days', type: 'days', label: 'Lead Paint Inspection (days)', group: 'dates', requires: 'lead_paint_addendum' },
  // 房屋
  { key: 'property_address', type: 'text', label: 'Property Address', group: 'property', hint: '¶2' },
  { key: 'legal_description', type: 'text', label: 'Legal Description', group: 'property', hint: '¶2' },
  { key: 'exclusions', type: 'text', label: 'Exclusions', group: 'property', hint: '¶2D' },
  { key: 'hoa_yes_no', type: 'boolean', label: 'Subject to HOA', group: 'property', hint: '¶6E' },
  { key: 'survey_new_or_existing', type: 'text', label: 'Survey (new / existing T-47)', group: 'property', hint: '¶6C' },
  // 附加协议
  { key: 'addenda', type: 'list', label: 'Addenda checked', group: 'addenda', hint: '¶22' },
  // 佣金（来自 listing / buyer rep agreement）
  { key: 'commission_pct', type: 'number', label: 'Commission %', group: 'commission', hint: 'Listing Agreement / Buyer Rep' },
  { key: 'referral_pct', type: 'number', label: 'Referral %', group: 'commission' },
  // 租赁
  { key: 'rent', type: 'money', label: 'Monthly Rent', group: 'lease' },
  { key: 'deposit', type: 'money', label: 'Security Deposit', group: 'lease' },
  { key: 'lease_start', type: 'date', label: 'Lease Start', group: 'lease' },
  { key: 'lease_end', type: 'date', label: 'Lease End', group: 'lease' },
  { key: 'notice_days', type: 'days', label: 'Notice (days)', group: 'lease' },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(DEAL_FIELDS.map((f) => [f.key, f]));
export const FIELD_KEYS = DEAL_FIELDS.map((f) => f.key);

/** 已知 addendum 的规范 key（抽取 prompt 与 Playbook 的 requires 都用这些） */
export const ADDENDA = [
  'financing_addendum',
  'hoa_addendum',
  'lead_paint_addendum',
  'seller_temporary_lease',
  'buyer_temporary_lease',
  'non_realty_items',
  'backup_addendum',
  'appraisal_addendum',
  'short_sale_addendum',
  'sale_of_other_property',
  'environmental_addendum',
] as const;
export type AddendumKey = (typeof ADDENDA)[number];
