/**
 * Unauthorized page — shown when a user lacks the required role for a route.
 *
 * Layer: app / pages
 * Route: /[locale]/unauthorized
 *
 * Displayed by requireRole() when the user's activeRole does not match the
 * required role (e.g. accessing /telemedicine/admin without the "admin" role).
 */

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Static unauthorized page. No session check needed — this is purely a UI page.
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don&apos;t have permission to view this page. Contact your
          administrator if you believe this is a mistake.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
