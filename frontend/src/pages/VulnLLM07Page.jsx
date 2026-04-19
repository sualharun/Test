import { useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function VulnLLM07Page() {
  const { token, logout } = useAuth();
  const [expression, setExpression] = useState("1 + 1");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  async function run(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await apiFetch("/vuln/llm07/agent-eval", {
        method: "POST",
        json: true,
        body: { expression },
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
        <strong>LLM07 / insecure eval</strong> — user input is evaluated as Python. Demo only.
      </div>
      <h2>LLM07 — agent eval tool</h2>
      <form onSubmit={run} className="card">
        <label htmlFor="expr">expression</label>
        <textarea id="expr" rows={5} value={expression} onChange={(e) => setExpression(e.target.value)} />
        <button className="primary" type="submit" style={{ marginTop: "0.5rem" }}>
          Run eval
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {out ? (
        <pre className="card" style={{ whiteSpace: "pre-wrap" }}>
          {out}
        </pre>
      ) : null}
    </div>
  );
}
