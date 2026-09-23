// TaskList.tsx — renders the list of tasks with toggle and delete controls.
// Uses useTrace to record each user interaction as a client-side trace span,
// giving a timeline of exactly which actions the user took and in what order.
import { useTrace } from "@watcher/react";

interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}

export default function TaskList({ tasks, onToggle, onDelete }: Props) {
  const trace = useTrace();

  function handleToggle(task: Task) {
    // Trace the user interaction — useful for replaying user sessions.
    trace("ui.task.toggle", {
      payload: { taskId: task.id, currentState: task.done },
    });
    onToggle(task.id);
  }

  function handleDelete(task: Task) {
    trace("ui.task.delete", {
      payload: { taskId: task.id, title: task.title },
    });
    onDelete(task.id, task.title);
  }

  if (tasks.length === 0) {
    return <p style={{ color: "#888", textAlign: "center" }}>No tasks yet — add one above.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {tasks.map((task) => (
        <li
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            marginBottom: 8,
            background: task.done ? "#f9fafb" : "#fff",
          }}
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => handleToggle(task)}
            style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
          />
          <span style={{ flex: 1, textDecoration: task.done ? "line-through" : "none", color: task.done ? "#9ca3af" : "#111" }}>
            {task.title}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={() => handleDelete(task)}
            style={{
              padding: "3px 10px", fontSize: 12, borderRadius: 4,
              background: "transparent", border: "1px solid #fca5a5",
              color: "#ef4444", cursor: "pointer",
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
