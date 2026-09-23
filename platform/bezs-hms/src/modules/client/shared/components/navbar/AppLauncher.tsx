"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { Grip, LayoutGrid, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface AppEntry {
  id: string;
  name: string;
  slug: string;
}

const APP_CONFIG: Record<string, { icon: LucideIcon; bg: string; fg: string }> =
  {
    telemedicine: { icon: Stethoscope, bg: "bg-blue-500", fg: "text-white" },
  };

export function AppLauncher({ apps = [] }: { apps?: AppEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Open apps"
        >
          <Grip className="size-5 text-zinc-500 dark:text-zinc-300" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-3">
        <p className="text-xs font-semibold text-muted-foreground px-1 mb-2 tracking-wide uppercase">
          Apps
        </p>
        {apps.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No apps available
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {apps.map((app) => {
              const cfg = APP_CONFIG[app.slug];
              const Icon = cfg?.icon ?? LayoutGrid;
              const bg = cfg?.bg ?? "bg-primary";
              const fg = cfg?.fg ?? "text-white";
              return (
                <Link
                  key={app.id}
                  href={`/bezs/${app.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-xl px-5 py-3 hover:bg-muted transition-colors group"
                >
                  <div className={`${bg} ${fg} rounded-xl p-2.5`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[11px] text-center leading-tight text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                    {app.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
