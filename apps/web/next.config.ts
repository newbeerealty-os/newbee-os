import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@newbee/core"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
