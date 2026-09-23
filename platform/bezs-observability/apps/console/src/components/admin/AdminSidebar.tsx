// AdminSidebar — left navigation for the /admin section.
// Client component so it can read pathname for active state.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Key,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organisations", label: "Organisations", icon: Building2 },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 hidden lg:flex flex-col">
      <div className="sticky top-0 h-svh flex flex-col border-r bg-background py-6 pr-4">
        {/* Logo / title */}
        <div className="px-2 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Panel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Back to console */}
        <Link
          href="/overview"
          className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Console
        </Link>
      </div>
    </aside>
  );
}
