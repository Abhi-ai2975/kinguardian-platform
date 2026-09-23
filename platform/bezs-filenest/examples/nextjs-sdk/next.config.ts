import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@filenest/core", "@filenest/node", "@filenest/react", "@filenest/nextjs"],
};

export default nextConfig;
