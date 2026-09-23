/**
 * FHIR EMR dedicated marketing page.
 *
 * Route: /[locale]/(marketing)/fhir-emr
 *
 * Server component. Fetches current session and renders the full
 * FhirEmrPage explaining HL7 FHIR R4 resources and interoperability.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Footer from "@/modules/client/(marketing)/components/Footer";
import { FhirEmrPage } from "@/modules/client/(marketing)/pages/FhirEmrPage";

export const dynamic = "force-dynamic";

/** FHIR EMR explanation page. */
export default async function FhirEmrRoute() {
  const session = await getServerSession();
  return (
    <>
      <RootNavbar session={session} />
      <main>
        <FhirEmrPage session={session} />
      </main>
      <Footer />
    </>
  );
}
