import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.72.237.21", "localhost", "127.0.0.1", "187.77.223.124"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
