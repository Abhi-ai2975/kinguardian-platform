/**
 * Sessions settings page — Phase 1 placeholder.
 * @module
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorSmartphone } from "lucide-react";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <MonitorSmartphone className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground text-sm">View and revoke active sessions.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 4</CardTitle>
          <CardDescription>
            Active session management and remote sign-out will be available when the full console ships.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
