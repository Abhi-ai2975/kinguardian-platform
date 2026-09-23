"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useCallback } from "react";
import { THEME_COLORS, type ThemeColor, type ThemeMode } from "@/theme/ThemeProvider";

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme();

  const parts = resolvedTheme?.split("-") ?? ["zinc", "light"];
  const color = (THEME_COLORS.includes(parts[0] as ThemeColor) ? parts[0] : "zinc") as ThemeColor;
  const mode: ThemeMode = parts[1] === "dark" ? "dark" : "light";

  const setColor = useCallback(
    (c: ThemeColor) => setTheme(`${c}-${mode}`),
    [setTheme, mode]
  );
  const setMode = useCallback(
    (m: ThemeMode) => setTheme(`${color}-${m}`),
    [setTheme, color]
  );
  const toggleMode = useCallback(
    () => setTheme(`${color}-${mode === "light" ? "dark" : "light"}`),
    [setTheme, color, mode]
  );
  const resetTheme = useCallback(() => setTheme("zinc-light"), [setTheme]);

  return {
    color,
    mode,
    theme: resolvedTheme ?? "zinc-light",
    setColor,
    setMode,
    toggleMode,
    resetTheme,
  };
}
