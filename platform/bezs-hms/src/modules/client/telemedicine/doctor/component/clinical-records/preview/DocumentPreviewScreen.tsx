/**
 * DocumentPreviewScreen — split view: the file beside chat and summary.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / preview
 *
 * Left is the document, right is a tabbed panel: the data an agent read out of
 * it and is waiting on approval for, a summary, and a chat to ask about it.
 * The divider is draggable so a doctor reading a dense scan can give it most of
 * the screen, and one working through the extracted values can do the reverse.
 *
 * The chosen split persists to localStorage, so a doctor who prefers 40/60 gets
 * it on every document rather than re-dragging on each one. Starts at 50/50.
 *
 * Restored imperatively after mount rather than passed as `defaultLayout`:
 * reading localStorage during render would produce different markup on the
 * server and the client, which React rejects as a hydration mismatch.
 *
 * Both panels have a floor so neither can be dragged shut — a collapsed pane
 * looks like a broken screen rather than a deliberate layout.
 */

"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  ListChecks,
  MessageSquare,
  ScrollText,
} from "lucide-react";
import type { GroupImperativeHandle, Layout } from "react-resizable-panels";
import { Link } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fileExtension,
  formatBytes,
  openAttachment,
} from "@/modules/client/telemedicine/shared/components/clinical/AttachmentList";
import { DocumentChatPanel } from "./DocumentChatPanel";
import { DocumentSummaryPanel } from "./DocumentSummaryPanel";
import { ExtractedDataPanel } from "./ExtractedDataPanel";
import { FilePreviewPane } from "./FilePreviewPane";

// ── Constants ─────────────────────────────────────────────────────────────────

/** localStorage key for the doctor's chosen split. */
const LAYOUT_KEY = "clinical-record-preview-split";

/** Smallest either pane may be dragged to, as a percentage. */
const MIN_PANE_PCT = 25;

/** Panel ids — the keys the persisted layout is stored under. */
const PANE_FILE = "preview-file";
const PANE_PANELS = "preview-panels";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentPreviewScreenProps {
  /** FileNest fileId being previewed. */
  fileId: string;
  /** Filename. */
  title: string | null;
  /** MIME type. */
  contentType: string | null;
  /** Size in bytes. */
  size: number | null;
  /** The order or document this file belongs to. */
  parentLabel: string;
  /** Where the back link goes — the tab the doctor came from. */
  backHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Two-pane document preview.
 *
 * @param props - See DocumentPreviewScreenProps.
 */
export function DocumentPreviewScreen({
  fileId,
  title,
  contentType,
  size,
  parentLabel,
  backHref,
}: DocumentPreviewScreenProps) {
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  /* Restore the saved split once the group exists. Corrupt or stale entries are
     ignored rather than throwing — a bad localStorage value should cost the
     preference, not the screen. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAYOUT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Layout;
      if (typeof saved?.[PANE_FILE] === "number") {
        groupRef.current?.setLayout(saved);
      }
    } catch {
      /* Unparseable — fall back to the 50/50 default. */
    }
  }, []);

  /**
   * Remembers the split after a drag settles.
   *
   * @param layout - Panel id → percentage.
   */
  function handleLayoutChanged(layout: Layout) {
    try {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      /* Private browsing or a full quota — not worth surfacing. */
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-3">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {title ?? "Untitled file"}
            </p>
            <Badge
              variant="secondary"
              className="shrink-0 font-mono text-[10px] font-normal"
            >
              {fileExtension(title, contentType)}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[parentLabel, formatBytes(size)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => void openAttachment(fileId, "view", title)}
          >
            <ExternalLink className="size-3.5" />
            Open in new tab
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => void openAttachment(fileId, "download", title)}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* ── Split ── */}
      <ResizablePanelGroup
        orientation="horizontal"
        groupRef={groupRef}
        onLayoutChanged={handleLayoutChanged}
        className="min-h-0 flex-1 overflow-hidden rounded-lg border"
      >
        <ResizablePanel id={PANE_FILE} defaultSize={50} minSize={MIN_PANE_PCT}>
          <FilePreviewPane
            fileId={fileId}
            title={title}
            contentType={contentType}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          id={PANE_PANELS}
          defaultSize={50}
          minSize={MIN_PANE_PCT}
        >
          <Tabs defaultValue="extracted" className="flex h-full flex-col gap-0">
            {/* Extracted leads: it is the only tab with work waiting on the
                doctor, and the reason the report was opened at all. */}
            <TabsList className="m-3 mb-0 grid shrink-0 grid-cols-3">
              <TabsTrigger value="extracted" className="gap-1.5 text-xs">
                <ListChecks className="size-3.5" />
                Extracted
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-1.5 text-xs">
                <ScrollText className="size-3.5" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <MessageSquare className="size-3.5" />
                Chat
              </TabsTrigger>
            </TabsList>

            {/* min-h-0 on each: without it the flex child refuses to shrink
                and the panel's own scroll area never engages. */}
            <TabsContent value="extracted" className="mt-3 min-h-0 flex-1">
              <ExtractedDataPanel fileTitle={title} />
            </TabsContent>

            <TabsContent value="chat" className="mt-3 min-h-0 flex-1">
              <DocumentChatPanel fileTitle={title} />
            </TabsContent>

            <TabsContent value="summary" className="mt-3 min-h-0 flex-1">
              <DocumentSummaryPanel
                fileTitle={title}
                parentLabel={parentLabel}
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
