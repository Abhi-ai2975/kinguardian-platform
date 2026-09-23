// Callout — styled note/warning/tip boxes usable directly in MDX files.
import { AlertTriangle, Info, Lightbulb, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "note" | "tip" | "warning" | "danger";

const config: Record<
  CalloutType,
  { icon: React.ElementType; classes: string }
> = {
  note: {
    icon: Info,
    classes: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
  },
  tip: {
    icon: Lightbulb,
    classes: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 text-green-900 dark:text-green-200",
  },
  warning: {
    icon: AlertTriangle,
    classes: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-200",
  },
  danger: {
    icon: XCircle,
    classes: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 text-red-900 dark:text-red-200",
  },
};

interface Props {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = "note", title, children }: Props) {
  const { icon: Icon, classes } = config[type];
  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", classes)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-sm leading-relaxed">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
