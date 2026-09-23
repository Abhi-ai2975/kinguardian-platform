/**
 * CreateApiKeyModal — Dialog wrapper around CreateApiKeyFlow.
 *
 * Step management and reveal UI live in CreateApiKeyFlow. The modal tracks
 * whether a key has been created (for the title) and wires onDone to
 * incrementTrigger + onClose.
 *
 * @module
 */
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApiKeyStore } from "../stores/api-key.store";
import { CreateApiKeyFlow } from "../components/CreateApiKeyFlow";
import type { TCreatedApiKey } from "@/modules/entities/schemas/api-key";

interface CreateApiKeyModalProps {
  organizationId: string;
  projectId: string;
}

export function CreateApiKeyModal({ organizationId, projectId }: CreateApiKeyModalProps) {
  const { isOpen, modalType, onClose, incrementTrigger } = useApiKeyStore();
  const [revealed, setRevealed] = React.useState(false);

  const open = isOpen && modalType === "createApiKey";

  function handleOpenChange(o: boolean) {
    if (!o) {
      if (revealed) incrementTrigger();
      setRevealed(false);
      onClose();
    }
  }

  function handleDone(_key: TCreatedApiKey) {
    incrementTrigger();
    setRevealed(false);
    onClose();
  }

  React.useEffect(() => {
    if (!open) setRevealed(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {revealed ? "API key created" : "New API key"}
          </DialogTitle>
          {!revealed && (
            <DialogDescription>
              Keys are project-scoped. Scopes limit what the key can do.
            </DialogDescription>
          )}
        </DialogHeader>

        <CreateApiKeyFlow
          organizationId={organizationId}
          projectId={projectId}
          onCreated={() => setRevealed(true)}
          onDone={handleDone}
          doneLabel="Done"
        />
      </DialogContent>
    </Dialog>
  );
}
