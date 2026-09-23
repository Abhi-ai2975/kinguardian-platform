/**
 * Clinical Records — document analysis.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/clinical-records
 *        /[patientId]/[appointmentId]/analyse?serviceRequest={id}&attachment={id}
 *        ...                                 /analyse?document={id}&attachment={id}
 *
 * Server component. Guards match the workspace it is reached from:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Query params rather than further dynamic segments: this route is already two
 * segments deep, and the file is identified by a pair — the parent resource and
 * the attachment within it — which reads better as a query than as
 * /analyse/4021/5501.
 *
 * Resolution is two steps, the second scoped to the first, so each half fails
 * distinctly and a hand-edited URL cannot reach another patient's file. See
 * resolvePreviewFile.
 */

import { FileX, FolderX } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { resolvePreviewFile } from "@/modules/server/presentation/helpers/previewAttachment";
import { DocumentPreviewScreen } from "@/modules/client/telemedicine/doctor/component/clinical-records/preview/DocumentPreviewScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/** Route params and query string for the preview screen. */
interface DocumentPreviewPageProps {
  params: Promise<{ patientId: string; appointmentId: string; locale: string }>;
  searchParams: Promise<{
    serviceRequest?: string;
    document?: string;
    attachment?: string;
  }>;
}

/**
 * Preview one attachment from the patient's record.
 *
 * @param params - Dynamic route params.
 * @param searchParams - Identifies which attachment to show.
 */
export default async function DocumentPreviewPage({
  params,
  searchParams,
}: DocumentPreviewPageProps) {
  const { patientId, appointmentId } = await params;
  const query = await searchParams;
  const locale = await getLocale();

  // ── Guards ─────────────────────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session?.user) redirect({ href: "/login", locale });

  const practitioner = await requirePractitionerProfile();
  if (!practitioner) {
    redirect({ href: "/bezs/telemedicine/doctor/settings/profile", locale });
  }

  const workspaceHref = `/bezs/telemedicine/doctor/clinical-records/${patientId}/${appointmentId}`;

  const resolution = await resolvePreviewFile(query, parseInt(patientId, 10));

  // ── The order or document itself is gone ───────────────────────────────────
  if (!resolution.ok && resolution.reason !== "file-missing") {
    return (
      <PreviewError
        icon={<FolderX className="size-10 opacity-40" />}
        title={
          resolution.reason === "bad-request"
            ? "Nothing to preview"
            : "This order is no longer available"
        }
        body={
          resolution.reason === "bad-request"
            ? "The link is missing the details needed to find a file."
            : "It may have been removed from the patient's record since this link was opened."
        }
        backHref={workspaceHref}
      />
    );
  }

  // ── The parent exists but no longer carries the file ───────────────────────
  if (!resolution.ok) {
    return (
      <PreviewError
        icon={<FileX className="size-10 opacity-40" />}
        title="This file is no longer attached"
        /* The parent resolved, so the message can name what was being looked
           at rather than being a bare error. */
        body={`${resolution.parentLabel} no longer has this file. It may have been deleted or replaced.`}
        backHref={workspaceHref}
      />
    );
  }

  return (
    <DocumentPreviewScreen
      fileId={resolution.file.fileId}
      title={resolution.file.title}
      contentType={resolution.file.contentType}
      size={resolution.file.size}
      parentLabel={resolution.parentLabel}
      backHref={workspaceHref}
    />
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

/**
 * Full-page message for an unresolvable preview link.
 *
 * @param icon - Leading icon.
 * @param title - Headline.
 * @param body - Explanation.
 * @param backHref - Where the return button goes.
 */
function PreviewError({
  icon,
  title,
  body,
  backHref,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          {icon}
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="max-w-sm text-center text-xs">{body}</p>
          <Button asChild size="sm" variant="outline" className="mt-1">
            <Link href={backHref}>Back to the record</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
