/**
 * ExtractedDataPanel — review, edit and approve what the AI read from the file.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * When a report is uploaded an agent reads it and extracts structured clinical
 * data — observations today, more resource types later. Nothing it produces may
 * enter the patient's record unreviewed, so this panel is the gate: the doctor
 * corrects the values, then approves or rejects each one.
 *
 * Named "Extracted" rather than "Findings" because it will not stay
 * observations-only, and "Findings" already means Observations specifically in
 * the Clinical Records workspace.
 *
 * UI only. The rows below are illustrative, held in local state, and nothing is
 * written anywhere. The header says so plainly — a list of plausible lab values
 * beside a real report is exactly the thing that gets mistaken for a real
 * reading of it.
 *
 * Wiring it later means replacing the seed with the agent's output and the
 * approve handlers with the same persistClinicalEntry the workspace uses; the
 * shape below is already the ObservationFormItem fields those need.
 */

"use client";

import { useState } from "react";
import {
  Check,
  CheckCheck,
  Pencil,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Where the doctor has got to with one extracted row. */
type ReviewState = "pending" | "approved" | "rejected";

/** One value the agent read out of the report. */
interface ExtractedObservation {
  id: string;
  /** What was measured. */
  display: string;
  /** The measured value, as text — not every result is numeric. */
  value: string;
  /** Unit, when the result carries one. */
  unit: string;
  /** Reference range as printed on the report. */
  referenceRange: string;
  /** True when the agent read the value as outside its reference range. */
  outOfRange: boolean;
  state: ReviewState;
}

// ── Placeholder data ──────────────────────────────────────────────────────────

/**
 * Illustrative rows, so the panel can be judged as a design.
 *
 * Replaced wholesale by the agent's output once extraction is wired. Flagged in
 * the header as sample data for as long as it is here.
 */
const SAMPLE_EXTRACTION: ExtractedObservation[] = [
  {
    id: "sample-1",
    display: "Haemoglobin",
    value: "11.2",
    unit: "g/dL",
    referenceRange: "13.0 – 17.0",
    outOfRange: true,
    state: "pending",
  },
  {
    id: "sample-2",
    display: "Mean corpuscular volume",
    value: "78",
    unit: "fL",
    referenceRange: "80 – 100",
    outOfRange: true,
    state: "pending",
  },
  {
    id: "sample-3",
    display: "White cell count",
    value: "7.4",
    unit: "10⁹/L",
    referenceRange: "4.0 – 11.0",
    outOfRange: false,
    state: "pending",
  },
  {
    id: "sample-4",
    display: "Platelet count",
    value: "295",
    unit: "10⁹/L",
    referenceRange: "150 – 400",
    outOfRange: false,
    state: "pending",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ExtractedDataPanelProps {
  /** Filename, named in the header so the panel has context. */
  fileTitle: string | null;
}

/**
 * Review queue for AI-extracted clinical data.
 *
 * @param fileTitle - Filename the data was read from.
 */
export function ExtractedDataPanel({ fileTitle }: ExtractedDataPanelProps) {
  const [rows, setRows] = useState<ExtractedObservation[]>(SAMPLE_EXTRACTION);
  /** Id of the row open for editing, or null when none is. */
  const [editingId, setEditingId] = useState<string | null>(null);

  const pending = rows.filter((r) => r.state === "pending");
  const approved = rows.filter((r) => r.state === "approved");

  /**
   * Applies a patch to one row.
   *
   * @param id - Row to change.
   * @param patch - Fields to overwrite.
   */
  function update(id: string, patch: Partial<ExtractedObservation>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /** Approves every row still awaiting a decision. */
  function approveAll() {
    setRows((prev) =>
      prev.map((r) => (r.state === "pending" ? { ...r, state: "approved" } : r)),
    );
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Unwired notice ── */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
        <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Interface preview — sample values, not read from{" "}
          {fileTitle ?? "this file"}
        </p>
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
          Coming soon
        </Badge>
      </div>

      {/* ── Queue summary ── */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          {pending.length > 0 ? (
            <>
              <span className="font-medium text-foreground">
                {pending.length}
              </span>{" "}
              awaiting your review
            </>
          ) : (
            "All entries reviewed"
          )}
        </p>
        {approved.length > 0 && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {approved.length} approved
          </Badge>
        )}

        {pending.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1.5 text-xs"
            onClick={approveAll}
          >
            <CheckCheck className="size-3.5" />
            Approve all
          </Button>
        )}
      </div>

      {/* ── Rows ── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {rows.map((row) => (
            <ExtractedRow
              key={row.id}
              row={row}
              isEditing={editingId === row.id}
              onEdit={() => setEditingId(row.id)}
              onDoneEditing={() => setEditingId(null)}
              onChange={(patch) => update(row.id, patch)}
              onApprove={() => {
                update(row.id, { state: "approved" });
                setEditingId(null);
              }}
              onReject={() => {
                update(row.id, { state: "rejected" });
                setEditingId(null);
              }}
              onReset={() => update(row.id, { state: "pending" })}
            />
          ))}
        </div>
      </ScrollArea>

      {/* ── Commit bar ──
          Separate from per-row approval on purpose: approving a row is a
          judgement about that value, writing them to the chart is one
          deliberate act the doctor performs once. */}
      <div className="flex items-center gap-2 border-t p-3">
        <p className="text-xs text-muted-foreground">
          {approved.length === 0
            ? "Approve entries to add them to the record"
            : `${approved.length} ready to add`}
        </p>
        <Button
          size="sm"
          className="ml-auto gap-1.5 text-xs"
          disabled
          title="Not connected yet"
        >
          <Check className="size-3.5" />
          Add to record
        </Button>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface ExtractedRowProps {
  row: ExtractedObservation;
  isEditing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
  onChange: (patch: Partial<ExtractedObservation>) => void;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}

/**
 * One extracted value: read it, correct it, accept or discard it.
 *
 * @param props - See ExtractedRowProps.
 */
function ExtractedRow({
  row,
  isEditing,
  onEdit,
  onDoneEditing,
  onChange,
  onApprove,
  onReject,
  onReset,
}: ExtractedRowProps) {
  const isDecided = row.state !== "pending";

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 transition-colors",
        row.state === "approved" &&
          "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
        /* Rejected stays visible but recedes — a doctor should be able to see
           what they discarded, and undo it. */
        row.state === "rejected" && "border-dashed bg-muted/30 opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {isEditing ? (
            <Input
              value={row.display}
              onChange={(e) => onChange({ display: e.target.value })}
              className="h-7 text-sm font-medium"
              placeholder="What was measured"
            />
          ) : (
            <p
              className={cn(
                "truncate text-sm font-medium",
                row.state === "rejected" && "line-through",
              )}
            >
              {row.display}
            </p>
          )}

          {/* Value + unit */}
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={row.value}
                onChange={(e) => onChange({ value: e.target.value })}
                className="h-7 w-24 text-sm"
                placeholder="Value"
              />
              <Input
                value={row.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                className="h-7 w-24 text-sm"
                placeholder="Unit"
              />
              <Input
                value={row.referenceRange}
                onChange={(e) => onChange({ referenceRange: e.target.value })}
                className="h-7 flex-1 text-sm"
                placeholder="Reference range"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-mono text-sm text-foreground">
                {row.value}
                {row.unit && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {row.unit}
                  </span>
                )}
              </span>
              {row.referenceRange && (
                <span className="text-muted-foreground">
                  ref {row.referenceRange}
                </span>
              )}
              {row.outOfRange && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400/50 text-[10px] font-normal text-amber-700 dark:text-amber-400"
                >
                  <TriangleAlert className="size-2.5" />
                  Out of range
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ── Decision ── */}
        <div className="flex shrink-0 items-center gap-1">
          {isDecided ? (
            <>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-normal",
                  row.state === "approved" &&
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                )}
              >
                {row.state === "approved" ? "Approved" : "Discarded"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={onReset}
                aria-label="Undo decision"
                title="Undo"
              >
                <Undo2 className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={isEditing ? onDoneEditing : onEdit}
                aria-label={isEditing ? "Finish editing" : "Edit entry"}
                title={isEditing ? "Done" : "Edit"}
              >
                {isEditing ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  <Pencil className="size-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={onReject}
                aria-label="Discard entry"
                title="Discard"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-7"
                onClick={onApprove}
                aria-label="Approve entry"
                title="Approve"
              >
                <Check className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
