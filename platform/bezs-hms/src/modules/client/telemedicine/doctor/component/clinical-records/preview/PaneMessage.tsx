/**
 * PaneMessage — centred status message filling the preview pane.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Shared by FilePreviewPane and DicomCanvas so "loading", "couldn't load" and
 * "unsupported" all look identical regardless of which renderer produced them —
 * a DICOM decode failure should not look like a different kind of error than a
 * presigned-link failure.
 */

interface PaneMessageProps {
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

/**
 * Centred message filling the pane, for non-rendered states.
 *
 * @param icon - Leading icon.
 * @param title - Headline.
 * @param body - Optional explanation.
 * @param action - Optional button.
 */
export function PaneMessage({ icon, title, body, action }: PaneMessageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 px-6 text-muted-foreground">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="max-w-sm text-center text-xs">{body}</p>}
      {action}
    </div>
  );
}
