import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet-evm",
  ],
};

export default nextConfig;
