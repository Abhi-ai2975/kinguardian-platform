/**
 * Static sidebar navigation data for the FileNest Console.
 *
 * mainNavGroups is shown to all authenticated users.
 * adminNavGroups is conditionally rendered for superadmins only.
 * Icon names are kebab-case lucide-react identifiers consumed by DynamicLucideIcon.
 *
 * @module
 */

import type { NavGroup } from "./types";

export const mainNavGroups: NavGroup[] = [
  {
    title: "Platform",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: "layout-dashboard" },
      { title: "Projects", url: "/projects", icon: "folder-open" },
    ],
  },
  {
    title: "Organisation",
    items: [
      { title: "Team", url: "/org/team", icon: "users" },
      { title: "Usage", url: "/org/usage", icon: "chart-column" },
    ],
  },
  {
    title: "Account",
    items: [{ title: "Settings", url: "/settings", icon: "settings" }],
  },
  {
    title: "Resources",
    items: [{ title: "Docs", url: "/docs", icon: "book-open" }],
  },
];

export const adminNavGroups: NavGroup[] = [
  {
    title: "Admin",
    items: [
      { title: "Users", url: "/admin/users", icon: "user" },
      {
        title: "Organisations",
        url: "/admin/organizations",
        icon: "building-2",
      },
      { title: "Projects", url: "/admin/projects", icon: "folder" },
    ],
  },
];
