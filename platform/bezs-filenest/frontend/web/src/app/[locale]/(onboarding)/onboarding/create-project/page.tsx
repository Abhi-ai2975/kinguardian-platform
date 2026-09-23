/**
 * Create-project onboarding step.
 *
 * Reuses CreateProjectForm from the main app. On success passes the project ID
 * as a URL param to the get-api-key step (no sessionStorage).
 *
 * @module
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectForm } from "@/modules/client/projects/forms/CreateProjectForm";
import type { TProject } from "@/modules/entities/schemas/project";

export default function CreateProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";

  function handleSuccess(data: TProject) {
    toast.success("Project created");
    router.push(`/onboarding/get-api-key?orgId=${orgId}&projectId=${data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your first project</CardTitle>
        <CardDescription>
          A project is where your files live. You can create more projects later
          from the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateProjectForm onSuccess={handleSuccess} />
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
