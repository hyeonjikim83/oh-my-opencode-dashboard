import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fs", "path", "better-sqlite3"],
};

export default nextConfig;
