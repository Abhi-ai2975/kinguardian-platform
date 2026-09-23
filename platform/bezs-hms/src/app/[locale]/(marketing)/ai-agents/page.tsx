/**
 * AI Clinical Agents dedicated marketing page.
 *
 * Route: /[locale]/(marketing)/ai-agents
 *
 * Server component. Fetches current session and renders the full AiAgentsPage
 * explaining the intake agent, consultation agent, and voice agent.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Footer from "@/modules/client/(marketing)/components/Footer";
import { AiAgentsPage } from "@/modules/client/(marketing)/pages/AiAgentsPage";

export const dynamic = "force-dynamic";

/** AI Clinical Agents explanation page. */
export default async function AiAgentsRoute() {
  const session = await getServerSession();
  return (
    <>
      <RootNavbar session={session} />
      <main>
        <AiAgentsPage session={session} />
      </main>
      <Footer />
    </>
  );
}
