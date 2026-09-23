/**
 * IdentifiersSection — immediate-mutation identifier management for the Edit
 * Practitioner Sheet.
 *
 * Layer: client / telemedicine / admin / forms / practitioners
 *
 * Unlike the 4 `/full`-covered arrays (names, telecom, addresses,
 * communications), identifiers are a true sub-resource route with their own
 * lifecycle — each add/delete calls its dedicated action immediately, not
 * deferred to the parent form's Save button. Same interaction model as the
 * Photo section.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { TerminologySelect } from "@/modules/client/shared/components/TerminologySelect";
import {
  listPractitionerIdentifiersAction,
  addPractitionerIdentifierAction,
  deletePractitionerIdentifierAction,
} from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import type { TPractitionerIdentifierResponse } from "@/modules/entities/schemas/practitioner";

interface IdentifiersSectionProps {
  practitionerId: number;
}

/** Draft shape for the "add new identifier" mini-form. */
interface TIdentifierDraft {
  use?: string;
  value: string;
  system?: string;
  assigner?: string;
}

const EMPTY_DRAFT: TIdentifierDraft = { value: "" };

/**
 * Lists existing identifiers with immediate delete, plus an inline
 * "add new" form that calls addPractitionerIdentifierAction right away.
 */
export function IdentifiersSection({ practitionerId }: IdentifiersSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ["practitioners", practitionerId, "identifiers"] as const;
  const [draft, setDraft] = useState<TIdentifierDraft>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [res, err] = await listPractitionerIdentifiersAction({
        payload: { practitionerId },
      });
      if (err) throw new Error(err.message ?? "Failed to load identifiers");
      return res!;
    },
  });

  async function handleAdd() {
    if (!draft.value.trim()) {
      toast.error("Identifier value is required");
      return;
    }
    setIsAdding(true);
    const [, err] = await addPractitionerIdentifierAction({
      payload: { practitionerId, ...draft },
    });
    setIsAdding(false);
    if (err) {
      handleZSAError({ err, fallbackMessage: "Failed to add identifier" });
      return;
    }
    toast.success("Identifier added");
    setDraft(EMPTY_DRAFT);
    void queryClient.invalidateQueries({ queryKey });
  }

  async function handleDelete(itemId: number) {
    setDeletingId(itemId);
    const [, err] = await deletePractitionerIdentifierAction({
      payload: { practitionerId, itemId },
    });
    setDeletingId(null);
    if (err) {
      handleZSAError({ err, fallbackMessage: "Failed to delete identifier" });
      return;
    }
    toast.success("Identifier deleted");
    void queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <p className="text-sm text-muted-foreground">
        Business identifiers assigned to this practitioner. Changes here save
        immediately — they are not part of the form&apos;s Save Changes button.
      </p>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {data?.data.map((id: TPractitionerIdentifierResponse) => (
        <Card key={id.id}>
          <CardContent className="flex items-center justify-between gap-2 py-3">
            <div className="text-sm">
              {id.use && <span className="mr-2 capitalize text-muted-foreground">{id.use}</span>}
              <span className="font-medium">{id.value}</span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive"
              onClick={() => handleDelete(id.id)}
              disabled={deletingId === id.id}
            >
              {deletingId === id.id ? (
                <Loader2Icon className="animate-spin" data-icon />
              ) : (
                <Trash2Icon data-icon />
              )}
            </Button>
          </CardContent>
        </Card>
      ))}

      {!isLoading && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No identifiers yet.</p>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm">Add Identifier</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Use</FieldLabel>
              <TerminologySelect
                resource="Patient"
                field="identifier.use"
                valueType="code"
                value={draft.use}
                onChange={(v) => setDraft((d) => ({ ...d, use: (v as string) ?? undefined }))}
                placeholder="Select use"
              />
            </Field>
            <Field>
              <FieldLabel>Value *</FieldLabel>
              <Input
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                placeholder="NPI-1234567890"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>System URI</FieldLabel>
              <Input
                value={draft.system ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, system: e.target.value }))}
                placeholder="http://hl7.org/fhir/sid/us-npi"
              />
            </Field>
            <Field>
              <FieldLabel>Assigner</FieldLabel>
              <Input
                value={draft.assigner ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, assigner: e.target.value }))}
                placeholder="Credentialing Dept"
              />
            </Field>
          </div>
          <Button type="button" size="sm" onClick={handleAdd} disabled={isAdding} className="self-end">
            {isAdding && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            <PlusIcon data-icon="inline-start" />
            Add Identifier
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
