import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@newbee/core"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  devIndicators: false, // 开发模式左下角的 N 按钮会挡住侧栏头像
};

export default nextConfig;
