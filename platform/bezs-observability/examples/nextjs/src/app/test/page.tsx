// test/page.tsx — SDK Test Lab.
// Renders buttons to fire every event type (audit, log, trace, metric)
// from both client (browser hooks) and server (Server Actions) contexts.
import { TestPanel } from "@/components/TestPanel";

export default function TestPage() {
  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <a href="/tasks" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
          ← Back to Bookmarks
        </a>
        <a href="/ai-event" style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
          🤖 AI Events →
        </a>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>
        SDK Test Lab
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6b7280" }}>
        Fire every event type from browser and server contexts. Events appear in
        the{" "}
        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb" }}
        >
          Watcher24 console
        </a>{" "}
        and the Live Feed in real time.
      </p>

      <TestPanel />
    </main>
  );
}
