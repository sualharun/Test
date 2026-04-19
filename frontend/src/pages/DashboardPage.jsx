import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const STATUSES = ["open", "in_progress", "done"];

export default function DashboardPage() {
  const { token, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await apiFetch("/tasks", { token });
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.status === 401) {
        logout();
      }
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    load();
  }, [load]);

  async function createTask(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/tasks", {
        method: "POST",
        json: true,
        body: { title: title.trim(), description: description.trim() || null, status },
        token,
      });
      setTitle("");
      setDescription("");
      setStatus("open");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    }
  }

  async function updateTask(task, patch) {
    setError("");
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PUT",
        json: true,
        body: patch,
        token,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  return (
    <div>
      <h2>Dashboard</h2>
      {error ? <div className="error">{error}</div> : null}

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
          <button className="primary" type="submit">
            Add task
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
        <td>{task.status}</td>
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
      <td colSpan={4}>
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
