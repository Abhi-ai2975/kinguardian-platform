/**
 * HIPAA compliance dedicated marketing page.
 *
 * Route: /[locale]/(marketing)/hipaa
 *
 * Server component. Fetches current session and renders the full
 * HipaaPage explaining DrGodly's HIPAA compliance architecture.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Footer from "@/modules/client/(marketing)/components/Footer";
import { HipaaPage } from "@/modules/client/(marketing)/pages/HipaaPage";

export const dynamic = "force-dynamic";

/** HIPAA compliance explanation page. */
export default async function HipaaRoute() {
  const session = await getServerSession();
  return (
    <>
      <RootNavbar session={session} />
      <main>
        <HipaaPage session={session} />
      </main>
      <Footer />
    </>
  );
}
