import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 只测纯逻辑（翻译复刻的覆盖等），不起 Next、不碰 DOM
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["test/**/*.test.ts?(x)"] },
});
