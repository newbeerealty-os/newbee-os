import { describe, it, expect } from "vitest";
import { MESSAGES } from "@newbee/core";
import { ORDER, REPLICAS, placedKeys } from "@/components/i18n-replicas";

// 规矩：网站上每一条文案都要出现在"设置 › 语言 / 翻译"对应页面的复刻里。新增文案没放进去，这条测试就挂。
describe("翻译编辑页的页面复刻", () => {
  it("每个页面都有复刻，顺序表和复刻表一致", () => {
    for (const id of ORDER) expect(REPLICAS[id], id).toBeTypeOf("function");
    expect(Object.keys(REPLICAS).sort()).toEqual([...ORDER].sort());
  });

  it("词典里每一条文案都被放进了某个页面复刻（“其他”页签必须为空）", () => {
    const placed = new Set(Object.values(placedKeys()).flatMap((s) => [...s]));
    const missing = Object.keys(MESSAGES).filter((k) => !placed.has(k));
    expect(missing, `这些文案没放进任何页面复刻：\n${missing.join("\n")}`).toEqual([]);
  });

  it("复刻里没有引用不存在的 key", () => {
    const placed = new Set(Object.values(placedKeys()).flatMap((s) => [...s]));
    const bogus = [...placed].filter((k) => !MESSAGES[k]);
    expect(bogus).toEqual([]);
  });
});
