/**
 * useRouteConfig — resolves per-route UI configuration for the current pathname.
 *
 * Layer: client / shared / hooks
 *
 * Reads route-config.json and returns the config block whose key is the longest
 * prefix of the current pathname. Falls back to the "default" block when no
 * prefix matches.
 *
 * Config options:
 *   breadcrumbs       — render the BreadCrumb trail below the navbar in <main>
 *   navbarBreadcrumbs — render BreadCrumb inside the top AppNavbar (replaces CommandSearch)
 */

"use client";

import { usePathname } from "@/i18n/navigation";
import routeConfig from "@/config/route-config.json";

/** Shape of a single route config entry. */
export interface RouteConfig {
  /** Whether to show the breadcrumb trail in the main content area. */
  breadcrumbs: boolean;
  /** Whether to show breadcrumbs inside the top navbar instead of CommandSearch. */
  navbarBreadcrumbs: boolean;
}

const DEFAULT_CONFIG: RouteConfig = routeConfig.default;

/**
 * Returns the resolved RouteConfig for the current pathname.
 * Longest prefix match wins; falls back to the default config.
 */
export function useRouteConfig(): RouteConfig {
  const pathname = usePathname();

  const entries = Object.entries(routeConfig).filter(
    ([key]) => key !== "default",
  ) as [string, RouteConfig][];

  // Find the most specific (longest) prefix that matches the current pathname.
  const match = entries
    .filter(([prefix]) => pathname.startsWith(prefix))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return match ? match[1] : DEFAULT_CONFIG;
}
