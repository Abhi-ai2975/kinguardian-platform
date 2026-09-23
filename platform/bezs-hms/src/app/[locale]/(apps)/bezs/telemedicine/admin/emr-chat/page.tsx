/**
 * EMR Chat page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/bezs/telemedicine/admin/emr-chat
 *
 * Conversational FHIR workflow assistant. Users describe what they need in
 * natural language (e.g. "register a new patient", "book an appointment for
 * John Smith") and the system resolves the intent to the matching FHIR workflow,
 * then renders the form steps inline in the chat.
 *
 * Sessions are persisted to PostgreSQL via the EmrChatSession server module so
 * users can leave mid-workflow and resume exactly where they left off.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

/**
 * Loads the authenticated user's context from the session and renders
 * the EMR chat interface with persistence enabled.
 */
export default async function EMRChatPage() {
  const session = await getServerSession();
  const userId = session?.user?.id ?? "";
  const orgId = session?.session?.activeOrganizationId ?? null;

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      basePath="/bezs/telemedicine/admin/emr-chat"
    />
  );
}
