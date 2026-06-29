import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do monorepo são transpilados pelo Next (sem build prévio).
  transpilePackages: ["@calmbook/core", "@calmbook/db"],
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis"],
};

export default nextConfig;
