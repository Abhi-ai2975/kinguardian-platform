/**
 * Doctor EMR session page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/emr/[sessionId]
 *
 * Mirrors the admin /emr-chat/[sessionId] pattern. Pre-loads the chat session
 * from the database server-side and passes it to EMRChatContainer as
 * `initialSession` so the client renders with no loading flash.
 *
 * Security: verifies the session belongs to the authenticated user.
 * Returns 404 for unknown sessions or sessions owned by other users.
 */

import { notFound } from "next/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getSessionController } from "@/modules/server/core/emr-chat/interface-adapters/controllers";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

interface DoctorEMRSessionPageProps {
  params: Promise<{ locale: string; sessionId: string }>;
}

/**
 * Loads and renders an existing doctor EMR chat session.
 *
 * @param params - Route params containing locale and sessionId.
 */
export default async function DoctorEMRSessionPage({
  params,
}: DoctorEMRSessionPageProps) {
  const { sessionId } = await params;
  const authSession = await getServerSession();
  const userId = authSession?.user?.id ?? "";
  const orgId = authSession?.session?.activeOrganizationId ?? null;

  // Enforce practitioner profile requirement.
  await requirePractitionerProfile();

  let initialSession;
  try {
    initialSession = await getSessionController(sessionId);
  } catch {
    notFound();
  }

  // Prevent practitioners from viewing other users' sessions.
  if (initialSession.userId !== userId) {
    notFound();
  }

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      sessionId={sessionId}
      initialSession={initialSession}
      basePath="/bezs/telemedicine/doctor/emr"
    />
  );
}
