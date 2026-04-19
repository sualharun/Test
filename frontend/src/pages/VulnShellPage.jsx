import { useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function VulnShellPage() {
  const { token, logout } = useAuth();
  const [command, setCommand] = useState("echo hello");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  async function run(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await apiFetch("/vuln/shell/run", {
        method: "POST",
        json: true,
        body: { command },
        token,
      });
      setOut(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err instanceof Error && err.status === 401) logout();
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="error" style={{ marginBottom: "1rem" }}>
        <strong>OS command injection</strong> — user input passed to a shell.
      </div>
      <h2>Shell bridge</h2>
      <form onSubmit={run} className="card">
        <label htmlFor="cmd">command</label>
        <textarea id="cmd" rows={4} value={command} onChange={(e) => setCommand(e.target.value)} />
        <button className="primary" type="submit" style={{ marginTop: "0.5rem" }}>
          Execute
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {out ? <pre className="card" style={{ whiteSpace: "pre-wrap" }}>{out}</pre> : null}
    </div>
  );
}
