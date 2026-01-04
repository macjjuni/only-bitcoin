// next.config.ts
import type { NextConfig } from "next";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `v${packageJson.version}`;

const nextConfig: NextConfig = {
  // region [Env Configuration]
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  // endregion

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // endregion
};

export default nextConfig;