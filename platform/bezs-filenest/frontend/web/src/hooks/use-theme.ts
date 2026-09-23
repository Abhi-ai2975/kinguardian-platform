/**
 * use-theme — custom hook wrapping next-themes for compound color+mode themes.
 *
 * Returns the parsed color and mode from the resolved theme string, plus
 * convenience setters. All components should import from here rather than
 * directly from next-themes so the parsing logic stays in one place.
 *
 * @module
 */
"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useCallback } from "react";
import { THEME_COLORS, type ThemeColor, type ThemeMode } from "@/theme/ThemeProvider";

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme();

  const parts = resolvedTheme?.split("-") ?? ["teal", "light"];
  const color = (THEME_COLORS.includes(parts[0] as ThemeColor) ? parts[0] : "teal") as ThemeColor;
  const mode: ThemeMode = parts[1] === "dark" ? "dark" : "light";

  const setColor = useCallback(
    (c: ThemeColor) => setTheme(`${c}-${mode}`),
    [setTheme, mode],
  );
  const setMode = useCallback(
    (m: ThemeMode) => setTheme(`${color}-${m}`),
    [setTheme, color],
  );
  const toggleMode = useCallback(
    () => setTheme(`${color}-${mode === "light" ? "dark" : "light"}`),
    [setTheme, color, mode],
  );
  const resetTheme = useCallback(() => setTheme("teal-light"), [setTheme]);

  return {
    color,
    mode,
    theme: resolvedTheme ?? "teal-light",
    setColor,
    setMode,
    toggleMode,
    resetTheme,
  };
}
