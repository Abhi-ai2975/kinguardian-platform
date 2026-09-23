// TasksPage.tsx — main task management page.
// Shows useAudit for CRUD actions, useMetric for task count changes,
// and useLog for errors during API calls.
import { useEffect, useState } from "react";
import { useAudit, useLog, useMetric } from "@watcher/react";
import TaskList from "../components/TaskList";

interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

interface Props {
  auth: { userId: string; email: string };
  onLogout: () => void;
}

export default function TasksPage({ auth, onLogout }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const audit = useAudit();
  const log = useLog();
  const metric = useMetric();

  // Fetch tasks on mount.
  useEffect(() => {
    fetchTasks();
  }, []);

  // Track task count as a metric whenever it changes.
  useEffect(() => {
    metric("tasks.count", { payload: { value: tasks.length, userId: auth.userId } });
  }, [tasks.length]);

  async function fetchTasks() {
    try {
      const res = await fetch(`/api/tasks?userId=${auth.userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
    } catch (err) {
      log("error", "tasks.fetch.failed", {
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), userId: auth.userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const task: Task = await res.json();

      setTasks((prev) => [...prev, task]);
      setNewTitle("");

      // Audit event so the creation appears in the compliance trail.
      audit("task.created", {
        userId: auth.userId,
        payload: { taskId: task.id, title: task.title },
      });
    } catch (err) {
      log("error", "task.create.failed", {
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: auth.userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Task = await res.json();

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      audit("task.toggled", {
        userId: auth.userId,
        payload: { taskId, done: updated.done },
      });
    } catch (err) {
      log("error", "task.toggle.failed", {
        payload: { taskId, message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async function handleDelete(taskId: string, title: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}?userId=${auth.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      // Audit deletions — important for compliance so deleted data is traceable.
      audit("task.deleted", {
        userId: auth.userId,
        payload: { taskId, title },
      });
    } catch (err) {
      log("error", "task.delete.failed", {
        payload: { taskId, message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: auth.userId }),
      });
    } catch {
      // Best-effort logout — the audit event still fires.
    }
    audit("user.logout", { userId: auth.userId, payload: {} });
    onLogout();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <strong>{auth.email}</strong>
          <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>({auth.userId})</span>
        </div>
        <button onClick={handleLogout} style={logoutBtn}>Sign out</button>
      </div>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title…"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
        />
        <button type="submit" disabled={loading} style={addBtn}>
          {loading ? "…" : "Add"}
        </button>
      </form>

      <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}

const logoutBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 13, borderRadius: 6,
  background: "transparent", border: "1px solid #ccc", cursor: "pointer",
};
const addBtn: React.CSSProperties = {
  padding: "8px 20px", fontSize: 14, borderRadius: 6,
  background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
};
