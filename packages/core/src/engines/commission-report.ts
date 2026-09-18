// 佣金总览的数据：把佣金记录切成"按状态 / 按类型 / 按月 / 待收"，给门户首页和 /commissions 顶部的图用。纯函数。
import type { CommissionKind, CommissionSide, CommissionStatus } from './commission';
import { capYearOf } from './commission';

export interface ReportRow {
  id: string;
  kind: CommissionKind;
  side: CommissionSide;
  status: CommissionStatus;
  /** 生效日期 YYYY-MM-DD（成交日 → 交易成交日 → 预计成交 → 创建日） */
  date: string;
  title: string;
  price: number | null;
  gci: number;
  nci: number;
  /** computed.lines 的 id + 金额 */
  lines: { id: string; amount: number }[];
}
export interface ReportFilter { from: string; to: string; sides: CommissionSide[] }

export type ReportStatus = Exclude<CommissionStatus, 'cancelled'>;
export const REPORT_STATUSES: ReportStatus[] = ['paid', 'closed', 'pending', 'projected'];
export type ByStatus = Record<ReportStatus, number>;
export interface MonthCell { n: number; gci: number; nci: number }
export interface CommissionReport {
  count: { total: number; byStatus: ByStatus };
  gci: { total: number; byStatus: ByStatus };
  nci: { total: number; byStatus: ByStatus };
  /** GCI 去哪儿了 */
  breakdown: { nci: number; brokerSplit: number; referralOut: number; perDeal: number; royalty: number; team: number; other: number };
  paidRate: number;
  /** 交易额（售价 / 租金合计）：卖 = 卖方，买 = 买方，租赁 = 放租 + 寻租 + 托管；推荐费不算 */
  volume: { total: number; sell: number; buy: number; lease: number };
  monthly: { month: string; bySide: Partial<Record<CommissionSide, MonthCell>>; total: MonthCell }[];
  /** 该收还没收的：签约中 + 已成交未收，按日期先后 */
  pending: ReportRow[];
  pendingTotal: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const zero = (): ByStatus => ({ paid: 0, closed: 0, pending: 0, projected: 0 });

export function buildCommissionReport(rows: ReportRow[], f: ReportFilter): CommissionReport {
  const inRange = rows.filter((r) => r.status !== 'cancelled' && r.date >= f.from && r.date <= f.to && f.sides.includes(r.side));
  const count = { total: inRange.length, byStatus: zero() };
  const gci = { total: 0, byStatus: zero() };
  const nci = { total: 0, byStatus: zero() };
  const breakdown = { nci: 0, brokerSplit: 0, referralOut: 0, perDeal: 0, royalty: 0, team: 0, other: 0 };
  for (const r of inRange) {
    const st = r.status as ReportStatus;
    count.byStatus[st] += 1;
    gci.byStatus[st] += r.gci; gci.total += r.gci;
    nci.byStatus[st] += r.nci; nci.total += r.nci;
    breakdown.nci += r.nci;
    for (const ln of r.lines) {
      if (ln.id === 'brokerSplit') breakdown.brokerSplit += ln.amount;
      else if (ln.id === 'referralOut') breakdown.referralOut += ln.amount;
      else if (ln.id === 'perDealFee' || ln.id === 'eoFee') breakdown.perDeal += ln.amount;
      else if (ln.id === 'royalty') breakdown.royalty += ln.amount;
      else if (ln.id === 'team') breakdown.team += ln.amount;
      else breakdown.other += ln.amount;
    }
  }
  for (const k of Object.keys(breakdown) as (keyof typeof breakdown)[]) breakdown[k] = r2(breakdown[k]);
  gci.total = r2(gci.total); nci.total = r2(nci.total);

  // 按月：from 的月份到 to 的月份，每月一格
  const monthly: CommissionReport['monthly'] = [];
  const [fy, fm] = f.from.split('-').map(Number);
  const [ty, tm] = f.to.split('-').map(Number);
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
    const month = `${y}-${String(m).padStart(2, '0')}`;
    const cell: CommissionReport['monthly'][number] = { month, bySide: {}, total: { n: 0, gci: 0, nci: 0 } };
    for (const r of inRange) {
      if (!r.date.startsWith(month)) continue;
      const c = (cell.bySide[r.side] ??= { n: 0, gci: 0, nci: 0 });
      c.n += 1; c.gci = r2(c.gci + r.gci); c.nci = r2(c.nci + r.nci);
      cell.total.n += 1; cell.total.gci = r2(cell.total.gci + r.gci); cell.total.nci = r2(cell.total.nci + r.nci);
    }
    monthly.push(cell);
  }

  const volume = { total: 0, sell: 0, buy: 0, lease: 0 };
  for (const r of inRange) {
    if (r.kind !== 'deal' || !r.price) continue;
    const k = r.side === 'listing' ? 'sell' : r.side === 'buyer' ? 'buy' : 'lease';
    volume[k] = r2(volume[k] + r.price); volume.total = r2(volume.total + r.price);
  }
  const pending = inRange.filter((r) => r.status === 'pending' || r.status === 'closed').sort((a, b) => a.date.localeCompare(b.date));
  return { count, gci, nci, breakdown, paidRate: gci.total ? nci.total / gci.total : 0, volume, monthly, pending, pendingTotal: r2(pending.reduce((s, r) => s + r.nci, 0)) };
}

export const PERIOD_PRESETS = ['month', 'quarter', 'year', 'm12', 'period'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 预设时间段 → from / to。'period' = 方案里的周期起点起一整年（cap 用的那个） */
export function periodRange(preset: PeriodPreset, todayISO: string, capYearStart: string): { from: string; to: string } {
  const [y, m] = todayISO.split('-').map(Number);
  switch (preset) {
    case 'month': return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
    case 'quarter': { const q = Math.floor((m - 1) / 3) * 3 + 1; return { from: `${y}-${pad(q)}-01`, to: `${y}-${pad(q + 2)}-${pad(lastDay(y, q + 2))}` }; }
    case 'year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'm12': { let fy = y, fm = m - 11; if (fm <= 0) { fm += 12; fy -= 1; } return { from: `${fy}-${pad(fm)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` }; }
    case 'period': { const p = capYearOf(todayISO, capYearStart); return { from: p.start, to: p.end }; }
  }
}
