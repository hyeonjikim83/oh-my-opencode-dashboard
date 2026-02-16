import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fs", "path", "better-sqlite3"],
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
