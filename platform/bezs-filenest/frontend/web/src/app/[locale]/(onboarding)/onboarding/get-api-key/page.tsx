/**
 * Get-API-key onboarding step.
 *
 * Reads orgId and projectId from URL search params (passed by the
 * create-project step). Renders CreateApiKeyFlow — the same two-step
 * form + reveal used in the Project API Keys page modal.
 *
 * On done: stores the raw key in sessionStorage for the install-sdk
 * snippets, then navigates to the next step.
 *
 * @module
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateApiKeyFlow } from "@/modules/client/api-keys/components/CreateApiKeyFlow";
import type { TCreatedApiKey } from "@/modules/entities/schemas/api-key";

export default function GetApiKeyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";
  const projectId = searchParams.get("projectId") ?? "";

  function handleDone(key: TCreatedApiKey) {
    sessionStorage.setItem("fn_onboarding_key", key.key);
    if (projectId) sessionStorage.setItem("fn_onboarding_project_id", projectId);
    router.push("/onboarding/install-sdk");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an API key</CardTitle>
        <CardDescription>
          This key authenticates your application with FileNest. It will only
          be shown once — copy it and store it securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateApiKeyFlow
          organizationId={orgId}
          projectId={projectId}
          onDone={handleDone}
          doneLabel="Continue to install SDK"
        />
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => router.push("/dashboard")}
        >
          Skip for now
        </Button>
      </CardContent>
    </Card>
  );
}
