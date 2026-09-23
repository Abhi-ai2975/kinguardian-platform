// /ai-event page — demonstrates watcher.ai() server-side event firing.
// All buttons call Server Actions which use the Next.js server-side SDK.
// Events appear in the console under the AI Events section (event_type = "ai").
import AIEventPanel from "@/components/AIEventPanel";

export default function AIEventPage() {
  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <a href="/tasks" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
          ← Bookmarks
        </a>
        <a href="/test" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
          SDK Test Lab →
        </a>
      </div>
      <AIEventPanel />
    </main>
  );
}
