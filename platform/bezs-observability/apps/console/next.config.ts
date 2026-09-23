import type { NextConfig } from "next";

// The console delegates all authentication to the IAM service.
// Requests to /api/auth/* are proxied to IAM so session cookies are set
// on the console's origin, which allows SSR session reads to work.
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  async rewrites() {
    const iamUrl = process.env.IAM_URL ?? "http://localhost:5000";
    return [
      {
        source: "/api/auth/:path*",
        destination: `${iamUrl}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
