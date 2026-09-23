"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

export const THEME_COLORS = [
  "zinc",
  "teal",
  "red",
  "rose",
  "orange",
  "green",
  "blue",
  "yellow",
  "violet",
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];
export type ThemeMode = "light" | "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="teal-light"
      enableSystem={false}
      storageKey="app-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
