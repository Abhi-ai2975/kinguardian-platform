"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Loader2, LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

type IconName = keyof typeof dynamicIconImports;

// cache per icon name so we only create each wrapper once
const iconCache: Partial<Record<IconName, ComponentType<LucideProps>>> = {};

export default function DynamicIcon({
  name,
  ...props
}: { name: IconName } & LucideProps) {
  const Icon =
    iconCache[name] ||
    (iconCache[name] = dynamic(dynamicIconImports[name], {
      ssr: false,
      loading: () => <Loader2 className="animate-spin text-muted-foreground" />,
    }));

  if (!Icon) {
    return null;
  }

  return <Icon {...props} />;
}
