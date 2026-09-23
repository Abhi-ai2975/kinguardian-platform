type BaseNavItem = {
  title: string;
  badge?: string;
  icon?: any;
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
