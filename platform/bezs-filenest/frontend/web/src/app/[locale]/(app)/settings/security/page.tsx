/**
 * Security settings page — Phase 1 placeholder.
 * @module
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="text-muted-foreground text-sm">Manage passwords, 2FA, and API keys.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 4</CardTitle>
          <CardDescription>
            Password change, two-factor authentication, and active session management will be
            available when the full console ships.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
