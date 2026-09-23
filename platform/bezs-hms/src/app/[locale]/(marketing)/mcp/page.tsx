/**
 * MCP Server dedicated marketing page.
 *
 * Route: /[locale]/(marketing)/mcp
 *
 * Server component. Fetches current session and renders the full McpPage
 * explaining the DrGodly Model Context Protocol server and FHIR tool layer.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Footer from "@/modules/client/(marketing)/components/Footer";
import { McpPage } from "@/modules/client/(marketing)/pages/McpPage";

export const dynamic = "force-dynamic";

/** MCP Server explanation page. */
export default async function McpRoute() {
  const session = await getServerSession();
  return (
    <>
      <RootNavbar session={session} />
      <main>
        <McpPage session={session} />
      </main>
      <Footer />
    </>
  );
}
