/**
 * ConfigUnavailable — inline error state shown when a project config row
 * cannot be loaded (e.g. project was created before the config migration).
 *
 * Replaces the Next.js 404 page so the user stays in the settings layout
 * and sees a clear, actionable message rather than a dead end.
 *
 * @module
 */
import { AlertCircle } from "lucide-react";

export function ConfigUnavailable() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm">
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">Configuration not available</p>
        <p className="text-muted-foreground">
          This project does not have a configuration record yet. This can happen
          for projects created before the configuration feature was introduced.
          Please contact support or re-create the project to resolve this.
        </p>
      </div>
    </div>
  );
}
