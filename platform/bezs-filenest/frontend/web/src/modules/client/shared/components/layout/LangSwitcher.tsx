/**
 * LangSwitcher — locale selector dropdown for all navbars.
 *
 * Reads the active locale from next-intl and uses the locale-aware router
 * to switch. Ready for additional locales — add them to routing.ts and
 * LOCALE_LABELS below.
 *
 * @module
 */
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, { short: string; label: string }> = {
  en: { short: "EN", label: "English" },
  fr: { short: "FR", label: "Français" },
  de: { short: "DE", label: "Deutsch" },
  es: { short: "ES", label: "Español" },
};

function getLocaleInfo(locale: string) {
  return LOCALE_LABELS[locale] ?? { short: locale.toUpperCase(), label: locale };
}

export function LangSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
  }

  const current = getLocaleInfo(locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 px-2 h-9 font-normal text-muted-foreground hover:text-foreground", className)}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {routing.locales.map((l) => {
          const info = getLocaleInfo(l);
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => switchLocale(l)}
              className={cn("gap-2", l === locale && "font-medium text-foreground")}
            >
              <span className="w-6 text-xs text-muted-foreground">{info.short}</span>
              {info.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
