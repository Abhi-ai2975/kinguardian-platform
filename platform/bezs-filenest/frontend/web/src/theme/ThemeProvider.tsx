/**
 * ThemeProvider — wraps next-themes with the data-theme compound system.
 *
 * Themes are "{color}-{mode}" strings (e.g. "teal-light", "blue-dark").
 * globals.css uses [data-theme="..."] selectors so every combination gets
 * its own full token set without any runtime JS overhead at paint time.
 *
 * @module
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

export const THEME_COLORS = [
  "zinc", "teal", "blue", "violet", "green", "rose", "orange",
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];
export type ThemeMode = "light" | "dark";

export const THEME_PREVIEWS: Record<ThemeColor, { light: string; dark: string; name: string }> = {
  zinc:   { light: "#18181b", dark: "#a1a1aa", name: "Zinc" },
  teal:   { light: "#0d9488", dark: "#2dd4bf", name: "Teal" },
  blue:   { light: "#2563eb", dark: "#60a5fa", name: "Blue" },
  violet: { light: "#7c3aed", dark: "#a78bfa", name: "Violet" },
  green:  { light: "#15803d", dark: "#4ade80", name: "Green" },
  rose:   { light: "#e11d48", dark: "#fb7185", name: "Rose" },
  orange: { light: "#ea580c", dark: "#fb923c", name: "Orange" },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="teal-light"
      enableSystem={false}
      storageKey="filenest-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
