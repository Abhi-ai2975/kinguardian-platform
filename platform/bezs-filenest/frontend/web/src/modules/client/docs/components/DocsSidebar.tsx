/**
 * DocsSidebar — collapsible left navigation tree for the docs section.
 *
 * Reads docsNav to render all sections. Detects the active page via
 * usePathname() and auto-expands the section containing it. Sections
 * without the active page start collapsed; toggle state is local only
 * (not persisted across refreshes).
 *
 * @module
 */
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsNav } from "../config/nav";

export function DocsSidebar() {
  const pathname = usePathname();

  const initialOpen = docsNav.reduce<Record<string, boolean>>((acc, section) => {
    acc[section.title] = section.items.some((item) => item.href === pathname);
    return acc;
  }, {});

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => ({
      ...docsNav.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.title] = true;
        return acc;
      }, {}),
    }),
  );

  // Re-expand the section containing the active page when route changes
  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      docsNav.forEach((section) => {
        if (section.items.some((item) => item.href === pathname)) {
          next[section.title] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  function toggle(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <nav
      aria-label="Docs navigation"
      className="hidden lg:block w-56 shrink-0"
    >
      <div className="sticky top-20 space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)] pb-10 pr-2">
        {docsNav.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggle(section.title)}
              className="flex w-full items-center justify-between mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              {section.title}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  openSections[section.title] ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>

            {openSections[section.title] && (
              <ul className="space-y-0.5 border-l border-border/60 pl-3">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "block rounded-sm py-1 px-2 text-sm transition-colors",
                          isActive
                            ? "font-medium text-foreground bg-muted"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
