/**
 * LayoutBreadCrumb — conditionally renders BreadCrumb in the main content area.
 *
 * Layer: client / shared / components
 *
 * A thin client wrapper used by the apps layout. Checks route-config.json for
 * the current path — if breadcrumbs is false (e.g. EMR chat, which shows them
 * in the navbar instead) it renders nothing. BreadCrumb itself is kept
 * config-unaware so it can be rendered freely in the navbar too.
 */

"use client";

import { useRouteConfig } from "@/modules/client/shared/hooks/useRouteConfig";
import BreadCrumb from "./BreadCrumb";

/**
 * Renders BreadCrumb only when the current route's config has breadcrumbs: true.
 */
export default function LayoutBreadCrumb() {
  const { breadcrumbs } = useRouteConfig();
  if (!breadcrumbs) return null;
  return <BreadCrumb />;
}
