// App.tsx — root component that manages the login state and page routing.
// Tracks page views on every route change using useLog.
import { useEffect, useState } from "react";
import { useLog } from "@watcher/react";
import LoginPage from "./pages/LoginPage";
import TasksPage from "./pages/TasksPage";
import TestPage from "./pages/TestPage";
import AIEventPage from "./pages/AIEventPage";

interface AuthState {
  userId: string;
  email: string;
}

type Page = "app" | "test" | "ai-events";

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [page, setPage] = useState<Page>("app");
  const log = useLog();

  // Log a page-view event whenever the active page changes.
  useEffect(() => {
    const pageName = page === "test" ? "test-lab" : page === "ai-events" ? "ai-events" : auth ? "tasks" : "login";
    log("info", "page.view", { payload: { page: pageName } });
  }, [auth, page]);

  return (
    <div style={{ maxWidth: page === "test" ? 960 : 640, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <header style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0 }}>📋 Task Tracker</h1>
          <p style={{ color: "#666", fontSize: 13, margin: "4px 0 0" }}>
            Watcher24 React + Node.js example
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setPage((p) => p === "ai-events" ? "app" : "ai-events")}
            style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 6,
              border: "1px solid #ddd6fe",
              background: page === "ai-events" ? "#f5f3ff" : "#fff",
              cursor: "pointer", color: "#7c3aed", fontFamily: "inherit",
            }}
          >
            {page === "ai-events" ? "← Back" : "🤖 AI Events →"}
          </button>
          <button
            onClick={() => setPage((p) => p === "test" ? "app" : "test")}
            style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 6,
              border: "1px solid #d1d5db", background: page === "test" ? "#f3f4f6" : "#fff",
              cursor: "pointer", color: "#374151", fontFamily: "inherit",
            }}
          >
            {page === "test" ? "← Back" : "SDK Test Lab →"}
          </button>
        </div>
      </header>

      {page === "test" ? (
        <TestPage />
      ) : page === "ai-events" ? (
        <AIEventPage />
      ) : auth ? (
        <TasksPage auth={auth} onLogout={() => setAuth(null)} />
      ) : (
        <LoginPage onLogin={setAuth} />
      )}
    </div>
  );
}
