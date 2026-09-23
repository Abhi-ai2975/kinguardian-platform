/**
 * Settings layout — sidebar navigation wrapper for all /settings/* pages.
 *
 * @module
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Palette, Shield, MonitorSmartphone } from "lucide-react";

const SETTINGS_NAV = [
  { href: "/settings/profile",    label: "Profile",     icon: User },
  { href: "/settings/appearance", label: "Appearance",  icon: Palette },
  { href: "/settings/security",   label: "Security",    icon: Shield },
  { href: "/settings/sessions",   label: "Sessions",    icon: MonitorSmartphone },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 min-h-full">
      <nav className="w-48 shrink-0">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settings
        </p>
        <ul className="space-y-0.5">
          {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.includes(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 min-w-0 max-w-2xl">
        {children}
      </div>
    </div>
  );
}
