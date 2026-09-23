/**
 * next.config — Next.js configuration for the FileNest Console App.
 *
 * The console app is a pure OAuth 2.1 PKCE client. It has no database,
 * no BetterAuth instance, and no server-side session storage of its own.
 * All auth is delegated to the IAM service at NEXT_PUBLIC_BETTER_AUTH_URL.
 *
 * @module
 */
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
