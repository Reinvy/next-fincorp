import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
