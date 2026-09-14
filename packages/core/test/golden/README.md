# 黄金集（不进 git）
把 5 份脱敏后的真实合同 PDF 放这里，命名 `01.pdf … 05.pdf`，每份配一个 `01.expected.json`（key → 期望值）。
运行 `pnpm --filter @newbee/core golden`（Day 7 加脚本）会真的调用 Claude API，花钱，手动触发。
