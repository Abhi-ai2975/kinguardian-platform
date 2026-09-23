/**
 * RootNavbar — fixed top navigation for the DrGodly marketing landing page.
 *
 * Layer: client / (marketing) / components
 *
 * Renders the brand logo, main nav links (FHIR EMR, Platform, Security,
 * Integrations), and action buttons (Sign In / Sign Up or Open App if
 * already authenticated). Becomes opaque + blurred on scroll.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OAuthPkceButton } from "@/modules/client/auth/components/OAuthPkceButton";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import LocaleSwitcher from "@/modules/client/shared/components/LocaleSwitcher";
import { NavUser } from "@/modules/client/shared/components/NavUser";
import { Link, useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthResponse } from "@/modules/server/auth/types";

/**
 * Top navigation bar for the marketing landing page.
 *
 * @param session - Current server session (null if unauthenticated).
 */
export default function RootNavbar({
  session,
}: {
  session: AuthResponse | null;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const user = session
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        username: session.user.username,
      }
    : null;

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">
              DrGodly
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold ml-1 hidden sm:inline-flex border-primary/30 text-primary"
            >
              FHIR R4
            </Badge>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/fhir-emr"
              className="text-muted-foreground font-medium hover:text-primary transition-colors"
            >
              FHIR EMR
            </Link>
            <Link
              href="/ai-agents"
              className="text-muted-foreground font-medium hover:text-primary transition-colors"
            >
              AI Agents
            </Link>
            <Link
              href="/hipaa"
              className="text-muted-foreground font-medium hover:text-primary transition-colors"
            >
              Security
            </Link>
            <Link
              href="/mcp"
              className="text-muted-foreground font-medium hover:text-primary transition-colors"
            >
              MCP API
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <ThemeSwitcher />
            {!user ? (
              <>
                <OAuthPkceButton
                  variant="ghost"
                  size="sm"
                  className="font-semibold rounded-full"
                >
                  Sign In
                </OAuthPkceButton>
                <OAuthPkceButton
                  size="sm"
                  className="rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                >
                  Get Started Free
                </OAuthPkceButton>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                  onClick={() => {
                    const url =
                      session?.session.activeRoleRedirectUrl ??
                      "/bezs/telemedicine/patient/profile";
                    router.push(url as any);
                  }}
                >
                  Open App
                </Button>
                <NavUser user={user} />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
