/**
 * Sidebar navigation type definitions.
 *
 * Shared between menu-datas.ts (static data) and NavGroup (renderer).
 * NavItem is either a leaf link or a collapsible group with sub-links.
 *
 * @module
 */

type BaseNavItem = {
  title: string;
  badge?: string;
  icon?: string;
  isLoading?: boolean;
};

type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

type NavItem = NavCollapsible | NavLink;

type NavGroup = {
  title: string;
  items: NavItem[];
};

export type { NavGroup, NavItem, NavCollapsible, NavLink };
