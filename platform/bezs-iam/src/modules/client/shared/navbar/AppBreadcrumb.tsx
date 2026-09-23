"use client";

import { Fragment } from "react";
import { usePathname, Link } from "@/i18n/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ------------------------------------------------------------------ //
// Add a label for any route segment that should have a human-readable name.
// Segments not listed here are treated as IDs and shown truncated.
// ------------------------------------------------------------------ //
const SEGMENT_LABELS: Record<string, string> = {
  // Top-level
  admin: "Admin",
  // Users & Auth
  users: "Users",
  sessions: "Sessions",
  consents: "Consents",
  // OAuth
  "oauth-clients": "OAuth Clients",
  // Organizations
  organizations: "Organizations",
  // Agent Auth
  "agent-auth": "Agent Auth",
  // Apps / Navigation
  apps: "Apps",
  menus: "Menus",
  // Resources
  resources: "Resources",
  "resource-actions": "Resource Actions",
  // Org roles
  roles: "Roles",
};

function getLabel(segment: string): string {
  const known = SEGMENT_LABELS[segment];
  if (known) return known;
  // Unknown segment is a dynamic ID — show a short truncation
  return segment.length > 8 ? `${segment.slice(0, 6)}…` : segment;
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  // next-intl's usePathname strips the locale prefix automatically
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: getLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
