/**
 * Marketing layout — navbar + footer shell for the landing and feature pages.
 *
 * Checks auth server-side once so child pages receive isAuthenticated
 * via the RootNavbar without their own session fetch.
 *
 * @module
 */
import { getServerSession } from "@/modules/server/auth/get-session";
import { RootNavbar } from "@/modules/client/(marketing)/components/RootNavbar";
import { Footer } from "@/modules/client/(marketing)/components/Footer";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <RootNavbar isAuthenticated={isAuthenticated} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
