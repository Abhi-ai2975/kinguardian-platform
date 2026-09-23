/**
 * AdminSidebar — plain navigation panel for the telemedicine admin section.
 *
 * Layer: client / telemedicine / admin / components / nav
 *
 * Deliberately does NOT use the shared shadcn Sidebar suite
 * (SidebarProvider/Sidebar/SidebarTrigger/SidebarMenuButton). The top-level
 * app shell (`src/app/[locale]/(apps)/layout.tsx`) already mounts one
 * SidebarProvider around MenuBar + SidebarInset, and admin/layout.tsx renders
 * deep inside that SidebarInset's <main>. Nesting a second SidebarProvider
 * here would collide with two module-level singletons in sidebar.tsx:
 *  - SIDEBAR_COOKIE_NAME ("sidebar_state") — a hardcoded cookie key shared by
 *    every SidebarProvider instance on the page, so toggling one sidebar's
 *    persisted open/closed state would bleed into the other's.
 *  - The Ctrl/Cmd+B keyboard shortcut — each SidebarProvider registers its
 *    own global listener, so one keypress would toggle both sidebars at once.
 *
 * A plain flex nav sidesteps both issues entirely. It can graduate to a full
 * collapsible Sidebar later if those tradeoffs are ever addressed upstream.
 */

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "./adminNavItems";

/** Active-route check — matches on exact path or path-with-query. */
function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.split("?")[0] === href;
}

/** Renders the admin section's nav links as a plain vertical list. */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 space-y-1 border-r pr-3">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Admin
      </p>
      <nav className="flex flex-col gap-0.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActiveHref(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
