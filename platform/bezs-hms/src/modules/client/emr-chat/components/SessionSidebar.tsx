/**
 * SessionSidebar component.
 *
 * Layer: client / emr-chat / components
 *
 * History drawer that lists all ACTIVE chat sessions. Features:
 *   - Search bar: client-side title filter
 *   - Grouping: Pinned (floats to top) then Today / Yesterday / This Week / Older
 *   - Per-row actions: pin/unpin toggle, inline title rename, delete
 *
 * All mutations are optimistic — the store is updated immediately and the
 * server action fires in the background.
 */

"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Trash2,
  Clock,
  SquarePen,
  Search,
  Pin,
  PinOff,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TEmrChatSessionSummary } from "@/modules/entities/schemas/emr-chat";

// ── Grouping helpers ──────────────────────────────────────────────────────────

interface SessionGroup {
  label: string;
  sessions: TEmrChatSessionSummary[];
  isPinned?: boolean;
}

/**
 * Groups sessions into a "Pinned" section followed by date-recency buckets.
 * Pinned sessions are excluded from the date groups.
 *
 * @param sessions - All (already-filtered) session summaries.
 * @param now - Current date reference.
 * @returns Array of labelled groups in display order.
 */
function groupSessions(
  sessions: TEmrChatSessionSummary[],
  now: Date,
): SessionGroup[] {
  const pinned = sessions.filter((s) => s.pinned);
  const unpinned = sessions.filter((s) => !s.pinned);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const dateGroups: SessionGroup[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "This Week", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const s of unpinned) {
    const d = new Date(s.updatedAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() >= today.getTime()) {
      dateGroups[0].sessions.push(s);
    } else if (day.getTime() >= yesterday.getTime()) {
      dateGroups[1].sessions.push(s);
    } else if (day.getTime() >= weekAgo.getTime()) {
      dateGroups[2].sessions.push(s);
    } else {
      dateGroups[3].sessions.push(s);
    }
  }

  return [
    ...(pinned.length > 0
      ? [{ label: "Pinned", sessions: pinned, isPinned: true }]
      : []),
    ...dateGroups.filter((g) => g.sessions.length > 0),
  ];
}

// ── Component props ───────────────────────────────────────────────────────────

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TEmrChatSessionSummary[];
  activeSessionId: string | null;
  isLoading: boolean;
  /** Navigate to an existing session. */
  onSelectSession: (id: string) => void;
  /** Archive a session and navigate away if it was active. */
  onDeleteSession: (id: string) => void;
  /** Rename a session title inline. */
  onRenameSession: (id: string, title: string) => Promise<void>;
  /** Toggle the pinned state of a session. */
  onPinSession: (id: string, pinned: boolean) => Promise<void>;
  /** Start a fresh blank chat. */
  onNewChat: () => void;
}

/**
 * Slide-in drawer showing the session history.
 *
 * @param isOpen - Whether the Sheet is visible.
 * @param onClose - Called when the user dismisses the drawer.
 * @param sessions - Flat list of session summaries from the store.
 * @param activeSessionId - UUID of the currently open session.
 * @param isLoading - Whether to show skeleton rows.
 * @param onSelectSession - Called with the session UUID when a row is clicked.
 * @param onDeleteSession - Called with the session UUID to archive it.
 * @param onRenameSession - Called with id + new title to rename inline.
 * @param onPinSession - Called with id + pinned flag to toggle pin state.
 * @param onNewChat - Called when the "New Chat" button is clicked.
 */
export function SessionSidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onNewChat,
}: SessionSidebarProps) {
  const [search, setSearch] = useState("");

  // Client-side title filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      (s.title ?? "New Chat").toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const groups = useMemo(
    () => groupSessions(filtered, new Date()),
    [filtered],
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-5 pb-3 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            Chat History
          </SheetTitle>
        </SheetHeader>

        {/* New Chat button */}
        <div className="px-4 pb-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          >
            <SquarePen className="size-4" />
            New Chat
          </Button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions…"
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <Separator className="shrink-0" />

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex flex-col gap-2 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
              <MessageSquare className="size-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No previous chats</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
              <Search className="size-7 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                No sessions match &ldquo;{search}&rdquo;
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p
                    className={cn(
                      "px-2 pb-1 text-xs font-medium uppercase tracking-wider",
                      group.isPinned
                        ? "text-primary/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        onSelect={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        onDelete={() => onDeleteSession(session.id)}
                        onRename={(title) => onRenameSession(session.id, title)}
                        onPin={() => onPinSession(session.id, !session.pinned)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── SessionRow ────────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: TEmrChatSessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void>;
  onPin: () => Promise<void>;
}

/**
 * A single row in the session history list.
 *
 * Normal state: shows title, message count, active-workflow badge, and
 * hover-revealed action buttons (pin, rename, delete).
 *
 * Edit state: replaces the title with an inline text input that saves on
 * Enter or blur, and cancels on Escape.
 *
 * @param session - Session summary data.
 * @param isActive - Whether this session is currently open in the chat area.
 * @param onSelect - Navigate to this session.
 * @param onDelete - Archive this session.
 * @param onRename - Called with the new title when the user confirms an edit.
 * @param onPin - Toggle the pinned state.
 */
function SessionRow({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: SessionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title ?? "");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasWorkflows = session.workflows.length > 0;

  const displayTitle = session.title ?? "New Chat";

  // Focus the input whenever edit mode activates.
  useEffect(() => {
    if (isEditing) {
      setEditValue(session.title ?? "");
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [isEditing, session.title]);

  /** Commit the rename — no-op if empty or unchanged. */
  async function commitRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== (session.title ?? "")) {
      await onRename(trimmed);
    }
    setIsEditing(false);
  }

  /** Cancel edit without saving. */
  function cancelEdit() {
    setEditValue(session.title ?? "");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md px-2 py-1.5 bg-accent">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitRename(); }
            if (e.key === "Escape") cancelEdit();
          }}
          onBlur={commitRename}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary/50 py-0.5"
          aria-label="Rename session"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commitRename(); }}
          className="shrink-0 text-primary hover:text-primary/70"
          aria-label="Confirm rename"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Cancel rename"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-md overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={cn(
          "group flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50 text-foreground",
        )}
      >
        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayTitle}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {session.messageCount} {session.messageCount === 1 ? "msg" : "msgs"}
            </span>
            {session.hasActiveWorkflow && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                Resumable
              </Badge>
            )}
          </div>
        </div>

      {/* Action buttons — revealed on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Pin / unpin */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-6 text-muted-foreground",
            session.pinned
              ? "opacity-100 text-primary hover:text-primary/70"
              : "hover:text-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          aria-label={session.pinned ? "Unpin session" : "Pin session"}
        >
          {session.pinned ? (
            <PinOff className="size-3.5" />
          ) : (
            <Pin className="size-3.5" />
          )}
        </Button>

        {/* Rename */}
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          aria-label="Rename session"
        >
          <SquarePen className="size-3.5" />
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete session"
        >
          <Trash2 className="size-3.5" />
        </Button>

        {/* Expand workflow history — only shown when workflows exist */}
        {hasWorkflows && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            aria-label={isExpanded ? "Hide workflow history" : "Show workflow history"}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>

    {/* Workflow history sub-list */}
    {isExpanded && hasWorkflows && (
      <div className="ml-6 pl-2 border-l border-border flex flex-col gap-0.5 pb-1">
        {session.workflows.map((wf) => (
          <div key={wf.id} className="flex items-center gap-1.5 py-0.5">
            {wf.status === "COMPLETED" ? (
              <CheckCircle2 className="size-3 text-green-500 shrink-0" />
            ) : wf.status === "IN_PROGRESS" ? (
              <Loader2 className="size-3 text-primary animate-spin shrink-0" />
            ) : (
              <XCircle className="size-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {wf.workflowName}
            </span>
            {wf.status === "IN_PROGRESS" && (
              <span className="text-[10px] text-primary font-medium shrink-0">
                In progress
              </span>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
  );
}
