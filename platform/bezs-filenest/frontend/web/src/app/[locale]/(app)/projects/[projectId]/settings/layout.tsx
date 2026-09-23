/**
 * Project settings layout — left-sidebar navigation for all /settings/* sub-pages.
 *
 * Mirrors the pattern of /settings/layout.tsx (app-level user settings) but scoped
 * to a single project. The active segment is highlighted; inactive items show
 * the title only (no badge/count) to keep the sidebar scannable.
 *
 * @module
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, HardDrive, Upload, ShieldCheck, Scale, Cpu } from "lucide-react";

const PROJECT_SETTINGS_NAV = [
  { segment: "general",    label: "General",    icon: Settings },
  { segment: "storage",    label: "Storage",    icon: HardDrive },
  { segment: "uploads",    label: "Uploads",    icon: Upload },
  { segment: "security",   label: "Security",   icon: ShieldCheck },
  { segment: "processing", label: "Processing", icon: Cpu },
  { segment: "compliance", label: "Compliance", icon: Scale },
] as const;

export default function ProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const base = `/projects/${params.projectId}/settings`;

  return (
    <div className="flex gap-8 min-h-full">
      <nav className="w-44 shrink-0">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Project settings
        </p>
        <ul className="space-y-0.5">
          {PROJECT_SETTINGS_NAV.map(({ segment, label, icon: Icon }) => {
            const href = `${base}/${segment}`;
            const active = pathname.includes(`/settings/${segment}`);
            return (
              <li key={segment}>
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
