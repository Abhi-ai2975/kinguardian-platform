/**
 * How It Works dedicated marketing page.
 *
 * Route: /[locale]/(marketing)/how-it-works
 *
 * Server component. Fetches current session and renders the full
 * HowItWorksPage — a deep dive on the AI FHIR clinical workflow for both
 * patients and doctors, plus the technical FHIR resource data flow.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Footer from "@/modules/client/(marketing)/components/Footer";
import { HowItWorksPage } from "@/modules/client/(marketing)/pages/HowItWorksPage";

export const dynamic = "force-dynamic";

/** Full clinical workflow explanation page. */
export default async function HowItWorksRoute() {
  const session = await getServerSession();
  return (
    <>
      <RootNavbar session={session} />
      <main>
        <HowItWorksPage session={session} />
      </main>
      <Footer />
    </>
  );
}
