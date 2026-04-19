import { useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AgentPage() {
  const { token, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(e) {
    e.preventDefault();
    setError("");
    setResponse("");
    setLoading(true);
    try {
      const { data } = await apiFetch("/run-agent", {
        method: "POST",
        json: true,
        body: { prompt: prompt.trim() },
        token,
      });
      if (!data || typeof data.response !== "string") {
        throw new Error("Unexpected response shape from /run-agent");
      }
      setResponse(data.response);
    } catch (err) {
      if (err instanceof Error && err.status === 401) {
        logout();
      }
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Agent Playground</h2>
      <p className="muted">
        Sends prompts to the backend <code>/run-agent</code> endpoint. Responses are simulated and do not execute
        code.
      </p>

      <div className="card">
        {error ? <div className="error">{error}</div> : null}
        <form onSubmit={run}>
          <label htmlFor="prompt">Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            minLength={1}
            maxLength={2000}
            placeholder="Describe what you want the (mock) agent to consider…"
          />
          <div className="row" style={{ marginTop: "0.75rem" }}>
            <button className="primary" type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Running…" : "Run"}
            </button>
            <span className="muted">{prompt.length} / 2000</span>
          </div>
        </form>
      </div>

      {response ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Response</h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.9rem",
            }}
          >
            {response}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
