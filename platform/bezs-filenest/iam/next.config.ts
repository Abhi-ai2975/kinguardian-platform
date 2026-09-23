/**
 * @module next.config
 * @description Next.js configuration.
 *
 * **Key settings:**
 * - `reactCompiler: true` — enables the React Compiler (formerly React Forget)
 *   for automatic memoization.
 * - `typescript.ignoreBuildErrors: true` — build proceeds despite TS errors
 *   (CI should run a separate type-check step).
 * - `output: "standalone"` — produces a self-contained build for Docker
 *   deployment (includes all node_modules in `.next/standalone`).
 * - **Security headers** — HSTS, X-Frame-Options, X-Content-Type-Options,
 *   XSS protection, Referrer-Policy, Permissions-Policy on all routes.
 * - **next-intl plugin** — wraps the config for locale-based routing
 *   (en, hi, ta with default "en").
 * @category Configuration
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
