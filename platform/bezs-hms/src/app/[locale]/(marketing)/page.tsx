/**
 * Marketing landing page for DrGodly.
 *
 * Route: /[locale]/(marketing)
 *
 * Server component. Fetches the current session to control CTA button
 * variants (Sign Up vs. Open Dashboard). Composes the full public-facing
 * landing page:
 *
 *   RootNavbar  — fixed top nav with FHIR EMR / Platform / Security / MCP API links
 *   Hero        — AI-native FHIR EMR headline, stat row, mock EMR card visual
 *   FhirEmrSection — FHIR R4 resource showcase + proprietary EMR comparison
 *   Features    — six-card grid: FHIR EMR, AI Agents, HIPAA, MCP, Voice, Telemedicine
 *   HowItWorks  — five-step AI FHIR clinical workflow timeline
 *   McpSection  — MCP Server integration explainer with live terminal simulation
 *   Testimonials (repurposed) — HIPAA/Security/Compliance trust section
 *   Cta         — Final sign-up CTA with compliance badges
 *   Footer      — Links + HL7/HIPAA/MCP compliance badges
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import RootNavbar from "@/modules/client/(marketing)/components/RootNavbar";
import Hero from "@/modules/client/(marketing)/components/Hero";
import FhirEmrSection from "@/modules/client/(marketing)/components/FhirEmrSection";
import Features from "@/modules/client/(marketing)/components/Features";
import HowItWorks from "@/modules/client/(marketing)/components/HowItWorks";
import McpSection from "@/modules/client/(marketing)/components/McpSection";
import Testimonials from "@/modules/client/(marketing)/components/Testimonials";
import Cta from "@/modules/client/(marketing)/components/Cta";
import Footer from "@/modules/client/(marketing)/components/Footer";

export const dynamic = "force-dynamic";

/** Marketing landing page. */
export default async function Home() {
  const session = await getServerSession();

  return (
    <>
      <RootNavbar session={session} />
      <main>
        <Hero session={session} />
        <FhirEmrSection />
        <Features />
        <HowItWorks />
        <McpSection />
        <Testimonials />
        <Cta session={session} />
      </main>
      <Footer />
    </>
  );
}
