"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/" as const, label: "Home" },
  { href: "/bezs/settings" as const, label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          DrGodly
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Dark / Light toggle */}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
