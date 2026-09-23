/**
 * EMR Chat session page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/emr-chat/[sessionId]
 *
 * Server page for an existing chat session. Loads the full session
 * (messages + active workflow state) from the database and passes it to
 * EMRChatContainer as `initialSession` so the client renders instantly
 * without a loading flash — no second DB round-trip on mount.
 *
 * Security: verifies the session belongs to the authenticated user.
 * Returns 404 for unknown sessions or sessions owned by other users.
 */

import { notFound } from "next/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getSessionController } from "@/modules/server/core/emr-chat/interface-adapters/controllers";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

interface EMRChatSessionPageProps {
  params: Promise<{ locale: string; sessionId: string }>;
}

/**
 * Loads and renders an existing EMR chat session.
 * Passes the pre-fetched session as a prop to avoid a client-side DB round-trip.
 *
 * @param params - Route params containing locale and sessionId.
 */
export default async function EMRChatSessionPage({
  params,
}: EMRChatSessionPageProps) {
  const { sessionId } = await params;
  const authSession = await getServerSession();
  const userId = authSession?.user?.id ?? "";
  const orgId = authSession?.session?.activeOrganizationId ?? null;

  let initialSession;
  try {
    initialSession = await getSessionController(sessionId);
  } catch {
    notFound();
  }

  // Prevent users from viewing other users' sessions.
  if (initialSession.userId !== userId) {
    notFound();
  }

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      sessionId={sessionId}
      initialSession={initialSession}
      basePath="/bezs/telemedicine/admin/emr-chat"
    />
  );
}
