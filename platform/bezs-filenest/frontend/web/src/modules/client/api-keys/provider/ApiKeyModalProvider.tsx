/**
 * ApiKeyModalProvider — mounts all API key modals once per page.
 *
 * Hydration-guarded with isMounted so modals don't render on the server.
 * Pass organizationId and projectId so modals can scope their IAM calls.
 *
 * @module
 */
"use client";

import { useState, useEffect } from "react";
import { CreateApiKeyModal } from "../modals/CreateApiKeyModal";
import { RevokeApiKeyModal } from "../modals/RevokeApiKeyModal";
import { ViewApiKeyDrawer } from "../modals/ViewApiKeyDrawer";

interface ApiKeyModalProviderProps {
  organizationId: string;
  projectId: string;
}

export function ApiKeyModalProvider({ organizationId, projectId }: ApiKeyModalProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return (
    <>
      <CreateApiKeyModal organizationId={organizationId} projectId={projectId} />
      <RevokeApiKeyModal projectId={projectId} />
      <ViewApiKeyDrawer />
    </>
  );
}
