// SettingsSidebar — secondary navigation panel shown inside the settings section.
// Rendered as a client component so it can read the current pathname for active state.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, UsersRound, Key, CreditCard, AppWindow } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  { href: "/settings/org", label: "Organisation", icon: Building2 },
  { href: "/settings/members", label: "Members", icon: Users },
  { href: "/settings/teams", label: "Teams", icon: UsersRound },
  { href: "/settings/apps", label: "Apps", icon: AppWindow },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
] as const;

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-44 shrink-0 space-y-1">
      {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
