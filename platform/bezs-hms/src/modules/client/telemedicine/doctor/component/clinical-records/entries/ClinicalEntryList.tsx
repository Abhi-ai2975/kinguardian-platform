/**
 * ClinicalEntryList — compact scannable list of clinical entries with a
 * click-through detail drawer.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / entries
 *
 * Replaces the review page's flat-card editors, which rendered every field of
 * every entry at once (a MedicationItem shows ~15 fields, so a five-drug visit
 * was a multi-thousand-pixel scroll with nothing scannable). Here each entry is
 * one row — name, coding status, and a summary of the values that identify it —
 * and the full field set opens in a side drawer.
 *
 * Generic over the four clinical form-item types: the caller supplies how to
 * create a blank item, how to summarise one, and which fields to render in the
 * drawer. The list itself owns only which row is open.
 *
 * Fully controlled — every mutation goes out through `onChange` so the
 * workspace's staging autosave sees it.
 */

"use client";

import { useState } from "react";
import { Loader2, Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClinicalEntryDrawer } from "./ClinicalEntryDrawer";
import { ClinicalEntryRow } from "./ClinicalEntryRow";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The fields every clinical form item shares. The four concrete types
 * (ConditionFormItem, ObservationFormItem, …) all satisfy this.
 */
export interface ClinicalEntryBase {
  /** Stable list key — a UUID for new items, the FHIR id for saved ones. */
  id: string;
  /** Human-readable name shown as the row title. */
  display: string;
  /** Short terminology system name, e.g. "SNOMED". */
  terminologySystem: string;
  /** Present once the entry has been published to the EMR. */
  fhirId?: number;
  /** Set once a terminology code has been resolved for the entry. */
  resolved?: { code: string; system: string; display: string; text: string };
}

interface ClinicalEntryListProps<T extends ClinicalEntryBase> {
  /** Current entries — controlled by the workspace. */
  items: T[];
  /** Called with the full updated list on any add, edit or remove. */
  onChange: (items: T[]) => void;
  /** Section icon. */
  icon: LucideIcon;
  /** Section title, e.g. "Prescriptions". */
  title: string;
  /** Label for the add button, e.g. "Add medication". */
  addLabel: string;
  /** Message shown when the list is empty. */
  emptyLabel: string;
  /** Creates a blank entry when the doctor clicks add. */
  createItem: () => T;
  /** Builds the one-line summary shown beneath each row title. */
  summary: (item: T) => string;
  /** Renders the drawer body for one entry. */
  renderFields: (item: T, onItemChange: (item: T) => void) => React.ReactNode;
  /** Optional hint shown in the section header. */
  hint?: string;
  /**
   * Optional content rendered attached beneath a row, inside the same bordered
   * group. Return null for rows that need none.
   *
   * Exists for Orders, where each order carries its own uploaded result files
   * and an upload action. Those used to live in a second section listing every
   * published order again — so an order appeared twice on one screen, and its
   * files sat nowhere near the order they belonged to.
   */
  renderRowExtra?: (item: T) => React.ReactNode;
  /**
   * Writes one entry to the EMR, resolving to its FHIR id.
   *
   * When supplied the list becomes a direct editor: the drawer gains a Save
   * button, edits are held locally until it is pressed, and the returned id is
   * written back onto the entry so the next save updates rather than
   * duplicates. When omitted the list stays a controlled form and the caller
   * owns persistence.
   */
  onPersistItem?: (item: T) => Promise<number>;
  /**
   * Removes one entry from the EMR. Called before it leaves the list, so a
   * failed delete leaves the entry visible rather than silently dropping it
   * from the screen while it still exists in the record.
   */
  onDeleteItem?: (item: T) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Section of clinical entries as compact rows, editable via a detail drawer.
 *
 * @param props - See ClinicalEntryListProps.
 */
export function ClinicalEntryList<T extends ClinicalEntryBase>({
  items,
  onChange,
  icon: Icon,
  title,
  addLabel,
  emptyLabel,
  createItem,
  summary,
  renderFields,
  hint,
  renderRowExtra,
  onPersistItem,
  onDeleteItem,
}: ClinicalEntryListProps<T>) {
  /** Id of the entry currently open in the drawer, or null when closed. */
  const [openId, setOpenId] = useState<string | null>(null);
  /** True while a save or delete is in flight. */
  const [isBusy, setIsBusy] = useState(false);
  /**
   * The entry being edited in the drawer, held apart from the list while
   * onPersistItem is in use.
   *
   * Direct-to-EMR editing needs a buffer: without one every keystroke would
   * land in the list, and an abandoned edit would leave the row showing changes
   * that were never written to the record.
   */
  const [draft, setDraft] = useState<T | null>(null);
  /** Entry awaiting delete confirmation, or null when none is pending. */
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);

  const listItem = items.find((i) => i.id === openId) ?? null;
  const openItem = onPersistItem ? draft : listItem;

  /**
   * Appends a blank entry and opens it for editing.
   *
   * In direct-to-EMR mode the blank entry is opened as a draft only — it does
   * not join the list until it saves, so cancelling never leaves an empty row
   * behind.
   */
  function handleAdd() {
    const item = createItem();
    if (onPersistItem) {
      setDraft(item);
    } else {
      onChange([...items, item]);
    }
    setOpenId(item.id);
  }

  /** Opens an existing entry, seeding the draft buffer from it. */
  function handleOpen(item: T) {
    setDraft(item);
    setOpenId(item.id);
  }

  /** Applies a field edit — to the draft when buffering, else to the list. */
  function handleItemChange(next: T) {
    if (onPersistItem) {
      setDraft(next);
      return;
    }
    onChange(items.map((i) => (i.id === next.id ? next : i)));
  }

  /** Closes the drawer, discarding any unsaved draft. */
  function handleClose() {
    setOpenId(null);
    setDraft(null);
  }

  /**
   * Writes the open draft to the EMR, then merges it into the list with the id
   * the server assigned.
   */
  async function handleSave() {
    if (!onPersistItem || !draft) return;
    setIsBusy(true);
    try {
      const fhirId = await onPersistItem(draft);
      const saved = { ...draft, fhirId } as T;
      /* Present already means this was an edit; absent means a new entry. */
      onChange(
        items.some((i) => i.id === saved.id)
          ? items.map((i) => (i.id === saved.id ? saved : i))
          : [...items, saved],
      );
      handleClose();
    } catch (err) {
      console.error("[ClinicalEntryList] save failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not save. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * Removes an entry, deleting it from the EMR first when it exists there.
   * The row only disappears once the delete has succeeded.
   */
  function handleRemove(id: string) {
    const item = items.find((i) => i.id === id);

    /*
     * Deletes now go straight to FHIR, so removing a saved entry takes it out
     * of the patient's record with nothing to undo it. Confirm first.
     *
     * An entry with no fhirId was never written anywhere — discarding it loses
     * only what is on screen, so it goes immediately rather than nagging.
     */
    if (onDeleteItem && item?.fhirId != null) {
      setPendingDelete(item);
      return;
    }

    void performRemove(id);
  }

  /**
   * Carries out a removal that has already been confirmed, or never needed
   * confirming. The row leaves the list only once the EMR delete has
   * succeeded — a failure leaves it visible rather than dropping it from the
   * screen while it still exists in the record.
   *
   * @param id - List id of the entry to remove.
   */
  async function performRemove(id: string) {
    const item = items.find((i) => i.id === id);

    if (onDeleteItem && item) {
      setIsBusy(true);
      try {
        await onDeleteItem(item);
      } catch (err) {
        console.error("[ClinicalEntryList] delete failed:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Could not remove. Please try again.",
        );
        setIsBusy(false);
        return;
      }
      setIsBusy(false);
    }

    setPendingDelete(null);
    onChange(items.filter((i) => i.id !== id));
    if (openId === id) handleClose();
  }

  return (
    <Card>
      <CardContent className="px-4 py-3.5 space-y-3">
        {/* ── Section header ── */}
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary shrink-0" />
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant="secondary" className="text-xs font-normal">
            {items.length}
          </Badge>

          {hint && (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              {hint}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 text-xs shrink-0"
            onClick={handleAdd}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </div>

        <Separator />

        {/* ── Rows ── */}
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          /*
           * Two layouts, chosen by whether rows carry attached content.
           *
           * Plain entries are one-liners, so hairline-divided rows in a single
           * box read as a tight scannable list — the right density for them.
           *
           * Rows with attachments are not one-liners: an order plus its result
           * files is a block several lines tall, and in a shared box those
           * blocks run together into one slab where it is not obvious which
           * files belong to which order. Each becomes its own card with a gap
           * between, so one order reads as one unit.
           */
          <div className={renderRowExtra ? "space-y-2.5" : "divide-y rounded-md border"}>
            {items.map((item) => {
              const extra = renderRowExtra?.(item);
              return (
                <div
                  key={item.id}
                  className={
                    renderRowExtra
                      ? "overflow-hidden rounded-lg border bg-card shadow-xs"
                      : undefined
                  }
                >
                  <ClinicalEntryRow
                    title={item.display}
                    summary={summary(item)}
                    terminologySystem={item.terminologySystem}
                    isCoded={Boolean(item.resolved?.code)}
                    isPublished={item.fhirId != null}
                    onOpen={() => handleOpen(item)}
                    onRemove={() => handleRemove(item.id)}
                  />
                  {extra && <div className="border-t px-3 py-2.5">{extra}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Affordance repeated at the bottom for long lists */}
        {items.length > 3 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground"
            onClick={handleAdd}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        )}
      </CardContent>

      {/* ── Detail drawer ── */}
      <ClinicalEntryDrawer
        open={openItem !== null}
        title={openItem?.display || title}
        isPublished={openItem?.fhirId != null}
        onClose={handleClose}
        onSave={onPersistItem ? () => void handleSave() : undefined}
        isSaving={isBusy}
        onRemove={
          /* A draft that has never been saved is discarded, not deleted —
             there is nothing in the record to remove. */
          openItem && items.some((i) => i.id === openItem.id)
            ? () => void handleRemove(openItem.id)
            : openItem
              ? handleClose
              : undefined
        }
      >
        {openItem ? renderFields(openItem, handleItemChange) : null}
      </ClinicalEntryDrawer>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove &ldquo;{pendingDelete?.display || "this entry"}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes it from the patient&apos;s medical record straight
              away. It cannot be undone — re-adding it creates a new entry with
              a new history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              className="bg-destructive text-white hover:bg-destructive/90"
              /* Not auto-closing: the dialog stays until the delete resolves,
                 so a failure surfaces while the entry is still in context. */
              onClick={(ev) => {
                ev.preventDefault();
                if (pendingDelete) void performRemove(pendingDelete.id);
              }}
            >
              {isBusy && <Loader2 className="size-3.5 animate-spin" />}
              {isBusy ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
