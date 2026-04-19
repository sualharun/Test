import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const STATUSES = ["open", "in_progress", "done"];

function formatTs(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy HH:mm");
  } catch {
    return String(iso);
  }
}

export default function DashboardPage() {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  const tasksQuery = useQuery({
    queryKey: ["tasks", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const { data } = await apiFetch("/tasks", { token });
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    const err = tasksQuery.error;
    if (err instanceof Error && err.status === 401) logout();
  }, [tasksQuery.error, logout]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/tasks", {
        method: "POST",
        json: true,
        body: { title: title.trim(), description: description.trim() || null, status },
        token,
      });
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setStatus("open");
      queryClient.invalidateQueries({ queryKey: ["tasks", token] });
    },
  });

  const error =
    tasksQuery.error instanceof Error
      ? tasksQuery.error.message
      : tasksQuery.error
        ? String(tasksQuery.error)
        : "";

  async function createTask(e) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync();
    } catch (err) {
      /* surfaced via mutation state if we wire setError; keep simple */
    }
  }

  async function updateTask(task, patch) {
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PUT",
        json: true,
        body: patch,
        token,
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks", token] });
    } catch (err) {
      if (err instanceof Error && err.status === 401) logout();
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE", token });
      await queryClient.invalidateQueries({ queryKey: ["tasks", token] });
    } catch (err) {
      if (err instanceof Error && err.status === 401) logout();
    }
  }

  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading;

  return (
    <div>
      <h2>Dashboard</h2>
      {error ? <div className="error">{error}</div> : null}
      {createMutation.isError ? (
        <div className="error">{createMutation.error instanceof Error ? createMutation.error.message : "Create failed"}</div>
      ) : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add task</h3>
        <form onSubmit={createTask}>
          <div style={{ marginBottom: "0.6rem" }}>
            <label htmlFor="t-title">Title</label>
            <input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div style={{ marginBottom: "0.6rem" }}>
            <label htmlFor="t-desc">Description</label>
            <textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
          </div>
          <div style={{ marginBottom: "0.6rem" }}>
            <label htmlFor="t-status">Status</label>
            <select id="t-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button className="primary" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding…" : "Add task"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Your tasks</h3>
        {loading ? <p className="muted">Loading…</p> : null}
        {!loading && tasks.length === 0 ? <p className="muted">No tasks yet.</p> : null}
        {!loading && tasks.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);

  if (!editing) {
    return (
      <tr>
        <td>{task.title}</td>
        <td>{task.description || "—"}</td>
        <td>
          <span
            className={clsx("status-pill", {
              "status-open": task.status === "open",
              "status-progress": task.status === "in_progress",
              "status-done": task.status === "done",
            })}
          >
            {task.status}
          </span>
        </td>
        <td className="muted" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
          {formatTs(task.created_at)}
        </td>
        <td>
          <div className="row">
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={() => onDelete(task.id)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={5}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <button
              type="button"
              className="primary"
              onClick={async () => {
                await onUpdate(task, {
                  title: title.trim(),
                  description: description.trim() || null,
                  status,
                });
                setEditing(false);
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(task.title);
                setDescription(task.description || "");
                setStatus(task.status);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
