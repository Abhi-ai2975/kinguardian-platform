/**
 * ThemeSwitcher — sun/moon toggle button for light ↔ dark mode.
 *
 * Uses the custom useTheme hook which reads resolvedTheme and exposes
 * toggleMode. Mounts only client-side to avoid hydration flicker.
 *
 * @module
 */
"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { mode, toggleMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("cursor-pointer", className)}
      onClick={toggleMode}
      aria-label="Toggle dark mode"
    >
      <Sun
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-300",
          mode === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-[1.2rem] w-[1.2rem] transition-all duration-300",
          mode === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0",
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
