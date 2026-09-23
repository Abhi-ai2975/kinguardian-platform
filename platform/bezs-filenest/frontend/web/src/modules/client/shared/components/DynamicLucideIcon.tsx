/**
 * DynamicLucideIcon — lazily loads any lucide-react icon by kebab-case name.
 *
 * Icons are cached after the first render so repeat usage doesn't re-fetch.
 * Falls back to a spinning loader while the icon chunk downloads.
 *
 * @module
 */
"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Loader2, type LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

type IconName = keyof typeof dynamicIconImports;

const iconCache: Partial<Record<IconName, ComponentType<LucideProps>>> = {};

export default function DynamicLucideIcon({
  name,
  ...props
}: { name: IconName } & LucideProps) {
  const Icon =
    iconCache[name] ||
    (iconCache[name] = dynamic(dynamicIconImports[name], {
      ssr: false,
      loading: () => <Loader2 className="animate-spin text-muted-foreground" />,
    }));

  if (!Icon) return null;
  return <Icon {...props} />;
}
