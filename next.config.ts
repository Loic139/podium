import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Hébergement mutualisé : le conteneur annonce beaucoup de CPU mais la
    // mémoire est limitée — sans ce plafond, le build sature et se fige.
    cpus: 2,
    workerThreads: false,
  },
};

export default nextConfig;
