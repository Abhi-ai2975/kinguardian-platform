/**
 * EMRChatPanel — two-tab panel used on the Doctor EMR page.
 *
 * Layer : Client — telemedicine / doctor / emr
 * Role  : Top-level layout component for the doctor's AI-powered EMR workspace.
 *         Provides a header bar with an inline tab toggle that switches between:
 *
 *           "AI Chat"    — the A2UIChat component, lazily loaded to keep the
 *                          initial page bundle small. Enables conversational
 *                          clinical workflows backed by FHIR tool calls.
 *
 *           "UI Browser" — UISchemaPreview, a browsable catalogue of every
 *                          A2UI schema in the registry, grouped by FHIR resource
 *                          type. Useful for inspecting forms/cards before using
 *                          them in a live session.
 *
 * Height: calc(100vh - 156px) to fill the app shell below the navbar/breadcrumb.
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Bot, LayoutGrid } from "lucide-react";
import { UISchemaPreview } from "./UISchemaPreview";

/**
 * A2UIChat is dynamically imported to avoid including the heavy AI chat bundle
 * in the initial page JS. The `ssr: false` flag prevents a hydration mismatch
 * because A2UIChat depends on browser-only APIs (local storage, Web Audio, etc.).
 */
const A2UIChatPage = dynamic(
  () => import("@/modules/client/ai-hub/components/A2UIChat"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading AI Assistant…
      </div>
    ),
  },
);

interface EMRChatPanelProps {
  /** The portal role — drives the subtitle copy shown in the header. */
  role: "doctor" | "patient";
}

/**
 * EMRChatPanel component.
 *
 * Renders the shared AI EMR workspace used by the doctor portal.
 * The active tab is local state — no URL param or global store needed.
 *
 * @param props.role - "doctor" (clinical mode) or "patient" (patient-facing copy).
 */
export function EMRChatPanel({ role }: EMRChatPanelProps) {
  const [tab, setTab] = useState<"chat" | "preview">("chat");

  return (
    <div className="flex flex-col w-full h-[calc(100vh-156px)]">
      {/* ── Header with tab toggle ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">EMR Assistant</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {role === "doctor"
                ? "Electronic Medical Records — guided clinical workflows"
                : "Your health records — ask anything about your care"}
            </p>
          </div>
        </div>

        {/* Pill-style tab toggle (no shadcn Tabs — keeps the header compact) */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
              tab === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-3 w-3" />
            AI Chat
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
              tab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            UI Browser
          </button>
        </div>
      </div>

      {/* ── Body: swap between tabs without unmounting the inactive one ── */}
      {/* Note: conditional rendering (not hidden) — A2UIChat resets on tab switch,
          which is intentional so each new chat session starts fresh.            */}
      <div className="flex flex-1 min-h-0 w-full">
        {tab === "chat" ? <A2UIChatPage /> : <UISchemaPreview />}
      </div>
    </div>
  );
}
