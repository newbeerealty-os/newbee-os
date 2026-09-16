// 交易阶段的统一视觉：色条 / 圆点 / 徽章。颜色只来自 core 的 STAGE_COLORS，全站只用这三个组件表达阶段。
import { STAGE_COLORS, type DealStage } from "@newbee/core";

const color = (stage: string) => STAGE_COLORS[stage as DealStage] ?? STAGE_COLORS.lead;

/** 卡片 / 行最左边的竖条 */
export function StageBar({ stage, className = "" }: { stage: string; className?: string }) {
  return <span aria-hidden className={`block w-1 shrink-0 self-stretch rounded-full ${className}`} style={{ background: color(stage) }} />;
}

export function StageDot({ stage }: { stage: string }) {
  return <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color(stage) }} />;
}

/** 圆点 + 阶段名 */
export function StageBadge({ stage, label }: { stage: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-2 py-0.5 text-xs font-medium text-fg">
      <StageDot stage={stage} />{label}
    </span>
  );
}
