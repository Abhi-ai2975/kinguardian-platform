/**
 * Project layout — secondary nav tabs for a single project's sub-pages.
 *
 * Tabs: Files · API Keys · Webhooks · Settings
 *
 * @module
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Files, KeyRound, Webhook, Settings } from "lucide-react";

const PROJECT_NAV = [
  { segment: "files",    label: "Files",    icon: Files },
  { segment: "api-keys", label: "API Keys", icon: KeyRound },
  { segment: "webhooks", label: "Webhooks", icon: Webhook },
  { segment: "settings", label: "Settings", icon: Settings },
] as const;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const base = `/projects/${params.projectId}`;

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b">
        {PROJECT_NAV.map(({ segment, label, icon: Icon }) => {
          const href = `${base}/${segment}`;
          const active = pathname.includes(`/${segment}`);
          return (
            <Link
              key={segment}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
