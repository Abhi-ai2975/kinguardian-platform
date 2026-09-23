/**
 * RootNavbar — top navigation bar for the marketing pages.
 *
 * Shows the FileNest logo, feature links, theme switcher, language switcher,
 * and auth-aware CTAs. Collapses to a mobile menu on small screens.
 *
 * @module
 */
"use client";

import Link from "next/link";
import { HardDrive, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/modules/client/shared/components/layout/ThemeSwitcher";
import { LangSwitcher } from "@/modules/client/shared/components/layout/LangSwitcher";

const NAV_LINKS = [
  { href: "/features/storage",    label: "Storage" },
  { href: "/features/processing", label: "Processing" },
  { href: "/features/search",     label: "Search" },
  { href: "/features/compliance", label: "Compliance" },
  { href: "/docs",                label: "Docs" },
] as const;

interface RootNavbarProps {
  isAuthenticated: boolean;
}

export function RootNavbar({ isAuthenticated }: RootNavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardDrive className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">FileNest</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-1">
          <LangSwitcher />
          <ThemeSwitcher />

          <div className="w-px h-5 bg-border mx-1" />

          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to Console</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: theme + lang + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <LangSwitcher />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("md:hidden border-t bg-background", open ? "block" : "hidden")}>
        <div className="flex flex-col gap-1 px-4 py-3">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm"><Link href="/dashboard">Go to Console</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm"><Link href="/login">Sign in</Link></Button>
                <Button asChild size="sm"><Link href="/signup">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
