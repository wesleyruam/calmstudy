import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do monorepo são transpilados pelo Next (sem build prévio).
  transpilePackages: ["@calmbook/core", "@calmbook/db", "@calmbook/infra"],
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis"],
  // Os pacotes infra/worker usam imports estilo NodeNext (".js" apontando p/ ".ts").
  // O webpack do Next precisa deste alias para resolvê-los.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
