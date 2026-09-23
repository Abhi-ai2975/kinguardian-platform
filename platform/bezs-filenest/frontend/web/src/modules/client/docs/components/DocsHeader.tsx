/**
 * DocsHeader — fixed top navigation bar for the docs section.
 *
 * Contains the FileNest logo, primary docs links, a Cmd+K search trigger,
 * a theme toggle, and a "Go to Console" button. On mobile, a sheet menu
 * exposes the full sidebar nav.
 *
 * @module
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HardDrive, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/modules/client/shared/components/layout/ThemeSwitcher";
import { DocsSearch, DocsSearchTrigger } from "./DocsSearch";
import { DocsSidebar } from "./DocsSidebar";

export function DocsHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold shrink-0"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <HardDrive className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm">FileNest</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground">Docs</span>
          </Link>

          {/* Search — desktop */}
          <div className="hidden md:block ml-2">
            <DocsSearchTrigger onOpen={() => setSearchOpen(true)} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />

            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link href="/dashboard">Go to Console</Link>
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Search modal */}
      <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
                <HardDrive className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm">FileNest Docs</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search inside mobile menu */}
          <div className="border-b px-4 py-3">
            <DocsSearchTrigger
              onOpen={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
            />
          </div>

          {/* Sidebar nav reused in the sheet */}
          <div className="overflow-y-auto p-4">
            <DocsSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
