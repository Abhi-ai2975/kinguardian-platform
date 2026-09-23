/**
 * Callout — styled note/tip/warning/danger block for MDX content.
 *
 * Renders a bordered, icon-annotated box. Use inside MDX files as
 * <Callout type="tip" title="Pro tip">content</Callout>.
 *
 * @module
 */

import { Info, Lightbulb, TriangleAlert, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutType = "note" | "tip" | "warning" | "danger";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const config: Record<
  CalloutType,
  { icon: typeof Info; classes: string; titleClass: string }
> = {
  note: {
    icon: Info,
    classes: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
    titleClass: "text-blue-800 dark:text-blue-300",
  },
  tip: {
    icon: Lightbulb,
    classes:
      "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
    titleClass: "text-green-800 dark:text-green-300",
  },
  warning: {
    icon: TriangleAlert,
    classes:
      "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
    titleClass: "text-yellow-800 dark:text-yellow-300",
  },
  danger: {
    icon: CircleX,
    classes: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
    titleClass: "text-red-800 dark:text-red-300",
  },
};

export function Callout({ type = "note", title, children }: CalloutProps) {
  const { icon: Icon, classes, titleClass } = config[type] ?? config.note;

  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", classes)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", titleClass)} />
      <div className="flex-1 space-y-1 text-sm">
        {title && (
          <p className={cn("font-semibold leading-none", titleClass)}>{title}</p>
        )}
        <div className="text-foreground/80 [&>p]:m-0">{children}</div>
      </div>
    </div>
  );
}
