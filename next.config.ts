// next.config.ts

import { readFileSync } from "fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `${packageJson.version}`;

const nextConfig: NextConfig = {
  // region [Env Configuration]
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  // endregion

  eslint: {
    ignoreDuringBuilds: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  allowedDevOrigins: ["192.168.68.104"],
  // endregion
};

export default nextConfig;
