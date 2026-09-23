"use client";
// AppSwitcher — dropdown in the top nav for switching between apps.
// Fetches the org's app list from /api/apps and calls the switchActiveApp
// Server Action when the user picks an app or "All Apps".
import { useEffect, useState, useTransition } from "react";
import { AppWindow, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchActiveApp } from "@/app/actions/app";
import type { App } from "@/lib/apps";

interface AppSwitcherProps {
  activeAppId: string | null;
}

export function AppSwitcher({ activeAppId }: AppSwitcherProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [isPending, startTransition] = useTransition();

  function fetchApps() {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setApps(data); })
      .catch(() => {});
  }

  // Initial load so the active app label renders correctly on mount.
  useEffect(() => { fetchApps(); }, []);

  const activeApp = apps.find((a) => a.id === activeAppId) ?? null;
  const label = activeApp?.name ?? "All Apps";

  function select(appId: string | null) {
    startTransition(async () => {
      await switchActiveApp(appId);
    });
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) fetchApps(); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-medium max-w-[180px]"
          disabled={isPending}
        >
          <AppWindow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => select(null)} className="gap-2">
          <Check
            className={`h-3.5 w-3.5 ${activeAppId === null ? "opacity-100" : "opacity-0"}`}
          />
          All Apps
        </DropdownMenuItem>
        {apps.length > 0 && <DropdownMenuSeparator />}
        {apps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onClick={() => select(app.id)}
            className="gap-2"
          >
            <Check
              className={`h-3.5 w-3.5 shrink-0 ${activeAppId === app.id ? "opacity-100" : "opacity-0"}`}
            />
            <span className="truncate">{app.name}</span>
          </DropdownMenuItem>
        ))}
        {apps.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
            No apps yet — create one in Settings
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
