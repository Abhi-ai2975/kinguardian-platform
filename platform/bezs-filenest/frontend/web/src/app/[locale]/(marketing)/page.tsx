/**
 * Landing page — root of the FileNest marketing site.
 *
 * Checks session server-side to show authenticated vs unauthenticated CTAs.
 * All sections are split into focused client or server components in
 * modules/client/(marketing)/components/.
 *
 * @module
 */
import { getServerSession } from "@/modules/server/auth/get-session";
import { Hero } from "@/modules/client/(marketing)/components/Hero";
import { Features } from "@/modules/client/(marketing)/components/Features";
import { SdkSection } from "@/modules/client/(marketing)/components/SdkSection";
import { ComplianceSection } from "@/modules/client/(marketing)/components/ComplianceSection";
import { StorageSection } from "@/modules/client/(marketing)/components/StorageSection";
import { Cta } from "@/modules/client/(marketing)/components/Cta";

export default async function LandingPage() {
  const session = await getServerSession();
  const isAuthenticated = !!session;

  return (
    <>
      <Hero isAuthenticated={isAuthenticated} />
      <Features />
      <SdkSection />
      <ComplianceSection />
      <StorageSection />
      <Cta isAuthenticated={isAuthenticated} />
    </>
  );
}
