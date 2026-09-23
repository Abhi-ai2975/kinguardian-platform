// DocsHeader — fixed top bar for the /docs site.
// Contains logo, main nav links, search trigger, theme toggle, and GitHub link.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DocsSearch } from "./DocsSearch";
import { docsNav } from "@/lib/docs-nav";

export function DocsHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/docs" className="flex items-center gap-2 font-semibold shrink-0">
            <span className="text-primary text-lg font-bold">Watcher</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              docs
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {[
              { label: "Docs", href: "/docs" },
              { label: "API", href: "/docs/api/ingestion" },
              { label: "SDKs", href: "/docs/sdks/javascript" },
              { label: "Changelog", href: "/docs/changelog" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname.startsWith(href) && href !== "/docs"
                    ? "bg-accent text-foreground"
                    : pathname === href
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <DocsSearch />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* GitHub */}
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <a
              href="https://github.com/naveenraj-g/watcher24"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>

          {/* Back to app */}
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/overview">Dashboard →</Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <nav
            className="absolute left-0 top-16 bottom-0 w-72 overflow-y-auto bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {docsNav.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
