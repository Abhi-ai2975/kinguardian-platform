/**
 * AppearanceSettings — accent color + dark/light mode picker.
 *
 * Reads and writes the compound "color-mode" theme string via next-themes.
 * Renders color swatches, a dark-mode toggle, a live preview card, and a
 * reset-to-default button.
 *
 * @module
 */
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, RotateCcw, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { THEME_COLORS, THEME_PREVIEWS, type ThemeColor } from "@/theme/ThemeProvider";

export default function AppearanceSettings() {
  const { color, mode, setColor, setMode, resetTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const isDark = mode === "dark";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Palette className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Appearance</h1>
          <p className="text-muted-foreground text-sm">Customise the look and feel of the console.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred colour and display mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </div>
              <div>
                <Label htmlFor="dark-mode" className="text-sm font-medium cursor-pointer">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark appearance</p>
              </div>
            </div>
            <Switch id="dark-mode" checked={isDark} onCheckedChange={(v) => setMode(v ? "dark" : "light")} />
          </div>

          <Separator />

          {/* Colour swatches */}
          <div>
            <Label className="text-sm font-medium block mb-1">Accent Colour</Label>
            <p className="text-xs text-muted-foreground mb-4">Choose your preferred accent colour</p>
            <div className="flex flex-wrap gap-4">
              {THEME_COLORS.map((c) => {
                const preview = THEME_PREVIEWS[c];
                const swatch = isDark ? preview.dark : preview.light;
                const isActive = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="flex flex-col items-center gap-1.5 group focus:outline-none"
                    aria-label={`Select ${preview.name} theme`}
                    aria-pressed={isActive}
                  >
                    <div
                      className={cn(
                        "size-9 rounded-full transition-all duration-200",
                        isActive
                          ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110 shadow-lg"
                          : "ring-1 ring-border group-hover:scale-110 group-hover:shadow-md",
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                    <span className={cn("text-[10px] font-medium capitalize", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {preview.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Live preview */}
          <div>
            <Label className="text-sm font-medium block mb-1">Preview</Label>
            <p className="text-xs text-muted-foreground mb-4">How your selected theme looks</p>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/40">
                <div className="size-2.5 rounded-full bg-destructive/60" />
                <div className="size-2.5 rounded-full bg-yellow-400/60" />
                <div className="size-2.5 rounded-full bg-green-500/60" />
                <div className="mx-auto h-5 w-36 rounded-md bg-background/80 border text-[9px] flex items-center justify-center text-muted-foreground font-mono">
                  console.filenest.io
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-3 w-20 rounded-md bg-foreground/80 mb-1.5" />
                    <div className="h-2 w-28 rounded-md bg-muted-foreground/40" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 w-16 rounded-md bg-primary flex items-center justify-center">
                      <div className="h-1.5 w-9 rounded bg-primary-foreground/70" />
                    </div>
                    <div className="h-6 w-16 rounded-md border bg-secondary flex items-center justify-center">
                      <div className="h-1.5 w-9 rounded bg-secondary-foreground/40" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[false, true, false].map((highlight, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg border p-2.5 space-y-1.5",
                        highlight ? "bg-primary/10 border-primary/30" : "bg-muted",
                      )}
                    >
                      <div className="h-1.5 w-8 rounded bg-muted-foreground/30" />
                      <div className={cn("h-3 w-full rounded", highlight ? "bg-primary/50" : "bg-muted-foreground/20")} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Active</Badge>
                  <Badge variant="secondary">Processing</Badge>
                  <Badge variant="outline">Draft</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset to Default</p>
              <p className="text-xs text-muted-foreground">Reverts to Teal · Light</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetTheme} className="gap-2">
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Badge variant="secondary" className="font-mono capitalize">
          {THEME_PREVIEWS[color]?.name ?? color} · {isDark ? "Dark" : "Light"}
        </Badge>
      </div>
    </div>
  );
}
