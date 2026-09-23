// DocsSidebar — left-side navigation tree for the /docs site.
// Each section is collapsible. The section containing the active page is always
// expanded; all others default to open and can be toggled individually.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { docsNav } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

// Returns true if any item in the section matches the current pathname.
function sectionIsActive(items: { href: string }[], pathname: string) {
  return items.some((item) =>
    item.href === "/docs"
      ? pathname === "/docs"
      : pathname === item.href || pathname.startsWith(item.href + "/"),
  );
}

export function DocsSidebar() {
  const pathname = usePathname();

  // All sections start open; track which ones are collapsed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // When the pathname changes, ensure the section containing the active page
  // is expanded even if the user had previously collapsed it.
  useEffect(() => {
    docsNav.forEach((section) => {
      if (sectionIsActive(section.items, pathname)) {
        setCollapsed((prev) =>
          prev[section.title] ? { ...prev, [section.title]: false } : prev,
        );
      }
    });
  }, [pathname]);

  function toggle(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <aside className="w-60 shrink-0 hidden lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
        <nav className="space-y-4">
          {docsNav.map((section) => {
            const isOpen = !collapsed[section.title];

            return (
              <div key={section.title}>
                {/* Group label — visually distinct from items: no bg, pure label */}
                <button
                  onClick={() => toggle(section.title)}
                  className="flex w-full items-center justify-between px-1 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform duration-200",
                      !isOpen && "-rotate-90",
                    )}
                  />
                </button>

                {/* Collapsible items — indented under the group label */}
                {isOpen && (
                  <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                    {section.items.map((item) => {
                      const active =
                        item.href === "/docs"
                          ? pathname === "/docs"
                          : pathname === item.href ||
                            pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "block rounded-md px-2 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-accent font-medium text-foreground"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
