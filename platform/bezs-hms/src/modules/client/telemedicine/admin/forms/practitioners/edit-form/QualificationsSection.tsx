/**
 * QualificationsSection — immediate-mutation qualification management for
 * the Edit Practitioner Sheet.
 *
 * Layer: client / telemedicine / admin / forms / practitioners
 *
 * Same immediate-mutation model as IdentifiersSection — each add/delete
 * calls its dedicated sub-resource action right away, not deferred to the
 * parent form's Save button.
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
import { ReferenceSelect } from "@/modules/client/shared/components/ReferenceSelect";
import { searchOrganizationOptions } from "../../../queries/organization.queries";
import { useAdminStore } from "../../../stores/admin.store";
import {
  listPractitionerQualificationsAction,
  addPractitionerQualificationAction,
  deletePractitionerQualificationAction,
} from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import type { TPractitionerQualificationResponse } from "@/modules/entities/schemas/practitioner";

interface QualificationsSectionProps {
  practitionerId: number;
}

/** Draft shape for the "add new qualification" mini-form. */
interface TQualificationDraft {
  code_code?: string;
  code_display?: string;
  status_code?: string;
  issuer?: string;
  issuer_display?: string;
}

const EMPTY_DRAFT: TQualificationDraft = {};

/**
 * Lists existing qualifications with immediate delete, plus an inline
 * "add new" form that calls addPractitionerQualificationAction right away.
 */
export function QualificationsSection({ practitionerId }: QualificationsSectionProps) {
  const queryClient = useQueryClient();
  const orgId = useAdminStore((s) => s.data?.orgId ?? null);
  const queryKey = ["practitioners", practitionerId, "qualifications"] as const;
  const [draft, setDraft] = useState<TQualificationDraft>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [res, err] = await listPractitionerQualificationsAction({
        payload: { practitionerId },
      });
      if (err) throw new Error(err.message ?? "Failed to load qualifications");
      return res!;
    },
  });

  const issuerId = draft.issuer ? Number(draft.issuer.split("/")[1]) : undefined;

  async function handleAdd() {
    if (!draft.code_code && !draft.code_display) {
      toast.error("A qualification code or display is required");
      return;
    }
    setIsAdding(true);
    const [, err] = await addPractitionerQualificationAction({
      payload: { practitionerId, ...draft },
    });
    setIsAdding(false);
    if (err) {
      handleZSAError({ err, fallbackMessage: "Failed to add qualification" });
      return;
    }
    toast.success("Qualification added");
    setDraft(EMPTY_DRAFT);
    void queryClient.invalidateQueries({ queryKey });
  }

  async function handleDelete(itemId: number) {
    setDeletingId(itemId);
    const [, err] = await deletePractitionerQualificationAction({
      payload: { practitionerId, itemId },
    });
    setDeletingId(null);
    if (err) {
      handleZSAError({ err, fallbackMessage: "Failed to delete qualification" });
      return;
    }
    toast.success("Qualification deleted");
    void queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="flex flex-col gap-3 p-1 pr-3">
      <p className="text-sm text-muted-foreground">
        Certifications, licenses, and training. Changes here save immediately
        — they are not part of the form&apos;s Save Changes button.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data?.data.map((q: TPractitionerQualificationResponse) => (
        <Card key={q.id}>
          <CardContent className="flex items-center justify-between gap-2 py-3">
            <div className="text-sm">
              <p className="font-medium">
                {q.code_display ?? q.code_text ?? q.code_code ?? "Unknown"}
              </p>
              {q.issuer_display && (
                <p className="text-muted-foreground">{q.issuer_display}</p>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive"
              onClick={() => handleDelete(q.id)}
              disabled={deletingId === q.id}
            >
              {deletingId === q.id ? (
                <Loader2Icon className="animate-spin" data-icon />
              ) : (
                <Trash2Icon data-icon />
              )}
            </Button>
          </CardContent>
        </Card>
      ))}

      {!isLoading && data?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No qualifications yet.</p>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm">Add Qualification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Code</FieldLabel>
              <Input
                value={draft.code_code ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, code_code: e.target.value }))}
                placeholder="MD"
              />
            </Field>
            <Field>
              <FieldLabel>Display</FieldLabel>
              <Input
                value={draft.code_display ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, code_display: e.target.value }))}
                placeholder="Doctor of Medicine"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Status Code</FieldLabel>
            <Input
              value={draft.status_code ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, status_code: e.target.value }))}
              placeholder="active"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Issuer</FieldLabel>
              <ReferenceSelect
                fetchOptions={(q) => searchOrganizationOptions(q, orgId)}
                queryKey={["organizations", "picker", orgId]}
                value={issuerId ? { id: issuerId, label: draft.issuer_display ?? "" } : null}
                onChange={(opt) =>
                  setDraft((d) => ({
                    ...d,
                    issuer: opt ? `Organization/${opt.id}` : undefined,
                    issuer_display: opt?.label,
                  }))
                }
                placeholder="Search organizations…"
              />
            </Field>
            <Field>
              <FieldLabel>Issuer Display</FieldLabel>
              <Input
                value={draft.issuer_display ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, issuer_display: e.target.value }))}
                placeholder="State Medical Board"
              />
            </Field>
          </div>
          <Button type="button" size="sm" onClick={handleAdd} disabled={isAdding} className="self-end">
            {isAdding && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            <PlusIcon data-icon="inline-start" />
            Add Qualification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
